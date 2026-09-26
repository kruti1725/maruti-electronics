import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { SearchReceipt } from './components/SearchReceipt';
import { LoginPage } from './components/LoginPage';
import { DashboardCards } from './components/DashboardCards';
import { ReceiptForm } from './components/ReceiptForm';
import { ReceiptTable } from './components/ReceiptTable';
import { PrintReceipt } from './components/PrintReceipt';
import { StickerPrint } from './components/StickerPrint';
import { Loading } from './components/Loading';
import { IUser } from './types/user';
import { IReceipt } from './types/receipt';

export default function App() {
  const [initialSerial, setInitialSerial] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const querySerial = searchParams.get('serial');
      if (querySerial) return querySerial;
      const pathMatch = window.location.pathname.match(/^\/(?:track|receipt|receipts)\/([a-zA-Z0-9_-]+)/i);
      if (pathMatch && pathMatch[1] && pathMatch[1] !== 'mobile') {
        return pathMatch[1];
      }
    }
    return '';
  });

  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const serial = searchParams.get('serial');
      const path = window.location.pathname || '/';
      if (serial || path.startsWith('/track') || path.startsWith('/receipt')) {
        return '/search-receipt';
      }
      return path;
    }
    return '/';
  });

  const [user, setUser] = useState<IUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Active print/sticker modals
  const [activeA4Receipt, setActiveA4Receipt] = useState<IReceipt | null>(null);
  const [activeStickerReceipt, setActiveStickerReceipt] = useState<IReceipt | null>(null);

  // Edit receipt state
  const [editingReceipt, setEditingReceipt] = useState<IReceipt | null>(null);

  // Synchronize browser history and path changes
  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    const cleanPath = path.split('?')[0];

    // Parse search params if any
    const searchParams = new URLSearchParams(window.location.search);
    const serial = searchParams.get('serial') || '';
    if (serial) {
      setInitialSerial(serial);
      setCurrentPath('/search-receipt');
    } else if (cleanPath.startsWith('/track') || cleanPath.startsWith('/receipt')) {
      const pathMatch = cleanPath.match(/^\/(?:track|receipt|receipts)\/([a-zA-Z0-9_-]+)/i);
      if (pathMatch && pathMatch[1]) setInitialSerial(pathMatch[1]);
      setCurrentPath('/search-receipt');
    } else {
      setCurrentPath(cleanPath);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Listen to popstate (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const serial = searchParams.get('serial') || '';
      const path = window.location.pathname || '/';

      if (serial) {
        setInitialSerial(serial);
        setCurrentPath('/search-receipt');
      } else if (path.startsWith('/track') || path.startsWith('/receipt')) {
        const pathMatch = path.match(/^\/(?:track|receipt|receipts)\/([a-zA-Z0-9_-]+)/i);
        if (pathMatch && pathMatch[1]) setInitialSerial(pathMatch[1]);
        setCurrentPath('/search-receipt');
      } else {
        setCurrentPath(path);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check auth session: only authenticate if valid admin token exists
  useEffect(() => {
    const checkAuth = async () => {
      const stored = localStorage.getItem('kruti_auth_user');
      const token = localStorage.getItem('kruti_auth_token');

      if (!stored || !token) {
        setUser(null);
        setAuthChecked(true);
        return;
      }

      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.email) {
          setUser(parsed);
        }
      } catch {
        setUser(null);
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-admin-auth': 'true',
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
          }
        }
      } catch (e) {
        // Keep offline session
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      try {
        localStorage.removeItem('kruti_auth_user');
        localStorage.removeItem('kruti_auth_token');
      } catch {}
      setUser(null);
      navigate('/');
    }
  };

  // Protect admin routes: /dashboard, /add-receipt, /all-receipts, /update-receipt
  const isAdminRoute =
    currentPath.startsWith('/dashboard') ||
    currentPath.startsWith('/add-receipt') ||
    currentPath.startsWith('/all-receipts') ||
    currentPath.startsWith('/update-receipt');

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loading message="Initializing Kruti Electronics Portal..." size="lg" />
      </div>
    );
  }

  // Render current view
  const renderContent = () => {
    if (isAdminRoute && !user) {
      return (
        <LoginPage
          onLoginSuccess={(loggedInUser) => {
            setUser(loggedInUser);
            navigate('/dashboard');
          }}
          onNavigateHome={() => navigate('/')}
        />
      );
    }

    if (currentPath === '/login') {
      if (user) {
        return <DashboardCards onNavigate={(path) => navigate(path)} />;
      }
      return (
        <LoginPage
          onLoginSuccess={(loggedInUser) => {
            setUser(loggedInUser);
            navigate('/dashboard');
          }}
          onNavigateHome={() => navigate('/')}
        />
      );
    }

    if (currentPath === '/search-receipt') {
      return (
        <SearchReceipt
          initialSerial={initialSerial}
          onNavigateHome={() => navigate('/')}
          onPrintReceipt={(receipt) => setActiveA4Receipt(receipt)}
        />
      );
    }

    if (currentPath === '/dashboard') {
      return <DashboardCards onNavigate={(path) => navigate(path)} />;
    }

    if (currentPath === '/add-receipt') {
      return (
        <ReceiptForm
          onSuccess={(savedReceipt) => {
            setActiveA4Receipt(savedReceipt);
          }}
          onCancel={() => navigate('/all-receipts')}
        />
      );
    }

    if (currentPath === '/all-receipts') {
      return (
        <ReceiptTable
          onUpdate={(receipt) => {
            setEditingReceipt(receipt);
            navigate(`/update-receipt/${receipt.serialNumber}`);
          }}
          onPrintA4={(receipt) => setActiveA4Receipt(receipt)}
          onPrintSticker={(receipt) => setActiveStickerReceipt(receipt)}
          onAddNew={() => navigate('/add-receipt')}
        />
      );
    }

    if (currentPath.startsWith('/update-receipt')) {
      return (
        <ReceiptForm
          initialData={editingReceipt}
          isEditMode={true}
          onSuccess={() => {
            navigate('/all-receipts');
          }}
          onCancel={() => navigate('/all-receipts')}
        />
      );
    }

    return <HomePage onNavigate={(path) => navigate(path)} />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-red-600 selection:text-white">
      <Navbar
        currentPath={currentPath}
        onNavigate={navigate}
        user={user}
        onLogout={handleLogout}
      />

      <main className="flex-1">{renderContent()}</main>

      <Footer onNavigate={navigate} />

      {activeA4Receipt && (
        <PrintReceipt
          receipt={activeA4Receipt}
          isOpen={!!activeA4Receipt}
          onClose={() => setActiveA4Receipt(null)}
        />
      )}

      {activeStickerReceipt && (
        <StickerPrint
          receipt={activeStickerReceipt}
          isOpen={!!activeStickerReceipt}
          onClose={() => setActiveStickerReceipt(null)}
        />
      )}
    </div>
  );
}
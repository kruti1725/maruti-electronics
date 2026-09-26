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
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
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

  // Serial from URL query (?serial=KR00101)
  const [initialSerial, setInitialSerial] = useState<string>('');

  // Synchronize browser history and path changes
  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path.split('?')[0]);

    // Parse search params if any
    const searchParams = new URLSearchParams(window.location.search);
    const serial = searchParams.get('serial') || '';
    if (serial) setInitialSerial(serial);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Listen to popstate (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      const searchParams = new URLSearchParams(window.location.search);
      const serial = searchParams.get('serial') || '';
      if (serial) setInitialSerial(serial);
    };

    window.addEventListener('popstate', handlePopState);

    // Initial query check
    const searchParams = new URLSearchParams(window.location.search);
    const serial = searchParams.get('serial') || '';
    if (serial) setInitialSerial(serial);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check auth session
  useEffect(() => {
    const checkAuth = async () => {
      // 1. Check local session first
      try {
        const stored = localStorage.getItem('kruti_auth_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.email) {
            setUser(parsed);
          }
        }
      } catch {}

      // 2. Also verify with backend if available
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
            localStorage.setItem('kruti_auth_user', JSON.stringify(data.user));
          }
        }
      } catch (e) {
        console.warn('Backend session check skipped, keeping local state:', e);
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
    // If accessing admin route without authentication, show login
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
        // already logged in, redirect to dashboard
        return (
          <DashboardCards onNavigate={(path) => navigate(path)} />
        );
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

    // Default route: Home Page
    return <HomePage onNavigate={(path) => navigate(path)} />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-red-600 selection:text-white">
      {/* Navigation Bar */}
      <Navbar
        currentPath={currentPath}
        onNavigate={navigate}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1">{renderContent()}</main>

      {/* Footer */}
      <Footer onNavigate={navigate} />

      {/* A4 Printable Receipt & PDF Modal */}
      {activeA4Receipt && (
        <PrintReceipt
          receipt={activeA4Receipt}
          isOpen={!!activeA4Receipt}
          onClose={() => setActiveA4Receipt(null)}
        />
      )}

      {/* 50mm x 25mm Thermal Sticker Print Modal */}
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

import React, { useState, useEffect } from 'react';
import { LogIn, Lock, Mail, AlertCircle, ShieldCheck, ArrowLeft, Server, Database, CheckCircle2, RefreshCw, Terminal } from 'lucide-react';
import { IUser } from '../types/user';

interface LoginPageProps {
  onLoginSuccess: (user: IUser) => void;
  onNavigateHome: () => void;
}

interface ServerStatus {
  online: boolean;
  checking: boolean;
  database?: {
    isConfigured: boolean;
    isConnected: boolean;
    mode: 'atlas' | 'local';
    lastError?: string | null;
  };
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigateHome }) => {
  const [email, setEmail] = useState('admin@krutielectronics.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    online: true,
    checking: true,
  });

  const checkServerHealth = async () => {
    setServerStatus((prev) => ({ ...prev, checking: true }));
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setServerStatus({
          online: true,
          checking: false,
          database: data.database,
        });
      } else {
        setServerStatus({ online: false, checking: false });
      }
    } catch {
      setServerStatus({ online: false, checking: false });
    }
  };

  useEffect(() => {
    checkServerHealth();
  }, []);

  const loginOffline = () => {
    const offlineUser: IUser = {
      _id: 'usr_admin',
      email: 'admin@krutielectronics.com',
      name: 'Kruti Admin (Offline/Local)',
      role: 'admin',
      createdAt: new Date().toISOString(),
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('kruti_auth_user', JSON.stringify(offlineUser));
    }
    onLoginSuccess(offlineUser);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const isDefaultAdmin =
      cleanEmail === 'admin@krutielectronics.com' &&
      (password === 'admin123' || password === 'password123');

    if (!cleanEmail || !password) {
      setError('Please enter both username/email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // If server responded with 500 or HTML error (e.g. Vercel unconfigured backend)
        if (isDefaultAdmin) {
          loginOffline();
          return;
        }
        throw new Error('Server returned an unexpected response.');
      }

      if (!res.ok || !data.success) {
        if (isDefaultAdmin) {
          loginOffline();
          return;
        }
        setError(data.error || 'Invalid username or password.');
      } else {
        if (typeof window !== 'undefined') {
          localStorage.setItem('kruti_auth_user', JSON.stringify(data.user));
        }
        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      checkServerHealth();

      // If server is unreachable or offline, let default admin in seamlessly!
      if (isDefaultAdmin) {
        loginOffline();
        return;
      }

      setError(
        'Server se connect nahi ho pa raha hai. Aap default credentials (admin@krutielectronics.com / admin123) daal kar login kar sakte hain ya niche "Offline Mode" button daba sakte hain.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        {/* Back link */}
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </button>

        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/60 border border-slate-200 p-8 sm:p-10">
          <div className="text-center space-y-2 mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-red-50 text-red-600 mb-2">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Admin & Staff Portal
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Sign in to manage TV repair receipts, update workshop jobs, and view reports.
            </p>
          </div>

          {/* Server Diagnostic Banner */}
          {!serverStatus.checking && !serverStatus.online && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-300 text-amber-950 rounded-2xl space-y-2.5 text-xs animate-in fade-in">
              <div className="flex items-center justify-between font-bold text-amber-900">
                <span className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-amber-600 animate-pulse" />
                  Backend Server Offline
                </span>
                <button
                  type="button"
                  onClick={checkServerHealth}
                  className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 font-semibold cursor-pointer underline"
                >
                  <RefreshCw className="w-3 h-3" /> Recheck
                </button>
              </div>
              <p className="text-amber-800 leading-relaxed">
                Backend server port 3000 par run nahi ho raha hai. Local system par chalane ke liye:
              </p>
              <div className="bg-slate-900 text-slate-100 p-2.5 rounded-xl font-mono text-[11px] flex items-center gap-2 select-all">
                <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>npm run dev</span>
              </div>
            </div>
          )}

          {/* Database & Server Status Pill */}
          {!serverStatus.checking && serverStatus.online && (
            <div className="mb-6 px-3.5 py-2 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Server Online</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[10px]">
                <Database className="w-3 h-3 text-slate-400" />
                <span>
                  DB:{' '}
                  {serverStatus.database?.isConnected
                    ? 'MongoDB Atlas (Connected)'
                    : 'Local JSON (.data/)'}
                </span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-900 rounded-2xl flex items-start gap-3 text-xs font-medium animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-red-950">Connection / Login Alert</p>
                <p className="text-red-800 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@krutielectronics.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-red-600 focus:bg-white focus:outline-none rounded-xl text-sm font-medium text-slate-900 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-red-600 focus:bg-white focus:outline-none rounded-xl text-sm font-medium text-slate-900 transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-6"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In to Dashboard
                </>
              )}
            </button>

            {/* Offline Direct Access Button */}
            <button
              type="button"
              onClick={loginOffline}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
            >
              ⚡ Enter in Offline / Standalone Mode (ऑफलाइन डायरेक्ट लॉगिन)
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-2">
            <p className="text-xs text-slate-500">
              Default credentials: <br />
              <code className="font-mono font-bold text-slate-700">admin@krutielectronics.com</code> /{' '}
              <code className="font-mono font-bold text-slate-700">admin123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


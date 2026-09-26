import React, { useState } from 'react';
import { Tv, Menu, X, LogIn, LogOut, LayoutDashboard, PlusCircle, FileSpreadsheet, Search, ShieldCheck } from 'lucide-react';
import { IUser } from '../types/user';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  user: IUser | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate, user, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  const isActive = (path: string) => {
    if (path === '/' && currentPath === '/') return true;
    if (path !== '/' && currentPath.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand */}
          <button
            onClick={() => handleNavClick('/')}
            className="flex items-center gap-3 group text-left cursor-pointer focus:outline-none"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-red-600 to-red-500 text-white flex items-center justify-center shadow-md shadow-red-500/20 group-hover:scale-105 transition duration-200">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
                KRUTI <span className="text-red-600">ELECTRONICS</span>
              </span>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 tracking-wider uppercase -mt-0.5">
                TV Repair & Service Center
              </p>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => handleNavClick('/')}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                isActive('/') && currentPath === '/'
                  ? 'bg-red-50 text-red-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Home
            </button>

            <button
              onClick={() => handleNavClick('/search-receipt')}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                isActive('/search-receipt')
                  ? 'bg-red-50 text-red-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Search className="w-4 h-4 text-red-500" />
              Check Repair Status
            </button>

            {user ? (
              // Admin Logged-In Menu
              <>
                <div className="h-5 w-[1px] bg-slate-200 mx-2" />
                <button
                  onClick={() => handleNavClick('/dashboard')}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    isActive('/dashboard')
                      ? 'bg-red-50 text-red-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>

                <button
                  onClick={() => handleNavClick('/add-receipt')}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    isActive('/add-receipt')
                      ? 'bg-red-50 text-red-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Receipt
                </button>

                <button
                  onClick={() => handleNavClick('/all-receipts')}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    isActive('/all-receipts')
                      ? 'bg-red-50 text-red-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  All Receipts
                </button>

                <div className="flex items-center pl-2 ml-1">
                  <div className="hidden lg:flex flex-col text-right mr-3">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" /> {user.name}
                    </span>
                    <span className="text-[10px] text-slate-500">{user.email}</span>
                  </div>
                  <button
                    onClick={onLogout}
                    className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              </>
            ) : (
              // Public / Unauthenticated
              <button
                onClick={() => handleNavClick('/login')}
                className={`ml-2 px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  isActive('/login')
                    ? 'bg-red-600 text-white shadow-red-200'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                <LogIn className="w-4 h-4" />
                Staff Login
              </button>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-red-600" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-1.5 shadow-xl animate-in slide-in-from-top duration-200">
          <button
            onClick={() => handleNavClick('/')}
            className={`w-full text-left px-4 py-3 rounded-xl text-base font-semibold transition ${
              isActive('/') && currentPath === '/'
                ? 'bg-red-50 text-red-600 font-bold'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Home
          </button>

          <button
            onClick={() => handleNavClick('/search-receipt')}
            className={`w-full text-left px-4 py-3 rounded-xl text-base font-semibold flex items-center gap-2 transition ${
              isActive('/search-receipt')
                ? 'bg-red-50 text-red-600 font-bold'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Search className="w-5 h-5 text-red-600" />
            Check Repair Status
          </button>

          {user ? (
            <>
              <div className="pt-2 pb-1 border-t border-slate-100">
                <p className="px-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Admin Management
                </p>
              </div>

              <button
                onClick={() => handleNavClick('/dashboard')}
                className={`w-full text-left px-4 py-3 rounded-xl text-base font-semibold flex items-center gap-2.5 transition ${
                  isActive('/dashboard')
                    ? 'bg-red-50 text-red-600 font-bold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </button>

              <button
                onClick={() => handleNavClick('/add-receipt')}
                className={`w-full text-left px-4 py-3 rounded-xl text-base font-semibold flex items-center gap-2.5 transition ${
                  isActive('/add-receipt')
                    ? 'bg-red-50 text-red-600 font-bold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <PlusCircle className="w-5 h-5" />
                Add Receipt
              </button>

              <button
                onClick={() => handleNavClick('/all-receipts')}
                className={`w-full text-left px-4 py-3 rounded-xl text-base font-semibold flex items-center gap-2.5 transition ${
                  isActive('/all-receipts')
                    ? 'bg-red-50 text-red-600 font-bold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5" />
                All Receipts
              </button>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between px-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="px-3.5 py-2 bg-red-50 text-red-600 font-bold text-sm rounded-xl flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            </>
          ) : (
            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={() => handleNavClick('/login')}
                className="w-full py-3 px-4 bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-red-500/20"
              >
                <LogIn className="w-5 h-5" /> Login (Admin / Staff)
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

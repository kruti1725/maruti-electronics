import React from 'react';
import { Tv, Phone, MapPin, Clock, Search, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Company Brand */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shadow-lg shadow-red-600/30">
                <Tv className="w-6 h-6" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">
                KRUTI <span className="text-red-500">ELECTRONICS</span>
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              Fast, reliable, and genuine TV & Electronics repair service center. Specializing in LED, LCD, OLED, 4K Smart TV motherboard repair, panel COF bonding, backlight replacement, and power supply troubleshooting.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2">
              <span className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> 100% Genuine Spare Parts
              </span>
              <span className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <Clock className="w-4 h-4 text-amber-400" /> Fast Diagnosis
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-white font-bold text-sm tracking-wider uppercase">Quick Links</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('/')}
                  className="hover:text-red-400 transition cursor-pointer text-slate-400 hover:underline"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/search-receipt')}
                  className="flex items-center gap-1.5 hover:text-red-400 transition cursor-pointer text-slate-400 hover:underline"
                >
                  <Search className="w-3.5 h-3.5 text-red-500" /> Check Repair Status
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/login')}
                  className="hover:text-red-400 transition cursor-pointer text-slate-400 hover:underline"
                >
                  Admin / Staff Portal
                </button>
              </li>
            </ul>
          </div>

          {/* Workshop Contact */}
          <div className="space-y-4">
            <h4 className="text-white font-bold text-sm tracking-wider uppercase">Service Center</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>Station Road, Near Electronics Market, Gujarat, India</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-red-500 shrink-0" />
                <a href="tel:8511296117" className="hover:text-white transition">
                  +91 85112 96117 / +91 98765 43210
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-red-500 shrink-0" />
                <span>Mon – Sat: 10:00 AM – 8:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Notice & Copyright */}
        <div className="mt-12 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {currentYear} Kruti Electronics. All Rights Reserved.</p>
          <div className="flex items-center gap-6">
            <span>TV Repair & Service Center</span>
            <span>•</span>
            <button
              onClick={() => onNavigate('/search-receipt')}
              className="text-red-400 hover:text-red-300 font-medium cursor-pointer"
            >
              Track Repair
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

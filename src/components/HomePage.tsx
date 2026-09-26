import React from 'react';
import {
  Search,
  LogIn,
  Tv,
  CheckCircle2,
  Cpu,
  Zap,
  Volume2,
  Layers,
  Wrench,
  ShieldCheck,
  ArrowRight,
  Clock,
  PhoneCall,
  Sparkles,
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const services = [
    {
      icon: <Tv className="w-6 h-6 text-red-600" />,
      title: 'LED & Smart TV Repair',
      description: 'Expert diagnostic and repair for all brands including Sony, Samsung, LG, Mi, OnePlus, and TCL.',
    },
    {
      icon: <Layers className="w-6 h-6 text-red-600" />,
      title: 'Display & Panel Repair',
      description: 'Fix horizontal & vertical lines, double images, flicker, and specialized COF bonding with laser machine.',
    },
    {
      icon: <Zap className="w-6 h-6 text-red-600" />,
      title: 'Power Supply Repair',
      description: 'Component-level fix for dead TVs, standby light failure, blown capacitors, and power surge protection.',
    },
    {
      icon: <Cpu className="w-6 h-6 text-red-600" />,
      title: 'Motherboard Repair',
      description: 'Micro-soldering, processor reballing, eMMC memory reprogramming, and boot loop recovery.',
    },
    {
      icon: <Volume2 className="w-6 h-6 text-red-600" />,
      title: 'Sound & Audio Faults',
      description: 'Replacement of internal speakers, amplifier IC repairs, audio distortion fixing, and optical output diagnostics.',
    },
    {
      icon: <Wrench className="w-6 h-6 text-red-600" />,
      title: 'Panel Related Service',
      description: 'Backlight LED strip replacements with genuine high-lumen strips, polarized film repair, and reflector fixes.',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Submit TV',
      desc: 'Bring your TV to our service center or schedule our pickup assistance.',
    },
    {
      step: '02',
      title: 'Get Receipt',
      desc: 'Receive your official job card receipt with unique serial number & QR code.',
    },
    {
      step: '03',
      title: 'Track Repair',
      desc: 'Check live repair progress online 24/7 using your receipt or mobile number.',
    },
    {
      step: '04',
      title: 'Collect TV',
      desc: 'Test your fully repaired television with warranty and enjoy high-definition viewing!',
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-16 bg-gradient-to-b from-white via-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Top pill badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-red-600" />
              Gujarat's Trusted TV & Electronics Repair Specialists
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-none">
              KRUTI <span className="text-red-600">ELECTRONICS</span>
            </h1>

            <p className="text-xl sm:text-2xl font-bold text-slate-700">
              TV Repair & Service Center
            </p>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Fast, reliable, and genuine TV repair service with modern diagnostic tools, laser COF bonding, and 100% transparent live customer tracking.
            </p>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => onNavigate('/search-receipt')}
                className="w-full sm:w-auto px-8 py-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-base rounded-2xl shadow-xl shadow-red-600/30 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Search className="w-5 h-5" />
                Check Repair Status
              </button>

              <button
                onClick={() => onNavigate('/login')}
                className="w-full sm:w-auto px-7 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-base rounded-2xl shadow-md transition flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <LogIn className="w-5 h-5" />
                Admin / Staff Login
              </button>
            </div>

            {/* Trust Badges */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Genuine Components
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" /> Same-Day Inspection
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Service Warranty
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-red-600">
            Professional Solutions
          </h2>
          <p className="text-3xl font-black text-slate-900 mt-1">Our Repair Services</p>
          <p className="text-sm text-slate-600 mt-2">
            Comprehensive repair capabilities for all screen sizes from 24 inches to 85 inches OLED & 4K Ultra HD.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-red-200 transition duration-200 group"
            >
              <div className="p-3.5 rounded-2xl bg-red-50 w-fit mb-5 group-hover:scale-110 transition duration-200">
                {s.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-red-600 transition">
                {s.title}
              </h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-slate-900 text-white py-16 sm:py-20 rounded-3xl mx-4 sm:mx-6 lg:mx-8 px-6 sm:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-red-400">
              Simple & Transparent
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-1">
              How The Service Works
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              From submission to collection, track your TV status every step of the way.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((st, i) => (
              <div key={i} className="relative space-y-3">
                <span className="text-4xl font-black text-red-500/30 font-mono block">
                  {st.step}
                </span>
                <h3 className="text-lg font-bold text-white">{st.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center pt-8 border-t border-slate-800">
            <button
              onClick={() => onNavigate('/search-receipt')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-lg transition cursor-pointer"
            >
              Track Your Repair Now <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Workshop Location & Emergency Helpline */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-md flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">
              Have Questions or Need Immediate Assistance?
            </span>
            <h3 className="text-2xl font-black text-slate-900">
              Visit Our Repair Center or Speak With Our Chief Technician
            </h3>
            <p className="text-sm text-slate-600">
              Station Road, Near Electronics Market, Gujarat. Open Monday to Saturday from 10:00 AM to 8:00 PM.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <a
              href="tel:8511296117"
              className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl flex items-center gap-2 transition"
            >
              <PhoneCall className="w-4 h-4 text-red-500" />
              Call +91 85112 96117
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

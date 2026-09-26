import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  Tv,
  Clock,
  Wrench,
  CheckCircle2,
  PackageCheck,
  Calendar,
  AlertTriangle,
  Flame,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  Search,
} from 'lucide-react';
import { DashboardStats } from '../types/receipt';
import { getClientDashboardStats } from '../lib/client-storage';

interface DashboardCardsProps {
  onNavigate: (path: string) => void;
}

export const DashboardCards: React.FC<DashboardCardsProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) {
          setStats(data.stats);
          return;
        }
      }
      throw new Error('API unavailable');
    } catch {
      // Local metrics calculation
      const localStats = getClientDashboardStats();
      setStats(localStats);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Welcome & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            Admin Workshop Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time live monitoring of repair jobs, inventory queues, and technician loads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('/add-receipt')}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/25 flex items-center gap-2 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> New Receipt
          </button>

          <button
            onClick={() => onNavigate('/all-receipts')}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" /> View All Receipts
          </button>

          <button
            onClick={fetchStats}
            className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition cursor-pointer shadow-xs"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-900 rounded-2xl flex items-center justify-between">
          <span className="text-sm font-medium">{error}</span>
          <button onClick={fetchStats} className="text-xs font-bold underline">
            Retry
          </button>
        </div>
      )}

      {/* High-Level Alert Cards (Today, Old Receipts, Urgent) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Today's Receipts */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Today's Receipts
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono">
              {stats ? stats.todayReceipts : '...'}
            </span>
            <p className="text-xs text-slate-500 mt-1">Booked in shop today</p>
          </div>
        </div>

        {/* Old Receipts (Section 7 & 38 Rule) */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-3xl p-5 border-2 border-amber-300 shadow-sm relative overflow-hidden group hover:border-amber-400 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Old Receipts (≥ 4 Days)
            </span>
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20 animate-bounce">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-black text-amber-950 font-mono">
              {stats ? stats.oldReceipts : '...'}
            </span>
            <p className="text-xs text-amber-800 font-medium mt-1">
              Requires technician attention & customer follow-up
            </p>
          </div>
        </div>

        {/* Urgent Receipts */}
        <div className="bg-gradient-to-br from-red-50 to-rose-50/50 rounded-3xl p-5 border-2 border-red-300 shadow-sm relative overflow-hidden group hover:border-red-400 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-900">
              Urgent Priority TVs
            </span>
            <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-md shadow-red-600/20">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-black text-red-900 font-mono">
              {stats ? stats.urgentReceipts : '...'}
            </span>
            <p className="text-xs text-red-700 font-medium mt-1">High customer expectation</p>
          </div>
        </div>
      </div>

      {/* Main Breakdown Grid (Total Receipts, Total TVs, Pending, Under Repair, Ready, Delivered) */}
      <div>
        <h2 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
          Workshop Volume & Stage Breakdown
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Total Receipts */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase">Total Receipts</span>
              <FileSpreadsheet className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
              {stats ? stats.totalReceipts : '-'}
            </p>
          </div>

          {/* Total TVs */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase">Total TVs</span>
              <Tv className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
              {stats ? stats.totalTVs : '-'}
            </p>
          </div>

          {/* Pending */}
          <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/90 shadow-xs">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-[11px] font-bold uppercase">Pending</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-amber-950 mt-2 font-mono">
              {stats ? stats.pending : '-'}
            </p>
          </div>

          {/* Under Repair */}
          <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-200/90 shadow-xs">
            <div className="flex items-center justify-between text-blue-800">
              <span className="text-[11px] font-bold uppercase">Under Repair</span>
              <Wrench className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-blue-950 mt-2 font-mono">
              {stats ? stats.underRepair : '-'}
            </p>
          </div>

          {/* Ready */}
          <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200/90 shadow-xs">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-[11px] font-bold uppercase">Ready</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-950 mt-2 font-mono">
              {stats ? stats.ready : '-'}
            </p>
          </div>

          {/* Delivered */}
          <div className="bg-slate-100 rounded-2xl p-4 border border-slate-300 shadow-xs">
            <div className="flex items-center justify-between text-slate-700">
              <span className="text-[11px] font-bold uppercase">Delivered</span>
              <PackageCheck className="w-4 h-4 text-slate-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
              {stats ? stats.delivered : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        <div
          onClick={() => onNavigate('/add-receipt')}
          className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-red-50 text-red-600 group-hover:scale-110 transition duration-200">
              <PlusCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-red-600 transition">
                Create New Repair Receipt
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate job card for 1 or more TVs, assign technician, and create 50×25mm sticker.
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-red-600 group-hover:translate-x-1 transition" />
        </div>

        <div
          onClick={() => onNavigate('/all-receipts')}
          className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-slate-100 text-slate-800 group-hover:scale-110 transition duration-200">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-slate-800 transition">
                Manage & Filter All Receipts
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Search by serial, customer or phone, download Excel export, print A4 PDF receipts.
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-1 transition" />
        </div>
      </div>
    </div>
  );
};

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
  Scan,
} from 'lucide-react';
import { DashboardStats, IReceipt } from '../types/receipt';
import { getClientDashboardStats } from '../lib/client-storage';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface DashboardCardsProps {
  onNavigate: (path: string) => void;
}

function calculateCalendarDays(dateInput?: string): number {
  if (!dateInput) return 0;
  const dateOnly = dateInput.split('T')[0];
  const parts = dateOnly.split('-');
  if (parts.length !== 3) return 0;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return 0;

  const receivedMidnight = new Date(year, month, day).getTime();
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.round((todayMidnight - receivedMidnight) / (1000 * 60 * 60 * 24)));
}

function computeStatsFromReceipts(receipts: IReceipt[]): DashboardStats {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  let totalReceipts = receipts.length;
  let totalTVs = 0;
  let pending = 0;
  let underRepair = 0;
  let ready = 0;
  let delivered = 0;
  let returned = 0;
  let rejected = 0;
  let todayReceipts = 0;
  let oldReceipts = 0;
  let urgentReceipts = 0;

  for (const r of receipts) {
    const rDateStr = String(r.receivedDate || r.createdAt || '').split('T')[0];
    if (rDateStr === todayStr) {
      todayReceipts++;
    }

    const daysDiff = calculateCalendarDays(r.receivedDate || r.createdAt);
    let receiptHasNonDelivered = false;

    const tvList = Array.isArray(r.tvs) && r.tvs.length > 0 ? r.tvs : [r as any];

    for (const tv of tvList) {
      totalTVs++;
      const st = String(tv.status || (r as any).status || 'Pending')
        .trim()
        .toLowerCase();
      const pr = String(tv.priority || (r as any).priority || 'Normal')
        .trim()
        .toLowerCase();

      if (st === 'pending') {
        pending++;
      } else if (st === 'under repair' || st === 'underrepair' || st === 'under_repair') {
        underRepair++;
      } else if (st === 'ready' || st === 'completed') {
        ready++;
      } else if (st === 'delivered') {
        delivered++;
      } else if (st === 'return' || st === 'returned' || st === 'total loss') {
        returned++;
      } else if (st === 'reject' || st === 'rejected' || st === 'cancel') {
        rejected++;
      } else {
        pending++;
      }

      const isClosed =
        st === 'delivered' ||
        st === 'return' ||
        st === 'returned' ||
        st === 'reject' ||
        st === 'rejected' ||
        st === 'cancel' ||
        st === 'total loss';

      if (!isClosed) {
        receiptHasNonDelivered = true;
      }

      if (pr === 'urgent' && !isClosed) {
        urgentReceipts++;
      }
    }

    if (daysDiff >= 4 && receiptHasNonDelivered) {
      oldReceipts++;
    }
  }

  return {
    totalReceipts,
    totalTVs,
    pending,
    underRepair,
    ready,
    completed: ready,
    delivered,
    cancel: rejected,
    totalLoss: returned,
    returned,
    rejected,
    todayReceipts,
    oldReceipts,
    overdueCount: oldReceipts,
    urgentReceipts,
    totalCost: 0,
    totalPaid: 0,
    totalPendingDue: 0,
  };
}

export const DashboardCards: React.FC<DashboardCardsProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('kruti_auth_token') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // 1. Try dedicated dashboard endpoint first
      const res = await fetch('/api/dashboard', { headers, cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const s = data?.stats;
        if (
          data?.success &&
          s &&
          typeof s.pending === 'number' &&
          typeof s.underRepair === 'number' &&
          typeof s.ready === 'number' &&
          typeof s.delivered === 'number' &&
          typeof s.todayReceipts === 'number' &&
          typeof s.oldReceipts === 'number' &&
          typeof s.urgentReceipts === 'number'
        ) {
          setStats({
            ...s,
            returned: s.returned ?? s.totalLoss ?? 0,
            rejected: s.rejected ?? s.cancel ?? 0,
          });
          return;
        }
      }

      // 2. Fallback: fetch receipts directly from API & calculate all counts accurately
      const receiptsRes = await fetch('/api/receipts?page=1&limit=2000', { headers, cache: 'no-store' });
      if (receiptsRes.ok) {
        const receiptsData = await receiptsRes.json();
        if (receiptsData?.success && Array.isArray(receiptsData.receipts)) {
          setStats(computeStatsFromReceipts(receiptsData.receipts));
          return;
        }
      }

      throw new Error('API unavailable');
    } catch {
      // 3. Final local metrics calculation fallback
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
            onClick={() => setIsScannerOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition cursor-pointer"
            title="Scan TV sticker barcode to update status directly from phone"
          >
            <Scan className="w-4 h-4 animate-pulse" /> Scan Barcode to Update Status
          </button>

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
            <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono block">
              {stats ? Number(stats.todayReceipts ?? 0) : '...'}
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
            <span className="text-3xl sm:text-4xl font-black text-amber-950 font-mono block">
              {stats ? Number(stats.oldReceipts ?? stats.overdueCount ?? 0) : '...'}
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
            <span className="text-3xl sm:text-4xl font-black text-red-900 font-mono block">
              {stats ? Number(stats.urgentReceipts ?? 0) : '...'}
            </span>
            <p className="text-xs text-red-700 font-medium mt-1">High customer expectation</p>
          </div>
        </div>
      </div>

      {/* Main Breakdown Grid */}
      <div>
        <h2 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
          Workshop Volume & Stage Breakdown
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Total Receipts */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase">Total Receipts</span>
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-xl font-black text-slate-900 mt-1.5 font-mono">
              {stats ? Number(stats.totalReceipts ?? 0) : '-'}
            </p>
          </div>

          {/* Total TVs */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase">Total TVs</span>
              <Tv className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-xl font-black text-slate-900 mt-1.5 font-mono">
              {stats ? Number(stats.totalTVs ?? 0) : '-'}
            </p>
          </div>

          {/* Pending */}
          <div className="bg-amber-50/60 rounded-2xl p-3.5 border border-amber-200/90 shadow-xs">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-[10px] font-bold uppercase">Pending</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <p className="text-xl font-black text-amber-950 mt-1.5 font-mono">
              {stats ? Number(stats.pending ?? 0) : '-'}
            </p>
          </div>

          {/* Under Repair */}
          <div className="bg-blue-50/60 rounded-2xl p-3.5 border border-blue-200/90 shadow-xs">
            <div className="flex items-center justify-between text-blue-800">
              <span className="text-[10px] font-bold uppercase">Under Repair</span>
              <Wrench className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <p className="text-xl font-black text-blue-950 mt-1.5 font-mono">
              {stats ? Number(stats.underRepair ?? 0) : '-'}
            </p>
          </div>

          {/* Ready */}
          <div className="bg-emerald-50/60 rounded-2xl p-3.5 border border-emerald-200/90 shadow-xs">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-[10px] font-bold uppercase">Ready</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-xl font-black text-emerald-950 mt-1.5 font-mono">
              {stats ? Number(stats.ready ?? stats.completed ?? 0) : '-'}
            </p>
          </div>

          {/* Delivered */}
          <div className="bg-slate-100 rounded-2xl p-3.5 border border-slate-300 shadow-xs">
            <div className="flex items-center justify-between text-slate-700">
              <span className="text-[10px] font-bold uppercase">Delivered</span>
              <PackageCheck className="w-3.5 h-3.5 text-slate-600" />
            </div>
            <p className="text-xl font-black text-slate-900 mt-1.5 font-mono">
              {stats ? Number(stats.delivered ?? 0) : '-'}
            </p>
          </div>

          {/* Return */}
          <div className="bg-purple-50/70 rounded-2xl p-3.5 border border-purple-200 shadow-xs">
            <div className="flex items-center justify-between text-purple-800">
              <span className="text-[10px] font-bold uppercase">Return</span>
              <span className="w-2 h-2 rounded-full bg-purple-600" />
            </div>
            <p className="text-xl font-black text-purple-950 mt-1.5 font-mono">
              {stats ? Number(stats.returned ?? stats.totalLoss ?? 0) : '-'}
            </p>
          </div>

          {/* Reject */}
          <div className="bg-rose-50/70 rounded-2xl p-3.5 border border-rose-200 shadow-xs">
            <div className="flex items-center justify-between text-rose-800">
              <span className="text-[10px] font-bold uppercase">Reject</span>
              <span className="w-2 h-2 rounded-full bg-rose-600" />
            </div>
            <p className="text-xl font-black text-rose-950 mt-1.5 font-mono">
              {stats ? Number(stats.rejected ?? stats.cancel ?? 0) : '-'}
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
                Generate job card for 1 or more TVs, assign technician, and create thermal sticker.
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
                Search by Receipt No or Mobile, download Excel export, print A4 PDF receipts.
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-1 transition" />
        </div>
      </div>

      {/* Barcode Scanner Modal for Dashboard / Technicians */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(scannedCode) => {
          setIsScannerOpen(false);
          onNavigate(`/update-receipt/${encodeURIComponent(scannedCode)}`);
        }}
      />
    </div>
  );
};
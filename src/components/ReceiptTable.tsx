import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  FileText,
  MessageCircle,
  Tag,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  X,
} from 'lucide-react';
import { IReceipt, TVStatus, TVPriority } from '../types/receipt';
import { generateHalfDetailWhatsAppLink, generateFullDetailWhatsAppLink, sanitizeMobileNumber } from '../lib/whatsapp';
import { printStickerDirect } from './StickerPrint';
import { ConfirmDialog } from './ConfirmDialog';
import { getClientReceipts, deleteClientReceipt } from '../lib/client-storage';

interface ReceiptTableProps {
  onUpdate: (receipt: IReceipt) => void;
  onPrintA4: (receipt: IReceipt) => void;
  onPrintSticker: (receipt: IReceipt) => void;
  onAddNew: () => void;
}

function calculateDays(receivedDate: string): number {
  if (!receivedDate) return 0;
  const dateOnly = receivedDate.split('T')[0];
  const parts = dateOnly.split('-');
  if (parts.length !== 3) return 0;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const receivedMidnight = new Date(year, month, day).getTime();
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const diffMs = todayMidnight - receivedMidnight;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export const ReceiptTable: React.FC<ReceiptTableProps> = ({
  onUpdate,
  onPrintA4,
  onPrintSticker,
  onAddNew,
}) => {
  const [receipts, setReceipts] = useState<IReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [daysFilter, setDaysFilter] = useState<string>('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Delete confirmation
  const [receiptToDelete, setReceiptToDelete] = useState<IReceipt | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // WhatsApp Share Dialog
  const [whatsAppReceipt, setWhatsAppReceipt] = useState<IReceipt | null>(null);
  const [whatsAppMode, setWhatsAppMode] = useState<'half' | 'full'>('half');

  const fetchReceipts = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('kruti_auth_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
      });
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'All') params.append('status', statusFilter);
      if (priorityFilter !== 'All') params.append('priority', priorityFilter);
      if (daysFilter !== 'All') params.append('days', daysFilter);

      const res = await fetch(`/api/receipts?${params.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.receipts)) {
          setReceipts(data.receipts);
          setTotalPages(data.totalPages || 1);
          setTotalCount(data.total || data.receipts.length);
          return;
        }
      }
      throw new Error('API unavailable, using local store');
    } catch {
      // Seamless local fallback
      let list = getClientReceipts();
      if (searchTerm) {
        const q = searchTerm.toLowerCase().trim();
        const cleanDigits = q.replace(/\D/g, '');
        // STRICT: Only search by serialNumber or mobileNumber
        list = list.filter((r) => {
          const matchSerial =
            r.serialNumber.toLowerCase().includes(q) ||
            (cleanDigits.length >= 3 && r.serialNumber.replace(/\D/g, '').includes(cleanDigits));
          const matchMobile =
            r.mobileNumber.includes(q) ||
            (cleanDigits.length >= 3 && r.mobileNumber.replace(/\D/g, '').includes(cleanDigits));
          return matchSerial || matchMobile;
        });
      }
      if (statusFilter !== 'All') {
        list = list.filter((r) => r.tvs.some((t) => t.status === statusFilter));
      }
      if (priorityFilter !== 'All') {
        list = list.filter((r) => r.tvs.some((t) => t.priority === priorityFilter));
      }
      if (daysFilter !== 'All') {
        list = list.filter((r) => {
          const diffDays = calculateDays(r.receivedDate);
          if (daysFilter === '4+') return diffDays >= 4;
          if (daysFilter === '0-3') return diffDays < 4;
          return true;
        });
      }
      const total = list.length;
      setTotalCount(total);
      setTotalPages(Math.ceil(total / 25) || 1);
      setReceipts(list.slice((page - 1) * 25, page * 25));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [page, statusFilter, priorityFilter, daysFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReceipts();
  };

  // WhatsApp click handler
  const handleWhatsApp = (receipt: IReceipt) => {
    setWhatsAppReceipt(receipt);
    setWhatsAppMode('half');
  };

  const handleSendWhatsApp = (receipt: IReceipt, mode: 'half' | 'full') => {
    const url =
      mode === 'half'
        ? generateHalfDetailWhatsAppLink(receipt)
        : generateFullDetailWhatsAppLink(receipt);

    if (!url) {
      alert('Invalid customer mobile number. Cannot open WhatsApp.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Delete Receipt handler
  const handleConfirmDelete = async () => {
    if (!receiptToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/receipts/${encodeURIComponent(receiptToDelete.serialNumber)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          deleteClientReceipt(receiptToDelete.serialNumber);
          setReceiptToDelete(null);
          await fetchReceipts();
          return;
        }
      }
      throw new Error('API delete failed');
    } catch {
      // Local delete fallback
      deleteClientReceipt(receiptToDelete.serialNumber);
      setReceiptToDelete(null);
      await fetchReceipts();
    } finally {
      setIsDeleting(false);
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    if (receipts.length === 0) {
      alert('No receipts available to export.');
      return;
    }

    const rows: any[] = [];
    receipts.forEach((r) => {
      r.tvs.forEach((tv, idx) => {
        rows.push({
          'Receipt No': r.serialNumber,
          Customer: r.customerName,
          Mobile: r.mobileNumber,
          'TV Unit': `#${idx + 1}`,
          Brand: tv.brand,
          Model: tv.modelNumber || 'N/A',
          Size: tv.size || 'N/A',
          Complaint: tv.complaint,
          'Repair By': r.repairBy || 'N/A',
          Priority: tv.priority,
          'Rack No': tv.rackNo || 'N/A',
          Payment: tv.paymentMethod,
          'Estimated Cost': tv.estimatedCost,
          'Actual Cost': tv.cost,
          Status: tv.status,
          'Received Date': r.receivedDate,
          Remarks: r.remarks || '',
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Receipts');

    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Receipts_${todayStr}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header & Export */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-red-50 text-red-600">
              <FileSpreadsheet className="w-6 h-6" />
            </span>
            All Repair Receipts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse, search, edit, print thermal labels, or trigger WhatsApp receipts ({totalCount} total records).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onAddNew}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/25 flex items-center gap-2 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> Add Receipt
          </button>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Excel
          </button>

          <button
            onClick={fetchReceipts}
            className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition cursor-pointer shadow-xs"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Receipt No (e.g. 611-0008) or Mobile Number (e.g. 8320831115)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-red-600 rounded-xl text-sm focus:outline-none transition font-medium"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <Search className="w-4 h-4" /> Search
          </button>
        </form>
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 -mt-1">
          <span className="font-semibold text-slate-600">Note:</span> Search is strictly restricted to <span className="font-bold text-red-600">Receipt No</span> or <span className="font-bold text-red-600">Mobile Number</span> only (Customer Name or TV brand searches are disabled).
        </div>

        {/* Filters Grid */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-slate-500 mr-2">
            <Filter className="w-3.5 h-3.5 text-red-600" /> Filters:
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Under Repair">Under Repair</option>
              <option value="Ready">Ready</option>
              <option value="Delivered">Delivered</option>
              <option value="Return">Return</option>
              <option value="Reject">Reject</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold focus:outline-none"
            >
              <option value="All">All Priorities</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          {/* Days Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Age / Days:</span>
            <select
              value={daysFilter}
              onChange={(e) => {
                setDaysFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold focus:outline-none"
            >
              <option value="All">All Days</option>
              <option value="0-3">0 – 3 Days (Fresh)</option>
              <option value="4+">4+ Days (Old Receipt)</option>
            </select>
          </div>

          {(searchTerm || statusFilter !== 'All' || priorityFilter !== 'All' || daysFilter !== 'All') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('All');
                setPriorityFilter('All');
                setDaysFilter('All');
                setPage(1);
              }}
              className="text-red-600 hover:text-red-700 font-bold underline ml-auto cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-900 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={fetchReceipts}
            className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs whitespace-nowrap border-collapse min-w-[960px]">
            <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3">Receipt No</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">TV Unit / Model</th>
                <th className="py-3 px-3">Problem / Fault</th>
                <th className="py-3 px-3">Technician</th>
                <th className="py-3 px-3 text-center">Priority</th>
                <th className="py-3 px-3 text-center">Rack</th>
                <th className="py-3 px-3 text-center">Payment</th>
                <th className="py-3 px-3 text-right">Est. Cost</th>
                <th className="py-3 px-3 text-right">Actual Cost</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Aging</th>
                <th className="py-3 px-3 text-center sticky right-0 bg-slate-900 z-10 shadow-l">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                    Loading receipts from database...
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-500">
                    <p className="text-base font-bold text-slate-700">No receipts found.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting your search criteria or add a new receipt.
                    </p>
                  </td>
                </tr>
              ) : (
                receipts.map((receipt) => {
                  const daysSinceReceived = calculateDays(receipt.receivedDate || receipt.createdAt);

                  const hasNonDeliveredTV = receipt.tvs.some((tv) => {
                    const st = String(tv.status || '').toLowerCase();
                    return st !== 'delivered' && st !== 'return' && st !== 'reject';
                  });
                  const isOldReceipt = daysSinceReceived >= 4 && hasNonDeliveredTV;

                  const totalEst = receipt.tvs.reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
                  const totalAct = receipt.tvs.reduce((sum, t) => sum + (t.cost || 0), 0);

                  const primaryStatus = receipt.tvs[0]?.status || (receipt as any).status || 'Pending';
                  const primaryPriority = receipt.tvs[0]?.priority || (receipt as any).priority || 'Normal';
                  const primaryRack = receipt.tvs.map((t) => t.rackNo).filter(Boolean).join(', ') || '-';
                  const paymentMethod = receipt.tvs[0]?.paymentMethod || 'Pending';
                  const primaryFault = receipt.tvs.map((t) => t.complaint).filter(Boolean).join(', ') || '-';

                  return (
                    <tr
                      key={receipt._id}
                      className={`hover:bg-slate-50/80 transition ${
                        isOldReceipt ? 'bg-amber-50/50 font-medium' : ''
                      }`}
                    >
                      {/* Receipt No + Date */}
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-extrabold text-slate-900 text-xs">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {receipt.serialNumber}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans mt-0.5">{receipt.receivedDate}</div>
                      </td>

                      {/* Customer: Name + Mobile stacked */}
                      <td className="py-2.5 px-3">
                        <div className="font-black text-slate-900 text-xs tracking-tight">{receipt.customerName}</div>
                        <div className="font-mono text-[11px] text-slate-500 font-semibold">{receipt.mobileNumber}</div>
                      </td>

                      {/* TV Brand & Model */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 text-xs">
                          {receipt.tvs.map((t) => `${t.brand} (${t.size || 'TV'})`).join(', ')}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                          {receipt.tvs.map((t) => t.modelNumber || 'Std').join(', ')}
                        </div>
                      </td>

                      {/* Problem / Fault */}
                      <td className="py-2.5 px-3 max-w-[160px] truncate text-slate-700 text-xs font-medium" title={primaryFault}>
                        {primaryFault}
                      </td>

                      {/* Technician */}
                      <td className="py-2.5 px-3 text-slate-700 font-medium">{receipt.repairBy || '-'}</td>

                      {/* Priority */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            primaryPriority === 'Urgent'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : primaryPriority === 'High'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {primaryPriority}
                        </span>
                      </td>

                      {/* Rack */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">{primaryRack}</td>

                      {/* Payment */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {paymentMethod}
                        </span>
                      </td>

                      {/* Estimated Cost */}
                      <td className="py-2.5 px-3 text-right font-medium text-slate-600">₹{totalEst}</td>

                      {/* Actual Cost */}
                      <td className="py-2.5 px-3 text-right font-extrabold text-red-600">
                        {totalAct > 0 ? `₹${totalAct}` : '-'}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border inline-flex items-center gap-1 ${
                            primaryStatus === 'Pending'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : primaryStatus === 'Under Repair'
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : primaryStatus === 'Ready'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : primaryStatus === 'Return'
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : primaryStatus === 'Reject'
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : 'bg-slate-800 text-slate-100 border-slate-700'
                          }`}
                        >
                          {primaryStatus}
                        </span>
                      </td>

                      {/* Days Elapsed & Old Receipt Highlight */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <span className="font-extrabold text-slate-800 text-xs">{daysSinceReceived}d</span>
                          {isOldReceipt && (
                            <span className="px-1 py-0.2 bg-red-600 text-white rounded text-[8px] font-black uppercase shadow-xs">
                              Old
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center sticky right-0 bg-white shadow-l z-10">
                        <div className="flex items-center justify-center gap-1">
                          {/* Update */}
                          <button
                            onClick={() => onUpdate(receipt)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Update Receipt"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Print Normal Receipt */}
                          <button
                            onClick={() => onPrintA4(receipt)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Print A4 Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* PDF */}
                          <button
                            onClick={() => onPrintA4(receipt)}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Download PDF"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {/* WhatsApp */}
                          <button
                            onClick={() => handleWhatsApp(receipt)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Send WhatsApp Message"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>

                          {/* Rugtek RP-326 Thermal Sticker Print (80x30mm) */}
                          <button
                            onClick={() => onPrintSticker(receipt)}
                            className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            title="Rugtek RP-326 Thermal Sticker Print (80×30 mm)"
                          >
                            <Tag className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setReceiptToDelete(receipt)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Delete Receipt"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer: Exactly 25 Receipts Per Page with Next/Prev Controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div>
            Showing <strong>{totalCount > 0 ? (page - 1) * 25 + 1 : 0}</strong> to{' '}
            <strong>{Math.min(page * 25, totalCount)}</strong> of <strong>{totalCount}</strong> receipts (25 per page)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg font-extrabold text-xs transition cursor-pointer ${
                  page === p
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!receiptToDelete}
        title="Delete Repair Receipt"
        message={`Are you sure you want to delete receipt ${receiptToDelete?.serialNumber} for customer "${receiptToDelete?.customerName}"? This record and all associated TV data will be permanently removed.`}
        confirmLabel="Delete Receipt"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setReceiptToDelete(null)}
      />

      {/* WhatsApp Share Options Modal (Half Detail vs Full Detail) */}
      {whatsAppReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MessageCircle className="w-5 h-5 text-white" />
                <div>
                  <h3 className="text-base font-extrabold">WhatsApp Share Receipt</h3>
                  <p className="text-xs text-emerald-100">
                    {whatsAppReceipt.customerName} ({whatsAppReceipt.mobileNumber})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWhatsAppReceipt(null)}
                className="text-emerald-100 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 font-medium">
                Customer ko kis tarah ka WhatsApp message bhejna chahte hain? Neeche option select karein:
              </p>

              {/* Option Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Half Detail */}
                <button
                  type="button"
                  onClick={() => setWhatsAppMode('half')}
                  className={`p-4 rounded-2xl border-2 text-left transition cursor-pointer ${
                    whatsAppMode === 'half'
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-sm text-slate-900">1. Half Detail</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      संक्षिप्त
                    </span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1">
                    <li>✓ Receipt No & Customer Name</li>
                    <li>✓ Mobile Number</li>
                    <li>✓ Material Detail (TV Model)</li>
                    <li>✓ Shop Notice & Live Link</li>
                  </ul>
                </button>

                {/* 2. Full Detail */}
                <button
                  type="button"
                  onClick={() => setWhatsAppMode('full')}
                  className={`p-4 rounded-2xl border-2 text-left transition cursor-pointer ${
                    whatsAppMode === 'full'
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-sm text-slate-900">2. Full Detail</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      सम्पूर्ण
                    </span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1">
                    <li>✓ All TV Units & Fault Details</li>
                    <li>✓ Repair Status & Technician</li>
                    <li>✓ Estimated & Final Cost</li>
                    <li>✓ Received / Revise / Out Dates</li>
                    <li>✓ Shop Notice & Live Link</li>
                  </ul>
                </button>
              </div>

              {/* Message Summary Preview */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                  Message Format ({whatsAppMode === 'half' ? 'Half Detail' : 'Full Detail'}):
                </span>
                <p className="font-mono text-[11px] text-slate-700 whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto p-2 bg-white rounded border border-slate-100">
                  {whatsAppMode === 'half'
                    ? `📺 KRUTI ELECTRONICS\nReceipt No : ${whatsAppReceipt.serialNumber}\nCustomer : ${whatsAppReceipt.customerName}\nPhone : ${whatsAppReceipt.mobileNumber}\nMaterial : ${whatsAppReceipt.tvs.map((t) => `${t.brand} ${t.size}`).join(', ')}\n🔍 Live Link: Check Status Online\n📢 Notice: Collect within 20 days`
                    : `📺 KRUTI ELECTRONICS\nReceipt No : ${whatsAppReceipt.serialNumber}\nCustomer : ${whatsAppReceipt.customerName}\nPhone : ${whatsAppReceipt.mobileNumber}\nDate : ${whatsAppReceipt.receivedDate}${whatsAppReceipt.revisedDate ? ` | Revise: ${whatsAppReceipt.revisedDate}` : ''}${whatsAppReceipt.outDate ? ` | Out: ${whatsAppReceipt.outDate}` : ''}\nTVs : ${whatsAppReceipt.tvs.map((t) => `${t.brand} ${t.size} - ${t.complaint} (${t.status})`).join('; ')}\nEst. Cost : ₹${whatsAppReceipt.tvs.reduce((acc, t) => acc + (t.estimatedCost || 0), 0)}\n🔍 Live Link: Check Status Online\n📢 Notice: Collect within 20 days`}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setWhatsAppReceipt(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleSendWhatsApp(whatsAppReceipt, whatsAppMode)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition"
              >
                <MessageCircle className="w-4 h-4" /> Send {whatsAppMode === 'half' ? 'Half Detail' : 'Full Detail'} on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
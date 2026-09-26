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
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'All') params.append('status', statusFilter);
      if (priorityFilter !== 'All') params.append('priority', priorityFilter);
      if (daysFilter !== 'All') params.append('days', daysFilter);

      const res = await fetch(`/api/receipts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.receipts)) {
          setReceipts(data.receipts);
          setTotalPages(data.totalPages || 1);
          setTotalCount(data.total || data.receipts.length);
          return;
        }
      }
      throw new Error('API fetch error');
    } catch {
      // Local fallback
      const local = getClientReceipts();
      let filtered = [...local];

      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            r.serialNumber.toLowerCase().includes(lower) ||
            r.customerName.toLowerCase().includes(lower) ||
            r.mobileNumber.includes(lower) ||
            r.tvs.some((tv) => tv.brand.toLowerCase().includes(lower))
        );
      }

      if (statusFilter !== 'All') {
        filtered = filtered.filter((r) => r.tvs.some((tv) => tv.status === statusFilter));
      }

      if (priorityFilter !== 'All') {
        filtered = filtered.filter((r) => r.tvs.some((tv) => tv.priority === priorityFilter));
      }

      if (daysFilter === '4+') {
        const now = Date.now();
        filtered = filtered.filter((r) => {
          const recDate = new Date(r.receivedDate).getTime();
          const diffDays = Math.floor((now - recDate) / (1000 * 60 * 60 * 24));
          const hasNotDelivered = r.tvs.some((tv) => tv.status !== 'Delivered' && tv.status !== 'Return' && tv.status !== 'Reject');
          return hasNotDelivered && diffDays >= 4;
        });
      }

      setTotalCount(filtered.length);
      setTotalPages(Math.ceil(filtered.length / 20) || 1);
      const start = (page - 1) * 20;
      setReceipts(filtered.slice(start, start + 20));
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
          Status: tv.status,
          'Estimated Cost': tv.estimatedCost,
          'Actual Cost': tv.cost,
          'Payment Method': tv.paymentMethod,
          'Received Date': r.receivedDate,
          'Revise Date': r.revisedDate || 'N/A',
          'Out Date': r.outDate || 'N/A',
          Remarks: r.remarks || '',
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Repair Receipts');
    XLSX.writeFile(workbook, `Kruti_Electronics_Receipts_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            TV Repair Job Cards
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Search, filter by status, update details, print 50x25mm labels, and dispatch WhatsApp alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onAddNew}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-2 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> Add New Receipt
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
              placeholder="Search by Receipt No, Customer Name, Mobile, or TV Brand..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-red-600 rounded-xl text-sm focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Search className="w-4 h-4" /> Search
          </button>
        </form>

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

          {/* Aging Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Aging:</span>
            <select
              value={daysFilter}
              onChange={(e) => {
                setDaysFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold focus:outline-none"
            >
              <option value="All">All Days</option>
              <option value="4+">Over 4 Days Pending (Old)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Receipts Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-900 text-white font-extrabold tracking-wider uppercase text-[11px]">
              <tr>
                <th className="py-4 px-4">Receipt No</th>
                <th className="py-4 px-4">Customer</th>
                <th className="py-4 px-4">TV Unit / Model</th>
                <th className="py-4 px-4">Problem / Fault</th>
                <th className="py-4 px-4">Technician</th>
                <th className="py-4 px-4">Priority</th>
                <th className="py-4 px-4">Rack</th>
                <th className="py-4 px-4">Payment</th>
                <th className="py-4 px-4 text-right">Est. Cost</th>
                <th className="py-4 px-4 text-right">Actual Cost</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4">Age</th>
                <th className="py-4 px-4">Remarks</th>
                <th className="py-4 px-4 text-center sticky right-0 bg-slate-900 z-10 shadow-l">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      <span className="font-semibold text-xs">Loading repair job cards...</span>
                    </div>
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-500">
                    <p className="font-bold text-sm text-slate-700">No repair receipts found.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try resetting your filters or click "Add New Receipt" above.
                    </p>
                  </td>
                </tr>
              ) : (
                receipts.map((receipt) => {
                  const now = Date.now();
                  const recDate = new Date(receipt.receivedDate).getTime();
                  const daysSinceReceived = Math.floor((now - recDate) / (1000 * 60 * 60 * 24));
                  const isOldReceipt =
                    receipt.tvs.some((tv) => tv.status !== 'Delivered' && tv.status !== 'Return' && tv.status !== 'Reject') &&
                    daysSinceReceived >= 4;

                  const totalEst = receipt.tvs.reduce((acc, tv) => acc + (tv.estimatedCost || 0), 0);
                  const totalAct = receipt.tvs.reduce((acc, tv) => acc + (tv.cost || 0), 0);
                  const primaryStatus = receipt.tvs[0]?.status || 'Pending';
                  const primaryPriority = receipt.tvs[0]?.priority || 'Normal';
                  const primaryRack = receipt.tvs[0]?.rackNo || '-';
                  const paymentMethod = receipt.tvs[0]?.paymentMethod || 'Pending';

                  return (
                    <tr
                      key={receipt._id || receipt.serialNumber}
                      className={`hover:bg-slate-50/80 transition ${
                        isOldReceipt ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Serial */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {receipt.serialNumber}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{receipt.customerName}</div>
                        <div className="text-[11px] font-mono text-slate-500">{receipt.mobileNumber}</div>
                      </td>

                      {/* TV details */}
                      <td className="py-3 px-4">
                        {receipt.tvs.map((tv, idx) => (
                          <div key={idx} className="leading-tight mb-1 last:mb-0">
                            <span className="font-extrabold text-slate-900">{tv.brand}</span>
                            {tv.size && <span className="text-slate-500 text-[11px]"> ({tv.size})</span>}
                            {tv.modelNumber && (
                              <div className="text-[10px] text-slate-400 font-mono">{tv.modelNumber}</div>
                            )}
                          </div>
                        ))}
                      </td>

                      {/* Complaint */}
                      <td className="py-3 px-4 truncate max-w-[150px]" title={receipt.tvs.map((t) => t.complaint).join(', ')}>
                        {receipt.tvs.map((t) => t.complaint).join(', ')}
                      </td>

                      {/* Technician */}
                      <td className="py-3 px-4 text-slate-700 font-semibold">{receipt.repairBy || '-'}</td>

                      {/* Priority */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            primaryPriority === 'Urgent'
                              ? 'bg-red-100 text-red-900 border border-red-300'
                              : primaryPriority === 'High'
                              ? 'bg-orange-100 text-orange-900 border border-orange-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {primaryPriority}
                        </span>
                      </td>

                      {/* Rack */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{primaryRack}</td>

                      {/* Payment */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {paymentMethod}
                        </span>
                      </td>

                      {/* Estimated Cost */}
                      <td className="py-3 px-4 text-right font-medium text-slate-600">₹{totalEst}</td>

                      {/* Actual Cost */}
                      <td className="py-3 px-4 text-right font-extrabold text-red-600">
                        {totalAct > 0 ? `₹${totalAct}` : '-'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
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

                      {/* Days Elapsed */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-700">{daysSinceReceived}d</span>
                          {isOldReceipt && (
                            <span className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[9px] font-extrabold tracking-wide uppercase shadow-xs">
                              Old Receipt
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Remarks */}
                      <td className="py-3 px-4 truncate max-w-[140px] text-slate-500" title={receipt.remarks}>
                        {receipt.remarks || '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center sticky right-0 bg-white shadow-l z-10">
                        <div className="flex items-center justify-center gap-1">
                          {/* Edit */}
                          <button
                            onClick={() => onUpdate(receipt)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Edit / Update Receipt"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Print A4 */}
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
                            title="Send WhatsApp Message (Half / Full Detail)"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>

                          {/* Sticker Print */}
                          <button
                            onClick={() => onPrintSticker(receipt)}
                            className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            title="50x25mm Sticker Print"
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

        {/* Pagination Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div>
            Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total receipts)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="font-bold px-2">{page}</span>
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
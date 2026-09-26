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
} from 'lucide-react';
import { IReceipt, TVStatus, TVPriority } from '../types/receipt';
import { generateWhatsAppLink, sanitizeMobileNumber } from '../lib/whatsapp';
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
      throw new Error('API unavailable, using local store');
    } catch {
      // Seamless local fallback
      let list = getClientReceipts();
      if (searchTerm) {
        const q = searchTerm.toLowerCase().trim();
        list = list.filter(
          (r) =>
            r.serialNumber.toLowerCase().includes(q) ||
            r.customerName.toLowerCase().includes(q) ||
            r.mobileNumber.includes(q)
        );
      }
      if (statusFilter !== 'All') {
        list = list.filter((r) => r.tvs.some((t) => t.status === statusFilter));
      }
      if (priorityFilter !== 'All') {
        list = list.filter((r) => r.tvs.some((t) => t.priority === priorityFilter));
      }
      setReceipts(list);
      setTotalPages(1);
      setTotalCount(list.length);
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

  // WhatsApp click handler (Section 17)
  const handleWhatsApp = (receipt: IReceipt) => {
    const url = generateWhatsAppLink(receipt);
    if (!url) {
      alert('Invalid customer mobile number. Cannot open WhatsApp.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Delete Receipt handler (Section 14)
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

  // Excel Export (Section 37)
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

      {/* Main Table Container (Responsive Horizontal Scroll) */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs whitespace-nowrap border-collapse min-w-[1250px]">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Receipt No</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Mobile</th>
                <th className="py-3.5 px-4">Received Date</th>
                <th className="py-3.5 px-4">TV Brand & Model</th>
                <th className="py-3.5 px-4">Repair By</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Rack</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4 text-right">Est. Cost</th>
                <th className="py-3.5 px-4 text-right">Actual Cost</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Days</th>
                <th className="py-3.5 px-4 max-w-[150px]">Remarks</th>
                <th className="py-3.5 px-4 text-center sticky right-0 bg-slate-100 z-10 shadow-l">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                    Loading receipts from database...
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-500">
                    <p className="text-base font-bold text-slate-700">No receipts found.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting your search criteria or add a new receipt.
                    </p>
                  </td>
                </tr>
              ) : (
                receipts.map((receipt) => {
                  const daysSinceReceived = Math.floor(
                    (Date.now() - new Date(receipt.receivedDate).getTime()) / (1000 * 60 * 60 * 24)
                  );

                  // Old receipt rule (Section 38): If days >= 4 AND TV is not Delivered -> highlight!
                  const hasNonDeliveredTV = receipt.tvs.some((tv) => tv.status !== 'Delivered');
                  const isOldReceipt = daysSinceReceived >= 4 && hasNonDeliveredTV;

                  const totalEst = receipt.tvs.reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
                  const totalAct = receipt.tvs.reduce((sum, t) => sum + (t.cost || 0), 0);

                  // Status summarization
                  const primaryStatus = receipt.tvs[0]?.status || 'Pending';
                  const primaryPriority = receipt.tvs[0]?.priority || 'Normal';
                  const primaryRack = receipt.tvs.map((t) => t.rackNo).filter(Boolean).join(', ') || '-';
                  const paymentMethod = receipt.tvs[0]?.paymentMethod || 'Pending';

                  return (
                    <tr
                      key={receipt._id}
                      className={`hover:bg-slate-50/80 transition ${
                        isOldReceipt ? 'bg-amber-50/60 font-semibold' : ''
                      }`}
                    >
                      {/* Receipt No */}
                      <td className="py-3 px-4 font-mono font-extrabold text-slate-900">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                          {receipt.serialNumber}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4 font-bold text-slate-900">{receipt.customerName}</td>

                      {/* Mobile */}
                      <td className="py-3 px-4 font-mono text-slate-700">{receipt.mobileNumber}</td>

                      {/* Received Date */}
                      <td className="py-3 px-4 text-slate-600">{receipt.receivedDate}</td>

                      {/* TV Brand & Model */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">
                            {receipt.tvs.map((t) => `${t.brand} (${t.size || 'TV'})`).join(', ')}
                          </span>
                          <span className="text-[10px] text-slate-500 truncate max-w-[180px]">
                            {receipt.tvs.map((t) => t.modelNumber || 'Std').join(', ')}
                          </span>
                        </div>
                      </td>

                      {/* Repair By */}
                      <td className="py-3 px-4 text-slate-700">{receipt.repairBy || 'Workshop'}</td>

                      {/* Priority */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            primaryPriority === 'Urgent'
                              ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse'
                              : primaryPriority === 'High'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
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
                              : 'bg-slate-800 text-slate-100 border-slate-700'
                          }`}
                        >
                          {primaryStatus}
                        </span>
                      </td>

                      {/* Days Elapsed & Old Receipt Highlight */}
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

                      {/* Actions (Section 11) */}
                      <td className="py-3 px-4 text-center sticky right-0 bg-white shadow-l z-10">
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

                          {/* WhatsApp (Section 17) */}
                          <button
                            onClick={() => handleWhatsApp(receipt)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Send WhatsApp Message"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>

                          {/* Sticker Print (Section 18 & 19) */}
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
    </div>
  );
};

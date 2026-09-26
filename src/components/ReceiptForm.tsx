import React, { useState } from 'react';
import { Plus, Trash2, Save, ArrowLeft, Tv, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { IReceipt, TVItem, TVStatus, TVPriority, PaymentMethod } from '../types/receipt';
import { receiptSchema } from '../lib/validation';
import { saveClientReceipt, updateClientReceipt } from '../lib/client-storage';

interface ReceiptFormProps {
  initialData?: IReceipt | null;
  isEditMode?: boolean;
  onSuccess: (receipt: IReceipt) => void;
  onCancel?: () => void;
}

const COMMON_BRANDS = [
  'Sony',
  'Samsung',
  'LG',
  'Mi (Xiaomi)',
  'OnePlus',
  'TCL',
  'Panasonic',
  'Realme',
  'Vu',
  'Videocon',
  'Sansui',
  'Haier',
  'Micromax',
  'Philips',
  'Thomson',
  'Kodak',
  'Intex',
  'BPL',
  'Other',
];

const COMMON_COMPLAINTS = [
  'No Display / Black Screen',
  'Sound Problem / No Audio',
  'Dead / No Power (No Standby LED)',
  'Panel Vertical / Horizontal Lines',
  'Backlight Defect / Dim Screen',
  'Motherboard Reboot Loop / Logo Hang',
  'HDMI Ports / AV Not Working',
  'Double Image / Ghosting',
  'Power Supply Blown / Smoke',
  'Display Broken (Panel Replacement)',
  'Wi-Fi / Smart Apps Crashing',
];

const TV_SIZES = ['24 inch', '32 inch', '40 inch', '43 inch', '50 inch', '55 inch', '65 inch', '75 inch', 'Other'];

export const ReceiptForm: React.FC<ReceiptFormProps> = ({
  initialData,
  isEditMode = false,
  onSuccess,
  onCancel,
}) => {
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const createBlankTV = (): TVItem => ({
    brand: 'Sony',
    modelNumber: '',
    size: '43 inch',
    complaint: 'No Display / Black Screen',
    estimatedCost: 1500,
    cost: 0,
    status: 'Pending',
    priority: 'Normal',
    rackNo: '',
    paymentMethod: 'Pending',
  });

  const [serialNumber, setSerialNumber] = useState(
    initialData?.serialNumber || 'KR' + Math.floor(10000 + Math.random() * 90000)
  );
  const [customerName, setCustomerName] = useState(initialData?.customerName || '');
  const [mobileNumber, setMobileNumber] = useState(initialData?.mobileNumber || '');
  const [receivedDate, setReceivedDate] = useState(initialData?.receivedDate || getTodayDate());
  const [repairBy, setRepairBy] = useState(initialData?.repairBy || '');
  const [remarks, setRemarks] = useState(initialData?.remarks || '');
  const [tvs, setTvs] = useState<TVItem[]>(
    initialData?.tvs && initialData.tvs.length > 0 ? initialData.tvs : [createBlankTV()]
  );

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // TV management
  const handleAddTV = () => {
    setTvs([...tvs, createBlankTV()]);
  };

  const handleRemoveTV = (index: number) => {
    if (tvs.length <= 1) return;
    setTvs(tvs.filter((_, i) => i !== index));
  };

  const handleTVChange = (index: number, field: keyof TVItem, value: any) => {
    const updated = [...tvs];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setTvs(updated);
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 10 digits
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobileNumber(cleaned);
  };

  const resetForm = () => {
    setSerialNumber('KR' + Math.floor(10000 + Math.random() * 90000));
    setCustomerName('');
    setMobileNumber('');
    setReceivedDate(getTodayDate());
    setRepairBy('');
    setRemarks('');
    setTvs([createBlankTV()]);
    setErrors({});
    setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);
    setSuccessMessage(null);

    const formData = {
      serialNumber: serialNumber.trim().toUpperCase(),
      customerName: customerName.trim(),
      mobileNumber: mobileNumber.trim(),
      receivedDate,
      repairBy: repairBy.trim(),
      remarks: remarks.trim(),
      tvs,
    };

    // Client-side Zod validation
    const parsed = receiptSchema.safeParse(formData);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        fieldErrors[path] = issue.message;
      });
      setErrors(fieldErrors);
      // scroll to top of form
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);

    try {
      const url = isEditMode
        ? `/api/receipts/${encodeURIComponent(initialData!.serialNumber)}`
        : '/api/receipts';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.receipt) {
          setSuccessMessage(isEditMode ? 'Receipt Updated Successfully!' : 'Receipt Saved Successfully');
          if (!isEditMode) {
            resetForm();
          }
          // Also sync to client storage
          if (isEditMode && initialData) {
            try { updateClientReceipt(initialData.serialNumber, data.receipt); } catch {}
          } else {
            try { saveClientReceipt(data.receipt); } catch {}
          }
          onSuccess(data.receipt);
          return;
        }
      }
      throw new Error('API save failed');
    } catch {
      // Local fallback save
      try {
        let savedReceipt: IReceipt;
        if (isEditMode && initialData) {
          savedReceipt = updateClientReceipt(initialData.serialNumber, formData);
        } else {
          savedReceipt = saveClientReceipt(formData);
        }
        setSuccessMessage(
          isEditMode
            ? 'Receipt Updated Successfully (Saved to Local Storage)!'
            : 'Receipt Saved Successfully (Saved to Local Storage)!'
        );
        if (!isEditMode) {
          resetForm();
        }
        onSuccess(savedReceipt);
      } catch (err: any) {
        setServerError(err.message || 'Failed to save receipt.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-2 cursor-pointer transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Receipts
            </button>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-red-50 text-red-600">
              <Tv className="w-7 h-7" />
            </span>
            {isEditMode ? `Update Receipt (${serialNumber})` : 'New Repair Receipt'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isEditMode
              ? 'Modify customer details, technicians, TV units, or payment statuses.'
              : 'Generate an official TV repair job card with multi-TV support and sticker barcode.'}
          </p>
        </div>

        {!isEditMode && (
          <button
            type="button"
            onClick={resetForm}
            className="self-start sm:self-center px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Form
          </button>
        )}
      </div>

      {/* Success banner */}
      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-2xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <p className="font-bold text-sm">{successMessage}</p>
            <p className="text-xs text-emerald-700">
              The receipt has been recorded in the database. You can print stickers or send WhatsApp from the All Receipts table.
            </p>
          </div>
        </div>
      )}

      {/* Server error */}
      {serverError && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 text-red-900 rounded-2xl flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
          <div>
            <p className="font-bold text-sm">Failed to save receipt</p>
            <p className="text-xs text-red-700">{serverError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Customer & General Information */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-6">
            1. Customer & Job Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Serial / Receipt Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Receipt / Serial No. <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                placeholder="e.g. KR00101"
                className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:outline-none transition ${
                  errors.serialNumber ? 'border-red-500' : 'border-slate-200 focus:border-red-600'
                }`}
                disabled={isEditMode}
              />
              {errors.serialNumber && (
                <p className="text-xs text-red-600 mt-1 font-medium">{errors.serialNumber}</p>
              )}
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Customer Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Full Name (e.g. Rahul Patel)"
                className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none transition ${
                  errors.customerName ? 'border-red-500' : 'border-slate-200 focus:border-red-600'
                }`}
              />
              {errors.customerName && (
                <p className="text-xs text-red-600 mt-1 font-medium">{errors.customerName}</p>
              )}
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Mobile Number (10 Digits) <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm pointer-events-none">
                  +91
                </span>
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={handleMobileChange}
                  placeholder="9876543210"
                  maxLength={10}
                  className={`w-full pl-12 pr-4 py-3 bg-slate-50 border-2 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:outline-none transition ${
                    errors.mobileNumber ? 'border-red-500' : 'border-slate-200 focus:border-red-600'
                  }`}
                />
              </div>
              {errors.mobileNumber && (
                <p className="text-xs text-red-600 mt-1 font-medium">{errors.mobileNumber}</p>
              )}
            </div>

            {/* Received Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Received Date <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none transition ${
                  errors.receivedDate ? 'border-red-500' : 'border-slate-200 focus:border-red-600'
                }`}
              />
              {errors.receivedDate && (
                <p className="text-xs text-red-600 mt-1 font-medium">{errors.receivedDate}</p>
              )}
            </div>

            {/* Repair By (Technician) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Repair Handled By
              </label>
              <input
                type="text"
                value={repairBy}
                onChange={(e) => setRepairBy(e.target.value)}
                placeholder="Technician name (e.g. Ramesh Sharma)"
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-red-600 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none transition"
              />
            </div>

            {/* Remarks / Accessories */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Remarks / Accessories Deposited
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Remote, Stand, Power Adapter"
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-red-600 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Section 2: TV List (Multiple TVs Support) */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                2. TV Units for Repair ({tvs.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Add 1, 2, or multiple TVs under this single receipt.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddTV}
              className="px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer border border-red-200 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> + Add Another TV
            </button>
          </div>

          <div className="space-y-6">
            {tvs.map((tv, idx) => (
              <div
                key={tv._id || idx}
                className="p-5 sm:p-6 bg-slate-50/80 rounded-2xl border-2 border-slate-200 relative transition hover:border-slate-300"
              >
                {/* TV Header Badge & Remove Button */}
                <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-red-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      TV Unit {idx + 1}
                    </span>
                  </div>

                  {tvs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTV(idx)}
                      className="px-3 py-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove TV
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Brand */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Brand <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={tv.brand}
                      onChange={(e) => handleTVChange(idx, 'brand', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:border-red-600 focus:outline-none"
                    >
                      {COMMON_BRANDS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Model Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Model Number
                    </label>
                    <input
                      type="text"
                      value={tv.modelNumber}
                      onChange={(e) => handleTVChange(idx, 'modelNumber', e.target.value)}
                      placeholder="e.g. KD-43X75K"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:border-red-600 focus:outline-none"
                    />
                  </div>

                  {/* Size */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      TV Size
                    </label>
                    <select
                      value={tv.size}
                      onChange={(e) => handleTVChange(idx, 'size', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:border-red-600 focus:outline-none"
                    >
                      {TV_SIZES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Priority
                    </label>
                    <select
                      value={tv.priority}
                      onChange={(e) => handleTVChange(idx, 'priority', e.target.value as TVPriority)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:border-red-600 focus:outline-none"
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>

                  {/* Complaint (Full row or 2 cols) */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Complaint / Problem Description <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      list={`complaints-list-${idx}`}
                      value={tv.complaint}
                      onChange={(e) => handleTVChange(idx, 'complaint', e.target.value)}
                      placeholder="e.g. No Display, Sound Problem"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:border-red-600 focus:outline-none"
                    />
                    <datalist id={`complaints-list-${idx}`}>
                      {COMMON_COMPLAINTS.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Repair Status <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={tv.status}
                      onChange={(e) => handleTVChange(idx, 'status', e.target.value as TVStatus)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold border focus:outline-none ${
                        tv.status === 'Pending'
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : tv.status === 'Under Repair'
                          ? 'bg-blue-50 text-blue-900 border-blue-300'
                          : tv.status === 'Ready'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : 'bg-slate-800 text-white border-slate-700'
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Under Repair">Under Repair</option>
                      <option value="Ready">Ready</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </div>

                  {/* Rack Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Rack Number
                    </label>
                    <input
                      type="text"
                      value={tv.rackNo}
                      onChange={(e) => handleTVChange(idx, 'rackNo', e.target.value)}
                      placeholder="e.g. R-03"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:border-red-600 focus:outline-none uppercase"
                    />
                  </div>

                  {/* Estimated Cost */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Estimated Cost (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={tv.estimatedCost}
                      onChange={(e) => handleTVChange(idx, 'estimatedCost', Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:border-red-600 focus:outline-none"
                    />
                  </div>

                  {/* Actual Cost */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Actual Cost (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={tv.cost}
                      onChange={(e) => handleTVChange(idx, 'cost', Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-red-600 focus:border-red-600 focus:outline-none"
                    />
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Payment Method
                    </label>
                    <select
                      value={tv.paymentMethod}
                      onChange={(e) => handleTVChange(idx, 'paymentMethod', e.target.value as PaymentMethod)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:border-red-600 focus:outline-none"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-slate-200/50">
          <p className="text-xs text-slate-500 max-w-md">
            🔒 WhatsApp will not open automatically. You can print thermal stickers, view A4 receipt, or dispatch WhatsApp alerts from the All Receipts table anytime.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving Receipt...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {isEditMode ? 'UPDATE RECEIPT' : 'SAVE RECEIPT'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

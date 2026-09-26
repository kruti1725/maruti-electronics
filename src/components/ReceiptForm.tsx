import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Tv,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  Hash,
  Sparkles,
} from 'lucide-react';
import { IReceipt, TVStatus, TVPriority, PaymentMethod } from '../types/receipt';
import { receiptSchema } from '../lib/validation';
import { saveClientReceipt, updateClientReceipt } from '../lib/client-storage';

interface ReceiptFormProps {
  initialData?: IReceipt | null;
  isEditMode?: boolean;
  onSuccess: (receipt: IReceipt) => void;
  onCancel?: () => void;
}

export interface TVReceiptEntry {
  id: string;
  serialNumber: string; // Har TV ka apna alag receipt number
  brand: string;
  modelNumber: string;
  size: string;
  complaint: string;
  estimatedCost: number;
  cost: number;
  status: TVStatus;
  priority: TVPriority;
  rackNo: string;
  paymentMethod: PaymentMethod;
  repairBy: string; // Technician
  revisedDate: string; // Revise Date
  outDate: string; // Out Date
  remarks: string; // Accessories / Notes
}

const COMMON_BRANDS = [
  'Sony', 'Samsung', 'LG', 'Mi (Xiaomi)', 'OnePlus', 'TCL', 'Panasonic',
  'Realme', 'Vu', 'Videocon', 'Sansui', 'Haier', 'Micromax', 'Philips',
  'Thomson', 'Kodak', 'Intex', 'BPL', 'Other',
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

const TV_SIZES = [
  '24 inch', '32 inch', '40 inch', '43 inch', '50 inch', '55 inch', '65 inch', '75 inch', 'Other',
];

const TECHNICIANS = [
  'Manoj',
  'Prashant',
  'Swapnil',
  'Bhavesh',
  'Golu',
  'Rakesh',
  'Durga',
  'Rohit',
];

function generateNextSerialNumber(prevSerial?: string): string {
  if (prevSerial) {
    const match = prevSerial.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const numStr = match[2];
      const nextNum = parseInt(numStr, 10) + 1;
      return `${prefix}${String(nextNum).padStart(numStr.length, '0')}`;
    }
  }
  return 'KR' + Math.floor(10000 + Math.random() * 89900);
}

export const ReceiptForm: React.FC<ReceiptFormProps> = ({
  initialData,
  isEditMode = false,
  onSuccess,
  onCancel,
}) => {
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const createBlankTV = (customSerial?: string): TVReceiptEntry => ({
    id: 'tv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    serialNumber: customSerial || generateNextSerialNumber(),
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
    repairBy: '',
    revisedDate: '',
    outDate: '',
    remarks: '',
  });

  // Customer Information (Shared across all TVs)
  const [customerName, setCustomerName] = useState(initialData?.customerName || '');
  const [mobileNumber, setMobileNumber] = useState(initialData?.mobileNumber || '');
  const [receivedDate, setReceivedDate] = useState(initialData?.receivedDate || getTodayDate());

  // Individual TV Units with separate receipt numbers
  const [tvs, setTvs] = useState<TVReceiptEntry[]>(() => {
    if (initialData) {
      if (initialData.tvs && initialData.tvs.length > 0) {
        return initialData.tvs.map((tv, idx) => ({
          id: tv._id || `init_tv_${idx}`,
          serialNumber: idx === 0 ? initialData.serialNumber : `${initialData.serialNumber}-${idx + 1}`,
          brand: tv.brand || 'Sony',
          modelNumber: tv.modelNumber || '',
          size: tv.size || '43 inch',
          complaint: tv.complaint || 'No Display / Black Screen',
          estimatedCost: tv.estimatedCost || 0,
          cost: tv.cost || 0,
          status: tv.status || 'Pending',
          priority: tv.priority || 'Normal',
          rackNo: tv.rackNo || '',
          paymentMethod: tv.paymentMethod || 'Pending',
          repairBy: initialData.repairBy || '',
          revisedDate: initialData.revisedDate || '',
          outDate: initialData.outDate || '',
          remarks: initialData.remarks || '',
        }));
      }
      return [
        {
          ...createBlankTV(initialData.serialNumber),
          repairBy: initialData.repairBy || '',
          revisedDate: initialData.revisedDate || '',
          outDate: initialData.outDate || '',
          remarks: initialData.remarks || '',
        },
      ];
    }
    return [createBlankTV('KR' + Math.floor(10000 + Math.random() * 89900))];
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add another TV / Receipt
  const handleAddTV = () => {
    const lastSerial = tvs[tvs.length - 1]?.serialNumber;
    const nextSerial = generateNextSerialNumber(lastSerial);
    const lastTv = tvs[tvs.length - 1];

    const newTV: TVReceiptEntry = {
      ...createBlankTV(nextSerial),
      repairBy: lastTv?.repairBy || '',
      revisedDate: lastTv?.revisedDate || '',
    };
    setTvs([...tvs, newTV]);
  };

  // Remove TV
  const handleRemoveTV = (index: number) => {
    if (tvs.length <= 1) return;
    setTvs(tvs.filter((_, i) => i !== index));
  };

  // Field change
  const handleTVChange = (index: number, field: keyof TVReceiptEntry, value: any) => {
    const updated = [...tvs];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setTvs(updated);
  };

  // Regenerate serial number
  const handleRegenerateSerial = (index: number) => {
    const newSerial = 'KR' + Math.floor(10000 + Math.random() * 89900);
    handleTVChange(index, 'serialNumber', newSerial);
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobileNumber(cleaned);
  };

  const resetForm = () => {
    setCustomerName('');
    setMobileNumber('');
    setReceivedDate(getTodayDate());
    setTvs([createBlankTV('KR' + Math.floor(10000 + Math.random() * 89900))]);
    setErrors({});
    setServerError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);
    setSuccessMessage(null);

    // Validate customer fields
    const fieldErrors: Record<string, string> = {};
    if (!customerName.trim() || customerName.trim().length < 2) {
      fieldErrors.customerName = 'Customer name is required (min 2 characters)';
    }
    if (!mobileNumber.trim() || mobileNumber.trim().length !== 10) {
      fieldErrors.mobileNumber = 'Mobile number must be exactly 10 digits';
    }
    if (!receivedDate) {
      fieldErrors.receivedDate = 'Received date is required';
    }

    // Validate each TV and check duplicate serial numbers
    const serialSet = new Set<string>();
    tvs.forEach((tv, idx) => {
      const s = tv.serialNumber.trim().toUpperCase();
      if (!s) {
        fieldErrors[`tv_${idx}_serial`] = `Receipt number is required for TV #${idx + 1}`;
      } else if (serialSet.has(s)) {
        fieldErrors[`tv_${idx}_serial`] = `Duplicate Receipt #${s}. Every TV must have a unique receipt number.`;
      } else {
        serialSet.add(s);
      }

      if (!tv.brand.trim()) {
        fieldErrors[`tv_${idx}_brand`] = `Brand is required for TV #${idx + 1}`;
      }
      if (!tv.complaint.trim()) {
        fieldErrors[`tv_${idx}_complaint`] = `Complaint is required for TV #${idx + 1}`;
      }
    });

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Prepare each TV as its own separate receipt
    const receiptsToSave = tvs.map((tv) => ({
      serialNumber: tv.serialNumber.trim().toUpperCase(),
      customerName: customerName.trim(),
      mobileNumber: mobileNumber.trim(),
      receivedDate,
      revisedDate: (tv.revisedDate || '').trim(),
      outDate: (tv.outDate || '').trim(),
      repairBy: (tv.repairBy || '').trim(),
      remarks: (tv.remarks || '').trim(),
      tvs: [
        {
          brand: tv.brand.trim(),
          modelNumber: (tv.modelNumber || '').trim(),
          size: (tv.size || '').trim(),
          complaint: tv.complaint.trim(),
          estimatedCost: Number(tv.estimatedCost) || 0,
          cost: Number(tv.cost) || 0,
          status: tv.status || 'Pending',
          priority: tv.priority || 'Normal',
          rackNo: (tv.rackNo || '').trim(),
          paymentMethod: tv.paymentMethod || 'Pending',
        },
      ],
    }));

    for (const r of receiptsToSave) {
      const parsed = receiptSchema.safeParse(r);
      if (!parsed.success) {
        setServerError(`Validation error on ${r.serialNumber}: ${parsed.error.issues[0]?.message}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    setLoading(true);

    try {
      if (isEditMode) {
        const singleReceipt = receiptsToSave[0];
        const targetSerial = initialData!.serialNumber;
        const res = await fetch(`/api/receipts/${encodeURIComponent(targetSerial)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(singleReceipt),
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success && data.receipt) {
          setSuccessMessage(`Receipt ${data.receipt.serialNumber} Updated Successfully!`);
          try {
            updateClientReceipt(targetSerial, data.receipt);
          } catch {}
          onSuccess(data.receipt);
          return;
        } else {
          throw new Error(data.error || 'Server error updating receipt.');
        }
      } else {
        // Create each receipt (Har TV ka alag receipt document save hoga)
        const createdList: IReceipt[] = [];

        for (let i = 0; i < receiptsToSave.length; i++) {
          const item = receiptsToSave[i];
          const res = await fetch('/api/receipts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.success || !data.receipt) {
            throw new Error(
              data.error || `Failed to save receipt ${item.serialNumber}. Kripya check karein.`
            );
          }

          const created: IReceipt = data.receipt;
          createdList.push(created);

          try {
            saveClientReceipt(created);
          } catch {}
        }

        const serialsList = createdList.map((r) => r.serialNumber).join(', ');
        setSuccessMessage(
          `Successfully created ${createdList.length} Receipt${
            createdList.length > 1 ? 's' : ''
          } (${serialsList}) for ${customerName}!`
        );

        resetForm();
        onSuccess(createdList[0]);
        return;
      }
    } catch (err: any) {
      setServerError(
        err.message ||
          'MongoDB Atlas se connection fail ho gaya. Kripya check karein ki Vercel par MONGODB_URI set hai aur Network Access 0.0.0.0/0 allowed hai.'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
            {isEditMode ? `Update Receipt (${initialData?.serialNumber})` : 'New Repair Receipt'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isEditMode
              ? 'Modify TV details, repair status, technician, or cost.'
              : 'Ek hi baar me customer ke multiple TVs add karein. Har TV ka alag receipt number banega aur All Receipts me alag-alag dikhega.'}
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

      {/* Notifications */}
      {serverError && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          <div className="text-sm">
            <span className="font-bold">Error: </span>
            {serverError}
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-800">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
          <div className="text-sm font-semibold">{successMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Customer Information */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                1. Customer Information
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Customer name aur mobile number sabhi TVs ke liye same rahega.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-lg">
              Step 1 of 2
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Customer Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Customer Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Rahul Patel"
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
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={mobileNumber}
                  onChange={handleMobileChange}
                  placeholder="9876543210"
                  className={`w-full pl-14 pr-4 py-3 bg-slate-50 border-2 rounded-xl text-slate-900 font-mono font-medium focus:bg-white focus:outline-none transition ${
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
          </div>
        </div>

        {/* Section 2: TV Units & Individual Receipts */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                2. TV Units & Receipts ({tvs.length})
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                  {tvs.length} Receipt{tvs.length > 1 ? 's' : ''}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Har TV ka alag receipt number rahega aur All Receipts me alag entry banegi.
              </p>
            </div>

            {!isEditMode && (
              <button
                type="button"
                onClick={handleAddTV}
                className="px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer border border-red-200 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" /> + Add Another TV / Receipt
              </button>
            )}
          </div>

          <div className="space-y-6">
            {tvs.map((tv, idx) => (
              <div
                key={tv.id}
                className="p-5 sm:p-6 bg-slate-50/90 rounded-2xl border-2 border-slate-200 relative transition hover:border-slate-300 shadow-xs"
              >
                {/* TV Header: Receipt Number & Remove */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-red-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="text-sm font-bold text-slate-900">
                        TV Unit {idx + 1}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">
                        (Individual Receipt Card)
                      </span>
                    </div>
                  </div>

                  {/* Individual Receipt Number */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-xs">
                      <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-600">Receipt No:</span>
                      <input
                        type="text"
                        value={tv.serialNumber}
                        onChange={(e) =>
                          handleTVChange(idx, 'serialNumber', e.target.value.toUpperCase())
                        }
                        placeholder="KR10234"
                        className="w-28 text-xs font-mono font-extrabold text-red-600 uppercase focus:outline-none bg-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => handleRegenerateSerial(idx)}
                        title="Generate New Receipt Number"
                        className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700 transition cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>

                    {!isEditMode && tvs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTV(idx)}
                        className="px-2.5 py-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-100/60 rounded-lg flex items-center gap-1 transition cursor-pointer"
                        title="Remove this TV"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>
                </div>

                {errors[`tv_${idx}_serial`] && (
                  <p className="text-xs text-red-600 mb-3 font-semibold">
                    {errors[`tv_${idx}_serial`]}
                  </p>
                )}

                {/* TV Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Brand (Typing enabled) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Brand <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      list={`brand-suggestions-${idx}`}
                      value={tv.brand}
                      onChange={(e) => handleTVChange(idx, 'brand', e.target.value)}
                      placeholder="e.g. Sony, Samsung, LG"
                      className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm font-medium focus:border-red-600 focus:outline-none transition ${
                        errors[`tv_${idx}_brand`] ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                    <datalist id={`brand-suggestions-${idx}`}>
                      {COMMON_BRANDS.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                    {errors[`tv_${idx}_brand`] && (
                      <p className="text-xs text-red-600 mt-1">{errors[`tv_${idx}_brand`]}</p>
                    )}
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

                  {/* Size (Typing enabled) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      TV Size
                    </label>
                    <input
                      type="text"
                      list={`size-suggestions-${idx}`}
                      value={tv.size}
                      onChange={(e) => handleTVChange(idx, 'size', e.target.value)}
                      placeholder="e.g. 32 inch, 43 inch, 55 inch"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:border-red-600 focus:outline-none"
                    />
                    <datalist id={`size-suggestions-${idx}`}>
                      {TV_SIZES.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>

                  {/* Repair Status */}
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
                          : tv.status === 'Return'
                          ? 'bg-purple-100 text-purple-900 border-purple-300'
                          : tv.status === 'Reject'
                          ? 'bg-rose-100 text-rose-900 border-rose-300'
                          : 'bg-slate-800 text-white border-slate-700'
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Under Repair">Under Repair</option>
                      <option value="Ready">Ready</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Return">Return</option>
                      <option value="Reject">Reject</option>
                    </select>
                  </div>

                  {/* Complaint / Problem Description */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Complaint / Problem Description <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      list={`complaints-list-${idx}`}
                      value={tv.complaint}
                      onChange={(e) => handleTVChange(idx, 'complaint', e.target.value)}
                      placeholder="e.g. No Display, Sound Problem, Dead"
                      className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm font-medium focus:border-red-600 focus:outline-none transition ${
                        errors[`tv_${idx}_complaint`] ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                    <datalist id={`complaints-list-${idx}`}>
                      {COMMON_COMPLAINTS.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                    {errors[`tv_${idx}_complaint`] && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors[`tv_${idx}_complaint`]}
                      </p>
                    )}
                  </div>

                  {/* Repair By (Technician) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Repair Handled By
                    </label>
                    <select
                      value={tv.repairBy}
                      onChange={(e) => handleTVChange(idx, 'repairBy', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:border-red-600 focus:outline-none"
                    >
                      <option value="">-- Select Technician --</option>
                      {TECHNICIANS.map((tech) => (
                        <option key={tech} value={tech}>
                          {tech}
                        </option>
                      ))}
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

                  {/* Revise Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Revise Date (Expected)
                    </label>
                    <input
                      type="date"
                      value={tv.revisedDate}
                      onChange={(e) => handleTVChange(idx, 'revisedDate', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:border-red-600 focus:outline-none"
                    />
                  </div>

                  {/* Out Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Out Date (Delivery)
                    </label>
                    <input
                      type="date"
                      value={tv.outDate}
                      onChange={(e) => handleTVChange(idx, 'outDate', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:border-red-600 focus:outline-none"
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
                      onChange={(e) =>
                        handleTVChange(idx, 'estimatedCost', Number(e.target.value))
                      }
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

                  {/* Priority */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Priority
                    </label>
                    <select
                      value={tv.priority}
                      onChange={(e) =>
                        handleTVChange(idx, 'priority', e.target.value as TVPriority)
                      }
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:border-red-600 focus:outline-none"
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Payment Method
                    </label>
                    <select
                      value={tv.paymentMethod}
                      onChange={(e) =>
                        handleTVChange(idx, 'paymentMethod', e.target.value as PaymentMethod)
                      }
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:border-red-600 focus:outline-none"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>

                  {/* Remarks / Accessories */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Remarks / Accessories Deposited
                    </label>
                    <input
                      type="text"
                      value={tv.remarks}
                      onChange={(e) => handleTVChange(idx, 'remarks', e.target.value)}
                      placeholder="e.g. Remote, Power Cable, Stand"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:border-red-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!isEditMode && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleAddTV}
                className="px-5 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm rounded-xl flex items-center gap-2 border border-red-200 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" /> + Add Another TV / Receipt for this Customer
              </button>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-lg shadow-slate-200/50">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-slate-100 text-slate-700 shrink-0">
              <Sparkles className="w-5 h-5 text-red-600" />
            </span>
            <div className="text-xs text-slate-500">
              <p className="font-bold text-slate-800 text-sm">
                {tvs.length === 1
                  ? `1 Receipt (${tvs[0].serialNumber}) will be created`
                  : `${tvs.length} Individual Receipts (${tvs.map((t) => t.serialNumber).join(', ')}) will be created`}
              </p>
              <p className="mt-0.5">
                Customer: <span className="font-bold text-slate-700">{customerName || '—'}</span>{' '}
                ({mobileNumber || '—'}). All Receipts table me har TV ka alag row dikhega.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
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
                  Saving Receipts...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {isEditMode
                    ? 'UPDATE RECEIPT'
                    : tvs.length > 1
                    ? `SAVE ALL ${tvs.length} RECEIPTS`
                    : 'SAVE RECEIPT'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
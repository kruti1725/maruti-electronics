import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import {
  X,
  AlertCircle,
  Scan,
  CheckCircle2,
  User,
  Phone,
  Tv,
  Calendar,
  ExternalLink,
  Save,
  Wrench,
} from 'lucide-react';
import { IReceipt } from '../types/receipt';
import { searchClientReceipt, updateClientReceipt } from '../lib/client-storage';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedCode: string, receiptData?: IReceipt) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scannedReceipt, setScannedReceipt] = useState<IReceipt | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('Under Repair');
  const [techRemarks, setTechRemarks] = useState('');
  const [actualCost, setActualCost] = useState<number>(0);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setScannedReceipt(null);
      setErrorMsg(null);
      setManualCode('');
      setUpdateSuccess(false);
      return;
    }

    setErrorMsg(null);
    setScannedReceipt(null);
    setUpdateSuccess(false);
    const elementId = 'kruti-html5-scanner';

    const timer = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          elementId,
          {
            fps: 10,
            qrbox: { width: 260, height: 160 },
            rememberLastUsedCamera: true,
            supportedScanTypes: [
              Html5QrcodeScanType.SCAN_TYPE_CAMERA,
              Html5QrcodeScanType.SCAN_TYPE_FILE,
            ],
            showTorchButtonIfSupported: true,
          },
          false
        );

        scannerRef.current = scanner;

        scanner.render(
          (decodedText) => {
            if (decodedText) {
              const cleanCode = decodedText.trim();
              handleCodeFound(cleanCode);
            }
          },
          () => {}
        );
      } catch (err: any) {
        setErrorMsg(err?.message || 'Unable to start camera scanner.');
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          scannerRef.current.clear().catch(() => {});
        } catch (_) {}
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  const handleCodeFound = async (rawCode: string) => {
    let serial = rawCode.trim();
    if (serial.includes('serial=')) {
      const parts = serial.split('serial=');
      if (parts[1]) {
        serial = decodeURIComponent(parts[1].split('&')[0]);
      }
    } else if (serial.includes('/track/') || serial.includes('/receipt/')) {
      const parts = serial.split('/');
      serial = decodeURIComponent(parts[parts.length - 1]);
    }

    setIsLoadingDetails(true);
    setErrorMsg(null);

    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
      } catch (_) {}
      scannerRef.current = null;
    }

    try {
      const res = await fetch(`/api/receipts/${encodeURIComponent(serial)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.receipt) {
          const rec: IReceipt = data.receipt;
          setScannedReceipt(rec);
          setSelectedStatus(rec.tvs?.[0]?.status || 'Under Repair');
          setActualCost(rec.tvs?.[0]?.cost || rec.tvs?.[0]?.estimatedCost || 0);
          setTechRemarks(rec.remarks || '');
          setIsLoadingDetails(false);
          return;
        }
      }
    } catch {}

    const found = searchClientReceipt(serial);
    if (found && found.length > 0) {
      const rec = found[0];
      setScannedReceipt(rec);
      setSelectedStatus(rec.tvs?.[0]?.status || 'Under Repair');
      setActualCost(rec.tvs?.[0]?.cost || rec.tvs?.[0]?.estimatedCost || 0);
      setTechRemarks(rec.remarks || '');
    } else {
      setErrorMsg(`No receipt found matching barcode "${serial}".`);
      setTimeout(() => {
        onScanSuccess(serial);
      }, 1500);
    }
    setIsLoadingDetails(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleCodeFound(manualCode.trim());
    }
  };

  const handleQuickStatusUpdate = async () => {
    if (!scannedReceipt) return;
    setIsUpdatingStatus(true);

    const updatedTvs = scannedReceipt.tvs.map((tv, idx) => {
      if (idx === 0) {
        return {
          ...tv,
          status: selectedStatus as any,
          cost: actualCost,
        };
      }
      return tv;
    });

    const updatedPayload: IReceipt = {
      ...scannedReceipt,
      tvs: updatedTvs,
      remarks: techRemarks,
      updatedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(`/api/receipts/${encodeURIComponent(scannedReceipt.serialNumber)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.receipt) {
          updateClientReceipt(scannedReceipt.serialNumber, data.receipt);
          setScannedReceipt(data.receipt);
          setUpdateSuccess(true);
          setTimeout(() => {
            onScanSuccess(scannedReceipt.serialNumber, data.receipt);
          }, 1000);
          return;
        }
      }
      throw new Error('API update failed');
    } catch {
      updateClientReceipt(scannedReceipt.serialNumber, updatedPayload);
      setScannedReceipt(updatedPayload);
      setUpdateSuccess(true);
      setTimeout(() => {
        onScanSuccess(scannedReceipt.serialNumber, updatedPayload);
      }, 1000);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-600 rounded-xl text-white">
              <Scan className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">Barcode & TV Sticker Scanner</h3>
              <p className="text-[11px] text-slate-400">
                Scan TV sticker to view Customer Details & Update Repair Status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {isLoadingDetails && (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-700">Fetching Customer & Repair details...</p>
            </div>
          )}

          {/* VIEW: Customer Details Card when scanned */}
          {!isLoadingDetails && scannedReceipt && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {updateSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Repair Status & Customer Details Updated Successfully!
                </div>
              )}

              {/* Verified Customer Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <span className="text-[11px] font-mono font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-lg">
                    {scannedReceipt.serialNumber}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {scannedReceipt.receivedDate}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" /> Customer Name
                    </span>
                    <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                      {scannedReceipt.customerName}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-500" /> Mobile Number
                    </span>
                    <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                      +91 {scannedReceipt.mobileNumber}
                    </p>
                  </div>
                </div>

                {/* TV Info */}
                {scannedReceipt.tvs && scannedReceipt.tvs.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/80">
                    <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                      <Tv className="w-3 h-3 text-slate-500" /> TV Details & Complaint
                    </span>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="font-bold text-slate-800 text-xs">
                        {scannedReceipt.tvs[0].brand} {scannedReceipt.tvs[0].size}{' '}
                        {scannedReceipt.tvs[0].modelNumber ? `(${scannedReceipt.tvs[0].modelNumber})` : ''}
                      </p>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-800 font-bold rounded-md">
                        Est: ₹{scannedReceipt.tvs[0].estimatedCost}
                      </span>
                    </div>
                    <p className="text-[11px] text-red-600 font-medium mt-0.5">
                      Fault: {scannedReceipt.tvs[0].complaint}
                    </p>
                  </div>
                )}
              </div>

              {/* Status Update Form */}
              <div className="bg-white border-2 border-red-100 rounded-2xl p-4 space-y-3.5 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-red-600" />
                  Quick Update Repair Status
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Repair Status
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500"
                    >
                      <option value="Pending">Pending (Not Started)</option>
                      <option value="Under Repair">Under Repair (Working)</option>
                      <option value="Ready">Ready for Delivery</option>
                      <option value="Delivered">Delivered to Customer</option>
                      <option value="Return">Return (Cannot Repair)</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Actual Cost (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={actualCost || ''}
                        onChange={(e) => setActualCost(Number(e.target.value) || 0)}
                        placeholder="Cost"
                        className="w-full pl-7 pr-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Technician Remarks / Work Done
                  </label>
                  <input
                    type="text"
                    value={techRemarks}
                    onChange={(e) => setTechRemarks(e.target.value)}
                    placeholder="e.g. Backlight strip replaced, tested for 3 hours OK."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleQuickStatusUpdate}
                    disabled={isUpdatingStatus}
                    className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isUpdatingStatus ? 'Saving...' : 'Save Status Now'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onScanSuccess(scannedReceipt.serialNumber, scannedReceipt);
                    }}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Full Edit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: Camera Scanner if no receipt is selected yet */}
          {!isLoadingDetails && !scannedReceipt && (
            <div className="space-y-4">
              <div className="w-full bg-slate-100 rounded-2xl p-2 border-2 border-dashed border-slate-300 min-h-[260px] flex flex-col justify-center items-center">
                <div id="kruti-html5-scanner" className="w-full" />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Manual Input */}
              <div className="pt-2 border-t border-slate-200">
                <form onSubmit={handleManualSubmit} className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Or Enter Serial Number / Receipt No:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. KR00101"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl uppercase focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      disabled={!manualCode.trim()}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition cursor-pointer"
                    >
                      Find
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
          <span>Workshop Scanner • Kruti Electronics</span>
          {scannedReceipt ? (
            <button
              onClick={() => {
                setScannedReceipt(null);
                setErrorMsg(null);
              }}
              className="px-3 py-1 text-xs font-bold text-red-600 hover:text-red-700"
            >
              Scan Another
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Search, Tv, Calendar, User, Phone, CheckCircle2, AlertCircle, Wrench, ShieldAlert, ArrowLeft, Printer, RefreshCw } from 'lucide-react';
import { IReceipt, TVStatus } from '../types/receipt';
import { searchClientReceipt } from '../lib/client-storage';

interface SearchReceiptProps {
  initialSerial?: string;
  onNavigateHome: () => void;
  onPrintReceipt?: (receipt: IReceipt) => void;
}

export const SearchReceipt: React.FC<SearchReceiptProps> = ({
  initialSerial = '',
  onNavigateHome,
  onPrintReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSerial);
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState<IReceipt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (termToSearch?: string) => {
    const query = (termToSearch !== undefined ? termToSearch : searchTerm).trim();
    if (!query) {
      setError('Please enter a Receipt Number or 10-digit Mobile Number.');
      return;
    }

    setLoading(true);
    setError(null);
    setReceipts([]);
    setHasSearched(true);

    try {
      const cleanDigits = query.replace(/\D/g, '');
      const isMobile = cleanDigits.length === 10;

      if (isMobile) {
        // Search by mobile
        const res = await fetch(`/api/receipts/mobile/${cleanDigits}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.receipts) {
            setReceipts(data.receipts);
            return;
          }
        }
      } else {
        // Search by serial number
        const res = await fetch(`/api/receipts/${encodeURIComponent(query.toUpperCase())}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.receipt) {
            setReceipts([data.receipt]);
            return;
          }
        }
      }
      throw new Error('Fallback search');
    } catch {
      // Local storage search fallback
      const found = searchClientReceipt(query);
      if (found.length > 0) {
        setReceipts(found);
      } else {
        setError('No TV repair receipt found for this serial or mobile number.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialSerial) {
      setSearchTerm(initialSerial);
      handleSearch(initialSerial);
    }
  }, [initialSerial]);

  const getStatusBadge = (status: TVStatus) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Pending Inspection
          </span>
        );
      case 'Under Repair':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <Wrench className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            Under Repair
          </span>
        );
      case 'Ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Ready for Pickup
          </span>
        );
      case 'Delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-100 border border-slate-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Delivered
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-[80vh] py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Header breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-red-600 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
        <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
          Live Tracking
        </span>
      </div>

      {/* Search Input Box */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-6 sm:p-8 mb-8">
        <div className="max-w-2xl mx-auto text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-red-50 text-red-600 mb-3">
            <Search className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Check TV Repair Status
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            Enter your <strong className="text-slate-900">Receipt / Serial Number</strong> (e.g. KR00101) or registered <strong className="text-slate-900">10-Digit Mobile Number</strong>.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="max-w-2xl mx-auto"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. KR00101 or 9876543210"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 focus:border-red-600 focus:bg-white focus:outline-none rounded-2xl text-slate-900 font-medium placeholder-slate-400 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-7 py-3.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-2xl shadow-lg shadow-red-600/30 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Track Status
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick sample chips */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
          <span>Quick search samples:</span>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('KR00101');
              handleSearch('KR00101');
            }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-lg font-mono text-slate-700 transition cursor-pointer"
          >
            KR00101
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('KR00102');
              handleSearch('KR00102');
            }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-lg font-mono text-slate-700 transition cursor-pointer"
          >
            KR00102
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('8511296117');
              handleSearch('8511296117');
            }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-lg font-mono text-slate-700 transition cursor-pointer"
          >
            8511296117
          </button>
        </div>
      </div>

      {/* Error / Not Found State */}
      {error && (
        <div className="p-6 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-4 text-red-900 mb-8 animate-in fade-in">
          <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-base">Receipt Not Found</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <p className="text-xs text-red-600 mt-2 font-medium">
              Need assistance? Call Kruti Electronics help desk directly at{' '}
              <a href="tel:8511296117" className="underline font-bold">
                +91 85112 96117
              </a>
              .
            </p>
          </div>
        </div>
      )}

      {/* Results Display */}
      {receipts.length > 0 && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">
              Found {receipts.length} Repair {receipts.length === 1 ? 'Receipt' : 'Receipts'}
            </h2>
            <span className="text-xs text-slate-500">Updated in real-time</span>
          </div>

          {receipts.map((receipt) => {
            const daysSinceReceived = Math.floor(
              (Date.now() - new Date(receipt.receivedDate).getTime()) / (1000 * 60 * 60 * 24)
            );

            return (
              <div
                key={receipt._id}
                className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200 overflow-hidden"
              >
                {/* Receipt Card Header */}
                <div className="bg-slate-900 text-white p-6 sm:p-7 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-red-400 bg-red-950/80 px-2.5 py-0.5 rounded-md border border-red-800">
                        Official Receipt
                      </span>
                      <span className="text-xs text-slate-400">
                        {daysSinceReceived === 0 ? 'Today' : `${daysSinceReceived} days ago`}
                      </span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
                      {receipt.serialNumber}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    {onPrintReceipt && (
                      <button
                        onClick={() => onPrintReceipt(receipt)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-slate-300" />
                        Print Copy
                      </button>
                    )}
                  </div>
                </div>

                {/* Customer & Booking Meta */}
                <div className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                    <User className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Customer Name</p>
                      <p className="font-bold text-slate-900">{receipt.customerName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                    <Phone className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Registered Mobile</p>
                      <p className="font-bold text-slate-900 font-mono">
                        {receipt.mobileNumber.slice(0, 3)}****{receipt.mobileNumber.slice(7)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                    <Calendar className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Received Date</p>
                      <p className="font-bold text-slate-900">{receipt.receivedDate}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                    <Wrench className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Repair Handled By</p>
                      <p className="font-bold text-slate-900">{receipt.repairBy || 'Service Workshop'}</p>
                    </div>
                  </div>
                </div>

                {/* TVs In This Receipt (Section 4 & 5 support) */}
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Tv className="w-5 h-5 text-red-600" />
                      TV Units ({receipt.tvs.length})
                    </h4>
                    <span className="text-xs text-slate-500">
                      Check individual status for each TV
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {receipt.tvs.map((tv, idx) => (
                      <div
                        key={tv._id || idx}
                        className="bg-slate-50/70 rounded-2xl border border-slate-200/90 p-5 sm:p-6 transition hover:border-slate-300"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-red-600 text-white font-bold text-xs flex items-center justify-center">
                              #{idx + 1}
                            </span>
                            <div>
                              <h5 className="text-lg font-black text-slate-900">
                                {tv.brand} {tv.size ? `(${tv.size})` : ''}
                              </h5>
                              <p className="text-xs text-slate-500 font-mono">
                                Model: {tv.modelNumber || 'Standard Model'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {getStatusBadge(tv.status)}
                          </div>
                        </div>

                        {/* Complaint & Technical Info */}
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-xs font-semibold text-slate-500 block">Reported Complaint</span>
                            <span className="font-medium text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 inline-block mt-1 w-full">
                              {tv.complaint}
                            </span>
                          </div>

                          <div>
                            <span className="text-xs font-semibold text-slate-500 block">Repair Priority & Rack</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                                  tv.priority === 'Urgent'
                                    ? 'bg-red-100 text-red-800'
                                    : tv.priority === 'High'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {tv.priority} Priority
                              </span>
                              {tv.rackNo && (
                                <span className="text-xs font-bold bg-white border border-slate-200 px-2 py-1 rounded-md text-slate-700 font-mono">
                                  Rack: {tv.rackNo}
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="text-xs font-semibold text-slate-500 block">Cost Summary</span>
                            <div className="flex items-center gap-3 mt-1">
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase">Est. Cost</span>
                                <span className="text-sm font-bold text-slate-700">₹{tv.estimatedCost}</span>
                              </div>
                              <div className="border-l border-slate-200 pl-3">
                                <span className="text-[10px] text-slate-400 block uppercase">Final Cost</span>
                                <span className="text-base font-extrabold text-red-600">
                                  {tv.cost > 0 ? `₹${tv.cost}` : 'TBD'}
                                </span>
                              </div>
                              <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-medium ml-auto">
                                {tv.paymentMethod}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Customer Notice & Shop Terms */}
                  {receipt.remarks && (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                      <strong>Remarks / Instructions:</strong> {receipt.remarks}
                    </div>
                  )}

                  <div className="p-4 bg-slate-100 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <p>
                      <strong>Important Notice:</strong> Repaired products must be collected within 20 days. After 20 days, storage charge of ₹300/day applies. Products not collected within 30 days may be subject to scrap disposal.
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty Initial Guidance */}
      {!hasSearched && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center max-w-2xl mx-auto shadow-sm">
          <Tv className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Track Your TV in 3 Easy Steps</h3>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-red-600 block mb-1">1. Find Receipt</span>
              Check the serial number on the printed job card slip or receipt given to you.
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-red-600 block mb-1">2. Enter Details</span>
              Type the serial number (e.g. KR00101) or your 10-digit mobile number above.
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-red-600 block mb-1">3. Live Status</span>
              See whether your TV is under inspection, awaiting parts, ready, or ready for pickup!
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

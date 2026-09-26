import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Printer, Download, X, Tv, Phone, MapPin, Calendar, CheckCircle2, ShieldAlert } from 'lucide-react';
import { IReceipt } from '../types/receipt';

interface PrintReceiptProps {
  receipt: IReceipt | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintReceipt: React.FC<PrintReceiptProps> = ({ receipt, isOpen, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (receipt) {
      const siteUrl = window.location.origin;
      const searchUrl = `${siteUrl}/search-receipt?serial=${encodeURIComponent(receipt.serialNumber)}`;
      QRCode.toDataURL(searchUrl, {
        width: 140,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation error:', err));
    }
  }, [receipt]);

  if (!isOpen || !receipt) return null;

  const totalEstimated = receipt.tvs.reduce((sum, tv) => sum + (tv.estimatedCost || 0), 0);
  const totalActual = receipt.tvs.reduce((sum, tv) => sum + (tv.cost || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!receiptRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 mm
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Receipt-${receipt.serialNumber}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[96vh] flex flex-col">
        {/* Top Control Bar (Hidden when printing via CSS) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-red-500" />
            <h3 className="text-base font-extrabold">A4 Repair Receipt & Job Card</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print A4
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 border border-slate-700"
            >
              {isGeneratingPdf ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-emerald-400" />
              )}
              Download PDF
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Content Area */}
        <div className="overflow-y-auto p-4 sm:p-8 flex-1 bg-slate-100/50">
          <div
            ref={receiptRef}
            id="a4-receipt-print-area"
            className="bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-slate-200 text-slate-900 max-w-[210mm] mx-auto min-h-[260mm] flex flex-col justify-between"
          >
            <div>
              {/* Header with Brand & Contact */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-slate-900 pb-5 gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold">
                      <Tv className="w-6 h-6" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-black tracking-tight text-slate-900">
                        KRUTI <span className="text-red-600">ELECTRONICS</span>
                      </h1>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        TV Repair & Electronics Service Center
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-600 space-y-0.5">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" /> Station Road, Near Electronics Market, Gujarat
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-red-600 shrink-0" /> Helpline: +91 85112 96117 / +91 98765 43210
                    </p>
                  </div>
                </div>

                {/* Receipt Title & Meta */}
                <div className="text-left sm:text-right bg-slate-50 p-4 rounded-xl border border-slate-200 sm:min-w-[220px]">
                  <span className="text-xs font-black tracking-wider uppercase text-red-600 block">
                    TV REPAIR RECEIPT
                  </span>
                  <div className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
                    {receipt.serialNumber}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center sm:justify-end gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> Date: <strong>{receipt.receivedDate}</strong>
                  </div>
                </div>
              </div>

              {/* Customer & Technician Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 border-b border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Customer Name</span>
                  <span className="text-slate-900 font-black text-sm">{receipt.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Mobile Number</span>
                  <span className="text-slate-900 font-bold font-mono text-sm">{receipt.mobileNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Repair Handled By</span>
                  <span className="text-slate-900 font-bold text-sm">{receipt.repairBy || 'Workshop Staff'}</span>
                </div>
              </div>

              {/* TV Details Table */}
              <div className="mt-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                  TV Unit Specifications ({receipt.tvs.length})
                </h3>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Brand & Model</th>
                        <th className="py-2.5 px-3">Size</th>
                        <th className="py-2.5 px-3">Complaint / Issue</th>
                        <th className="py-2.5 px-3">Rack</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Est. (₹)</th>
                        <th className="py-2.5 px-3 text-right">Actual (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {receipt.tvs.map((tv, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {tv.brand} {tv.modelNumber ? `(${tv.modelNumber})` : ''}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{tv.size || 'N/A'}</td>
                          <td className="py-2.5 px-3 text-slate-800 font-medium">{tv.complaint}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{tv.rackNo || '-'}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 border border-slate-300 text-slate-800">
                              {tv.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-600">₹{tv.estimatedCost}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-red-600">
                            {tv.cost > 0 ? `₹${tv.cost}` : 'TBD'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={6} className="py-2.5 px-3 text-right uppercase text-slate-600">
                          Total Amount:
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700">₹{totalEstimated}</td>
                        <td className="py-2.5 px-3 text-right text-red-600 font-black text-sm">
                          {totalActual > 0 ? `₹${totalActual}` : `₹${totalEstimated} (Est)`}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Remarks */}
              {receipt.remarks && (
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <strong className="text-slate-900">Remarks / Accessories:</strong> {receipt.remarks}
                </div>
              )}
            </div>

            {/* Bottom Section: QR Code, Terms & Signatures */}
            <div className="mt-8 pt-5 border-t-2 border-slate-900">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                {/* QR Code Container */}
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  {qrDataUrl && (
                    <img
                      src={qrDataUrl}
                      alt="Receipt QR Code"
                      className="w-20 h-20 border border-slate-300 rounded-lg p-0.5 bg-white"
                    />
                  )}
                  <div className="text-left">
                    <span className="text-[11px] font-black text-slate-900 uppercase block">
                      Scan to Track Repair
                    </span>
                    <p className="text-[10px] text-slate-500 leading-tight mt-0.5 max-w-[150px]">
                      Scan with any smartphone camera to check live status online.
                    </p>
                  </div>
                </div>

                {/* Important Terms Notice */}
                <div className="flex-1 text-[10px] text-slate-600 leading-relaxed bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                  <p className="font-bold text-amber-950 mb-1 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Terms & Conditions:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Please collect your repaired product within <strong>20 days</strong>.</li>
                    <li>After 20 days, storage charge of <strong>₹300/day</strong> will be applicable.</li>
                    <li>If product is not collected within <strong>30 days</strong>, it may be treated as scrap.</li>
                    <li>Physical damage or panel crack under customer handling is not covered.</li>
                  </ul>
                </div>

                {/* Signature line */}
                <div className="text-center sm:text-right shrink-0 min-w-[130px]">
                  <div className="h-10 border-b border-slate-400" />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mt-1">
                    Authorized Signatory
                  </span>
                  <span className="text-[9px] text-slate-400">Kruti Electronics</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

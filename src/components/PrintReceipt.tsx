import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Printer, Download, X, Phone, MapPin, Calendar, CheckCircle2, ShieldAlert, Share2, MessageCircle } from 'lucide-react';
import { IReceipt } from '../types/receipt';
import { KrutiLogo } from './KrutiLogo';
import { generateFullDetailWhatsAppLink, getPublicDomain, sanitizeMobileNumber } from '../lib/whatsapp';

interface PrintReceiptProps {
  receipt: IReceipt | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintReceipt: React.FC<PrintReceiptProps> = ({ receipt, isOpen, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (receipt) {
      const siteUrl = getPublicDomain();
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

  /**
   * Share PDF or WhatsApp details directly without forcing a download
   */
  const handleShareWhatsApp = async () => {
    setIsSharing(true);
    try {
      // If Web Share API supports file sharing, generate PDF blob and share
      if (receiptRef.current && navigator.canShare) {
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
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], `Receipt-${receipt.serialNumber}.pdf`, {
          type: 'application/pdf',
        });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Kruti Electronics Receipt - ${receipt.serialNumber}`,
            text: `Receipt #${receipt.serialNumber} for ${receipt.customerName}. View status online. Helpline: 7778833577`,
          });
          setIsSharing(false);
          return;
        }
      }
    } catch (shareErr) {
      console.log('Native file share skipped/fallback to link:', shareErr);
    }

    // Direct WhatsApp Web / App share without manual download
    const waLink = generateFullDetailWhatsAppLink(receipt);
    if (waLink) {
      window.open(waLink, '_blank');
    }
    setIsSharing(false);
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
              onClick={handleShareWhatsApp}
              disabled={isSharing}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-950/20"
              title="Direct WhatsApp Share without downloading"
            >
              <MessageCircle className="w-4 h-4" />
              {isSharing ? 'Sharing...' : 'Share on WhatsApp'}
            </button>

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
              {/* Header with Brand Logo & Contact */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-slate-900 pb-5 gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    {/* Brand Geometric Logo from image */}
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-xs">
                      <KrutiLogo className="w-10 h-10" />
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
                    <p className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <Phone className="w-3.5 h-3.5 text-red-600 shrink-0" /> Helpline: +91 77788 33577 / 7778833577
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
                  <div className="text-xs text-slate-500 mt-1 flex flex-col sm:items-end gap-0.5">
                    <div>
                      <Calendar className="w-3 h-3 text-slate-400 inline mr-1" /> Date: <strong>{receipt.receivedDate}</strong>
                    </div>
                    {receipt.revisedDate && (
                      <div className="text-[11px] text-slate-600">
                        Revise: <strong>{receipt.revisedDate}</strong>
                      </div>
                    )}
                    {receipt.outDate && (
                      <div className="text-[11px] text-slate-600">
                        Out: <strong>{receipt.outDate}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer & Technician Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 border-b border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Customer Name</span>
                  <p className="font-bold text-sm text-slate-900 mt-0.5 uppercase">{receipt.customerName}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Mobile Number</span>
                  <p className="font-bold text-sm text-slate-900 mt-0.5 font-mono">{receipt.mobileNumber}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Assigned Technician</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{receipt.repairBy || 'Workshop Team'}</p>
                </div>
              </div>

              {/* TV Items Table */}
              <div className="mt-5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                  Materials / Televisions Received ({receipt.tvs.length})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">Brand & Model</th>
                        <th className="py-2.5 px-3">Screen Size</th>
                        <th className="py-2.5 px-3">Rack</th>
                        <th className="py-2.5 px-3">Customer Complaint</th>
                        <th className="py-2.5 px-3 text-right">Est. Cost</th>
                        <th className="py-2.5 px-3 text-right">Final Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {receipt.tvs.map((tv, idx) => (
                        <tr key={tv._id || idx} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            {tv.brand}
                            {tv.modelNumber && (
                              <span className="block text-[10px] text-slate-500 font-normal">
                                Model: {tv.modelNumber}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-700">{tv.size || '-'}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md font-mono text-[11px] font-bold">
                              {tv.rackNo || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 max-w-[200px] break-words">
                            {tv.complaint || '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-medium text-slate-600">
                            ₹{tv.estimatedCost?.toLocaleString('en-IN') || 0}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            ₹{tv.cost?.toLocaleString('en-IN') || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Calculation Strip */}
              <div className="mt-4 flex justify-end">
                <div className="w-full sm:w-64 bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Estimated:</span>
                    <span className="font-mono font-semibold">₹{totalEstimated.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-1.5 border-t border-slate-200">
                    <span>Total Amount:</span>
                    <span className="font-mono text-red-600">₹{totalActual.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              {receipt.remarks && (
                <div className="mt-4 p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-xs">
                  <span className="font-bold text-amber-900 block text-[10px] uppercase tracking-wide">
                    Technician Remarks / Notes:
                  </span>
                  <p className="text-amber-800 mt-0.5 italic">{receipt.remarks}</p>
                </div>
              )}
            </div>

            {/* Bottom Terms & Tracking QR */}
            <div className="mt-8 pt-5 border-t-2 border-slate-900">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                {/* Terms and conditions */}
                <div className="flex-1 space-y-2 text-[10px] text-slate-600 leading-relaxed">
                  <div className="flex items-center gap-1 font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" /> Important Terms & Workshop Notice:
                  </div>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Kripya 20 din ke andar apna TV test karwake delivery le lein.</li>
                    <li>20 din ke baad ₹300 per day storage charge lagaya jayega.</li>
                    <li>30 din tak koi response na milne par saman ko scrap mana jayega, dukan ki koi zimmedari nahi hogi.</li>
                    <li>Receipt khone par ID proof aur phone number verification anivarya hai.</li>
                  </ul>
                </div>

                {/* QR Code Tracking Box */}
                <div className="flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200 rounded-xl shrink-0 text-center w-full sm:w-auto">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Scan QR Code" className="w-24 h-24 rounded-md" />
                  ) : (
                    <div className="w-24 h-24 bg-slate-200 rounded-md animate-pulse" />
                  )}
                  <span className="text-[9px] font-bold text-slate-700 uppercase tracking-wider mt-1.5">
                    Scan for Live Status
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    maruti-electronics.vercel.app
                  </span>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 mt-4 text-center text-xs">
                <div>
                  <div className="border-t border-slate-300 w-44 mx-auto pt-1 text-[11px] font-bold text-slate-700">
                    Customer Signature
                  </div>
                </div>
                <div>
                  <div className="border-t border-slate-300 w-44 mx-auto pt-1 text-[11px] font-bold text-slate-700">
                    Authorized Signatory (Kruti)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Printer, X, Tag, Info } from 'lucide-react';
import { IReceipt } from '../types/receipt';

interface StickerPrintProps {
  receipt: IReceipt | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Real sticker printing function using an isolated print iframe
 * strictly configured for 50mm x 25mm thermal sticker rolls.
 */
export function printStickerDirect(receipt: IReceipt) {
  const serialNo = receipt.serialNumber.replace(/^KR-?/i, '');
  const customerName = receipt.customerName.toUpperCase();
  const mobile = receipt.mobileNumber;

  // Create an invisible iframe for printing
  const iframeId = 'kruti_sticker_print_frame';
  let existingIframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = iframeId;
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '50mm';
  iframe.style.height = '25mm';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) return;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sticker - ${receipt.serialNumber}</title>
  <style>
    @page {
      size: 50mm 25mm;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 50mm;
      height: 25mm;
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow: hidden;
    }
    .sticker-container {
      width: 50mm;
      height: 25mm;
      padding: 1.5mm 2.2mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: left;
    }
    .header {
      text-align: center;
      font-size: 8.5pt;
      font-weight: 900;
      letter-spacing: 0.2px;
      line-height: 1.05;
      text-transform: uppercase;
      border-bottom: 0.6px solid #000000;
      padding-bottom: 0.5mm;
    }
    .content-body {
      display: flex;
      flex-direction: column;
      gap: 0.6mm;
      padding-top: 0.4mm;
    }
    .row {
      display: flex;
      align-items: baseline;
      font-size: 7pt;
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .label {
      font-weight: 800;
      min-width: 14mm;
      display: inline-block;
    }
    .value {
      font-weight: 800;
      font-size: 7.2pt;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .serial-val {
      font-size: 8.5pt;
      font-weight: 900;
    }
  </style>
</head>
<body>
  <div class="sticker-container">
    <div class="header">KRUTI ELECTRONICS</div>
    <div class="content-body">
      <div class="row">
        <span class="label">Serial No:</span>
        <span class="value serial-val">${serialNo || receipt.serialNumber}</span>
      </div>
      <div class="row">
        <span class="label">Name:</span>
        <span class="value">${customerName}</span>
      </div>
      <div class="row">
        <span class="label">Mobile:</span>
        <span class="value">${mobile}</span>
      </div>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

  doc.open();
  doc.write(html);
  doc.close();

  // Clean up iframe after printing dialog closes
  setTimeout(() => {
    iframe.remove();
  }, 60000);
}

export const StickerPrint: React.FC<StickerPrintProps> = ({ receipt, isOpen, onClose }) => {
  if (!isOpen || !receipt) return null;

  const serialNo = receipt.serialNumber.replace(/^KR-?/i, '');
  const customerName = receipt.customerName.toUpperCase();
  const mobile = receipt.mobileNumber;

  const handlePrint = () => {
    printStickerDirect(receipt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Tag className="w-5 h-5 text-red-500" />
            <h3 className="text-base font-extrabold">Thermal Sticker Print (50mm × 25mm)</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-xs text-slate-600 mb-4">
            Stick this label directly onto the TV back cover or customer stand for rapid identification during workshop servicing.
          </p>

          {/* Actual 50mm x 25mm Scaled Preview Card */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Preview (Actual Roll Size: 50mm × 25mm)
            </span>

            {/* Sticker physical aspect ratio (2:1) container */}
            <div
              style={{ width: '50mm', height: '25mm' }}
              className="bg-white border-2 border-slate-900 shadow-md p-1.5 flex flex-col justify-between select-none"
            >
              <div className="text-center font-black text-[9pt] leading-none uppercase border-b border-black pb-0.5 tracking-tight">
                KRUTI ELECTRONICS
              </div>

              <div className="flex flex-col gap-0.5 text-[7pt] leading-tight font-bold text-slate-900">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold">Serial No:</span>
                  <span className="font-black text-[8.5pt]">{serialNo || receipt.serialNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold">Name:</span>
                  <span className="truncate max-w-[32mm] text-right">{customerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold">Mobile:</span>
                  <span className="font-mono">{mobile}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Printer Settings Reminder Box */}
          <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <Info className="w-4 h-4 text-amber-600" /> Required Printer Settings:
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 pl-5 list-disc text-[11px]">
              <li>Paper size: <strong>50mm × 25mm</strong></li>
              <li>Margins: <strong>None (0mm)</strong></li>
              <li>Scale: <strong>100%</strong></li>
              <li>Headers & Footers: <strong>OFF</strong></li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-2 cursor-pointer transition"
          >
            <Printer className="w-4 h-4" /> Print Thermal Sticker
          </button>
        </div>
      </div>
    </div>
  );
};

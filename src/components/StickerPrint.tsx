import React, { useState } from 'react';
import { Printer, X, Tag, Check, LayoutGrid, AlertCircle } from 'lucide-react';
import { IReceipt } from '../types/receipt';
import { KrutiLogo, LOGO_MONO_SVG_STRING } from './KrutiLogo';

export type StickerSize = '80x30' | '50x25';

interface StickerPrintProps {
  receipt: IReceipt | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Rugtek RP-326 / 80mm Thermal Printer Direct Sticker Print
 * Calibrated specifically for Rugtek RP-326 80mm x 30mm Sticker Labels:
 * - NO Shop Name text in header (ONLY Official Kruti Logo)
 * - Exact 80mm x 30mm label size (@page size: 80mm 30mm; margin: 0mm !important;)
 * - Zero top whitespace - starts immediately from the top edge
 * - Horizontal layout: Left side (Customer + TV info) | Right side (Clear Barcode)
 */
export function printStickerDirect(
  receipt: IReceipt,
  size: StickerSize = '80x30'
) {
  const receiptNo = receipt.serialNumber || 'KR-000';
  const customerName = (receipt.customerName || 'CUSTOMER').toUpperCase();
  const mobile = receipt.mobileNumber || '-';
  const date = receipt.receivedDate || new Date().toISOString().split('T')[0];

  const firstTv = receipt.tvs?.[0];
  const tvBrand = firstTv?.brand || 'Television';
  const tvSize = firstTv?.size ? ` ${firstTv.size}` : '';
  const tvModel = firstTv?.modelNumber ? ` (${firstTv.modelNumber})` : '';
  const tvBrandModel = `${tvBrand}${tvSize}${tvModel}`.trim();
  const rackNo = firstTv?.rackNo || '-';
  const fault =
    receipt.tvs
      ?.map((tv) => tv.complaint)
      .filter(Boolean)
      .join(', ') || 'No Display / Panel Problem';

  const escapeHtml = (value: unknown) => {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const safeReceiptNo = escapeHtml(receiptNo);
  const safeCustomerName = escapeHtml(customerName);
  const safeMobile = escapeHtml(mobile);
  const safeDate = escapeHtml(date);
  const safeTvBrandModel = escapeHtml(tvBrandModel);
  const safeRackNo = escapeHtml(rackNo);
  const safeFault = escapeHtml(fault);

  const widthMm = size === '80x30' ? 80 : 50;
  const heightMm = size === '80x30' ? 30 : 25;

  const iframeId = 'kruti_sticker_print_frame';
  const oldIframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
  if (oldIframe) {
    oldIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = iframeId;
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = `${widthMm}mm`;
  iframe.style.height = `${heightMm}mm`;
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }

  let bodyContent = '';

  if (size === '80x30') {
    // 80x30mm Rugtek RP-326 Thermal Sticker
    // ONLY LOGO (NO SHOP NAME TEXT) + HELPLINE IN HEADER
    bodyContent = `
      <div class="sticker-80x30">
        <!-- Top Bar: ONLY LOGO (No name text) + Helpline -->
        <div class="s80-hdr">
          <div class="s80-logo">${LOGO_MONO_SVG_STRING}</div>
          <div class="s80-phone">TEL: 099045 88634</div>
        </div>

        <!-- Main Body: Two Columns (Left Details + Right Barcode) -->
        <div class="s80-body">
          <div class="s80-details">
            <div class="detail-row">
              <span class="rc-badge">RC: ${safeReceiptNo}</span>
              <span class="date-txt">DT: ${safeDate}</span>
            </div>
            <div class="detail-row">
              <span class="lbl">NAME:</span>
              <span class="val font-strong">${safeCustomerName}</span>
            </div>
            <div class="detail-row">
              <span class="lbl">MOB:</span>
              <span class="val font-mono">${safeMobile}</span>
            </div>
            <div class="detail-row">
              <span class="lbl">TV:</span>
              <span class="val">${safeTvBrandModel}</span>
            </div>
            <div class="detail-row">
              <span class="lbl">RACK:</span>
              <span class="rack-badge">${safeRackNo}</span>
              <span class="lbl-inline">FLT:</span>
              <span class="val truncate-fault">${safeFault}</span>
            </div>
          </div>

          <!-- Barcode Area (Scannable Code128) -->
          <div class="s80-barcode-col">
            <svg id="sticker-barcode"></svg>
            <div class="barcode-serial">${safeReceiptNo}</div>
          </div>
        </div>
      </div>
    `;
  } else {
    // 50x25mm Small Sticker
    // ONLY LOGO (NO SHOP NAME TEXT) + HELPLINE
    bodyContent = `
      <div class="sticker-50x25">
        <div class="s50-hdr">
          <div class="s50-logo">${LOGO_MONO_SVG_STRING}</div>
          <div class="s50-phone">099045 88634</div>
        </div>
        <div class="s50-body">
          <div class="s50-details">
            <div class="s50-row"><b>RC:</b> <span class="font-mono font-black">${safeReceiptNo}</span></div>
            <div class="s50-row truncate"><b>NAME:</b> ${safeCustomerName}</div>
            <div class="s50-row"><b>MOB:</b> ${safeMobile}</div>
            <div class="s50-row truncate"><b>TV:</b> ${safeTvBrandModel}</div>
            <div class="s50-row"><b>RACK:</b> ${safeRackNo}</div>
          </div>
          <div class="s50-barcode-col">
            <svg id="sticker-barcode"></svg>
            <div class="s50-barcode-serial">${safeReceiptNo}</div>
          </div>
        </div>
      </div>
    `;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sticker_${safeReceiptNo}</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <style>
    @page {
      size: ${widthMm}mm ${heightMm}mm;
      margin: 0mm !important;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      width: ${widthMm}mm !important;
      height: ${heightMm}mm !important;
      max-height: ${heightMm}mm !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, Helvetica, sans-serif;
      overflow: hidden;
      line-height: 1.1;
    }

    @media print {
      html, body {
        width: ${widthMm}mm !important;
        height: ${heightMm}mm !important;
        max-height: ${heightMm}mm !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
    }

    /* 80mm x 30mm RUGTEK RP-326 STICKER */
    .sticker-80x30 {
      width: 80mm;
      height: 30mm;
      max-width: 80mm;
      max-height: 30mm;
      padding: 1.2mm 2mm 1mm 2mm;
      margin: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .s80-hdr {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 0.8px solid #000000;
      padding-bottom: 0.8mm;
      margin-bottom: 0.8mm;
    }

    .s80-logo {
      width: 6mm;
      height: 6mm;
      display: flex;
      align-items: center;
    }
    .s80-logo svg {
      width: 100%;
      height: 100%;
    }

    .s80-phone {
      font-size: 6.8pt;
      font-weight: 900;
      font-family: monospace;
      letter-spacing: 0.2px;
    }

    .s80-body {
      display: flex;
      justify-content: space-between;
      align-items: stretch;
      gap: 2mm;
      flex: 1;
      overflow: hidden;
    }

    .s80-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      font-size: 6.2pt;
      padding-right: 1mm;
    }

    .detail-row {
      display: flex;
      align-items: center;
      white-space: nowrap;
      overflow: hidden;
      gap: 1.2mm;
      line-height: 1.15;
    }

    .rc-badge {
      font-family: monospace;
      font-size: 7.5pt;
      font-weight: 900;
      letter-spacing: -0.2px;
    }

    .date-txt {
      font-size: 5.8pt;
      font-weight: 700;
      margin-left: auto;
      color: #333333;
    }

    .lbl {
      font-weight: 800;
      min-width: 8.5mm;
      font-size: 5.6pt;
      color: #222222;
    }

    .lbl-inline {
      font-weight: 800;
      font-size: 5.6pt;
      margin-left: 1mm;
    }

    .val {
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .font-strong {
      font-weight: 900;
      font-size: 6.5pt;
    }

    .font-mono {
      font-family: monospace;
      font-size: 6.5pt;
      font-weight: 800;
    }

    .rack-badge {
      font-weight: 900;
      font-size: 6.5pt;
    }

    .truncate-fault {
      max-width: 25mm;
      font-size: 5.8pt;
    }

    .s80-barcode-col {
      width: 26mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding-left: 1mm;
      border-left: 0.5px dashed #666666;
    }

    .s80-barcode-col svg {
      width: 100% !important;
      height: 14mm !important;
    }

    .barcode-serial {
      font-family: monospace;
      font-size: 6.2pt;
      font-weight: 900;
      letter-spacing: 1px;
      margin-top: 0.4mm;
      text-align: center;
    }

    /* 50mm x 25mm COMPACT STICKER */
    .sticker-50x25 {
      width: 50mm;
      height: 25mm;
      max-width: 50mm;
      max-height: 25mm;
      padding: 0.8mm 1.5mm;
      margin: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .s50-hdr {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 0.6px solid #000;
      padding-bottom: 0.4mm;
      margin-bottom: 0.4mm;
    }

    .s50-logo {
      width: 5mm;
      height: 5mm;
      display: flex;
      align-items: center;
    }
    .s50-logo svg {
      width: 100%;
      height: 100%;
    }

    .s50-phone {
      font-size: 5.5pt;
      font-weight: 900;
      font-family: monospace;
    }

    .s50-body {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1mm;
      flex: 1;
      overflow: hidden;
    }

    .s50-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.2mm;
      font-size: 5.2pt;
      line-height: 1.1;
      overflow: hidden;
    }

    .s50-row {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .s50-barcode-col {
      width: 16mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .s50-barcode-col svg {
      width: 100% !important;
      height: 12mm !important;
    }

    .s50-barcode-serial {
      font-family: monospace;
      font-size: 5pt;
      font-weight: 900;
      text-align: center;
    }

    .truncate {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 28mm;
    }
  </style>
</head>
<body>
  ${bodyContent}
  <script>
    window.onload = function() {
      try {
        if (typeof JsBarcode === 'function') {
          JsBarcode('#sticker-barcode', "${safeReceiptNo}", {
            format: "CODE128",
            width: ${size === '80x30' ? 1.15 : 0.95},
            height: ${size === '80x30' ? 42 : 28},
            displayValue: false,
            margin: 0
          });
        }
      } catch (e) {
        console.error('Barcode generation error', e);
      }
      setTimeout(function() {
        window.focus();
        window.print();
      }, 200);
    };
  </script>
</body>
</html>`;

  doc.open();
  doc.write(html);
  doc.close();
}

/**
 * StickerPrint Modal Component (Exported for App.tsx)
 */
export const StickerPrint: React.FC<StickerPrintProps> = ({ receipt, isOpen, onClose }) => {
  // Default is 80x30 for Rugtek RP-326
  const [selectedSize, setSelectedSize] = useState<StickerSize>('80x30');

  if (!isOpen || !receipt) return null;

  const receiptNo = receipt.serialNumber;
  const customerName = receipt.customerName.toUpperCase();
  const mobile = receipt.mobileNumber;
  const date = receipt.receivedDate;
  const firstTv = receipt.tvs[0];
  const tvBrandModel = firstTv
    ? `${firstTv.brand}${firstTv.size ? ' ' + firstTv.size : ''}${firstTv.modelNumber ? ' (' + firstTv.modelNumber + ')' : ''}`
    : 'Television';
  const rackNo = firstTv?.rackNo || '-';
  const fault = receipt.tvs.map((tv) => tv.complaint).filter(Boolean).join(', ') || 'No Display / Black Screen';

  const handlePrint = () => {
    printStickerDirect(receipt, selectedSize);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Tag className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="text-base font-extrabold">Thermal Sticker / POS Label Print</h3>
              <p className="text-[11px] text-slate-400">Rugtek RP-326 (80 × 30 mm) • Zero Top-Margin • Logo Only</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Paper Size Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Select Printer / Sticker Size:
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Option 1: 80x30mm Rugtek RP-326 (Default & Recommended) */}
              <button
                type="button"
                onClick={() => setSelectedSize('80x30')}
                className={`p-3 rounded-2xl text-xs font-bold border-2 transition cursor-pointer flex flex-col items-start gap-1 text-left ${
                  selectedSize === '80x30'
                    ? 'border-red-600 bg-red-50 text-red-700 shadow-sm ring-2 ring-red-500/20'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-extrabold text-sm">Rugtek RP-326 (80 × 30 mm)</span>
                  {selectedSize === '80x30' && <Check className="w-4 h-4 text-red-600" />}
                </div>
                <span className="text-[11px] font-normal text-slate-500">
                  Standard 80×30 mm Label • Zero Top Waste • Only Logo
                </span>
              </button>

              {/* Option 2: 50x25mm Small Barcode Sticker */}
              <button
                type="button"
                onClick={() => setSelectedSize('50x25')}
                className={`p-3 rounded-2xl text-xs font-bold border-2 transition cursor-pointer flex flex-col items-start gap-1 text-left ${
                  selectedSize === '50x25'
                    ? 'border-red-600 bg-red-50 text-red-700 shadow-sm ring-2 ring-red-500/20'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-extrabold text-sm">50 × 25 mm Sticker</span>
                  {selectedSize === '50x25' && <Check className="w-4 h-4 text-red-600" />}
                </div>
                <span className="text-[11px] font-normal text-slate-500">
                  Small Barcode Sticker Roll • Only Logo
                </span>
              </button>
            </div>
          </div>

          {/* Important Print Guide Box: Explaining Top Space Removal */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-950 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-900">Upar Ka Space Hatane Ke Liye 2 Zaroori Settings (Chrome Print):</p>
              <ul className="text-[11px] text-amber-800 space-y-0.5 list-disc list-inside">
                <li>
                  <strong>Margins: &quot;None&quot; select karein</strong> — Browser ka Default margin upar 10-15mm white space chhod deta hai. &quot;None&quot; karne se print ekdum top edge se shuru hota hai.
                </li>
                <li>
                  <strong>&quot;Headers and footers&quot; ko UNCHECK (Band) karein</strong> — Isse browser date/URL ka upar ka space poori tarah khatam ho jayega.
                </li>
              </ul>
            </div>
          </div>

          {/* Live Interactive Sticker Preview (Shows ONLY LOGO without shop name) */}
          <div className="flex flex-col items-center justify-center p-5 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300">
            <div className="flex items-center justify-between w-full mb-3 px-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <LayoutGrid className="w-3.5 h-3.5" /> Live Preview ({selectedSize === '80x30' ? '80mm × 30mm' : '50mm × 25mm'} — Logo Only)
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-mono">
                100% Real Size
              </span>
            </div>

            {selectedSize === '80x30' ? (
              /* 80mm x 30mm Real Card Preview */
              <div
                style={{ width: '80mm', height: '30mm' }}
                className="bg-white border-2 border-slate-900 shadow-md p-2 flex flex-col justify-between select-none overflow-hidden"
              >
                {/* Header: ONLY Logo + Helpline */}
                <div className="flex items-center justify-between border-b border-black pb-1">
                  <div className="flex items-center gap-1.5">
                    <KrutiLogo className="w-5 h-5" variant="monochrome" />
                  </div>
                  <span className="text-[6.5pt] font-extrabold font-mono text-slate-900">
                    TEL: 099045 88634
                  </span>
                </div>

                {/* Body: Left Details + Right Barcode */}
                <div className="flex items-center justify-between gap-1.5 pt-1 text-[6.2pt] leading-tight text-slate-900 my-auto">
                  <div className="flex flex-col gap-0.5 flex-1 overflow-hidden font-bold">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-[7pt]">RC: {receiptNo}</span>
                      <span className="text-[5.5pt] font-semibold text-slate-600">DT: {date}</span>
                    </div>
                    <div className="truncate font-black">NAME: {customerName}</div>
                    <div className="font-mono">MOB: {mobile}</div>
                    <div className="truncate">TV: {tvBrandModel}</div>
                    <div className="flex items-center gap-1">
                      <span>RACK: <b>{rackNo}</b></span>
                      <span className="truncate text-slate-600">| FLT: {fault}</span>
                    </div>
                  </div>

                  {/* Right Barcode Box */}
                  <div className="w-[25mm] pl-1.5 border-l border-dashed border-slate-400 flex flex-col items-center justify-center shrink-0">
                    <div className="flex gap-0.5 items-end h-5 w-full justify-center">
                      {[1, 2, 1, 3, 1, 2, 1, 3, 2, 1, 2, 1, 3, 1, 2, 1, 2, 3, 1, 2].map((w, i) => (
                        <div key={i} className="bg-slate-900 h-full" style={{ width: `${w * 1.1}px` }} />
                      ))}
                    </div>
                    <span className="text-[5.5pt] font-mono font-black mt-0.5 tracking-wider">{receiptNo}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* 50mm x 25mm Real Card Preview */
              <div
                style={{ width: '50mm', height: '25mm' }}
                className="bg-white border-2 border-slate-900 shadow-md p-1.5 flex flex-col justify-between select-none overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-black pb-0.5">
                  <KrutiLogo className="w-4 h-4" variant="monochrome" />
                  <span className="text-[5pt] font-bold font-mono">099045 88634</span>
                </div>
                <div className="flex items-center justify-between gap-1 text-[5.5pt] leading-tight font-bold text-slate-900 my-auto">
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <div>RC: <span className="font-black font-mono">{receiptNo}</span></div>
                    <div className="truncate max-w-[24mm]">NAME: {customerName}</div>
                    <div>MOB: {mobile}</div>
                    <div className="truncate max-w-[24mm]">TV: {tvBrandModel}</div>
                    <div>RACK: {rackNo}</div>
                  </div>
                  <div className="w-12 h-9 border-l border-dashed border-slate-400 flex flex-col items-center justify-center pl-1">
                    <div className="flex gap-0.5 items-end h-5 w-full justify-center">
                      {[1, 2, 1, 3, 1, 2, 1, 3, 2, 1, 2, 1].map((w, i) => (
                        <div key={i} className="bg-slate-900 h-full" style={{ width: `${w}px` }} />
                      ))}
                    </div>
                    <span className="text-[5pt] font-mono font-bold mt-0.5">{receiptNo}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-red-600/25 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              PRINT TO RUGTEK RP-326 ({selectedSize === '80x30' ? '80 × 30 mm' : '50 × 25 mm'})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
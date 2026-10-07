import React, { useState } from 'react';
import { Printer, X, Tag, Info, Check, LayoutGrid } from 'lucide-react';
import { IReceipt } from '../types/receipt';
import { KrutiLogo, LOGO_SVG_STRING } from './KrutiLogo';

export type StickerSize = '50x25' | '80x30';
export type StickerOrientation = 'landscape' | 'portrait';

interface StickerPrintProps {
  receipt: IReceipt | null;
  isOpen: boolean;
  onClose: () => void;
}

export function printStickerDirect(
  receipt: IReceipt,
  size: StickerSize = '50x25',
  orientation: StickerOrientation = 'landscape'
) {
  const receiptNo = receipt.serialNumber || 'KR-000';
  const customerName = (receipt.customerName || 'CUSTOMER').toUpperCase();
  const mobile = receipt.mobileNumber || '-';
  const date = receipt.receivedDate || new Date().toISOString().split('T')[0];

  const firstTv = receipt.tvs?.[0];
  const tvBrandModel = firstTv
    ? `${firstTv.brand || ''}${firstTv.size ? ' ' + firstTv.size : ''}${firstTv.modelNumber ? ' (' + firstTv.modelNumber + ')' : ''}`.trim() || 'Television'
    : 'Television';
  const rackNo = firstTv?.rackNo || '-';
  const fault =
    receipt.tvs
      ?.map((tv) => tv.complaint)
      .filter(Boolean)
      .join(', ') || 'General Repair';

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

  const stickerWidthMm = size === '80x30' ? 80 : 50;
  const stickerHeightMm = size === '80x30' ? 30 : 25;

  const pageWidthMm = 80;
  const pageHeightMm = orientation === 'landscape' ? stickerHeightMm : stickerWidthMm;
  const contentWidthMm = orientation === 'landscape' ? stickerWidthMm : stickerHeightMm;
  const contentHeightMm = orientation === 'landscape' ? stickerHeightMm : stickerWidthMm;

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
  iframe.style.width = `${pageWidthMm}mm`;
  iframe.style.height = `${pageHeightMm}mm`;
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }

  let bodyContent = '';

  if (size === '50x25') {
    if (orientation === 'landscape') {
      bodyContent = `
        <div class="sticker sticker-50-landscape">
          <div class="hdr-50">
            <div class="logo-box-50">${LOGO_SVG_STRING}</div>
            <span class="helpline-50">TEL: 7778833577</span>
          </div>
          <div class="main-split-50">
            <div class="rows-50">
              <div class="row-item"><span class="lbl-50">RC:</span><span class="val-50 rc-code">${safeReceiptNo}</span></div>
              <div class="row-item"><span class="lbl-50">NAME:</span><span class="val-50">${safeCustomerName}</span></div>
              <div class="row-item"><span class="lbl-50">DATE:</span><span class="val-50">${safeDate}</span></div>
              <div class="row-item"><span class="lbl-50">FAULT:</span><span class="val-50">${safeFault}</span></div>
            </div>
            <div class="barcode-container-50">
              <svg id="sticker-barcode" class="barcode-svg-50"></svg>
            </div>
          </div>
        </div>
      `;
    } else {
      bodyContent = `
        <div class="sticker sticker-50-portrait">
          <div class="hdr-v50">
            <div class="logo-box-v50">${LOGO_SVG_STRING}</div>
          </div>
          <div class="rc-v50">${safeReceiptNo}</div>
          <div class="barcode-box-v50">
            <svg id="sticker-barcode" class="barcode-svg-v50"></svg>
          </div>
          <div class="rows-v50">
            <div class="vrow"><span class="vlbl">CUST:</span><span class="vval">${safeCustomerName}</span></div>
            <div class="vrow"><span class="vlbl">MOB:</span><span class="vval">${safeMobile}</span></div>
            <div class="vrow"><span class="vlbl">DATE:</span><span class="vval">${safeDate}</span></div>
            <div class="vrow"><span class="vlbl">TV:</span><span class="vval">${safeTvBrandModel}</span></div>
            <div class="vrow"><span class="vlbl">RACK:</span><span class="vval font-bold">${safeRackNo}</span></div>
            <div class="vrow"><span class="vlbl">FAULT:</span><span class="vval">${safeFault}</span></div>
          </div>
        </div>
      `;
    }
  } else {
    // 80x30
    if (orientation === 'landscape') {
      bodyContent = `
        <div class="sticker sticker-80-landscape">
          <div class="hdr-80">
            <div class="logo-name-80">
              <div class="logo-box-80">${LOGO_SVG_STRING}</div>
            </div>
            <span class="shop-phone">HELPLINE: 7778833577</span>
          </div>
          <div class="grid-80">
            <div class="col-80">
              <div class="row-item"><span class="lbl-80">RECEIPT:</span><span class="val-80 rc-code-80">${safeReceiptNo}</span></div>
              <div class="row-item"><span class="lbl-80">CUSTOMER:</span><span class="val-80">${safeCustomerName}</span></div>
              <div class="row-item"><span class="lbl-80">PHONE:</span><span class="val-80">${safeMobile}</span></div>
            </div>
            <div class="col-80">
              <div class="row-item"><span class="lbl-80">DATE:</span><span class="val-80">${safeDate}</span></div>
              <div class="row-item"><span class="lbl-80">TV:</span><span class="val-80">${safeTvBrandModel}</span></div>
              <div class="row-item"><span class="lbl-80">RACK:</span><span class="val-80">${safeRackNo}</span></div>
            </div>
            <div class="barcode-col-80">
              <svg id="sticker-barcode" class="barcode-svg-80"></svg>
            </div>
          </div>
          <div class="fault-strip-80">
            <span class="lbl-80">FAULT:</span>
            <span class="val-80">${safeFault}</span>
          </div>
        </div>
      `;
    } else {
      bodyContent = `
        <div class="sticker sticker-80-portrait">
          <div class="hdr-v80">
            <div class="logo-box-v80">${LOGO_SVG_STRING}</div>
          </div>
          <div class="rc-v80">${safeReceiptNo}</div>
          <div class="barcode-box-v80">
            <svg id="sticker-barcode" class="barcode-svg-v80"></svg>
          </div>
          <div class="rows-v80">
            <div class="vrow"><span class="vlbl">CUST:</span><span class="vval">${safeCustomerName}</span></div>
            <div class="vrow"><span class="vlbl">MOB:</span><span class="vval">${safeMobile}</span></div>
            <div class="vrow"><span class="vlbl">DATE:</span><span class="vval">${safeDate}</span></div>
            <div class="vrow"><span class="vlbl">TV:</span><span class="vval">${safeTvBrandModel}</span></div>
            <div class="vrow"><span class="vlbl">RACK:</span><span class="vval">${safeRackNo}</span></div>
            <div class="vrow"><span class="vlbl">FAULT:</span><span class="vval">${safeFault}</span></div>
          </div>
          <div class="footer-v80">TEL: 7778833577</div>
        </div>
      `;
    }
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sticker_${safeReceiptNo}</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <style>
    @page {
      size: ${pageWidthMm}mm ${pageHeightMm}mm;
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
      width: ${pageWidthMm}mm;
      height: ${pageHeightMm}mm;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      overflow: hidden;
    }
    @media print {
      html, body {
        width: ${pageWidthMm}mm !important;
        height: ${pageHeightMm}mm !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    }
    .sticker {
      background: #ffffff;
      color: #000000;
      width: ${contentWidthMm}mm;
      height: ${contentHeightMm}mm;
      max-width: ${contentWidthMm}mm;
      max-height: ${contentHeightMm}mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .sticker-50-landscape {
      padding: 0.8mm 1.5mm;
      justify-content: space-between;
    }
    .hdr-50 {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 0.8px solid #000000;
      padding-bottom: 0.3mm;
      line-height: 1;
    }
    .logo-box-50 {
      width: 6mm;
      height: 6mm;
      display: flex;
      align-items: center;
    }
    .logo-box-50 svg {
      width: 100%;
      height: 100%;
    }
    .helpline-50 {
      font-size: 5.5pt;
      font-weight: 800;
      font-family: monospace;
    }
    .main-split-50 {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1mm;
      padding-top: 0.2mm;
    }
    .rows-50 {
      display: flex;
      flex-direction: column;
      gap: 0.25mm;
      flex: 1;
      overflow: hidden;
    }
    .row-item {
      display: flex;
      align-items: baseline;
      font-size: 6.2pt;
      line-height: 1.05;
      white-space: nowrap;
      overflow: hidden;
    }
    .lbl-50 {
      font-weight: 800;
      min-width: 9.5mm;
      display: inline-block;
      font-size: 5.5pt;
    }
    .val-50 {
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .rc-code {
      font-size: 7.5pt;
      font-weight: 900;
      font-family: monospace;
    }
    .barcode-container-50 {
      width: 17mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .barcode-svg-50 {
      width: 100% !important;
      height: 13mm !important;
    }
    .sticker-50-portrait {
      padding: 1mm;
      justify-content: space-between;
    }
    .hdr-v50 {
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 0.8px solid #000000;
      padding-bottom: 0.3mm;
    }
    .logo-box-v50 {
      width: 6.5mm;
      height: 6.5mm;
    }
    .logo-box-v50 svg {
      width: 100%;
      height: 100%;
    }
    .rc-v50 {
      text-align: center;
      font-size: 8pt;
      font-weight: 900;
      font-family: monospace;
      margin: 0.3mm 0;
    }
    .barcode-box-v50 {
      width: 100%;
      height: 9mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .barcode-svg-v50 {
      width: 100% !important;
      height: 8.5mm !important;
    }
    .rows-v50 {
      display: flex;
      flex-direction: column;
      gap: 0.3mm;
      border-top: 0.5px dashed #444444;
      padding-top: 0.4mm;
    }
    .vrow {
      display: flex;
      font-size: 5pt;
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
    }
    .vlbl {
      font-weight: 800;
      min-width: 6.5mm;
    }
    .vval {
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sticker-80-landscape {
      padding: 1.2mm 2.2mm;
      justify-content: space-between;
    }
    .hdr-80 {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #000000;
      padding-bottom: 0.4mm;
    }
    .logo-name-80 {
      display: flex;
      align-items: center;
    }
    .logo-box-80 {
      width: 8mm;
      height: 8mm;
    }
    .logo-box-80 svg {
      width: 100%;
      height: 100%;
    }
    .shop-phone {
      font-size: 6.5pt;
      font-weight: 800;
      font-family: monospace;
    }
    .grid-80 {
      display: grid;
      grid-template-columns: 27mm 25mm 23mm;
      gap: 1.5mm;
      align-items: center;
      padding: 0.6mm 0;
    }
    .col-80 {
      display: flex;
      flex-direction: column;
      gap: 0.4mm;
    }
    .lbl-80 {
      font-weight: 800;
      min-width: 12mm;
      display: inline-block;
      font-size: 6pt;
    }
    .val-80 {
      font-weight: 700;
      font-size: 6.5pt;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .rc-code-80 {
      font-size: 8.5pt;
      font-weight: 900;
      font-family: monospace;
    }
    .barcode-col-80 {
      height: 14mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .barcode-svg-80 {
      width: 100% !important;
      height: 13.5mm !important;
    }
    .fault-strip-80 {
      border-top: 0.5px dashed #444444;
      padding-top: 0.4mm;
      display: flex;
      align-items: center;
      gap: 1mm;
      font-size: 6pt;
      white-space: nowrap;
      overflow: hidden;
    }
    .sticker-80-portrait {
      padding: 1.2mm;
      justify-content: space-between;
    }
    .hdr-v80 {
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 1px solid #000000;
      padding-bottom: 0.4mm;
    }
    .logo-box-v80 {
      width: 9mm;
      height: 9mm;
    }
    .logo-box-v80 svg {
      width: 100%;
      height: 100%;
    }
    .rc-v80 {
      text-align: center;
      font-size: 9pt;
      font-weight: 900;
      font-family: monospace;
    }
    .barcode-box-v80 {
      width: 100%;
      height: 11mm;
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 0.5px dashed #444444;
      padding-bottom: 0.3mm;
      margin-bottom: 0.3mm;
    }
    .barcode-svg-v80 {
      width: 100% !important;
      height: 10.5mm !important;
    }
    .rows-v80 {
      display: flex;
      flex-direction: column;
      gap: 0.5mm;
    }
    .footer-v80 {
      text-align: center;
      font-size: 5pt;
      font-weight: 800;
      border-top: 0.5px solid #000000;
      padding-top: 0.3mm;
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
            width: ${size === '80x30' ? 1.4 : 1.1},
            height: ${size === '80x30' ? 34 : 26},
            displayValue: false,
            margin: 0
          });
        }
      } catch (e) {
        console.error('Barcode error', e);
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

export const StickerPrint: React.FC<StickerPrintProps> = ({ receipt, isOpen, onClose }) => {
  const [selectedSize, setSelectedSize] = useState<StickerSize>('50x25');
  const [selectedOrientation, setSelectedOrientation] = useState<StickerOrientation>('landscape');

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
  const fault = receipt.tvs.map((tv) => tv.complaint).filter(Boolean).join(', ') || 'General Repair';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Tag className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="text-base font-extrabold">Thermal Sticker Print (Logo & Barcode)</h3>
              <p className="text-[11px] text-slate-400">TV back cover label for technician barcode scanning</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Sticker Size:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSize('50x25')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedSize === '50x25'
                      ? 'border-red-600 bg-red-50 text-red-700 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {selectedSize === '50x25' && <Check className="w-3.5 h-3.5 text-red-600" />}
                  50 × 25 mm
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSize('80x30')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedSize === '80x30'
                      ? 'border-red-600 bg-red-50 text-red-700 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {selectedSize === '80x30' && <Check className="w-3.5 h-3.5 text-red-600" />}
                  80 × 30 mm
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Orientation:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrientation('landscape')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedOrientation === 'landscape'
                      ? 'border-red-600 bg-red-50 text-red-700 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {selectedOrientation === 'landscape' && <Check className="w-3.5 h-3.5 text-red-600" />}
                  Horizontal
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrientation('portrait')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedOrientation === 'portrait'
                      ? 'border-red-600 bg-red-50 text-red-700 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {selectedOrientation === 'portrait' && <Check className="w-3.5 h-3.5 text-red-600" />}
                  Vertical
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Preview - ONLY LOGO */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300">
            <div className="flex items-center justify-between w-full mb-3 px-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <LayoutGrid className="w-3.5 h-3.5" /> Preview ({selectedSize === '80x30' ? '80mm × 30mm' : '50mm × 25mm'} - {selectedOrientation === 'landscape' ? 'Horizontal' : 'Vertical'})
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-mono">100% Scale</span>
            </div>

            {selectedSize === '50x25' ? (
              <div
                style={{ width: '50mm', height: '25mm' }}
                className="bg-white border-2 border-slate-900 shadow-md p-1.5 flex flex-col justify-between select-none"
              >
                <div className="flex items-center justify-between border-b border-black pb-0.5">
                  <div className="flex items-center gap-1">
                    <KrutiLogo className="w-5 h-5" />
                  </div>
                  <span className="text-[5pt] font-bold font-mono">TEL: 7778833577</span>
                </div>
                <div className="flex items-center justify-between gap-1 text-[6.2pt] leading-tight font-bold text-slate-900 my-auto">
                  <div className="flex flex-col gap-0.5">
                    <div>RC: <span className="font-black font-mono">{receiptNo}</span></div>
                    <div className="truncate max-w-[24mm]">NAME: {customerName}</div>
                    <div>DATE: {date}</div>
                    <div className="truncate max-w-[24mm]">FAULT: {fault}</div>
                  </div>
                  <div className="w-12 h-9 bg-slate-100 border border-slate-300 rounded flex flex-col items-center justify-center p-0.5">
                    <div className="flex gap-0.5 items-end h-5 w-full justify-center">
                      {[1, 2, 1, 3, 1, 2, 1, 3, 2, 1, 2, 1].map((w, i) => (
                        <div key={i} className="bg-slate-800 h-full" style={{ width: `${w}px` }} />
                      ))}
                    </div>
                    <span className="text-[5pt] font-mono font-bold mt-0.5">{receiptNo}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{ width: '80mm', height: '30mm' }}
                className="bg-white border-2 border-slate-900 shadow-md p-2 flex flex-col justify-between select-none"
              >
                <div className="flex items-center justify-between border-b border-black pb-0.5">
                  <div className="flex items-center gap-1.5">
                    <KrutiLogo className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-[5.5pt] text-slate-700">HELPLINE: 7778833577</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[6.2pt] leading-tight font-bold text-slate-900 my-auto items-center">
                  <div className="flex flex-col gap-0.5">
                    <div>RECEIPT: <span className="font-mono text-red-600 font-black">{receiptNo}</span></div>
                    <div className="truncate max-w-[20mm]">CUST: {customerName}</div>
                    <div className="font-mono">PHONE: {mobile}</div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div>DATE: {date}</div>
                    <div className="truncate max-w-[20mm]">TV: {tvBrandModel}</div>
                    <div>RACK: {rackNo}</div>
                  </div>
                  <div className="h-10 bg-slate-100 border border-slate-300 rounded flex flex-col items-center justify-center p-0.5">
                    <div className="flex gap-0.5 items-end h-6 w-full justify-center">
                      {[2, 1, 3, 1, 2, 1, 3, 2, 1, 2, 1, 3, 1, 2].map((w, i) => (
                        <div key={i} className="bg-slate-800 h-full" style={{ width: `${w}px` }} />
                      ))}
                    </div>
                    <span className="text-[5pt] font-mono font-bold">{receiptNo}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 border-t border-dashed border-slate-400 pt-0.5 text-[6.2pt]">
                  <span className="font-extrabold shrink-0">FAULT:</span>
                  <span className="truncate font-medium text-slate-800">{fault}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer">
            Cancel
          </button>
          <button
            onClick={() => printStickerDirect(receipt, selectedSize, selectedOrientation)}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-2 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Sticker ({selectedSize})
          </button>
        </div>
      </div>
    </div>
  );
};
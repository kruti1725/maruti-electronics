import React, { useState } from 'react';
import { Printer, X, Tag, Check, LayoutGrid, AlertCircle } from 'lucide-react';
import { IReceipt } from '../types/receipt';
import { KrutiLogo, LOGO_SVG_STRING } from './KrutiLogo';

export type StickerSize = 'rp326' | '50x25';

interface StickerPrintProps {
  receipt: IReceipt | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Rugtek RP-326 / 80mm POS Thermal Printer Direct Print
 * Calibrated for ZERO TOP MARGIN & ZERO PAPER WASTE
 */
export function printStickerDirect(
  receipt: IReceipt,
  size: StickerSize = 'rp326'
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
      .join(', ') || 'No Display / Black Screen';

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
  iframe.style.width = '80mm';
  iframe.style.height = '60mm';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }

  let bodyContent = '';

  if (size === 'rp326') {
    bodyContent = `
      <div class="rp326-ticket">
        <div class="rp-hdr">
          <div class="rp-brand">
            <div class="rp-logo">${LOGO_SVG_STRING}</div>
            <div>
              <div class="rp-title">KRUTI ELECTRONICS</div>
              <div class="rp-sub">TV REPAIR & SERVICE CENTER</div>
            </div>
          </div>
          <div class="rp-contact">
            HELPLINE: 099045 88634
          </div>
        </div>

        <div class="rp-divider"></div>

        <table class="rp-table">
          <tr>
            <td class="col-left"><span class="f-lbl">Receipt No:</span> <strong class="f-rc">${safeReceiptNo}</strong></td>
            <td class="col-right"><span class="f-lbl">Date:</span> <strong>${safeDate}</strong></td>
          </tr>
          <tr>
            <td class="col-left"><span class="f-lbl">Customer:</span> <strong>${safeCustomerName}</strong></td>
            <td class="col-right"><span class="f-lbl">TV Model:</span> <strong>${safeTvBrandModel}</strong></td>
          </tr>
          <tr>
            <td class="col-left"><span class="f-lbl">Phone:</span> <strong>${safeMobile}</strong></td>
            <td class="col-right"><span class="f-lbl">Rack No:</span> <strong>${safeRackNo}</strong></td>
          </tr>
          <tr>
            <td colspan="2" class="col-full">
              <span class="f-lbl">Fault:</span> <strong>${safeFault}</strong>
            </td>
          </tr>
        </table>

        <div class="rp-barcode-area">
          <svg id="sticker-barcode"></svg>
          <div class="rp-barcode-text">${safeReceiptNo}</div>
        </div>
      </div>
    `;
  } else {
    bodyContent = `
      <div class="sticker-50mm">
        <div class="s50-hdr">
          <div class="s50-logo">${LOGO_SVG_STRING}</div>
          <div class="s50-title">KRUTI ELECTRONICS</div>
          <div class="s50-tel">099045 88634</div>
        </div>
        <div class="s50-body">
          <div class="s50-info">
            <div><b>RC:</b> ${safeReceiptNo}</div>
            <div class="truncate"><b>NAME:</b> ${safeCustomerName}</div>
            <div><b>MOB:</b> ${safeMobile}</div>
            <div class="truncate"><b>TV:</b> ${safeTvBrandModel}</div>
            <div><b>RACK:</b> ${safeRackNo}</div>
          </div>
          <div class="s50-barcode">
            <svg id="sticker-barcode"></svg>
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
      size: 80mm auto;
      margin: 0mm !important;
      margin-top: 0mm !important;
      margin-bottom: 0mm !important;
      margin-left: 0mm !important;
      margin-right: 0mm !important;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      width: 80mm !important;
      margin: 0 !important;
      margin-top: 0 !important;
      padding: 0 !important;
      padding-top: 0 !important;
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, Helvetica, sans-serif;
      overflow: hidden;
    }

    @media print {
      html, body {
        width: 80mm !important;
        margin: 0 !important;
        margin-top: 0 !important;
        padding: 0 !important;
        padding-top: 0 !important;
      }
    }

    /* RUGTEK RP-326 (80mm) ZERO TOP WASTE STYLING */
    .rp326-ticket {
      width: 76mm;
      max-width: 76mm;
      margin: 0 auto;
      padding-top: 0.5mm !important; /* Start directly from the top cut edge */
      padding-bottom: 1mm;
      padding-left: 1mm;
      padding-right: 1mm;
      background: #ffffff;
    }

    .rp-hdr {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0 !important;
      margin-top: 0 !important;
      padding-bottom: 1mm;
    }

    .rp-brand {
      display: flex;
      align-items: center;
      gap: 1.5mm;
    }

    .rp-logo {
      width: 6mm;
      height: 6mm;
    }
    .rp-logo svg {
      width: 100%;
      height: 100%;
    }

    .rp-title {
      font-size: 8.5pt;
      font-weight: 900;
      letter-spacing: -0.2px;
      line-height: 1.1;
    }

    .rp-sub {
      font-size: 5pt;
      font-weight: 700;
      color: #333333;
      letter-spacing: 0.1px;
    }

    .rp-contact {
      font-size: 5.8pt;
      font-weight: 800;
      text-align: right;
      white-space: nowrap;
      line-height: 1.1;
    }

    .rp-divider {
      width: 100%;
      height: 0.8px;
      background: #000000;
      margin-bottom: 1.2mm;
    }

    .rp-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 6.8pt;
      line-height: 1.35;
    }

    .rp-table td {
      vertical-align: top;
      padding: 0.4mm 0;
    }

    .col-left {
      width: 52%;
      padding-right: 1mm !important;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .col-right {
      width: 48%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .col-full {
      padding-top: 0.6mm !important;
      border-top: 0.5px dashed #666666;
      word-break: break-word;
    }

    .f-lbl {
      font-weight: 600;
      color: #222222;
      display: inline-block;
      margin-right: 0.8mm;
    }

    .f-rc {
      font-family: monospace;
      font-size: 8pt;
      font-weight: 900;
    }

    .rp-barcode-area {
      margin-top: 1.2mm;
      padding-top: 0.8mm;
      border-top: 0.5px dashed #444444;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    #sticker-barcode {
      width: 68mm !important;
      height: 11mm !important;
    }

    .rp-barcode-text {
      font-family: monospace;
      font-size: 6.5pt;
      font-weight: 900;
      letter-spacing: 1.5px;
      margin-top: 0.3mm;
    }

    .sticker-50mm {
      width: 50mm;
      height: 25mm;
      padding: 0.5mm 1mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 1px solid #000;
    }
    .s50-hdr {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 0.6px solid #000;
      padding-bottom: 0.3mm;
    }
    .s50-logo {
      width: 4mm;
      height: 4mm;
    }
    .s50-title {
      font-size: 6pt;
      font-weight: 900;
    }
    .s50-tel {
      font-size: 5pt;
      font-weight: 700;
    }
    .s50-body {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1mm;
    }
    .s50-info {
      font-size: 5.5pt;
      line-height: 1.15;
      flex: 1;
      overflow: hidden;
    }
    .s50-barcode {
      width: 16mm;
    }
    .s50-barcode svg {
      width: 100% !important;
      height: 13mm !important;
    }
    .truncate {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 32mm;
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
            width: ${size === '50x25' ? 1.0 : 1.6},
            height: ${size === '50x25' ? 24 : 32},
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
      }, 250);
    };
  </script>
</body>
</html>`;

  doc.open();
  doc.write(html);
  doc.close();
}

export const StickerPrint: React.FC<StickerPrintProps> = ({ receipt, isOpen, onClose }) => {
  const [selectedSize, setSelectedSize] = useState<StickerSize>('rp326');

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

  const handlePrint = () => {
    printStickerDirect(receipt, selectedSize);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Tag className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="text-base font-extrabold">Thermal Sticker / POS Label Print</h3>
              <p className="text-[11px] text-slate-400">Zero Top-Margin • Rugtek RP-326 (80mm)</p>
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
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Select Printer / Paper Size:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedSize('rp326')}
                className={`p-3 rounded-2xl text-xs font-bold border-2 transition cursor-pointer flex flex-col items-start gap-1 ${
                  selectedSize === 'rp326'
                    ? 'border-red-600 bg-red-50 text-red-700 shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-extrabold text-sm">Rugtek RP-326 (80mm)</span>
                  {selectedSize === 'rp326' && <Check className="w-4 h-4 text-red-600" />}
                </div>
                <span className="text-[11px] font-normal text-slate-500">
                  Zero Top-Waste • Full 80mm Roll
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSize('50x25')}
                className={`p-3 rounded-2xl text-xs font-bold border-2 transition cursor-pointer flex flex-col items-start gap-1 ${
                  selectedSize === '50x25'
                    ? 'border-red-600 bg-red-50 text-red-700 shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-extrabold text-sm">50 × 25 mm Sticker</span>
                  {selectedSize === '50x25' && <Check className="w-4 h-4 text-red-600" />}
                </div>
                <span className="text-[11px] font-normal text-slate-500">
                  Small Barcode Sticker Roll
                </span>
              </button>
            </div>
          </div>

          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-950 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Upar Ka Space Bachane Ke Liye Zaroori Setting:</p>
              <p className="text-[11px] text-amber-800">
                Print popup mein <strong>"Headers and footers" ko UNCHECK (Band)</strong> karein aur <strong>Margins ko "None"</strong> select karein. Isse upar ka khali hissa bilkul khatam ho jayega aur paper waste nahi hoga!
              </p>
            </div>
          </div>

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
              PRINT TO RUGTEK RP-326
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
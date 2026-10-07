import React, { useState } from 'react';
import { Printer, X, Tag, Info, Check, LayoutGrid } from 'lucide-react';
import { IReceipt } from '../types/receipt';

export type StickerSize = '50x25' | '80x30';
export type StickerOrientation = 'landscape' | 'portrait';

interface StickerPrintProps {
  receipt: IReceipt | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Real sticker printing function using an isolated print iframe.
 * Supports:
 * - 50mm x 25mm (Standard compact roll)
 * - 80mm x 30mm (Large / wide roll)
 * - Horizontal (landscape) or Vertical (portrait) orientation
 */
export function printStickerDirect(
  receipt: IReceipt,
  size: StickerSize = '50x25',
  orientation: StickerOrientation = 'landscape'
) {
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

  const widthMm = size === '80x30' ? 80 : 50;
  const heightMm = size === '80x30' ? 30 : 25;

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
  iframe.style.width = `${widthMm}mm`;
  iframe.style.height = `${heightMm}mm`;
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) return;

  const pageSizeStyle =
    orientation === 'landscape'
      ? `${widthMm}mm ${heightMm}mm landscape`
      : `${heightMm}mm ${widthMm}mm portrait`;

  let bodyContent = '';

  if (size === '80x30') {
    // 80mm x 30mm Large Horizontal Layout
    bodyContent = `
      <div class="sticker-container-80">
        <div class="header-80">
          <span class="shop-name">KRUTI ELECTRONICS</span>
          <span class="shop-sub">TV REPAIR & SERVICE | HELPLINE: 099045 88634</span>
        </div>
        <div class="body-grid-80">
          <div class="col-left">
            <div class="row">
              <span class="lbl">Receipt No:</span>
              <span class="val highlight">${receiptNo}</span>
            </div>
            <div class="row">
              <span class="lbl">Customer:</span>
              <span class="val">${customerName}</span>
            </div>
            <div class="row">
              <span class="lbl">Phone:</span>
              <span class="val">${mobile}</span>
            </div>
          </div>
          <div class="col-right">
            <div class="row">
              <span class="lbl">Date:</span>
              <span class="val">${date}</span>
            </div>
            <div class="row">
              <span class="lbl">TV Model:</span>
              <span class="val">${tvBrandModel}</span>
            </div>
            <div class="row">
              <span class="lbl">Rack No:</span>
              <span class="val">${rackNo}</span>
            </div>
          </div>
        </div>
        <div class="fault-row-80">
          <span class="lbl">Fault:</span>
          <span class="val fault-text">${fault}</span>
        </div>
      </div>
    `;
  } else {
    // 50mm x 25mm Compact Horizontal Layout
    bodyContent = `
      <div class="sticker-container-50">
        <div class="header-50">KRUTI ELECTRONICS</div>
        <div class="content-body-50">
          <div class="row">
            <span class="label">Receipt No:</span>
            <span class="value serial-val">${receiptNo}</span>
          </div>
          <div class="row">
            <span class="label">Name:</span>
            <span class="value">${customerName}</span>
          </div>
          <div class="row">
            <span class="label">Date:</span>
            <span class="value">${date}</span>
          </div>
          <div class="row">
            <span class="label">Fault:</span>
            <span class="value">${fault}</span>
          </div>
        </div>
      </div>
    `;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sticker - ${receiptNo}</title>
  <style>
    @page {
      size: ${pageSizeStyle};
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: ${widthMm}mm;
      height: ${heightMm}mm;
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow: hidden;
    }

    /* 50x25 Styles */
    .sticker-container-50 {
      width: 50mm;
      height: 25mm;
      padding: 1.2mm 2mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: left;
    }
    .header-50 {
      text-align: center;
      font-size: 7.8pt;
      font-weight: 900;
      letter-spacing: 0.3px;
      line-height: 1;
      text-transform: uppercase;
      border-bottom: 0.8px solid #000000;
      padding-bottom: 0.4mm;
    }
    .content-body-50 {
      display: flex;
      flex-direction: column;
      gap: 0.4mm;
      padding-top: 0.2mm;
    }
    .content-body-50 .row {
      display: flex;
      align-items: baseline;
      font-size: 6.8pt;
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .content-body-50 .label {
      font-weight: 800;
      min-width: 14mm;
      display: inline-block;
    }
    .content-body-50 .value {
      font-weight: 700;
      font-size: 6.8pt;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .content-body-50 .serial-val {
      font-size: 8.2pt;
      font-weight: 900;
    }

    /* 80x30 Styles */
    .sticker-container-80 {
      width: 80mm;
      height: 30mm;
      padding: 1.5mm 2.5mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: left;
    }
    .header-80 {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      border-bottom: 0.8px solid #000000;
      padding-bottom: 0.5mm;
      line-height: 1;
    }
    .header-80 .shop-name {
      font-size: 8.5pt;
      font-weight: 900;
      letter-spacing: 0.3px;
    }
    .header-80 .shop-sub {
      font-size: 5.5pt;
      font-weight: 700;
    }
    .body-grid-80 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2mm;
      padding-top: 0.8mm;
    }
    .body-grid-80 .row {
      display: flex;
      align-items: baseline;
      font-size: 7pt;
      line-height: 1.15;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .body-grid-80 .lbl {
      font-weight: 800;
      min-width: 15mm;
      display: inline-block;
      font-size: 6.5pt;
    }
    .body-grid-80 .val {
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 7pt;
    }
    .body-grid-80 .val.highlight {
      font-size: 8.8pt;
      font-weight: 900;
      font-family: monospace;
    }
    .fault-row-80 {
      display: flex;
      align-items: baseline;
      font-size: 6.8pt;
      line-height: 1.1;
      border-top: 0.5px dashed #444;
      padding-top: 0.5mm;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .fault-row-80 .lbl {
      font-weight: 800;
      min-width: 10mm;
      font-size: 6.5pt;
    }
    .fault-row-80 .fault-text {
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  ${bodyContent}
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

  const handlePrint = () => {
    printStickerDirect(receipt, selectedSize, selectedOrientation);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Tag className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="text-base font-extrabold">Thermal Sticker Print (Horizontal / Landscape)</h3>
              <p className="text-[11px] text-slate-400">TV back cover label for workshop tracking</p>
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
          {/* Controls: Size selection & Orientation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Size Options */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Sticker Size Option:
              </label>
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

            {/* Orientation Options */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Print Orientation:
              </label>
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
                  Horizontal (Landscape)
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
                  Vertical (Portrait)
                </button>
              </div>
            </div>
          </div>

          {/* Actual Scaled Interactive Preview */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300">
            <div className="flex items-center justify-between w-full mb-3 px-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <LayoutGrid className="w-3.5 h-3.5" /> Preview ({selectedSize === '80x30' ? '80mm × 30mm' : '50mm × 25mm'} - {selectedOrientation === 'landscape' ? 'Horizontal' : 'Vertical'})
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-mono">
                100% Scale
              </span>
            </div>

            {selectedSize === '50x25' ? (
              /* 50mm x 25mm Preview Box */
              <div
                style={{ width: '50mm', height: '25mm' }}
                className="bg-white border-2 border-slate-900 shadow-md p-1.5 flex flex-col justify-between select-none"
              >
                <div className="text-center font-black text-[8pt] leading-none uppercase border-b border-black pb-0.5 tracking-tight">
                  KRUTI ELECTRONICS
                </div>

                <div className="flex flex-col gap-0.5 text-[6.5pt] leading-tight font-bold text-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold">Receipt No:</span>
                    <span className="font-black text-[7.5pt] font-mono">{receiptNo}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold">Name:</span>
                    <span className="truncate max-w-[32mm] text-right font-medium">{customerName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold">Date:</span>
                    <span className="font-mono">{date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold">Fault:</span>
                    <span className="truncate max-w-[32mm] text-right font-normal">{fault}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* 80mm x 30mm Preview Box */
              <div
                style={{ width: '80mm', height: '30mm' }}
                className="bg-white border-2 border-slate-900 shadow-md p-2 flex flex-col justify-between select-none"
              >
                <div className="flex items-center justify-between border-b border-black pb-0.5">
                  <span className="font-black text-[8.5pt] uppercase tracking-tight">
                    KRUTI ELECTRONICS
                  </span>
                  <span className="font-bold text-[5.5pt] text-slate-700">
                    HELPLINE: 099045 88634
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[6.5pt] leading-tight font-bold text-slate-900 my-auto">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold">Receipt:</span>
                      <span className="font-black text-[8.5pt] font-mono text-red-600">{receiptNo}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold">Customer:</span>
                      <span className="truncate max-w-[22mm] font-semibold">{customerName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold">Phone:</span>
                      <span className="font-mono">{mobile}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold">Date:</span>
                      <span className="font-mono">{date}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold">TV:</span>
                      <span className="truncate max-w-[22mm] font-semibold">{tvBrandModel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold">Rack:</span>
                      <span className="font-mono">{rackNo}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 border-t border-dashed border-slate-400 pt-0.5 text-[6.5pt]">
                  <span className="font-extrabold shrink-0">Fault:</span>
                  <span className="truncate font-medium text-slate-800">{fault}</span>
                </div>
              </div>
            )}
          </div>

          {/* Printer Settings Reminder Box */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <Info className="w-4 h-4 text-amber-600 shrink-0" /> Printer Dialog Settings ({selectedSize === '80x30' ? '80×30mm' : '50×25mm'} {selectedOrientation === 'landscape' ? 'Horizontal' : 'Vertical'}):
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pl-5 list-disc text-[11px]">
              <li>Paper size: <strong>{selectedSize === '80x30' ? '80mm × 30mm' : '50mm × 25mm'}</strong></li>
              <li>Orientation: <strong>{selectedOrientation === 'landscape' ? 'Landscape (Horizontal)' : 'Portrait (Vertical)'}</strong></li>
              <li>Margins: <strong>None (0mm)</strong></li>
              <li>Headers & Footers: <strong>OFF (Unchecked)</strong></li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            Selected: <strong className="text-slate-800">{selectedSize === '80x30' ? '80×30 mm' : '50×25 mm'}</strong> ({selectedOrientation === 'landscape' ? 'Horizontal' : 'Vertical'})
          </p>

          <div className="flex items-center gap-2.5">
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
              <Printer className="w-4 h-4" /> Print Sticker ({selectedSize})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
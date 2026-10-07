export function printStickerDirect(
  receipt: IReceipt,
  size: StickerSize = '50x25',
  orientation: StickerOrientation = 'landscape'
) {
  /* =========================================================
     RECEIPT DATA
  ========================================================= */
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

  /* =========================================================
     HTML SAFETY
  ========================================================= */
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

  /* =========================================================
     RUGTEK 80MM PRINTER & STICKER GEOMETRY SPECIFICATION
     
     In Rugtek RP-326 / 80mm POS Thermal printers:
     - Physical roll feed width is fixed at 80mm.
     - For 50×25mm stickers:
         * Landscape: @page width=80mm, height=25mm. Sticker container=50mm x 25mm.
         * Portrait:  @page width=80mm, height=50mm. Sticker container=25mm x 50mm.
     - For 80×30mm stickers:
         * Landscape: @page width=80mm, height=30mm. Sticker container=80mm x 30mm.
         * Portrait:  @page width=80mm, height=80mm. Sticker container=30mm x 80mm.
  ========================================================= */
  const stickerWidthMm = size === '80x30' ? 80 : 50;
  const stickerHeightMm = size === '80x30' ? 30 : 25;

  const pageWidthMm = 80;
  const pageHeightMm = orientation === 'landscape' ? stickerHeightMm : stickerWidthMm;

  const contentWidthMm = orientation === 'landscape' ? stickerWidthMm : stickerHeightMm;
  const contentHeightMm = orientation === 'landscape' ? stickerHeightMm : stickerWidthMm;

  /* =========================================================
     REMOVE OLD PRINT IFRAME
  ========================================================= */
  const iframeId = 'kruti_sticker_print_frame';
  const oldIframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
  if (oldIframe) {
    oldIframe.remove();
  }

  /* =========================================================
     CREATE ISOLATED PRINT IFRAME
  ========================================================= */
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

  /* =========================================================
     BODY CONTENT BY SIZE & ORIENTATION
  ========================================================= */
  let bodyContent = '';

  if (size === '50x25') {
    if (orientation === 'landscape') {
      bodyContent = `
        <div class="sticker sticker-50-landscape">
          <div class="hdr-50">KRUTI ELECTRONICS</div>
          <div class="rows-50">
            <div class="row-item"><span class="lbl-50">RC NO:</span><span class="val-50 rc-code">${safeReceiptNo}</span></div>
            <div class="row-item"><span class="lbl-50">NAME:</span><span class="val-50">${safeCustomerName}</span></div>
            <div class="row-item"><span class="lbl-50">DATE:</span><span class="val-50">${safeDate}</span></div>
            <div class="row-item"><span class="lbl-50">FAULT:</span><span class="val-50">${safeFault}</span></div>
          </div>
        </div>
      `;
    } else {
      bodyContent = `
        <div class="sticker sticker-50-portrait">
          <div class="hdr-v50">KRUTI</div>
          <div class="rc-v50">${safeReceiptNo}</div>
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
            <span class="shop-title">KRUTI ELECTRONICS</span>
            <span class="shop-phone">HELPLINE: 099045 88634</span>
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
          <div class="hdr-v80">KRUTI ELECTRONICS</div>
          <div class="sub-v80">TV SERVICE & REPAIR</div>
          <div class="rc-v80">${safeReceiptNo}</div>
          <div class="rows-v80">
            <div class="vrow"><span class="vlbl">CUST:</span><span class="vval">${safeCustomerName}</span></div>
            <div class="vrow"><span class="vlbl">MOB:</span><span class="vval">${safeMobile}</span></div>
            <div class="vrow"><span class="vlbl">DATE:</span><span class="vval">${safeDate}</span></div>
            <div class="vrow"><span class="vlbl">TV:</span><span class="vval">${safeTvBrandModel}</span></div>
            <div class="vrow"><span class="vlbl">RACK:</span><span class="vval">${safeRackNo}</span></div>
            <div class="vrow"><span class="vlbl">FAULT:</span><span class="vval">${safeFault}</span></div>
          </div>
          <div class="footer-v80">TEL: 099045 88634</div>
        </div>
      `;
    }
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sticker_${safeReceiptNo}</title>
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

    /* 50 × 25 LANDSCAPE */
    .sticker-50-landscape {
      padding: 1mm 1.5mm;
      justify-content: space-between;
    }
    .hdr-50 {
      text-align: center;
      font-size: 7.5pt;
      font-weight: 900;
      letter-spacing: 0.4px;
      line-height: 1;
      border-bottom: 0.8px solid #000000;
      padding-bottom: 0.3mm;
      text-transform: uppercase;
    }
    .rows-50 {
      display: flex;
      flex-direction: column;
      gap: 0.3mm;
      padding-top: 0.3mm;
    }
    .row-item {
      display: flex;
      align-items: baseline;
      font-size: 6.5pt;
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
    }
    .lbl-50 {
      font-weight: 800;
      min-width: 11mm;
      display: inline-block;
      font-size: 6pt;
    }
    .val-50 {
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .rc-code {
      font-size: 8pt;
      font-weight: 900;
      font-family: monospace;
    }

    /* 50 × 25 PORTRAIT */
    .sticker-50-portrait {
      padding: 1.2mm 1.5mm;
      justify-content: flex-start;
      gap: 0.8mm;
    }
    .hdr-v50 {
      text-align: center;
      font-size: 7pt;
      font-weight: 900;
      letter-spacing: 0.2px;
      border-bottom: 0.8px solid #000000;
      padding-bottom: 0.3mm;
    }
    .rc-v50 {
      text-align: center;
      font-size: 8.5pt;
      font-weight: 900;
      font-family: monospace;
      line-height: 1.1;
      border-bottom: 0.5px dashed #444444;
      padding-bottom: 0.4mm;
    }
    .rows-v50 {
      display: flex;
      flex-direction: column;
      gap: 0.5mm;
    }
    .vrow {
      display: flex;
      flex-direction: column;
      line-height: 1;
      overflow: hidden;
    }
    .vlbl {
      font-size: 5pt;
      font-weight: 800;
      color: #333333;
    }
    .vval {
      font-size: 6pt;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* 80 × 30 LANDSCAPE */
    .sticker-80-landscape {
      padding: 1.2mm 2.2mm;
      justify-content: space-between;
    }
    .hdr-80 {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      border-bottom: 0.8px solid #000000;
      padding-bottom: 0.4mm;
      line-height: 1;
    }
    .shop-title {
      font-size: 8.5pt;
      font-weight: 900;
      letter-spacing: 0.3px;
    }
    .shop-phone {
      font-size: 5.5pt;
      font-weight: 700;
    }
    .grid-80 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2mm;
      padding-top: 0.5mm;
    }
    .col-80 {
      display: flex;
      flex-direction: column;
      gap: 0.35mm;
    }
    .lbl-80 {
      font-weight: 800;
      min-width: 13mm;
      font-size: 6.2pt;
    }
    .val-80 {
      font-weight: 700;
      font-size: 6.8pt;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .rc-code-80 {
      font-size: 8.5pt;
      font-weight: 900;
      font-family: monospace;
    }
    .fault-strip-80 {
      display: flex;
      align-items: baseline;
      gap: 1mm;
      border-top: 0.5px dashed #444444;
      padding-top: 0.3mm;
    }

    /* 80 × 30 PORTRAIT */
    .sticker-80-portrait {
      padding: 1.5mm 2mm;
      justify-content: space-between;
    }
    .hdr-v80 {
      text-align: center;
      font-size: 7.5pt;
      font-weight: 900;
      letter-spacing: 0.3px;
      line-height: 1;
    }
    .sub-v80 {
      text-align: center;
      font-size: 4.8pt;
      font-weight: 700;
      color: #333333;
      border-bottom: 0.8px solid #000000;
      padding-bottom: 0.4mm;
      margin-bottom: 0.4mm;
    }
    .rc-v80 {
      text-align: center;
      font-size: 9.5pt;
      font-weight: 900;
      font-family: monospace;
      border-bottom: 0.5px dashed #444444;
      padding-bottom: 0.4mm;
      margin-bottom: 0.4mm;
    }
    .rows-v80 {
      display: flex;
      flex-direction: column;
      gap: 0.6mm;
    }
    .footer-v80 {
      text-align: center;
      font-size: 5pt;
      font-weight: 800;
      border-top: 0.5px solid #000000;
      padding-top: 0.4mm;
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
      }, 150);
    };
  </script>
</body>
</html>`;

  doc.open();
  doc.write(html);
  doc.close();
}
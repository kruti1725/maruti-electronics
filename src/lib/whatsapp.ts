import { IReceipt } from '../types/receipt';

/**
 * Sanitizes phone number: strips non-numeric characters.
 * Returns 10-digit number or null if invalid.
 */
export function sanitizeMobileNumber(mobile: string): string | null {
  if (!mobile) return null;
  const digitsOnly = mobile.replace(/\D/g, '');
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return digitsOnly.slice(2);
  }
  if (digitsOnly.length === 10) {
    return digitsOnly;
  }
  return null;
}

/**
 * Resolves public domain URL for customer tracking links.
 * Avoids private internal preview URLs like run.app or localhost.
 */
export function getPublicDomain(siteUrl?: string): string {
  if (siteUrl && siteUrl.trim()) return siteUrl.trim();
  if (typeof window !== 'undefined' && window.location.origin) {
    const origin = window.location.origin;
    if (!origin.includes('run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return origin;
    }
  }
  return 'https://maruti-electronics.vercel.app';
}

/**
 * Generates the "Half Detail" (Brief) WhatsApp message & link:
 * Contains: Receipt No, Customer Name, Phone No, Material Detail, Notice & Tracking Link.
 */
export function generateHalfDetailWhatsAppLink(receipt: IReceipt, siteUrl?: string): string | null {
  const cleanMobile = sanitizeMobileNumber(receipt.mobileNumber);
  if (!cleanMobile) return null;

  const domain = getPublicDomain(siteUrl);
  const searchUrl = `${domain}/search-receipt?serial=${encodeURIComponent(receipt.serialNumber)}`;

  // Format material details (TV brand, size, model)
  const materialList = receipt.tvs
    .map((tv, idx) => {
      const parts = [tv.brand, tv.size, tv.modelNumber ? `(${tv.modelNumber})` : ''].filter(Boolean).join(' ');
      return receipt.tvs.length > 1 ? `${idx + 1}. ${parts}` : parts;
    })
    .join('\n');

  const message = `📺 *KRUTI ELECTRONICS*
━━━━━━━━━━━━━━━━━━━━━━
🧾 *TV REPAIR RECEIPT*

*Receipt No :* ${receipt.serialNumber}
*Customer   :* ${receipt.customerName}
*Phone No   :* ${cleanMobile}
*Material   :* 
${materialList || 'TV Unit'}

━━━━━━━━━━━━━━━━━━━━━━
🔍 *Check Live Status Online:*
${searchUrl}

📢 *Important Notice:*
• Kripya 20 din me apna TV deliver karwayein.
• 20 din ke baad ₹300/din storage charge lagega.
• 30 din baad dukaan ki koi zimmedari nahi hogi.

🙏 *Thank You*
*KRUTI ELECTRONICS*
📞 Helpline: 099045 88634`;

  return `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates the "Full Detail" WhatsApp message & link:
 * Contains: Receipt No, Name, Phone No, Material Detail, Status, Cost, Dates, Technician, Notice & Tracking Link.
 */
export function generateFullDetailWhatsAppLink(receipt: IReceipt, siteUrl?: string): string | null {
  const cleanMobile = sanitizeMobileNumber(receipt.mobileNumber);
  if (!cleanMobile) return null;

  const domain = getPublicDomain(siteUrl);
  const searchUrl = `${domain}/search-receipt?serial=${encodeURIComponent(receipt.serialNumber)}`;

  const tvDetails = receipt.tvs
    .map((tv, idx) => {
      const header = receipt.tvs.length > 1 ? `📺 *TV Unit #${idx + 1}:* ` : '📺 *TV Detail:* ';
      const name = [tv.brand, tv.size, tv.modelNumber ? `[${tv.modelNumber}]` : ''].filter(Boolean).join(' ');
      return `${header}${name}
   • *Fault:* ${tv.complaint || 'General Checkup'}
   • *Status:* ${tv.status}
   • *Est. Cost:* ₹${tv.estimatedCost || 0}
   • *Actual Cost:* ₹${tv.cost || 0}`;
    })
    .join('\n\n');

  const totalEst = receipt.tvs.reduce((acc, tv) => acc + (tv.estimatedCost || 0), 0);
  const totalActual = receipt.tvs.reduce((acc, tv) => acc + (tv.cost || 0), 0);

  const datesText = [
    `*Received Date :* ${receipt.receivedDate}`,
    receipt.revisedDate ? `*Revise Date   :* ${receipt.revisedDate}` : null,
    receipt.outDate ? `*Out Date      :* ${receipt.outDate}` : null,
    receipt.repairBy ? `*Repair By     :* ${receipt.repairBy}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const message = `📺 *KRUTI ELECTRONICS*
━━━━━━━━━━━━━━━━━━━━━━
🧾 *TV REPAIR RECEIPT (FULL DETAILS)*

*Receipt No :* ${receipt.serialNumber}
*Customer   :* ${receipt.customerName}
*Phone No   :* ${cleanMobile}
${datesText}

━━━━━━━━━━━━━━━━━━━━━━
${tvDetails}

━━━━━━━━━━━━━━━━━━━━━━
💰 *Total Est. Cost :* ₹${totalEst}
💵 *Final Cost      :* ₹${totalActual}

━━━━━━━━━━━━━━━━━━━━━━
🔍 *Track Live Repair Status:*
${searchUrl}

📢 *Terms & Important Notice:*
• Kripya 20 din ke andar apna saman prapt karein.
• 20 din ke baad ₹300/din storage charge lagega.
• 30 din baad saman scrap mana jayega aur dukaan ki koi zimmedari nahi hogi.

🙏 *Thank You*
*KRUTI ELECTRONICS*
📞 Helpline: 099045 88634`;

  return `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(message)}`;
}

export function generateWhatsAppLink(receipt: IReceipt, siteUrl?: string): string | null {
  return generateFullDetailWhatsAppLink(receipt, siteUrl);
}
import { IReceipt } from '../types/receipt';

/**
 * Sanitizes phone number: strips non-numeric characters.
 * Returns 10-digit number or null if invalid.
 */
export function sanitizeMobileNumber(mobile: string): string | null {
  if (!mobile) return null;
  const digitsOnly = mobile.replace(/\D/g, '');
  // If user entered with country code 91 and 12 digits, strip 91
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return digitsOnly.slice(2);
  }
  if (digitsOnly.length === 10) {
    return digitsOnly;
  }
  return null;
}

/**
 * Generates the official WhatsApp link for a receipt.
 */
export function generateWhatsAppLink(receipt: IReceipt, siteUrl?: string): string | null {
  const cleanMobile = sanitizeMobileNumber(receipt.mobileNumber);
  if (!cleanMobile) return null;

  const domain =
    siteUrl ||
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    'https://krutielectronics.com';

  const searchUrl = `${domain}/search-receipt?serial=${encodeURIComponent(receipt.serialNumber)}`;

  // Summary for TVs in receipt
  const tvBrands = receipt.tvs.map((tv) => tv.brand).filter(Boolean).join(', ') || 'N/A';
  const tvModels = receipt.tvs.map((tv) => tv.modelNumber || 'N/A').join(', ') || 'N/A';
  const tvStatuses = receipt.tvs.map((tv) => tv.status).join(', ') || 'Pending';
  const tvPriorities = receipt.tvs.map((tv) => tv.priority).join(', ') || 'Normal';
  const totalEstCost = receipt.tvs.reduce((acc, tv) => acc + (tv.estimatedCost || 0), 0);
  const totalActualCost = receipt.tvs.reduce((acc, tv) => acc + (tv.cost || 0), 0);

  const message = `📺 KRUTI ELECTRONICS
━━━━━━━━━━━━━━━━━━━━━━
🧾 TV REPAIR RECEIPT

Receipt No : ${receipt.serialNumber}
Customer : ${receipt.customerName}
Mobile : ${cleanMobile}
Brand : ${tvBrands}
Model No : ${tvModels}
Status : ${tvStatuses}
Priority : ${tvPriorities}
Estimated Cost : ₹${totalEstCost}
Actual Cost : ₹${totalActualCost}
━━━━━━━━━━━━━━━━━━━━━━
🔍 Check Repair Status
${searchUrl}
━━━━━━━━━━━━━━━━━━━━━━
📢 Important Notice
• Please collect your repaired product within 20 days.
• After 20 days, storage charge ₹300/day.
• If the product is not collected within 30 days, it may be treated as scrap and the shop will not be responsible.
━━━━━━━━━━━━━━━━━━━━━━
🙏 Thank You
KRUTI ELECTRONICS`;

  // Use wa.me with India country code 91
  return `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(message)}`;
}

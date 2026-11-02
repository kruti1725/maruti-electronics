import { IReceipt, DashboardStats } from '../types/receipt';

const STORAGE_KEY = 'kruti_receipts_data';

const DEFAULT_RECEIPTS: IReceipt[] = [
  {
    _id: 'rec_101',
    serialNumber: 'KR00101',
    customerName: 'Rahul Patel',
    mobileNumber: '9876543210',
    receivedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    repairBy: 'Ramesh Sharma',
    remarks: 'Customer reported smoke smell. Check power supply circuit.',
    tvs: [
      {
        _id: 'tv_101_1',
        brand: 'Sony',
        modelNumber: 'Bravia KD-43X75K',
        size: '43 inch',
        complaint: 'No Display / Red LED blinking 6 times',
        estimatedCost: 2200,
        cost: 2000,
        status: 'Under Repair',
        priority: 'Urgent',
        rackNo: 'R-04',
        paymentMethod: 'UPI',
      },
    ],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'rec_102',
    serialNumber: 'KR00102',
    customerName: 'Anil Kumar Verma',
    mobileNumber: '9822334455',
    receivedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    repairBy: 'Suresh Patel',
    remarks: 'Sound coming properly but display is pitch dark.',
    tvs: [
      {
        _id: 'tv_102_1',
        brand: 'Samsung',
        modelNumber: 'Crystal 4K UA50AUE60',
        size: '50 inch',
        complaint: 'Backlight Defect / Dim Screen',
        estimatedCost: 3500,
        cost: 3200,
        status: 'Ready',
        priority: 'High',
        rackNo: 'R-07',
        paymentMethod: 'Pending',
      },
    ],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'rec_103',
    serialNumber: 'KR00103',
    customerName: 'Pooja Shah',
    mobileNumber: '9898981234',
    receivedDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    repairBy: 'Ramesh Sharma',
    remarks: 'HDMI port loose connection, replaced with original port.',
    tvs: [
      {
        _id: 'tv_103_1',
        brand: 'LG',
        modelNumber: '32LM563BPTC Smart',
        size: '32 inch',
        complaint: 'HDMI Ports / AV Not Working',
        estimatedCost: 950,
        cost: 900,
        status: 'Delivered',
        priority: 'Normal',
        rackNo: 'R-12',
        paymentMethod: 'Cash',
      },
    ],
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function getClientReceipts(): IReceipt[] {
  if (typeof window === 'undefined') return DEFAULT_RECEIPTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RECEIPTS));
      return DEFAULT_RECEIPTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_RECEIPTS;
  } catch {
    return DEFAULT_RECEIPTS;
  }
}

export function saveClientReceipt(receiptData: any): IReceipt {
  const current = getClientReceipts();
  
  // Generate next 7-digit 611-XXXX serial number automatically
  let nextNum = 1;
  current.forEach((r) => {
    const s = String(r.serialNumber || '');
    const m = s.match(/611[-_]?(\d+)/i) || s.match(/(\d{3,})$/);
    if (m) {
      const val = parseInt(m[1], 10);
      if (val >= nextNum) nextNum = val + 1;
    }
  });

  const serialNumber = receiptData.serialNumber || `611-${nextNum.toString().padStart(4, '0')}`;
  const now = new Date().toISOString();

  const newReceipt: IReceipt = {
    _id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    serialNumber: serialNumber.toUpperCase(),
    customerName: receiptData.customerName,
    mobileNumber: receiptData.mobileNumber,
    receivedDate: receiptData.receivedDate || now.split('T')[0],
    repairBy: receiptData.repairBy || 'Ramesh Sharma',
    remarks: receiptData.remarks || '',
    tvs: (receiptData.tvs || []).map((tv: any, idx: number) => ({
      _id: tv._id || `tv_${Date.now()}_${idx}`,
      brand: tv.brand,
      modelNumber: tv.modelNumber,
      size: tv.size,
      complaint: tv.complaint,
      estimatedCost: Number(tv.estimatedCost) || 0,
      cost: Number(tv.cost) || 0,
      status: tv.status || 'Pending',
      priority: tv.priority || 'Normal',
      rackNo: tv.rackNo || '',
      paymentMethod: tv.paymentMethod || 'Pending',
    })),
    createdAt: now,
    updatedAt: now,
  };

  const updated = [newReceipt, ...current];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return newReceipt;
}

export function updateClientReceipt(serialNumber: string, updateData: any): IReceipt {
  const current = getClientReceipts();
  const cleanSerial = serialNumber.trim().toUpperCase();
  const idx = current.findIndex((r) => r.serialNumber.toUpperCase() === cleanSerial);

  if (idx === -1) {
    throw new Error('Receipt not found.');
  }

  const existing = current[idx];
  const updatedReceipt: IReceipt = {
    ...existing,
    ...updateData,
    serialNumber: existing.serialNumber, // preserve serial
    tvs: (updateData.tvs || existing.tvs).map((tv: any, i: number) => ({
      _id: tv._id || `tv_${Date.now()}_${i}`,
      brand: tv.brand,
      modelNumber: tv.modelNumber,
      size: tv.size,
      complaint: tv.complaint,
      estimatedCost: Number(tv.estimatedCost) || 0,
      cost: Number(tv.cost) || 0,
      status: tv.status || 'Pending',
      priority: tv.priority || 'Normal',
      rackNo: tv.rackNo || '',
      paymentMethod: tv.paymentMethod || 'Pending',
    })),
    updatedAt: new Date().toISOString(),
  };

  current[idx] = updatedReceipt;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }
  return updatedReceipt;
}

export function deleteClientReceipt(serialNumber: string): boolean {
  const current = getClientReceipts();
  const cleanSerial = serialNumber.trim().toUpperCase();
  const filtered = current.filter((r) => r.serialNumber.toUpperCase() !== cleanSerial);
  if (filtered.length !== current.length) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
    return true;
  }
  return false;
}

export function searchClientReceiptByMobile(mobile: string): IReceipt[] {
  const cleanDigits = mobile.replace(/\D/g, '');
  if (cleanDigits.length !== 10) return [];
  const receipts = getClientReceipts();
  return receipts.filter((r) => r.mobileNumber.replace(/\D/g, '') === cleanDigits);
}

export function searchClientReceipt(term: string): IReceipt[] {
  const clean = term.trim();
  const receipts = getClientReceipts();
  const cleanDigits = clean.replace(/\D/g, '');
  const lower = clean.toLowerCase();

  // STRICT: Only match serial number or mobile number (customer name and TV brand searches are excluded)
  return receipts.filter((r) => {
    const matchSerial =
      r.serialNumber.toLowerCase().includes(lower) ||
      (cleanDigits.length >= 3 && r.serialNumber.replace(/\D/g, '').includes(cleanDigits));
    const matchMobile =
      r.mobileNumber.includes(clean) ||
      (cleanDigits.length >= 3 && r.mobileNumber.replace(/\D/g, '').includes(cleanDigits));
    return matchSerial || matchMobile;
  });
}

export function getClientDashboardStats(): DashboardStats {
  const receipts = getClientReceipts();
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  let totalTVs = 0;
  let pending = 0;
  let underRepair = 0;
  let ready = 0;
  let delivered = 0;
  let returned = 0;
  let rejected = 0;
  let urgentReceipts = 0;
  let oldReceipts = 0;
  let todayReceipts = 0;

  receipts.forEach((r) => {
    const rDateStr = (r.receivedDate || r.createdAt || '').split('T')[0];
    if (rDateStr === todayStr) todayReceipts++;

    let diffDays = 0;
    const parts = rDateStr.split('-');
    if (parts.length === 3) {
      const recMidnight = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
      diffDays = Math.max(0, Math.round((todayMidnight - recMidnight) / (1000 * 60 * 60 * 24)));
    }

    let hasUrgent = false;
    let hasNotDelivered = false;

    (r.tvs || []).forEach((tv) => {
      totalTVs++;
      const st = String(tv.status || (r as any).status || 'Pending').trim().toLowerCase();
      const pr = String(tv.priority || (r as any).priority || 'Normal').trim().toLowerCase();

      if (st === 'pending') pending++;
      else if (st === 'under repair' || st === 'underrepair' || st === 'under_repair') underRepair++;
      else if (st === 'ready') ready++;
      else if (st === 'delivered') delivered++;
      else if (st === 'return' || st === 'returned') returned++;
      else if (st === 'reject' || st === 'rejected') rejected++;
      else pending++;

      const isClosed = st === 'delivered' || st === 'return' || st === 'returned' || st === 'reject' || st === 'rejected';
      if (!isClosed) {
        hasNotDelivered = true;
      }
      if (pr === 'urgent' && !isClosed) {
        hasUrgent = true;
      }
    });

    if (hasUrgent) urgentReceipts++;
    if (hasNotDelivered && diffDays >= 4) oldReceipts++;
  });

  return {
    totalReceipts: receipts.length,
    totalTVs,
    pending,
    underRepair,
    ready,
    completed: ready,
    delivered,
    cancel: rejected,
    totalLoss: returned,
    returned,
    rejected,
    todayReceipts,
    oldReceipts,
    overdueCount: oldReceipts,
    urgentReceipts,
    totalCost: 0,
    totalPaid: 0,
    totalPendingDue: 0,
  };
}
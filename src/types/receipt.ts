export type RepairStatus =
  | 'Pending'
  | 'Under Repair'
  | 'Completed'
  | 'Delivered'
  | 'Cancel'
  | 'Total Loss';

export const REPAIR_STATUSES: RepairStatus[] = [
  'Pending',
  'Under Repair',
  'Completed',
  'Delivered',
  'Cancel',
  'Total Loss',
];

export const COMMON_PROBLEMS = [
  'Card Fault',
  'Transformer Fault',
] as const;

export type CommonProblem = (typeof COMMON_PROBLEMS)[number];

export type ItemReceivedStatus = 'No Request' | 'Requested' | 'Yes';

export type PriorityLevel = 'High' | 'Normal' | 'Low';

export type PaymentStatus = 'Paid' | 'Unpaid' | 'Partial';

export const TECHNICIANS = [
  'Kailash Yadav',
  'Ramesh Yadav',
  'Satish SIngh',
  'Jilani',
] as const;

export type TechnicianName = (typeof TECHNICIANS)[number];

export interface ReceiptItem {
  id: string;
  repairMaterial: string;
  priority: PriorityLevel;
  repairBy: string;
  cost: number;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  repairStatus: RepairStatus;
  description: string;
}

export interface Receipt {
  id: string;
  serialNo: string;
  customerName: string;
  mobileNo: string;
  // Legacy & aggregated fields (kept in sync for backward compatibility)
  repairMaterial: string;
  cost: number;
  repairBy: string;
  repairStatus: RepairStatus;
  description: string;
  itemReceived: ItemReceivedStatus;
  itemReceivedDate?: string;
  priority: PriorityLevel;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  paymentDate?: string;
  createdAt: string;
  updatedAt?: string;
  // Multi-material items list
  items?: ReceiptItem[];
}

/**
 * Ensures a receipt has a valid array of items.
 * If receipt has no items (legacy single-item receipts), it synthesizes one item from legacy fields.
 */
export function ensureReceiptItems(receipt: Partial<Receipt>): ReceiptItem[] {
  if (receipt.items && Array.isArray(receipt.items) && receipt.items.length > 0) {
    return receipt.items.map((item, idx) => ({
      id: item.id || `item-${idx + 1}`,
      repairMaterial: item.repairMaterial || '',
      priority: item.priority || receipt.priority || 'Normal',
      repairBy: item.repairBy || receipt.repairBy || 'Kailash Yadav',
      cost: Number(item.cost) || 0,
      paymentStatus: item.paymentStatus || 'Unpaid',
      paidAmount: Number(item.paidAmount) || 0,
      repairStatus: item.repairStatus || receipt.repairStatus || 'Pending',
      description: item.description || '',
    }));
  }

  return [
    {
      id: 'item-1',
      repairMaterial: receipt.repairMaterial || '',
      priority: receipt.priority || 'Normal',
      repairBy: receipt.repairBy || 'Kailash Yadav',
      cost: Number(receipt.cost) || 0,
      paymentStatus: receipt.paymentStatus || 'Unpaid',
      paidAmount: Number(receipt.paidAmount) || 0,
      repairStatus: receipt.repairStatus || 'Pending',
      description: receipt.description || '',
    },
  ];
}

/**
 * Recalculates aggregated totals (cost, paidAmount, paymentStatus, overall repairStatus, repairMaterial summary)
 * across an array of receipt items.
 */
export function computeReceiptAggregates(items: ReceiptItem[], base?: Partial<Receipt>): {
  cost: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  repairStatus: RepairStatus;
  priority: PriorityLevel;
  repairMaterial: string;
  repairBy: string;
  description: string;
} {
  const totalCost = items.reduce((acc, it) => acc + (Number(it.cost) || 0), 0);
  const totalPaid = items.reduce((acc, it) => acc + (Number(it.paidAmount) || 0), 0);

  let paymentStatus: PaymentStatus = 'Unpaid';
  if (totalCost > 0 && totalPaid >= totalCost) {
    paymentStatus = 'Paid';
  } else if (totalPaid > 0) {
    paymentStatus = 'Partial';
  } else if (totalCost === 0 && totalPaid === 0 && items.some(i => i.paymentStatus === 'Paid')) {
    paymentStatus = 'Paid';
  }

  // Priority: High > Normal > Low
  let priority: PriorityLevel = 'Normal';
  if (items.some(i => i.priority === 'High')) {
    priority = 'High';
  } else if (items.every(i => i.priority === 'Low')) {
    priority = 'Low';
  }

  // Repair Status aggregation:
  // If all are Delivered -> Delivered
  // If all are Completed/Delivered/Cancel/Total Loss -> Completed
  // If any is Under Repair -> Under Repair
  // If any is Completed -> Completed
  // Otherwise Pending
  let repairStatus: RepairStatus = 'Pending';
  if (items.length > 0 && items.every(i => i.repairStatus === 'Delivered')) {
    repairStatus = 'Delivered';
  } else if (items.length > 0 && items.every(i => ['Completed', 'Delivered'].includes(i.repairStatus))) {
    repairStatus = 'Completed';
  } else if (items.length > 0 && items.every(i => ['Cancel', 'Total Loss'].includes(i.repairStatus))) {
    repairStatus = items[0].repairStatus;
  } else if (items.some(i => i.repairStatus === 'Under Repair')) {
    repairStatus = 'Under Repair';
  } else if (items.some(i => i.repairStatus === 'Completed')) {
    repairStatus = 'Completed';
  } else if (items.some(i => i.repairStatus === 'Pending')) {
    repairStatus = 'Pending';
  } else if (items.length > 0) {
    repairStatus = items[0].repairStatus;
  }

  // Material summary
  const materials = items.map(i => i.repairMaterial.trim()).filter(Boolean);
  const repairMaterial = materials.length > 0 ? materials.join(' + ') : (base?.repairMaterial || 'General Material');

  // Technician
  const techs = Array.from(new Set(items.map(i => i.repairBy.trim()).filter(Boolean)));
  const repairBy = techs.length > 0 ? techs.join(', ') : (base?.repairBy || 'Kailash Yadav');

  // Descriptions
  const descs = items.map((it, idx) => it.description.trim() ? `${items.length > 1 ? `[Item ${idx + 1}] ` : ''}${it.description.trim()}` : '').filter(Boolean);
  const description = descs.join(' | ') || (base?.description || '');

  return {
    cost: totalCost,
    paidAmount: totalPaid,
    paymentStatus,
    repairStatus,
    priority,
    repairMaterial,
    repairBy,
    description,
  };
}

export interface DashboardStats {
  totalReceipts: number;
  pending: number;
  underRepair: number;
  completed: number;
  delivered: number;
  cancel: number;
  totalLoss: number;
  totalCost: number;
  overdueCount: number; // > 3 days and not delivered/cancel/total loss
  totalPaid: number;
  totalPendingDue: number;

  // Compatibility fields for TV repair dashboard widgets
  totalTVs?: number;
  ready?: number;
  returned?: number;
  rejected?: number;
  todayReceipts?: number;
  oldReceipts?: number;
  urgentReceipts?: number;
}

// =========================================================================
// Backward Compatibility Types for Existing TV Workshop Components
// =========================================================================
export type TVStatus = RepairStatus | 'Ready' | 'Return' | 'Reject';
export type TVPriority = PriorityLevel | 'Urgent';
export type PaymentMethod = PaymentStatus | 'Cash' | 'UPI' | 'Card' | 'Pending' | 'Bank Transfer';

export interface TVItem {
  _id?: string;
  brand: string;
  modelNumber: string;
  size: string;
  complaint: string;
  estimatedCost: number;
  cost: number; // actual cost
  status: TVStatus;
  priority: TVPriority;
  rackNo: string;
  paymentMethod: PaymentMethod;
}

export interface IReceipt {
  _id: string;
  serialNumber: string;
  customerName: string;
  mobileNumber: string;
  receivedDate: string;
  revisedDate?: string;
  outDate?: string;
  repairBy: string;
  remarks: string;
  tvs: TVItem[];
  createdAt: string;
  updatedAt: string;

  // Interoperability with Maruti Electronics Receipt model
  id?: string;
  serialNo?: string;
  mobileNo?: string;
  repairMaterial?: string;
  cost?: number;
  repairStatus?: RepairStatus;
  description?: string;
  itemReceived?: ItemReceivedStatus;
  priority?: PriorityLevel;
  paymentStatus?: PaymentStatus;
  paidAmount?: number;
  items?: ReceiptItem[];
}
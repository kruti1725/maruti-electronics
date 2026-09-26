export type TVStatus = 'Pending' | 'Under Repair' | 'Ready' | 'Delivered' | 'Return' | 'Reject';
export type TVPriority = 'Normal' | 'High' | 'Urgent';
export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Pending' | 'Bank Transfer';

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
}

export interface DashboardStats {
  totalReceipts: number;
  totalTVs: number;
  pending: number;
  underRepair: number;
  ready: number;
  delivered: number;
  returned?: number;
  rejected?: number;
  todayReceipts: number;
  oldReceipts: number;
  urgentReceipts: number;
}
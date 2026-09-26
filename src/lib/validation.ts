import { z } from 'zod';

export const tvItemSchema = z.object({
  brand: z.string().trim().min(1, 'TV Brand is required'),
  modelNumber: z.string().trim().default(''),
  size: z.string().trim().default(''),
  complaint: z.string().trim().min(1, 'Complaint description is required'),
  estimatedCost: z.coerce.number().min(0, 'Estimated cost must be 0 or higher').default(0),
  cost: z.coerce.number().min(0, 'Actual cost must be 0 or higher').default(0),
  status: z.enum(['Pending', 'Under Repair', 'Ready', 'Delivered']),
  priority: z.enum(['Normal', 'High', 'Urgent']).default('Normal'),
  rackNo: z.string().trim().default(''),
  paymentMethod: z.enum(['Cash', 'UPI', 'Card', 'Pending', 'Bank Transfer']).default('Pending'),
});

export const receiptSchema = z.object({
  serialNumber: z
    .string()
    .trim()
    .min(1, 'Receipt / Serial number is required')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Serial number can only contain letters, numbers, and dashes'),
  customerName: z.string().trim().min(2, 'Customer name is required (min 2 characters)'),
  mobileNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),
  receivedDate: z.string().min(1, 'Received date is required'),
  repairBy: z.string().trim().default(''),
  remarks: z.string().trim().default(''),
  tvs: z.array(tvItemSchema).min(1, 'At least one TV must be added to the receipt'),
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Username or Email is required'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

export type TVItemInput = z.infer<typeof tvItemSchema>;
export type ReceiptInput = z.infer<typeof receiptSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

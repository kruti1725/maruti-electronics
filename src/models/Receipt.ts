import mongoose, { Schema, Document, Model } from 'mongoose';
import { IReceipt, TVItem } from '../types/receipt';

export interface IReceiptDocument extends Omit<IReceipt, '_id'>, Document {}

const TVItemSchema = new Schema<TVItem>(
  {
    brand: { type: String, required: true, trim: true },
    modelNumber: { type: String, default: '', trim: true },
    size: { type: String, default: '', trim: true },
    complaint: { type: String, required: true, trim: true },
    estimatedCost: { type: Number, default: 0, min: 0 },
    cost: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['Pending', 'Under Repair', 'Ready', 'Delivered', 'Return', 'Reject'],
      default: 'Pending',
      required: true,
    },
    priority: {
      type: String,
      enum: ['Normal', 'High', 'Urgent'],
      default: 'Normal',
      required: true,
    },
    rackNo: { type: String, default: '', trim: true },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Card', 'Pending', 'Bank Transfer'],
      default: 'Pending',
    },
  },
  { _id: true }
);

const ReceiptSchema = new Schema<IReceiptDocument>(
  {
    serialNumber: {
      type: String,
      required: [true, 'Serial number is required'],
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      index: true,
      trim: true,
    },
    receivedDate: {
      type: String,
      required: [true, 'Received date is required'],
      index: true,
    },
    revisedDate: {
      type: String,
      default: '',
      trim: true,
    },
    outDate: {
      type: String,
      default: '',
      trim: true,
    },
    repairBy: {
      type: String,
      default: '',
      trim: true,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
    tvs: {
      type: [TVItemSchema],
      validate: [(v: TVItem[]) => Array.isArray(v) && v.length > 0, 'At least one TV must be attached'],
    },
  },
  {
    timestamps: true,
  }
);

ReceiptSchema.index({ customerName: 'text', serialNumber: 'text', mobileNumber: 'text' });

export const ReceiptModel: Model<IReceiptDocument> =
  mongoose.models.Receipt || mongoose.model<IReceiptDocument>('Receipt', ReceiptSchema);
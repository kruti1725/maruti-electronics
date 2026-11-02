import mongoose, { Schema, Model } from "mongoose";

interface IReceiptCounter {
  _id: string;
  seq: number;
}

const ReceiptCounterSchema = new Schema<IReceiptCounter>(
  {
    _id: {
      type: String,
      required: true,
    },

    seq: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    versionKey: false,
  }
);

const ReceiptCounter: Model<IReceiptCounter> =
  (mongoose.models.ReceiptCounter as Model<IReceiptCounter>) ||
  mongoose.model<IReceiptCounter>(
    "ReceiptCounter",
    ReceiptCounterSchema
  );

export default ReceiptCounter;
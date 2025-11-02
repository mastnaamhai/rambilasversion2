import { Schema, model, Document } from 'mongoose';
import { PaymentType, PaymentMode } from '../types';

export interface IPayment extends Document {
  paymentNumber: number;
  invoiceId?: Schema.Types.ObjectId;
  truckHiringNoteId?: Schema.Types.ObjectId;
  customer?: Schema.Types.ObjectId;
  date: string;
  amount: number;
  type: PaymentType;
  mode: PaymentMode;
  referenceNo?: string;
  notes?: string;
  // TDS fields
  tdsApplicable?: boolean;
  tdsRate?: number;
  tdsAmount?: number;
  tdsDate?: string;
}

const PaymentSchema = new Schema({
  paymentNumber: { type: Number, required: true, unique: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: false },
  truckHiringNoteId: { type: Schema.Types.ObjectId, ref: 'TruckHiringNote', required: false },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: false },
  date: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: Object.values(PaymentType), required: true },
  mode: { type: String, enum: Object.values(PaymentMode), required: true },
  referenceNo: { type: String },
  notes: { type: String },
  // TDS fields
  tdsApplicable: { type: Boolean, default: false },
  tdsRate: { type: Number },
  tdsAmount: { type: Number },
  tdsDate: { type: String },
});

export default model<IPayment>('Payment', PaymentSchema);

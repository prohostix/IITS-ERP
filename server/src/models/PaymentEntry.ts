import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentEntry extends Document {
  organizationId: mongoose.Types.ObjectId;
  invoiceId: mongoose.Types.ObjectId;
  amount: number;
  method: 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'card';
  referenceNo?: string;
  receivedBy: mongoose.Types.ObjectId;
  receivedAt: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentEntrySchema = new Schema<IPaymentEntry>(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true 
    },
    invoiceId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Invoice', 
      required: true 
    },
    amount: { type: Number, required: true },
    method: { 
      type: String, 
      enum: ['cash', 'cheque', 'bank_transfer', 'upi', 'card'], 
      required: true 
    },
    referenceNo: { type: String },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receivedAt: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true }
);

paymentEntrySchema.index({ organizationId: 1 });
paymentEntrySchema.index({ invoiceId: 1 });

export default mongoose.model<IPaymentEntry>('PaymentEntry', paymentEntrySchema);

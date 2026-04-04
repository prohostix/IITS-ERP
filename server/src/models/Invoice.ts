import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoice extends Document {
  organizationId: mongoose.Types.ObjectId;
  centerId: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId;
  invoiceNo: string;
  amount: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  dueDate?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true 
    },
    centerId: { 
      type: Schema.Types.ObjectId, 
      ref: 'StudyCenter', 
      required: true 
    },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
    invoiceNo: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    tax: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true },
    status: { 
      type: String, 
      enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], 
      default: 'draft' 
    },
    items: [{
      description: { type: String, required: true },
      quantity: { type: Number, required: true },
      rate: { type: Number, required: true },
      amount: { type: Number, required: true },
    }],
    dueDate: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

invoiceSchema.index({ organizationId: 1, status: 1 });
invoiceSchema.index({ centerId: 1 });
// invoiceNo index is auto-created by unique: true in field definition

export default mongoose.model<IInvoice>('Invoice', invoiceSchema);

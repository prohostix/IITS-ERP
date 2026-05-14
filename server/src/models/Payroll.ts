import mongoose, { Schema, Document } from 'mongoose';

export interface IPayroll extends Document {
  organizationId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  month: string; // Format: YYYY-MM
  basicSalary: number;
  allowances: {
    hra?: number;
    transport?: number;
    medical?: number;
    other?: number;
  };
  deductions: {
    tax?: number;
    pf?: number;
    insurance?: number;
    other?: number;
  };
  bonus?: number;
  overtime?: number;
  grossSalary: number;
  netSalary: number;
  status: 'draft' | 'processed' | 'confirmed' | 'transferred_to_finance' | 'paid';
  confirmedBy?: mongoose.Types.ObjectId;
  confirmedAt?: Date;
  transferredToFinanceBy?: mongoose.Types.ObjectId;
  transferredToFinanceAt?: Date;
  financeApprovedBy?: mongoose.Types.ObjectId;
  financeApprovedAt?: Date;
  paymentDate?: Date;
  paymentMethod?: 'bank_transfer' | 'cash' | 'cheque';
  paymentReference?: string;
  processedBy?: mongoose.Types.ObjectId;
  processedAt?: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const payrollSchema = new Schema<IPayroll>(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true 
    },
    employeeId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    month: { type: String, required: true }, // YYYY-MM format
    basicSalary: { type: Number, required: true },
    allowances: {
      hra: { type: Number, default: 0 },
      transport: { type: Number, default: 0 },
      medical: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    deductions: {
      tax: { type: Number, default: 0 },
      pf: { type: Number, default: 0 },
      insurance: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    bonus: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 },
    grossSalary: { type: Number, required: true },
    netSalary: { type: Number, required: true },
    status: { 
      type: String, 
      enum: ['draft', 'processed', 'confirmed', 'transferred_to_finance', 'paid'], 
      default: 'draft' 
    },
    confirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    confirmedAt: { type: Date },
    transferredToFinanceBy: { type: Schema.Types.ObjectId, ref: 'User' },
    transferredToFinanceAt: { type: Date },
    financeApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    financeApprovedAt: { type: Date },
    paymentDate: { type: Date },
    paymentMethod: { 
      type: String, 
      enum: ['bank_transfer', 'cash', 'cheque'] 
    },
    paymentReference: { type: String },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    processedAt: { type: Date },
    remarks: { type: String },
  },
  { timestamps: true }
);

// Indexes
payrollSchema.index({ organizationId: 1, month: 1 });
payrollSchema.index({ employeeId: 1, month: 1 }, { unique: true });
payrollSchema.index({ status: 1 });

export default mongoose.model<IPayroll>('Payroll', payrollSchema);

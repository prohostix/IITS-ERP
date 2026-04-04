import mongoose, { Schema, Document } from 'mongoose';

export interface IPayrollBatch extends Document {
  organizationId: mongoose.Types.ObjectId;
  batchNumber: string;
  month: string; // Format: YYYY-MM
  payrollIds: mongoose.Types.ObjectId[];
  totalAmount: number;
  employeeCount: number;
  status: 'pending_finance_approval' | 'approved_by_finance' | 'payment_in_progress' | 'completed' | 'rejected';
  transferredBy: mongoose.Types.ObjectId;
  transferredAt: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  completedAt?: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const payrollBatchSchema = new Schema<IPayrollBatch>(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true 
    },
    batchNumber: { 
      type: String,
      unique: true 
    },
    month: { type: String, required: true },
    payrollIds: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'Payroll' 
    }],
    totalAmount: { type: Number, required: true },
    employeeCount: { type: Number, required: true },
    status: { 
      type: String, 
      enum: ['pending_finance_approval', 'approved_by_finance', 'payment_in_progress', 'completed', 'rejected'], 
      default: 'pending_finance_approval' 
    },
    transferredBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    },
    transferredAt: { 
      type: Date, 
      default: Date.now 
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
    completedAt: { type: Date },
    remarks: { type: String },
  },
  { timestamps: true }
);

// Indexes
payrollBatchSchema.index({ organizationId: 1, month: 1 });
payrollBatchSchema.index({ status: 1 });
payrollBatchSchema.index({ batchNumber: 1 });

// Auto-generate batch number
payrollBatchSchema.pre('save', async function (next) {
  if (!this.batchNumber) {
    const count = await mongoose.model('PayrollBatch').countDocuments();
    const monthCode = this.month.replace('-', '');
    this.batchNumber = `PB${monthCode}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

export default mongoose.model<IPayrollBatch>('PayrollBatch', payrollBatchSchema);

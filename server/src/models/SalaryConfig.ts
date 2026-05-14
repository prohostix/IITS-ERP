import mongoose, { Schema, Document } from 'mongoose';

export interface ISalaryConfig extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  basicSalary: number;
  allowances: {
    hra: number;
    transport: number;
    medical: number;
    other: number;
  };
  deductions: {
    pf: number;
    tax: number;
    insurance: number;
    other: number;
  };
  lateDeductionPerMinute: number;
  effectiveFrom: Date;
  createdBy: mongoose.Types.ObjectId;
  approvalStatus: 'pending_approval' | 'approved' | 'rejected';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectedRemarks?: string;
  updatedAt: Date;
  createdAt: Date;
}

const salaryConfigSchema = new Schema<ISalaryConfig>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    basicSalary: { type: Number, required: true, default: 0 },
    allowances: {
      hra: { type: Number, default: 0 },
      transport: { type: Number, default: 0 },
      medical: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    deductions: {
      pf: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      insurance: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    lateDeductionPerMinute: { type: Number, default: 0 },
    effectiveFrom: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvalStatus: {
      type: String,
      enum: ['pending_approval', 'approved', 'rejected'],
      default: 'pending_approval',
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectedRemarks: { type: String },
  },
  { timestamps: true }
);

salaryConfigSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

export default mongoose.model<ISalaryConfig>('SalaryConfig', salaryConfigSchema);

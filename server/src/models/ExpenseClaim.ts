import mongoose, { Schema, Document } from 'mongoose';

export interface IExpenseClaim extends Document {
  organizationId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  amount: number;
  category: string;
  description: string;
  receipts: string[];
  status: 'pending' | 'approved' | 'rejected' | 'reimbursed';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  remarks?: string;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const expenseClaimSchema = new Schema<IExpenseClaim>(
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
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    receipts: [{ type: String }],
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected', 'reimbursed'], 
      default: 'pending' 
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    remarks: { type: String },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

expenseClaimSchema.index({ organizationId: 1, status: 1 });
expenseClaimSchema.index({ employeeId: 1 });

export default mongoose.model<IExpenseClaim>('ExpenseClaim', expenseClaimSchema);

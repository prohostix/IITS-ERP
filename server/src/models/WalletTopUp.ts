import mongoose, { Schema, Document } from 'mongoose';

export interface IWalletTopUp extends Document {
  studyCenterId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  amount: number;
  paymentMethod: 'payment_gateway' | 'offline';
  referenceNumber?: string;
  proofDocument?: string;
  status: 'pending' | 'approved' | 'rejected';
  remarks?: string;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const walletTopUpSchema = new Schema<IWalletTopUp>(
  {
    studyCenterId: { type: Schema.Types.ObjectId, ref: 'StudyCenter', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    amount: { type: Number, required: true, min: [0.01, 'amount must be greater than zero'] },
    paymentMethod: { type: String, enum: ['payment_gateway', 'offline'], required: true },
    referenceNumber: { type: String },
    proofDocument: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    remarks: { type: String },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

walletTopUpSchema.index({ studyCenterId: 1, status: 1 });
walletTopUpSchema.index({ organizationId: 1, status: 1 });

export default mongoose.model<IWalletTopUp>('WalletTopUp', walletTopUpSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IStudyCenterWallet extends Document {
  studyCenterId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

const studyCenterWalletSchema = new Schema<IStudyCenterWallet>(
  {
    studyCenterId: { type: Schema.Types.ObjectId, ref: 'StudyCenter', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    balance: { type: Number, default: 0, min: [0, 'Wallet balance cannot be negative'] },
  },
  { timestamps: true }
);

studyCenterWalletSchema.index({ studyCenterId: 1 }, { unique: true });

export default mongoose.model<IStudyCenterWallet>('StudyCenterWallet', studyCenterWalletSchema);

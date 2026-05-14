import mongoose, { Schema, Document } from 'mongoose';

export interface IEnrollmentPayment extends Document {
  enrollmentId: mongoose.Types.ObjectId;
  studyCenterId: mongoose.Types.ObjectId;
  walletId: mongoose.Types.ObjectId;
  amount: number;
  debitedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentPaymentSchema = new Schema<IEnrollmentPayment>(
  {
    enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true },
    studyCenterId: { type: Schema.Types.ObjectId, ref: 'StudyCenter', required: true },
    walletId: { type: Schema.Types.ObjectId, ref: 'StudyCenterWallet', required: true },
    amount: { type: Number, required: true },
    debitedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

enrollmentPaymentSchema.index({ enrollmentId: 1 }, { unique: true });
enrollmentPaymentSchema.index({ studyCenterId: 1 });

export default mongoose.model<IEnrollmentPayment>('EnrollmentPayment', enrollmentPaymentSchema);

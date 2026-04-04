import mongoose, { Schema, Document } from 'mongoose';

export interface IUniversityAuthFee extends Document {
  organizationId: mongoose.Types.ObjectId;
  universityId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  configuredBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const universityAuthFeeSchema = new Schema<IUniversityAuthFee>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    amount: { type: Number, required: true, min: [0.01, 'Amount must be greater than zero'] },
    currency: { type: String, default: 'INR' },
    configuredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

universityAuthFeeSchema.index({ organizationId: 1, universityId: 1 }, { unique: true });

export default mongoose.model<IUniversityAuthFee>('UniversityAuthFee', universityAuthFeeSchema);

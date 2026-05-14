import mongoose, { Schema, Document } from 'mongoose';

export interface IAdditionalFee {
  label: string;
  amount: number;
  description?: string;
}

export interface IProgramFeeStructure extends Document {
  programId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  billingCycle: 'per_semester' | 'per_year' | 'total';
  baseFee: number;
  additionalFees: IAdditionalFee[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const programFeeStructureSchema = new Schema<IProgramFeeStructure>(
  {
    programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    billingCycle: {
      type: String,
      enum: ['per_semester', 'per_year', 'total'],
      required: true,
    },
    baseFee: { type: Number, required: true, min: [0, 'baseFee must be a non-negative number'] },
    additionalFees: [
      {
        label: { type: String, required: true },
        amount: { type: Number, required: true, min: [0, 'additionalFee amount must be non-negative'] },
        description: { type: String },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

programFeeStructureSchema.index({ programId: 1 }, { unique: true });
programFeeStructureSchema.index({ organizationId: 1 });

export default mongoose.model<IProgramFeeStructure>('ProgramFeeStructure', programFeeStructureSchema);

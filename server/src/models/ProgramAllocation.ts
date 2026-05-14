import mongoose, { Schema, Document } from 'mongoose';

export interface IProgramAllocation extends Document {
  organizationId: mongoose.Types.ObjectId;
  studyCenterId: mongoose.Types.ObjectId;
  programId: mongoose.Types.ObjectId;
  allocatedBy: mongoose.Types.ObjectId;
  allocatedAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const programAllocationSchema = new Schema<IProgramAllocation>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    studyCenterId: { type: Schema.Types.ObjectId, ref: 'StudyCenter', required: true },
    programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
    allocatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    allocatedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

programAllocationSchema.index(
  { organizationId: 1, studyCenterId: 1, programId: 1 },
  { unique: true }
);

export default mongoose.model<IProgramAllocation>('ProgramAllocation', programAllocationSchema);

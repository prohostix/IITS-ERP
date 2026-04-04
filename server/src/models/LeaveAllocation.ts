import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaveAllocation extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  year: number;
  sickLeave: number;
  casualLeave: number;
  earnedLeave: number;
  complementaryLeave: number;
  usedSick: number;
  usedCasual: number;
  usedEarned: number;
  usedComplementary: number;
  createdBy: mongoose.Types.ObjectId;
  updatedAt: Date;
  createdAt: Date;
}

const leaveAllocationSchema = new Schema<ILeaveAllocation>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    year: { type: Number, required: true },
    sickLeave: { type: Number, default: 12 },
    casualLeave: { type: Number, default: 12 },
    earnedLeave: { type: Number, default: 15 },
    complementaryLeave: { type: Number, default: 0 },
    usedSick: { type: Number, default: 0 },
    usedCasual: { type: Number, default: 0 },
    usedEarned: { type: Number, default: 0 },
    usedComplementary: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

leaveAllocationSchema.index({ organizationId: 1, userId: 1, year: 1 }, { unique: true });

export default mongoose.model<ILeaveAllocation>('LeaveAllocation', leaveAllocationSchema);

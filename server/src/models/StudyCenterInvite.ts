import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface IStudyCenterInvite extends Document {
  organizationId: mongoose.Types.ObjectId;
  token: string;
  universityIds: mongoose.Types.ObjectId[];
  programIds: mongoose.Types.ObjectId[];
  referredBy: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  status: 'pending' | 'used' | 'expired';
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const studyCenterInviteSchema = new Schema<IStudyCenterInvite>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    token: { type: String, required: true, unique: true },
    universityIds: [{ type: Schema.Types.ObjectId, ref: 'University', required: true }],
    programIds: [{ type: Schema.Types.ObjectId, ref: 'Program', default: [] }],
    referredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: false },
    status: { type: String, enum: ['pending', 'used', 'expired'], default: 'pending' },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: true }
);

studyCenterInviteSchema.index({ organizationId: 1, referredBy: 1 });
studyCenterInviteSchema.index({ expiresAt: 1 });

export const generateInviteToken = () => crypto.randomBytes(32).toString('hex');

export default mongoose.model<IStudyCenterInvite>('StudyCenterInvite', studyCenterInviteSchema);

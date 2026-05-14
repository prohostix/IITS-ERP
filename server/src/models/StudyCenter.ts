import mongoose, { Document, Schema } from 'mongoose';

export const VALID_ONBOARDING_TRANSITIONS: Record<string, string[]> = {
  pending_verification: ['ops_verified', 'rejected'],
  ops_verified: ['pending_payment', 'rejected'],
  pending_payment: ['active', 'rejected'],
  active: [],
  rejected: [],
};

export interface IStudyCenter extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  address?: string;
  contact?: string;
  email?: string;
  city?: string;
  state?: string;
  status: string;
  associatedUniversityIds: mongoose.Types.ObjectId[];
  allowedProgramIds: mongoose.Types.ObjectId[];
  allowedBranchIds?: mongoose.Types.ObjectId[];
  pendingDocuments: { name: string; url: string; uploadedAt: Date }[];
  referredBy?: mongoose.Types.ObjectId;
  inviteToken?: string;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  opsRemarks?: string;
  financeApprovedBy?: mongoose.Types.ObjectId;
  financeApprovedAt?: Date;
  paymentRemarks?: string;
  paymentProof?: { url: string; uploadedAt: Date; remarks?: string };
  credentials?: { username: string; password: string };
  statusHistory: { status: string; actorId?: mongoose.Types.ObjectId; remarks?: string; timestamp: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const StudyCenterSchema = new Schema<IStudyCenter>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    address: { type: String, trim: true },
    contact: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending_verification', 'ops_verified', 'pending_payment', 'active', 'rejected', 'inactive'],
      default: 'pending_verification',
      index: true,
    },
    associatedUniversityIds: [{ type: Schema.Types.ObjectId, ref: 'University' }],
    allowedProgramIds: [{ type: Schema.Types.ObjectId, ref: 'Program' }],
    allowedBranchIds: [{ type: Schema.Types.ObjectId, ref: 'Branch' }],
    pendingDocuments: [
      {
        name: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    referredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    inviteToken: { type: String },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    opsRemarks: { type: String },
    financeApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    financeApprovedAt: { type: Date },
    paymentRemarks: { type: String },
    paymentProof: {
      url: { type: String },
      uploadedAt: { type: Date },
      remarks: { type: String },
    },
    credentials: {
      username: { type: String },
      password: { type: String },
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        actorId: { type: Schema.Types.ObjectId, ref: 'User' },
        remarks: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

StudyCenterSchema.index({ organizationId: 1, code: 1 }, { unique: true });

const StudyCenter = mongoose.model<IStudyCenter>('StudyCenter', StudyCenterSchema);
export default StudyCenter;

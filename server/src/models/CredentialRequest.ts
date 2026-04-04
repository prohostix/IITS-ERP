import mongoose, { Schema, Document } from 'mongoose';

export interface ICredentialRequest extends Document {
  organizationId: mongoose.Types.ObjectId;
  requesterId: mongoose.Types.ObjectId;
  requesterName: string;
  requesterRole: string;
  ipAddress: string;
  targetCredential: string;
  targetCollection: string;
  targetId: mongoose.Types.ObjectId;
  remarks: string;
  status: 'pending' | 'approved' | 'rejected';
  respondedBy?: mongoose.Types.ObjectId;
  respondedAt?: Date;
  responseRemarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const credentialRequestSchema = new Schema<ICredentialRequest>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    requesterName: {
      type: String,
      required: true,
    },
    requesterRole: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    targetCredential: {
      type: String,
      required: true,
    },
    targetCollection: {
      type: String,
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    remarks: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    respondedAt: Date,
    responseRemarks: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
credentialRequestSchema.index({ requesterId: 1, status: 1 });
credentialRequestSchema.index({ organizationId: 1, status: 1, createdAt: -1 });

const CredentialRequest = mongoose.model<ICredentialRequest>(
  'CredentialRequest',
  credentialRequestSchema
);

export default CredentialRequest;

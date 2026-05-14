import mongoose, { Schema, Document } from 'mongoose';

export interface IReferralLink extends Document {
  organizationId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  employeeName: string;
  slug: string;
  fullUrl: string;
  status: 'active' | 'inactive';
  metrics: {
    centersReferred: number;
    studentsReferred: number;
    revenueGenerated: number;
    lastUsed?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const referralLinkSchema = new Schema<IReferralLink>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fullUrl: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    metrics: {
      centersReferred: { type: Number, default: 0 },
      studentsReferred: { type: Number, default: 0 },
      revenueGenerated: { type: Number, default: 0 },
      lastUsed: Date,
    },
  },
  {
    timestamps: true,
  }
);

referralLinkSchema.index({ employeeId: 1, slug: 1 });

const ReferralLink = mongoose.model<IReferralLink>('ReferralLink', referralLinkSchema);

export default ReferralLink;

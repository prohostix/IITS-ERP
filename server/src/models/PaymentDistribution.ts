import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentDistribution extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  partnerType: 'university' | 'edtech' | 'coordinator' | 'other';
  partnerId?: mongoose.Types.ObjectId;
  partnerName: string;
  distributionRules: {
    feeType: string;
    percentage: number;
    fixedAmount?: number;
    priority: number;
  }[];
  status: 'active' | 'inactive';
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paymentDistributionSchema = new Schema<IPaymentDistribution>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    partnerType: {
      type: String,
      enum: ['university', 'edtech', 'coordinator', 'other'],
      required: true,
    },
    partnerId: {
      type: Schema.Types.ObjectId,
      refPath: 'partnerType',
    },
    partnerName: {
      type: String,
      required: true,
    },
    distributionRules: [
      {
        feeType: { type: String, required: true },
        percentage: { type: Number, required: true, min: 0, max: 100 },
        fixedAmount: Number,
        priority: { type: Number, default: 1 },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    effectiveFrom: {
      type: Date,
      required: true,
    },
    effectiveTo: Date,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

paymentDistributionSchema.index({ organizationId: 1, status: 1 });
paymentDistributionSchema.index({ partnerType: 1, partnerId: 1 });

const PaymentDistribution = mongoose.model<IPaymentDistribution>(
  'PaymentDistribution',
  paymentDistributionSchema
);

export default PaymentDistribution;

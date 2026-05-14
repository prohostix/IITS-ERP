import mongoose, { Schema, Document } from 'mongoose';

export interface IIncentiveStructure extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  targetType: 'revenue' | 'admissions' | 'centers' | 'custom';
  applicableTo: 'department' | 'center' | 'employee';
  tiers: {
    threshold: number;
    incentivePercentage?: number;
    fixedAmount?: number;
    description: string;
  }[];
  period: 'monthly' | 'quarterly' | 'yearly';
  status: 'draft' | 'active' | 'inactive';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const incentiveStructureSchema = new Schema<IIncentiveStructure>(
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
    targetType: {
      type: String,
      enum: ['revenue', 'admissions', 'centers', 'custom'],
      required: true,
    },
    applicableTo: {
      type: String,
      enum: ['department', 'center', 'employee'],
      required: true,
    },
    tiers: [
      {
        threshold: { type: Number, required: true },
        incentivePercentage: Number,
        fixedAmount: Number,
        description: { type: String, required: true },
      },
    ],
    period: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'inactive'],
      default: 'draft',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
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

incentiveStructureSchema.index({ organizationId: 1, status: 1 });
incentiveStructureSchema.index({ effectiveFrom: 1, effectiveTo: 1 });

const IncentiveStructure = mongoose.model<IIncentiveStructure>(
  'IncentiveStructure',
  incentiveStructureSchema
);

export default IncentiveStructure;

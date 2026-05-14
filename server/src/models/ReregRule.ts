import mongoose, { Schema, Document } from 'mongoose';

export interface IReregRule extends Document {
  organizationId: mongoose.Types.ObjectId;
  carryForwardEnabled: boolean;
  autoApproveThreshold: number;
  notifyFinanceOnMiss: boolean;
  gracePeriodDays: number;
  penaltyAmount?: number;
  escalationRules: {
    missedCycles: number;
    action: 'notify' | 'block' | 'escalate';
    notifyRoles: string[];
  }[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const reregRuleSchema = new Schema<IReregRule>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
      index: true,
    },
    carryForwardEnabled: {
      type: Boolean,
      default: true,
    },
    autoApproveThreshold: {
      type: Number,
      default: 0,
      comment: 'Auto-approve if fees paid >= this amount',
    },
    notifyFinanceOnMiss: {
      type: Boolean,
      default: true,
    },
    gracePeriodDays: {
      type: Number,
      default: 7,
    },
    penaltyAmount: Number,
    escalationRules: [
      {
        missedCycles: { type: Number, required: true },
        action: {
          type: String,
          enum: ['notify', 'block', 'escalate'],
          required: true,
        },
        notifyRoles: [String],
      },
    ],
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

const ReregRule = mongoose.model<IReregRule>('ReregRule', reregRuleSchema);

export default ReregRule;

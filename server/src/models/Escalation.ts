import mongoose, { Schema, Document } from 'mongoose';

export interface IEscalation extends Document {
  organizationId: mongoose.Types.ObjectId;
  type: 'task_overdue' | 'approval_delay' | 'compliance' | 'credential_reveal';
  entityId: mongoose.Types.ObjectId;
  entityType: string;
  raisedBy: mongoose.Types.ObjectId;
  raisedAt: Date;
  currentLevel: number;
  maxLevel: number;
  status: 'active' | 'resolved';
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  chain: Array<{
    level: number;
    role: string;
    userId?: mongoose.Types.ObjectId;
    action?: string;
    actionAt?: Date;
    remarks?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const escalationSchema = new Schema<IEscalation>(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true 
    },
    type: { 
      type: String, 
      enum: ['task_overdue', 'approval_delay', 'compliance', 'credential_reveal'], 
      required: true 
    },
    entityId: { type: Schema.Types.ObjectId, required: true },
    entityType: { type: String, required: true },
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    raisedAt: { type: Date, default: Date.now },
    currentLevel: { type: Number, default: 1 },
    maxLevel: { type: Number, default: 3 },
    status: { 
      type: String, 
      enum: ['active', 'resolved'], 
      default: 'active' 
    },
    description: { type: String, required: true },
    impact: { 
      type: String, 
      enum: ['low', 'medium', 'high', 'critical'], 
      default: 'medium' 
    },
    chain: [{
      level: { type: Number, required: true },
      role: { type: String, required: true },
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      action: { type: String },
      actionAt: { type: Date },
      remarks: { type: String },
    }],
  },
  { timestamps: true }
);

escalationSchema.index({ organizationId: 1, status: 1 });
escalationSchema.index({ entityId: 1, entityType: 1 });

export default mongoose.model<IEscalation>('Escalation', escalationSchema);

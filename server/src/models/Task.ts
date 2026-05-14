import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  organizationId: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  assignedTo: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  deadline: Date;
  completedAt?: Date;
  evidence?: string[];
  remarks?: string;
  escalatedTo?: mongoose.Types.ObjectId;
  escalatedAt?: Date;
  escalationStatus: 'none' | 'overdue_employee' | 'escalated_dept' | 'escalated_ceo';
  gracePeriodEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true 
    },
    departmentId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Department'
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    priority: { 
      type: String, 
      enum: ['low', 'medium', 'high', 'critical'], 
      default: 'medium' 
    },
    status: { 
      type: String, 
      enum: ['pending', 'in_progress', 'completed', 'overdue'], 
      default: 'pending' 
    },
    deadline: { type: Date, required: true },
    completedAt: { type: Date },
    evidence: [{ type: String }],
    remarks: { type: String },
    escalatedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    escalatedAt: { type: Date },
    escalationStatus: {
      type: String,
      enum: ['none', 'overdue_employee', 'escalated_dept', 'escalated_ceo'],
      default: 'none',
    },
    gracePeriodEnd: { type: Date },
  },
  { timestamps: true }
);

taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ organizationId: 1, departmentId: 1 });
taskSchema.index({ deadline: 1, status: 1 });

export default mongoose.model<ITask>('Task', taskSchema);

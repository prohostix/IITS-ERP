import mongoose, { Schema, Document } from 'mongoose';

export interface IComplaint extends Document {
  organizationId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  subject: string;
  description: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  submittedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

const complaintSchema = new Schema<IComplaint>(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true 
    },
    employeeId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['open', 'in_progress', 'resolved', 'closed'], 
      default: 'open' 
    },
    priority: { 
      type: String, 
      enum: ['low', 'medium', 'high'], 
      default: 'medium' 
    },
    submittedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
    resolution: { type: String },
  },
  { timestamps: true }
);

complaintSchema.index({ organizationId: 1, status: 1 });
complaintSchema.index({ employeeId: 1 });

export default mongoose.model<IComplaint>('Complaint', complaintSchema);

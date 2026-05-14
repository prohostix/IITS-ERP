import mongoose, { Schema, Document } from 'mongoose';

export interface IAdmissionSession extends Document {
  organizationId: mongoose.Types.ObjectId;
  subDepartmentId: mongoose.Types.ObjectId;
  name: string;
  startDate: Date;
  endDate: Date;
  examDate?: Date;
  status: 'pending' | 'approved' | 'active' | 'closed';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const admissionSessionSchema = new Schema<IAdmissionSession>(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true 
    },
    subDepartmentId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Department', 
      required: true 
    },
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    examDate: { type: Date },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'active', 'closed'], 
      default: 'pending' 
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

admissionSessionSchema.index({ organizationId: 1, status: 1 });
admissionSessionSchema.index({ subDepartmentId: 1 });

export default mongoose.model<IAdmissionSession>('AdmissionSession', admissionSessionSchema);

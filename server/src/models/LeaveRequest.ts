import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaveRequest extends Document {
  employeeId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  type: 'sick' | 'casual' | 'earned' | 'unpaid';
  startDate: Date;
  endDate: Date;
  reason: string;
  status: 'pending' | 'dept_approved' | 'approved' | 'rejected';
  deptAdminRemarks?: string;
  hrRemarks?: string;
  deptApprovedBy?: mongoose.Types.ObjectId;
  hrApprovedBy?: mongoose.Types.ObjectId;
  appliedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const leaveRequestSchema = new Schema<ILeaveRequest>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true 
    },
    departmentId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Department', 
      required: true 
    },
    type: { 
      type: String, 
      enum: ['sick', 'casual', 'earned', 'unpaid'], 
      required: true 
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'dept_approved', 'approved', 'rejected'], 
      default: 'pending' 
    },
    deptAdminRemarks: { type: String },
    hrRemarks: { type: String },
    deptApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    hrApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    appliedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

leaveRequestSchema.index({ employeeId: 1, status: 1 });
leaveRequestSchema.index({ organizationId: 1, status: 1 });

export default mongoose.model<ILeaveRequest>('LeaveRequest', leaveRequestSchema);

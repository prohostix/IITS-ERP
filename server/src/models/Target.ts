import mongoose, { Schema, Document } from 'mongoose';

export interface ITarget extends Document {
  organizationId: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  employeeId?: mongoose.Types.ObjectId;
  centerId?: mongoose.Types.ObjectId;
  type: 'revenue' | 'students' | 'centers';
  period: string;
  target: number;
  achieved: number;
  incentive?: number;
  createdAt: Date;
  updatedAt: Date;
}

const targetSchema = new Schema<ITarget>(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true 
    },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    employeeId: { type: Schema.Types.ObjectId, ref: 'User' },
    centerId: { type: Schema.Types.ObjectId, ref: 'StudyCenter' },
    type: { 
      type: String, 
      enum: ['revenue', 'students', 'centers'], 
      required: true 
    },
    period: { type: String, required: true },
    target: { type: Number, required: true },
    achieved: { type: Number, default: 0 },
    incentive: { type: Number },
  },
  { timestamps: true }
);

targetSchema.index({ organizationId: 1, period: 1 });
targetSchema.index({ employeeId: 1 });

export default mongoose.model<ITarget>('Target', targetSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IDesignation extends Document {
  organizationId: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  subDepartmentId?: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;       // scoped to a branch
  title: string;
  level: number;
  parentDesignationId?: mongoose.Types.ObjectId;
  filledBy?: mongoose.Types.ObjectId[];
  maxHeadcount: number;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const designationSchema = new Schema<IDesignation>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    subDepartmentId: { type: Schema.Types.ObjectId, ref: 'SubDepartment', default: null },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    title: { type: String, required: true, trim: true },
    level: { type: Number, default: 1 },
    parentDesignationId: { type: Schema.Types.ObjectId, ref: 'Designation', default: null },
    filledBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    maxHeadcount: { type: Number, default: 1 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

designationSchema.index({ organizationId: 1, departmentId: 1 });
designationSchema.index({ parentDesignationId: 1 });

export default mongoose.model<IDesignation>('Designation', designationSchema);

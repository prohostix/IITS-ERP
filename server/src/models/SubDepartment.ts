import mongoose, { Schema, Document } from 'mongoose';

export interface ISubDepartment extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  parentDeptId: mongoose.Types.ObjectId;
  managerId?: mongoose.Types.ObjectId;
  features: string[];
  assignedUniversities?: mongoose.Types.ObjectId[];
  assignedPrograms?: mongoose.Types.ObjectId[];
  assignedCenters?: mongoose.Types.ObjectId[];
  status: 'active' | 'inactive';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const subDepartmentSchema = new Schema<ISubDepartment>(
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
      trim: true,
    },
    parentDeptId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
    features: {
      type: [String],
      default: [],
    },
    assignedUniversities: [{ type: Schema.Types.ObjectId, ref: 'University' }],
    assignedPrograms: [{ type: Schema.Types.ObjectId, ref: 'Program' }],
    assignedCenters: [{ type: Schema.Types.ObjectId, ref: 'StudyCenter' }],
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Unique: one sub-department name per parent department per org
subDepartmentSchema.index({ organizationId: 1, parentDeptId: 1, name: 1 }, { unique: true });

const SubDepartment = mongoose.model<ISubDepartment>('SubDepartment', subDepartmentSchema);

export default SubDepartment;

import mongoose, { Schema, Document } from 'mongoose';

export interface IBranch extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  branchCode: string;
  location: string;
  city?: string;
  state?: string;
  branchManagerId?: mongoose.Types.ObjectId;
  salesDeptId?: mongoose.Types.ObjectId;
  operationsDeptId?: mongoose.Types.ObjectId;
  additionalDeptIds: mongoose.Types.ObjectId[]; // extra depts the branch manager can access
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const branchSchema = new Schema<IBranch>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true },
    branchCode: { type: String, required: true, trim: true, uppercase: true },
    location: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    branchManagerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    salesDeptId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    operationsDeptId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    additionalDeptIds: [{ type: Schema.Types.ObjectId, ref: 'Department' }],
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

branchSchema.index({ organizationId: 1 });
branchSchema.index({ organizationId: 1, branchCode: 1 }, { unique: true });

export default mongoose.model<IBranch>('Branch', branchSchema);

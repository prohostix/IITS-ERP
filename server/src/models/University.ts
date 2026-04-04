import mongoose, { Schema, Document } from 'mongoose';

export interface IUniversity extends Document {
  organizationId: mongoose.Types.ObjectId;
  subDepartmentId?: mongoose.Types.ObjectId;
  name: string;
  code: string;
  address?: string;
  contact?: string;
  status: 'active' | 'inactive';
  // Branches that are allowed to use this university (empty = all branches)
  allowedBranchIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const universitySchema = new Schema<IUniversity>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    subDepartmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    name: { type: String, required: true },
    code: { type: String, required: true },
    address: { type: String },
    contact: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    allowedBranchIds: [{ type: Schema.Types.ObjectId, ref: 'Branch' }],
  },
  { timestamps: true }
);

universitySchema.index({ organizationId: 1 });
universitySchema.index({ organizationId: 1, code: 1 }, { unique: true });

export default mongoose.model<IUniversity>('University', universitySchema);

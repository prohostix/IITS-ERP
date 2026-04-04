import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  status: 'active' | 'inactive' | 'suspended';
  licenseId?: mongoose.Types.ObjectId;
  licenseExpiry?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    logo: { type: String },
    status: { 
      type: String, 
      enum: ['active', 'inactive', 'suspended'], 
      default: 'active' 
    },
    licenseId: { type: Schema.Types.ObjectId, ref: 'License' },
    licenseExpiry: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// email index is auto-created by unique: true in field definition
organizationSchema.index({ status: 1 });

export default mongoose.model<IOrganization>('Organization', organizationSchema);

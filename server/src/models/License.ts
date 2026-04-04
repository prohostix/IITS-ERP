import mongoose, { Schema, Document } from 'mongoose';

export interface ILicense extends Document {
  name: string;
  type: 'basic' | 'premium' | 'enterprise';
  features: string[];
  maxUsers: number;
  maxStorage: number;
  durationMonths: number;
  price: number;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const licenseSchema = new Schema<ILicense>(
  {
    name: { type: String, required: true, trim: true },
    type: { 
      type: String, 
      enum: ['basic', 'premium', 'enterprise'], 
      required: true 
    },
    features: [{ type: String }],
    maxUsers: { type: Number, required: true, default: 10 },
    maxStorage: { type: Number, required: true, default: 1024 }, // MB
    durationMonths: { type: Number, required: true, default: 12 },
    price: { type: Number, required: true },
    status: { 
      type: String, 
      enum: ['active', 'inactive'], 
      default: 'active' 
    },
  },
  { timestamps: true }
);

export default mongoose.model<ILicense>('License', licenseSchema);

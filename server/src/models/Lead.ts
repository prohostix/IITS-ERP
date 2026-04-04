import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
  organizationId: mongoose.Types.ObjectId;
  centerName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  source: string;
  referredBy?: mongoose.Types.ObjectId;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'converted' | 'lost';
  notes: string;
  convertedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<ILead>(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true 
    },
    centerName: { type: String, required: true },
    contactName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    source: { type: String, required: true },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { 
      type: String, 
      enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'converted', 'lost'], 
      default: 'new' 
    },
    notes: { type: String, default: '' },
    convertedAt: { type: Date },
  },
  { timestamps: true }
);

leadSchema.index({ organizationId: 1, status: 1 });
leadSchema.index({ referredBy: 1 });

export default mongoose.model<ILead>('Lead', leadSchema);

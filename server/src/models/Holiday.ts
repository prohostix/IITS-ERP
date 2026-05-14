import mongoose, { Schema, Document } from 'mongoose';

export interface IHoliday extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  date: Date;
  type: 'national' | 'regional' | 'company';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const holidaySchema = new Schema<IHoliday>(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true 
    },
    name: { type: String, required: true },
    date: { type: Date, required: true },
    type: { 
      type: String, 
      enum: ['national', 'regional', 'company'], 
      default: 'company' 
    },
    description: { type: String },
  },
  { timestamps: true }
);

holidaySchema.index({ organizationId: 1, date: 1 });

export default mongoose.model<IHoliday>('Holiday', holidaySchema);

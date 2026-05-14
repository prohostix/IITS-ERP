import mongoose, { Schema, Document } from 'mongoose';

export interface IVacancy extends Document {
  organizationId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  designation: string;
  count: number;
  filled: number;
  status: 'open' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

const vacancySchema = new Schema<IVacancy>(
  {
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
    designation: { type: String, required: true },
    count: { type: Number, required: true, min: 1 },
    filled: { type: Number, default: 0, min: 0 },
    status: { 
      type: String, 
      enum: ['open', 'closed'], 
      default: 'open' 
    },
  },
  { timestamps: true }
);

vacancySchema.index({ organizationId: 1, departmentId: 1 });
vacancySchema.index({ status: 1 });

export default mongoose.model<IVacancy>('Vacancy', vacancySchema);

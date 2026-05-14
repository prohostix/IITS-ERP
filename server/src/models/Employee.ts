import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployee extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  employeeId: string;
  joinDate: Date;
  salary?: number;
  vacancyId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<IEmployee>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true 
    },
    employeeId: { type: String, required: true, unique: true },
    joinDate: { type: Date, required: true, default: Date.now },
    salary: { type: Number },
    vacancyId: { type: Schema.Types.ObjectId, ref: 'Vacancy' },
  },
  { timestamps: true }
);

employeeSchema.index({ organizationId: 1 });
// employeeId index is auto-created by unique: true in field definition

export default mongoose.model<IEmployee>('Employee', employeeSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
  centerId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  enrollmentNo: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  programId: mongoose.Types.ObjectId;
  sessionId?: mongoose.Types.ObjectId;
  status: 'pending' | 'active' | 'inactive' | 'completed';
  joinDate: Date;
  reregStatus?: {
    semester: number;
    status: 'pending' | 'completed' | 'carry_forward';
    feePaid: boolean;
    completedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<IStudent>(
  {
    centerId: { 
      type: Schema.Types.ObjectId, 
      ref: 'StudyCenter', 
      required: true 
    },
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true 
    },
    enrollmentNo: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'AdmissionSession' },
    status: { 
      type: String, 
      enum: ['pending', 'active', 'inactive', 'completed'], 
      default: 'pending' 
    },
    joinDate: { type: Date, default: Date.now },
    reregStatus: {
      semester: { type: Number },
      status: { 
        type: String, 
        enum: ['pending', 'completed', 'carry_forward'] 
      },
      feePaid: { type: Boolean, default: false },
      completedAt: { type: Date },
    },
  },
  { timestamps: true }
);

studentSchema.index({ organizationId: 1, status: 1 });
studentSchema.index({ centerId: 1 });
// enrollmentNo index is auto-created by unique: true in field definition

export default mongoose.model<IStudent>('Student', studentSchema);

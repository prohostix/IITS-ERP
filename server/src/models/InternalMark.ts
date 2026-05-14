import mongoose, { Schema, Document } from 'mongoose';

export interface IInternalMark extends Document {
  organizationId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  subjectName?: string;
  marks: number;
  maxMarks: number;
  examType: 'internal' | 'practical' | 'assignment';
  enteredBy: mongoose.Types.ObjectId;
  enteredAt: Date;
  studyCenterId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const internalMarkSchema = new Schema<IInternalMark>(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true 
    },
    studentId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Student', 
      required: true 
    },
    subjectId: { type: Schema.Types.ObjectId, required: true },
    subjectName: { type: String },
    marks: { type: Number, required: true },
    maxMarks: { type: Number, required: true },
    examType: { 
      type: String, 
      enum: ['internal', 'practical', 'assignment'], 
      required: true 
    },
    enteredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    enteredAt: { type: Date, default: Date.now },
    studyCenterId: { type: Schema.Types.ObjectId, ref: 'StudyCenter' },
  },
  { timestamps: true }
);

internalMarkSchema.index({ studentId: 1 });
internalMarkSchema.index({ organizationId: 1 });

export default mongoose.model<IInternalMark>('InternalMark', internalMarkSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IProgramMaterial extends Document {
  programId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category: 'syllabus' | 'study_material' | 'question_paper' | 'reference' | 'other';
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  semesterNumber?: number;        // optional: link to a specific semester
  uploadedBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const programMaterialSchema = new Schema<IProgramMaterial>(
  {
    programId:      { type: Schema.Types.ObjectId, ref: 'Program', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    title:          { type: String, required: true },
    description:    { type: String, default: '' },
    category: {
      type: String,
      enum: ['syllabus', 'study_material', 'question_paper', 'reference', 'other'],
      required: true,
      default: 'study_material',
    },
    fileUrl:        { type: String, required: true },
    fileName:       { type: String, required: true },
    fileSize:       { type: Number, required: true },
    mimeType:       { type: String, required: true },
    semesterNumber: { type: Number, default: null },
    uploadedBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive:       { type: Boolean, default: true },
  },
  { timestamps: true }
);

programMaterialSchema.index({ programId: 1, organizationId: 1 });
programMaterialSchema.index({ category: 1 });

export default mongoose.model<IProgramMaterial>('ProgramMaterial', programMaterialSchema);

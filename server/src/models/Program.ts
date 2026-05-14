import mongoose, { Schema, Document } from 'mongoose';

export type CourseType = 'Skill Course' | 'Online Degree' | 'B.Voc Degree' | 'Credit Transfer';

export interface ISemester {
  number: number;
  name: string;       // e.g. "Semester 1"
  durationMonths: number;
}

export interface IProgram extends Document {
  universityId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  subDepartmentId?: mongoose.Types.ObjectId;
  name: string;
  code: string;
  courseType: CourseType;
  duration: number;           // total duration in months
  hasSemesters: boolean;
  semesters: ISemester[];
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const semesterSchema = new Schema<ISemester>(
  {
    number: { type: Number, required: true },
    name: { type: String, required: true },
    durationMonths: { type: Number, required: true, default: 6 },
  },
  { _id: false }
);

const programSchema = new Schema<IProgram>(
  {
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    subDepartmentId: { type: Schema.Types.ObjectId, ref: 'SubDepartment', default: null },
    name: { type: String, required: true },
    code: { type: String, required: true },
    courseType: {
      type: String,
      enum: ['Skill Course', 'Online Degree', 'B.Voc Degree', 'Credit Transfer'],
      required: true,
      default: 'Online Degree',
    },
    duration: { type: Number, required: true }, // in months
    hasSemesters: { type: Boolean, default: false },
    semesters: { type: [semesterSchema], default: [] },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

programSchema.index({ universityId: 1 });
programSchema.index({ organizationId: 1 });

export default mongoose.model<IProgram>('Program', programSchema);

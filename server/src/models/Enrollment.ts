import mongoose, { Schema, Document } from 'mongoose';

export const VALID_TRANSITIONS: Record<string, string[]> = {
  payment_pending: ['document_review'],
  document_review: ['finance_review', 'department_rejected'],
  finance_review: ['enrolled', 'rejected'],
  department_rejected: [],
  enrolled: [],
  rejected: [],
};

export interface IEnrollment extends Document {
  enrollmentNumber: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentAddress: string;
  programId: mongoose.Types.ObjectId;
  studyCenterId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  status: 'payment_pending' | 'document_review' | 'department_approved' | 'department_rejected' | 'finance_review' | 'enrolled' | 'rejected';
  departmentRemarks?: string;
  financeRemarks?: string;
  departmentReviewedBy?: mongoose.Types.ObjectId;
  departmentReviewedAt?: Date;
  financeReviewedBy?: mongoose.Types.ObjectId;
  financeReviewedAt?: Date;
  enrolledAt?: Date;
  statusHistory: {
    status: string;
    actorId?: mongoose.Types.ObjectId;
    timestamp: Date;
    remarks?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    enrollmentNumber: { type: String, unique: true },
    studentName: { type: String, required: true },
    studentEmail: { type: String, required: true },
    studentPhone: { type: String, required: true },
    studentAddress: { type: String, required: true },
    programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
    studyCenterId: { type: Schema.Types.ObjectId, ref: 'StudyCenter', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    status: {
      type: String,
      enum: ['payment_pending', 'document_review', 'department_approved', 'department_rejected', 'finance_review', 'enrolled', 'rejected'],
      default: 'payment_pending',
    },
    departmentRemarks: { type: String },
    financeRemarks: { type: String },
    departmentReviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    departmentReviewedAt: { type: Date },
    financeReviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    financeReviewedAt: { type: Date },
    enrolledAt: { type: Date },
    statusHistory: [
      {
        status: { type: String },
        actorId: { type: Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        remarks: { type: String },
      },
    ],
  },
  { timestamps: true }
);

// Auto-generate enrollment number
enrollmentSchema.pre('save', async function (next) {
  if (!this.enrollmentNumber) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await mongoose.model('Enrollment').countDocuments();
    this.enrollmentNumber = `ENR-${dateStr}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

enrollmentSchema.index({ studyCenterId: 1, status: 1 });
enrollmentSchema.index({ programId: 1, status: 1 });
enrollmentSchema.index({ organizationId: 1, status: 1 });

export default mongoose.model<IEnrollment>('Enrollment', enrollmentSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IKPI {
  title: string;
  description?: string;
  target: number;
  achieved: number;
  unit: string; // %, count, ₹, etc.
  period: string; // Q1 2025, FY 2025, etc.
  status: 'on_track' | 'at_risk' | 'achieved' | 'missed';
}

export interface IKRA {
  area: string;         // Key Result Area name
  description?: string;
  weightage: number;    // % weightage (all KRAs should sum to 100)
  rating?: number;      // 1-5 rating given by HR
  remarks?: string;
}

export interface IEmployeeProfile extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;

  // Personal Info
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  bloodGroup?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  emergencyContact?: { name: string; phone: string; relation: string };

  // Employment Info
  employeeCode?: string;
  joinDate?: Date;
  confirmationDate?: Date;
  probationEndDate?: Date;
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'intern';
  workLocation?: string;
  reportingManagerId?: mongoose.Types.ObjectId;

  // Salary
  ctc?: number;           // Cost to company (annual)
  basicSalary?: number;
  bankName?: string;
  bankAccountNo?: string;
  ifscCode?: string;
  panNumber?: string;

  // Documents
  documents?: Array<{ name: string; url?: string; uploadedAt?: Date }>;

  // KPI
  kpis?: IKPI[];

  // KRA
  kras?: IKRA[];

  // Performance Review
  lastReviewDate?: Date;
  nextReviewDate?: Date;
  overallRating?: number; // 1-5
  reviewRemarks?: string;

  createdAt: Date;
  updatedAt: Date;
}

const KPISchema = new Schema<IKPI>({
  title: { type: String, required: true },
  description: String,
  target: { type: Number, required: true },
  achieved: { type: Number, default: 0 },
  unit: { type: String, default: '%' },
  period: { type: String, required: true },
  status: { type: String, enum: ['on_track', 'at_risk', 'achieved', 'missed'], default: 'on_track' },
}, { _id: true });

const KRASchema = new Schema<IKRA>({
  area: { type: String, required: true },
  description: String,
  weightage: { type: Number, required: true },
  rating: { type: Number, min: 1, max: 5 },
  remarks: String,
}, { _id: true });

const employeeProfileSchema = new Schema<IEmployeeProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },

    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    bloodGroup: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },

    employeeCode: String,
    joinDate: Date,
    confirmationDate: Date,
    probationEndDate: Date,
    employmentType: { type: String, enum: ['full_time', 'part_time', 'contract', 'intern'], default: 'full_time' },
    workLocation: String,
    reportingManagerId: { type: Schema.Types.ObjectId, ref: 'User' },

    ctc: Number,
    basicSalary: Number,
    bankName: String,
    bankAccountNo: String,
    ifscCode: String,
    panNumber: String,

    documents: [{ name: String, url: String, uploadedAt: Date }],

    kpis: [KPISchema],
    kras: [KRASchema],

    lastReviewDate: Date,
    nextReviewDate: Date,
    overallRating: { type: Number, min: 1, max: 5 },
    reviewRemarks: String,
  },
  { timestamps: true }
);

employeeProfileSchema.index({ userId: 1, organizationId: 1 }, { unique: true });

export default mongoose.model<IEmployeeProfile>('EmployeeProfile', employeeProfileSchema);

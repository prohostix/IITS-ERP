import mongoose, { Schema, Document } from 'mongoose';

export interface IDayOverride {
  day: string; // 'Monday' | 'Tuesday' | ...
  checkInTime: string;
  checkOutTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
  breakDurationMinutes?: number;
}

export interface IOfficeLocation {
  name: string;
  latitude: number;
  longitude: number;
  allowedRadius: number;
  isDefault?: boolean;
}

export interface IHRSettings extends Document {
  organizationId: mongoose.Types.ObjectId;
  officeHours: {
    checkInTime: string;
    checkOutTime: string;
    graceMinutes: number;
    workingDays: string[];
    breakStartTime?: string;
    breakEndTime?: string;
    breakDurationMinutes?: number;
    dayOverrides?: IDayOverride[];
  };
  latePolicy: {
    maxLateMinutesPerMonth: number;
    deductionPerExtraMinute?: number;
    warningThreshold?: number;
  };
  // Legacy single location (kept for backward compat)
  location: {
    officeLatitude: number;
    officeLongitude: number;
    allowedRadius: number;
    requireLocationForCheckIn: boolean;
  };
  // Multiple named locations
  locations?: IOfficeLocation[];
  requireLocationForCheckIn?: boolean;
  biometric: {
    enabled: boolean;
    deviceType: 'fingerprint' | 'face' | 'card' | 'pin' | 'none';
    apiEndpoint?: string;
    apiKey?: string;
    syncInterval: number;
    fallbackToManual: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const dayOverrideSchema = new Schema<IDayOverride>({
  day: { type: String, required: true },
  checkInTime: { type: String, required: true },
  checkOutTime: { type: String, required: true },
  breakStartTime: { type: String },
  breakEndTime: { type: String },
  breakDurationMinutes: { type: Number },
}, { _id: false });

const officeLocationSchema = new Schema<IOfficeLocation>({
  name: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  allowedRadius: { type: Number, default: 100 },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const hrSettingsSchema = new Schema<IHRSettings>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
    },
    officeHours: {
      checkInTime: { type: String, required: true, default: '09:00' },
      checkOutTime: { type: String, required: true, default: '18:00' },
      graceMinutes: { type: Number, default: 15 },
      workingDays: {
        type: [String],
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      },
      breakStartTime: { type: String, default: '13:00' },
      breakEndTime: { type: String, default: '14:00' },
      breakDurationMinutes: { type: Number, default: 60 },
      dayOverrides: { type: [dayOverrideSchema], default: [] },
    },
    latePolicy: {
      maxLateMinutesPerMonth: { type: Number, default: 60 },
      deductionPerExtraMinute: { type: Number, default: 0 },
      warningThreshold: { type: Number, default: 45 },
    },
    location: {
      officeLatitude: { type: Number, default: 0 },
      officeLongitude: { type: Number, default: 0 },
      allowedRadius: { type: Number, default: 100 },
      requireLocationForCheckIn: { type: Boolean, default: true },
    },
    locations: { type: [officeLocationSchema], default: [] },
    requireLocationForCheckIn: { type: Boolean, default: true },
    biometric: {
      enabled: { type: Boolean, default: false },
      deviceType: {
        type: String,
        enum: ['fingerprint', 'face', 'card', 'pin', 'none'],
        default: 'none',
      },
      apiEndpoint: { type: String },
      apiKey: { type: String },
      syncInterval: { type: Number, default: 5 },
      fallbackToManual: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IHRSettings>('HRSettings', hrSettingsSchema);

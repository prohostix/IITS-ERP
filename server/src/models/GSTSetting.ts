import mongoose, { Schema, Document } from 'mongoose';

export interface IGSTSetting extends Document {
  organizationId: mongoose.Types.ObjectId;
  feeType: string;
  gstPercentage: number;
  hsnCode?: string;
  sacCode?: string;
  applicableFrom: Date;
  applicableTo?: Date;
  allowOverride: boolean;
  status: 'active' | 'inactive';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const gstSettingSchema = new Schema<IGSTSetting>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    feeType: {
      type: String,
      required: true,
    },
    gstPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    hsnCode: String,
    sacCode: String,
    applicableFrom: {
      type: Date,
      required: true,
    },
    applicableTo: Date,
    allowOverride: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

gstSettingSchema.index({ organizationId: 1, feeType: 1, status: 1 });
gstSettingSchema.index({ applicableFrom: 1, applicableTo: 1 });

const GSTSetting = mongoose.model<IGSTSetting>('GSTSetting', gstSettingSchema);

export default GSTSetting;

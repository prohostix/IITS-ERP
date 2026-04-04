import mongoose, { Schema, Document } from 'mongoose';

export interface IFeeStructure extends Document {
  programId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  registrationFee: number;
  tuitionFee: number;
  examFee: number;
  otherCharges: Map<string, number>;
  gstPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

const feeStructureSchema = new Schema<IFeeStructure>(
  {
    programId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Program', 
      required: true,
      unique: true 
    },
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true 
    },
    registrationFee: { type: Number, required: true, default: 0 },
    tuitionFee: { type: Number, required: true, default: 0 },
    examFee: { type: Number, required: true, default: 0 },
    otherCharges: { type: Map, of: Number, default: {} },
    gstPercentage: { type: Number, required: true, default: 18 },
  },
  { timestamps: true }
);

// programId index is auto-created by unique: true in field definition
feeStructureSchema.index({ organizationId: 1 });

export default mongoose.model<IFeeStructure>('FeeStructure', feeStructureSchema);

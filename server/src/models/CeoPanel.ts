import mongoose, { Schema, Document } from 'mongoose';

export interface ICeoPanel extends Document {
  organizationId: mongoose.Types.ObjectId;
  assignedUserId: mongoose.Types.ObjectId;
  name: string;
  dataScope: string[]; // ['all', 'operations', 'finance', 'hr', 'sales']
  status: 'active' | 'inactive';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ceoPanelSchema = new Schema<ICeoPanel>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    assignedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    dataScope: {
      type: [String],
      default: ['all'],
      enum: ['all', 'operations', 'finance', 'hr', 'sales', 'specific_departments'],
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

// Indexes
ceoPanelSchema.index({ organizationId: 1, status: 1 });
ceoPanelSchema.index({ assignedUserId: 1 });

const CeoPanel = mongoose.model<ICeoPanel>('CeoPanel', ceoPanelSchema);

export default CeoPanel;

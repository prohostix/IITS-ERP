import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncement extends Document {
  organizationId: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  title: string;
  content: string;
  type: 'general' | 'hr' | 'ops' | 'finance' | 'sales';
  priority: 'low' | 'medium' | 'high';
  postedBy: mongoose.Types.ObjectId;
  postedAt: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true 
    },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['general', 'hr', 'ops', 'finance', 'sales'], 
      default: 'general' 
    },
    priority: { 
      type: String, 
      enum: ['low', 'medium', 'high'], 
      default: 'medium' 
    },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    postedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

announcementSchema.index({ organizationId: 1, postedAt: -1 });
announcementSchema.index({ departmentId: 1 });

export default mongoose.model<IAnnouncement>('Announcement', announcementSchema);

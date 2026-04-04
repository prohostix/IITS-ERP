import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // recipient
  title: string;
  message: string;
  type: 'announcement' | 'task' | 'leave' | 'complaint' | 'system' | 'general';
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  link?: string; // optional deep-link tab
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['announcement', 'task', 'leave', 'complaint', 'system', 'general'],
      default: 'general',
    },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    read: { type: Boolean, default: false },
    link: { type: String },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ organizationId: 1, createdAt: -1 });

export default mongoose.model<INotification>('Notification', notificationSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IPollOption {
  text: string;
  votes: mongoose.Types.ObjectId[]; // userIds who voted
}

export interface IPoll extends Document {
  organizationId: mongoose.Types.ObjectId;
  question: string;
  options: IPollOption[];
  createdBy: mongoose.Types.ObjectId;
  expiresAt?: Date;
  isActive: boolean;
  allowMultiple: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pollSchema = new Schema<IPoll>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    question: { type: String, required: true },
    options: [
      {
        text: { type: String, required: true },
        votes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    allowMultiple: { type: Boolean, default: false },
  },
  { timestamps: true }
);

pollSchema.index({ organizationId: 1, createdAt: -1 });

export default mongoose.model<IPoll>('Poll', pollSchema);

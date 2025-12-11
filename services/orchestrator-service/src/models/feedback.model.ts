import mongoose, { Schema, Document } from "mongoose";

export interface IFeedback extends Document {
  userId: string;
  analysisId: string;
  rating: number; // 1-5
  comment?: string;
  timestamp: Date;
}

const FeedbackSchema = new Schema({
  userId: { type: String, required: true, index: true },
  analysisId: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: String,
  timestamp: { type: Date, default: Date.now, index: true }
});

FeedbackSchema.index({ userId: 1, timestamp: -1 });

export const Feedback = mongoose.model<IFeedback>("Feedback", FeedbackSchema);
import mongoose from 'mongoose';
const { Schema } = mongoose;

const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    imageUrl: String,
    modelVersion: String,
    bowlCount: Number,
    detected: Boolean,
    top3: [{ classId: String, confidence: Number, k: Number, grams: Number }],
    inferenceMs: Number,
    rawAiData: Schema.Types.Mixed,
    status: { type: String, enum: ['pending', 'confirmed', 'discarded'], default: 'pending' },
  },
  { timestamps: true }
);
schema.index({ userId: 1, createdAt: -1 });
schema.index({ createdAt: -1 });
schema.index({ status: 1 });
schema.index({ 'top3.0.classId': 1 });
schema.index({ 'top3.0.confidence': 1 });

export default mongoose.model('AiPrediction', schema);
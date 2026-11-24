import mongoose from 'mongoose';
const { Schema } = mongoose;

const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    imageUrl: String,
    modelVersion: String,
    top3: [{ classId: String, confidence: Number }],
    inferenceMs: Number,
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
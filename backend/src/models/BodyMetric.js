import mongoose from 'mongoose';
const { Schema } = mongoose;

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  heightCm: Number,
  weightKg: { type: Number, required: true },
  recordedAt: { type: Date, default: Date.now },
});
schema.index({ userId: 1, recordedAt: -1 });

export default mongoose.model('BodyMetric', schema);
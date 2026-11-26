import mongoose from 'mongoose';
const { Schema } = mongoose;

const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    toolsUsed: [String],
    matchedFoodIds: [{ type: Schema.Types.ObjectId, ref: 'Food' }],
    foundInDb: { type: Boolean, default: true },
  },
  { timestamps: true }
);

schema.index({ role: 1, createdAt: -1 });

export default mongoose.model('ChatMessage', schema);
import mongoose from 'mongoose';
const { Schema } = mongoose;

const schema = new Schema(
  {
    predictionId: { type: Schema.Types.ObjectId, ref: 'AiPrediction', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    predictedClass: { type: String, index: true },
    correctFoodId: { type: Schema.Types.ObjectId, ref: 'Food', required: true },
    comment: String,
    status: { type: String, enum: ['pending', 'resolved'], default: 'pending', index: true },
    adminNote: String,
    handledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    handledAt: Date,
  },
  { timestamps: true }
);
schema.index({ createdAt: -1 });

export default mongoose.model('Feedback', schema);

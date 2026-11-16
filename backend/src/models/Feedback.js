import mongoose from 'mongoose';
const { Schema } = mongoose;

const schema = new Schema(
  {
    predictionId: { type: Schema.Types.ObjectId, ref: 'AiPrediction', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    predictedClass: String,
    correctFoodId: { type: Schema.Types.ObjectId, ref: 'Food', required: true },
    comment: String,
  },
  { timestamps: true }
);

export default mongoose.model('Feedback', schema);
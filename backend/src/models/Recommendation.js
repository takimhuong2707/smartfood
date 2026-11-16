import mongoose from 'mongoose';
const { Schema } = mongoose;

const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['meal', 'daily'], required: true },
    date: Date,
    mealId: { type: Schema.Types.ObjectId, ref: 'Meal' },
    basedOn: { totalKcal: Number, targetKcal: Number },
    content: { type: String, required: true },
    llmModel: String,
  },
  { timestamps: true }
);

export default mongoose.model('Recommendation', schema);
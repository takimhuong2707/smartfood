import mongoose from 'mongoose';
const { Schema } = mongoose;

const schema = new Schema(
  {
    mealId: { type: Schema.Types.ObjectId, ref: 'Meal', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    foodId: { type: Schema.Types.ObjectId, ref: 'Food', required: true },
    foodName: String, // snapshot
    predictionId: { type: Schema.Types.ObjectId, ref: 'AiPrediction', index: true }, // null nếu thêm thủ công
    imageUrl: String,
    portionLabel: String,
    portionGrams: { type: Number, required: true },
    nutrition: { kcal: Number, protein: Number, carb: Number, fat: Number, fiber: Number }, // snapshot
    isCorrected: { type: Boolean, default: false },
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });
schema.index({ isCorrected: 1, predictionId: 1 });

export default mongoose.model('MealItem', schema);
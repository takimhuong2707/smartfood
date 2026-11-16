import mongoose from 'mongoose';
const { Schema } = mongoose;

const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'], required: true },
    eatenAt: { type: Date, required: true },
    note: String,
    totals: {
      kcal: { type: Number, default: 0 }, protein: { type: Number, default: 0 },
      carb: { type: Number, default: 0 }, fat: { type: Number, default: 0 },
      fiber: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);
schema.index({ userId: 1, eatenAt: -1 });

export default mongoose.model('Meal', schema);
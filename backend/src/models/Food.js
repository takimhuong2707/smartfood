import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    classId: { type: String, required: true, unique: true }, // trùng tên lớp của mô hình
    name: { type: String, required: true },
    aliases: [String],
    category: String,
    description: String,
    imageUrl: String,
    nutritionPer100g: {
      kcal: { type: Number, required: true },
      protein: Number, carb: Number, fat: Number, fiber: Number,
    },
    servingSizes: [{ label: String, grams: Number, isDefault: Boolean }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Food', schema);
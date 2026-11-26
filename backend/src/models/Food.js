import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    classId: { type: String, required: true, unique: true }, // trùng tên lớp của mô hình hoặc slug duy nhất
    aiClassId: { type: String, sparse: true, unique: true }, // 1 trong 30 lớp AI hợp lệ (nếu có)
    name: { type: String, required: true, index: true },
    aliases: [String],
    category: String,
    description: String,
    ingredients: String,
    cookingMethod: String,
    mealTime: String,
    imageUrl: String,
    source: { type: String, enum: ['system', 'admin', 'user'], default: 'system', index: true },
    nutritionPer100g: {
      kcal: { type: Number, required: true },
      protein: Number,
      carb: Number,
      fat: Number,
      fiber: Number,
    },
    servingSizes: [{ label: String, grams: Number, isDefault: Boolean }],
    isActive: { type: Boolean, default: true, index: true },
    deletedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Food', schema);

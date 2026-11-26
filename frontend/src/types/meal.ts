export type PortionOption = {
  label: string;
  grams: number;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  fiber?: number;
  isDefault?: boolean;
  kValue?: number;
  isAiEstimated?: boolean;
};

export type PredictionCandidate = {
  foodId: string;
  classId: string;
  name: string;
  confidence: number;
  kValue?: number;
  aiEstimatedGrams?: number;
  aiMethod?: string;
  portions: PortionOption[];
};

export type PredictionItem = {
  index: number;
  box?: number[] | null;
  candidates: PredictionCandidate[];
};

export type PredictionResponse = {
  predictionId: string;
  inferenceMs: number;
  bowlCount: number;
  detected: boolean;
  items?: PredictionItem[];
  candidates: PredictionCandidate[];
  total?: {
    grams: number;
    kcal: number;
    protein: number;
    carb: number;
    fat: number;
  } | null;
};

export type SaveMealInput = {
  foodId?: string;
  foodName: string;
  portionLabel: string;
  portionGrams: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  predictionId?: string;
  predictedClass?: string;
  imageUrl?: string;
  nutrition: {
    kcal: number;
    protein: number;
    carb: number;
    fat: number;
    fiber?: number;
  };
};

export type SubmitFeedbackInput = {
  predictionId: string;
  correctFoodId: string;
  predictedClass?: string;
  comment?: string;
};

export type FoodItem = {
  _id: string;
  classId: string;
  name: string;
  nutritionPer100g: {
    kcal: number;
    protein?: number;
    carb?: number;
    fat?: number;
    fiber?: number;
  };
  servingSizes: { label: string; grams: number; isDefault?: boolean }[];
};

import { api } from '@/utils/api';
import { uploadMultipart } from '@/utils/upload';
import type { PredictionResponse, SaveMealInput, SubmitFeedbackInput, FoodItem } from '@/types/meal';

export const mealService = {
  predictImage: async (imageUri: string): Promise<PredictionResponse> => {
    return uploadMultipart<PredictionResponse>({
      endpoint: '/meals/predict',
      fieldName: 'image',
      imageUri,
    });
  },

  saveMeal: async (data: SaveMealInput) => {
    const response = await api.post('/meals/save', data);
    return response.data;
  },

  submitFeedback: async (data: SubmitFeedbackInput) => {
    const response = await api.post('/meals/feedback', data);
    return response.data;
  },

  getAllFoods: async (): Promise<FoodItem[]> => {
    const response = await api.get<FoodItem[]>('/meals/foods');
    return response.data;
  },
};

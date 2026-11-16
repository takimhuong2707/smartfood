import { Platform } from 'react-native';
import { api } from '@/utils/api';
import type { PredictionResponse, SaveMealInput, FoodItem } from '@/types/meal';

export const mealService = {
  predictImage: async (imageUri: string): Promise<PredictionResponse> => {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      const res = await fetch(imageUri);
      const blob = await res.blob();
      formData.append('image', blob, 'photo.jpg');
    } else {
      formData.append('image', {
        uri: imageUri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      } as any);
    }

    const response = await api.post<PredictionResponse>('/meals/predict', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  saveMeal: async (data: SaveMealInput) => {
    const response = await api.post('/meals/save', data);
    return response.data;
  },

  getAllFoods: async (): Promise<FoodItem[]> => {
    const response = await api.get<FoodItem[]>('/meals/foods');
    return response.data;
  },
};

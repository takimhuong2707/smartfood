import { api } from '@/utils/api';
import type { User, ProfileInput, TodaySummary } from '@/types/auth';

export const userService = {
  getProfile: async () => (await api.get<User>('/user/profile')).data,

  updateProfile: async (data: ProfileInput) =>
    (await api.put<User>('/user/profile', data)).data,

  getTodaySummary: async () => (await api.get<TodaySummary>('/user/today-summary')).data,
};

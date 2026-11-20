import { api } from '@/utils/api';
import type { User, ProfileInput, TodaySummary } from '@/types/auth';
import type { StatisticsData } from '@/types/stats';

export const userService = {
  getProfile: async () => (await api.get<User>('/user/profile')).data,

  updateProfile: async (data: ProfileInput) =>
    (await api.put<User>('/user/profile', data)).data,

  getTodaySummary: async (date?: string) =>
    (await api.get<TodaySummary>(date ? `/user/today-summary?date=${encodeURIComponent(date)}` : '/user/today-summary')).data,

  getStatistics: async (days: number = 7) =>
    (await api.get<StatisticsData>(`/user/statistics?days=${days}`)).data,

  recordWeight: async (weightKg: number) =>
    (await api.post<{ success: boolean; weightKg: number; targets: any }>('/user/weight', { weightKg })).data,
};

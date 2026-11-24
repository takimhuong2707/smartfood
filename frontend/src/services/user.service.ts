import { api } from '@/utils/api';
import { uploadMultipart } from '@/utils/upload';
import type { User, ProfileInput, TodaySummary } from '@/types/auth';
import type { StatisticsData } from '@/types/stats';

export const userService = {
  getProfile: async () => (await api.get<User>('/user/profile')).data,

  updateProfile: async (data: ProfileInput) =>
    (await api.put<User>('/user/profile', data)).data,

  uploadAvatar: async (imageUri: string): Promise<User> =>
    uploadMultipart<User>({
      endpoint: '/user/avatar',
      fieldName: 'avatar',
      imageUri,
    }),

  saveNote: async (text: string): Promise<User> =>
    (await api.put<User>('/user/note', { text })).data,

  deleteNote: async (): Promise<User> =>
    (await api.delete<User>('/user/note')).data,

  getTodaySummary: async (date?: string) =>
    (await api.get<TodaySummary>(date ? `/user/today-summary?date=${encodeURIComponent(date)}` : '/user/today-summary')).data,

  getStatistics: async (days: number = 7) =>
    (await api.get<StatisticsData>(`/user/statistics?days=${days}`)).data,

  recordWeight: async (weightKg: number) =>
    (await api.post<{ success: boolean; weightKg: number; targets: any }>('/user/weight', { weightKg })).data,
};

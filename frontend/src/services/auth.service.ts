import { api } from '@/utils/api';
import type { AuthResponse, User } from '@/types/auth';

export const authService = {
  login: async (email: string, password: string) =>
    (await api.post<AuthResponse>('/auth/login', { email, password })).data,

  register: async (fullName: string, email: string, password: string) =>
    (await api.post<AuthResponse>('/auth/register', { fullName, email, password })).data,

  me: async () => (await api.get<{ user: User }>('/auth/me')).data.user,
};
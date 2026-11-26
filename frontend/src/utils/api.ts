import axios from 'axios';
import { API_URL } from '@/constants';
import { tokenStorage } from './token';

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

type AuthCallbacks = {
  onUnauthorized: () => Promise<void> | void;
  onAdminForbidden: () => Promise<void> | void;
};

let authCallbacks: AuthCallbacks | null = null;
let isHandling401 = false;

export function registerAuthCallbacks(callbacks: AuthCallbacks | null) {
  authCallbacks = callbacks;
}

// Tự gắn token vào mọi request
api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const url = String(error.config?.url || '');
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');

      if (status === 401 && !isAuthEndpoint && authCallbacks?.onUnauthorized && !isHandling401) {
        isHandling401 = true;
        try {
          await authCallbacks.onUnauthorized();
        } finally {
          isHandling401 = false;
        }
      } else if (status === 403 && url.includes('/admin') && authCallbacks?.onAdminForbidden) {
        await authCallbacks.onAdminForbidden();
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const message = (e.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
    if (e.code === 'ERR_NETWORK' || e.code === 'ECONNABORTED' || e.request) {
      return 'Không kết nối được máy chủ (Port 5000). Hãy kiểm tra Backend đã chạy và cùng mạng Wi-Fi.';
    }
    if (e.message) return e.message;
  }
  if (e instanceof Error) return e.message;
  return 'Có lỗi xảy ra, vui lòng thử lại';
}
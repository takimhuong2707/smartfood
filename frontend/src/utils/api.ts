import axios from 'axios';
import { API_URL } from '@/constants';
import { tokenStorage } from './token';

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

// Tự gắn token vào mọi request
api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
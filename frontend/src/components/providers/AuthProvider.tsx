import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import axios from 'axios';
import { authService } from '@/services/auth.service';
import { tokenStorage } from '@/utils/token';
import type { AuthResponse, User } from '@/types/auth';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Mở app: nếu còn token thì hỏi server xem còn hợp lệ không
  useEffect(() => {
    (async () => {
      try {
        if (await tokenStorage.get()) setUser(await authService.me());
      } catch (e) {
        // Chỉ xóa token khi server báo 401, không xóa khi chỉ mất mạng
        if (axios.isAxiosError(e) && e.response?.status === 401) await tokenStorage.remove();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveSession = useCallback(async ({ token, user }: AuthResponse) => {
    await tokenStorage.set(token);
    setUser(user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => saveSession(await authService.login(email, password)),
    [saveSession]
  );

  const register = useCallback(
    async (fullName: string, email: string, password: string) =>
      saveSession(await authService.register(fullName, email, password)),
    [saveSession]
  );

  const logout = useCallback(async () => {
    await tokenStorage.remove();
    setUser(null);
  }, []);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authService.me();
      setUser(me);
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
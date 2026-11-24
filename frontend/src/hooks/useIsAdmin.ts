import { useAuth } from '@/hooks/useAuth';

export function useIsAdmin() {
  const { user, loading } = useAuth();
  return {
    isAdmin: user?.role === 'admin',
    loading,
  };
}

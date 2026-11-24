import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { COLORS } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { adminService, type AdminUserDetail } from '@/services/admin.service';
import { getErrorMessage } from '@/utils/api';
import Button from '@/components/ui/Button';
import ErrorBox from '@/components/ui/ErrorBox';

export default function AdminUserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: currentUser, logout, refreshUser } = useAuth();

  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      setDetail(await adminService.getUserById(id));
    } catch (e) {
      if (axios.isAxiosError(e)) {
        if (e.response?.status === 401) {
          await logout();
          return;
        }
        if (e.response?.status === 403) {
          await refreshUser();
          return;
        }
      }
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id, logout, refreshUser]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const isSelf = Boolean(detail && currentUser && detail._id === currentUser.id);

  const confirmUpdate = (patch: { isActive?: boolean; role?: 'user' | 'admin' }, title: string, message: string) => {
    if (!detail || updating) return;
    Alert.alert(title, message, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận',
        style: 'destructive',
        onPress: async () => {
          try {
            setUpdating(true);
            setError(null);
            const updated = await adminService.updateUser(detail._id, patch);
            setDetail((prev) => (prev ? { ...prev, role: updated.role, isActive: updated.isActive } : prev));
          } catch (e) {
            if (axios.isAxiosError(e)) {
              if (e.response?.status === 401) {
                await logout();
                return;
              }
              if (e.response?.status === 403) {
                await refreshUser();
                return;
              }
            }
            setError(getErrorMessage(e));
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top + 10 }]}>
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin/users' as Href))}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={s.title}>Chi tiết người dùng</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {error && (
          <View style={{ marginBottom: 12 }}>
            <ErrorBox message={error} />
          </View>
        )}

        {detail && (
          <>
            <View style={s.card}>
              <Text style={s.name}>{detail.fullName}</Text>
              <Text style={s.email}>{detail.email}</Text>
              <View style={s.badgeRow}>
                <View style={s.badge}>
                  <Text style={s.badgeText}>Vai trò: {detail.role === 'admin' ? 'Admin' : 'User'}</Text>
                </View>
                <View style={[s.badge, !detail.isActive && s.badgeDanger]}>
                  <Text style={[s.badgeText, !detail.isActive && s.badgeDangerText]}>
                    {detail.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Chỉ số & Hoạt động</Text>
              <Text style={s.rowText}>
                Cân nặng / Chiều cao: {detail.latestMetric?.weightKg ?? '--'} kg • {detail.latestMetric?.heightCm ?? '--'} cm
              </Text>
              <Text style={s.rowText}>Mục tiêu calo: {detail.targets?.kcal ?? '--'} kcal/ngày</Text>
              <Text style={s.rowText}>Số bữa ăn đã ghi: {detail.stats.mealCount}</Text>
              <Text style={s.rowText}>Số lượt scan AI: {detail.stats.scanCount}</Text>
              <Text style={s.rowText}>
                Hoạt động gần nhất:{' '}
                {detail.stats.lastActiveAt ? new Date(detail.stats.lastActiveAt).toLocaleString('vi-VN') : '--'}
              </Text>
            </View>

            {!isSelf && (
              <View style={s.actions}>
                <Button
                  title={detail.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                  onPress={() =>
                    confirmUpdate(
                      { isActive: !detail.isActive },
                      detail.isActive ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?',
                      detail.isActive
                        ? 'Người dùng sẽ bị đăng xuất ngay lập tức và không thể đăng nhập lại.'
                        : 'Người dùng sẽ có thể đăng nhập lại bình thường.'
                    )
                  }
                  loading={updating}
                />
                <Button
                  title={detail.role === 'admin' ? 'Hạ xuống User thường' : 'Nâng lên Admin'}
                  onPress={() =>
                    confirmUpdate(
                      { role: detail.role === 'admin' ? 'user' : 'admin' },
                      'Thay đổi quyền hạn?',
                      detail.role === 'admin'
                        ? 'Tài khoản này sẽ mất toàn bộ quyền truy cập khu vực quản trị.'
                        : 'Tài khoản này sẽ có toàn bộ quyền quản trị hệ thống.'
                    )
                  }
                  loading={updating}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.ink },
  scroll: { paddingBottom: 32, gap: 12 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  name: { fontSize: 18, fontWeight: '700', color: COLORS.ink },
  email: { fontSize: 13, color: COLORS.muted },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  badge: { backgroundColor: COLORS.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '700', color: COLORS.primaryDark },
  badgeDanger: { backgroundColor: '#FEE2E2' },
  badgeDangerText: { color: '#B91C1C' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 4 },
  rowText: { fontSize: 13, color: COLORS.muted, lineHeight: 20 },
  actions: { gap: 10, marginTop: 4 },
});

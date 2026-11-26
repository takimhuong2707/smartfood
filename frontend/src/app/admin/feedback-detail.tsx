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
import { adminService, type AdminFeedbackItem } from '@/services/admin.service';
import { getErrorMessage } from '@/utils/api';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import ErrorBox from '@/components/ui/ErrorBox';

export default function AdminFeedbackDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout, refreshUser } = useAuth();

  const [item, setItem] = useState<AdminFeedbackItem | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getFeedbackById(id);
      setItem(data);
      setAdminNote(data.adminNote || '');
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        await logout();
        return;
      }
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id, logout]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleStatus = () => {
    if (!item || submitting) return;
    const nextStatus = item.status === 'resolved' ? 'pending' : 'resolved';
    Alert.alert(
      'Xác nhận',
      nextStatus === 'resolved' ? 'Đánh dấu feedback này đã xử lý?' : 'Chuyển lại trạng thái chờ xử lý?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              setSubmitting(true);
              setError(null);
              const updated = await adminService.updateFeedback(item._id, {
                status: nextStatus,
                adminNote: adminNote.trim(),
              });
              setItem((prev) => (prev ? { ...prev, status: updated.status, adminNote: updated.adminNote } : prev));
              await adminService.getStats(7, true).catch(() => null);
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
              setSubmitting(false);
            }
          },
        },
      ]
    );
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
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin/feedbacks' as Href))}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={s.title}>Chi tiết Feedback</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {error && (
          <View style={{ marginBottom: 10 }}>
            <ErrorBox message={error} />
          </View>
        )}

        {item && (
          <>
            <View style={s.card}>
              <Text style={s.label}>AI dự đoán: {item.predictedClass || '--'}</Text>
              <Text style={s.label}>Món đúng: {item.correctFoodId?.name || '--'}</Text>
              <Text style={s.label}>Trạng thái: {item.status === 'resolved' ? 'Đã xử lý' : 'Chờ xử lý'}</Text>
              <Text style={s.comment}>Góp ý của user: {item.comment || '(Không có)'}</Text>
            </View>

            <Field
              label="Ghi chú của Admin (tối đa 500 ký tự)"
              icon="create-outline"
              value={adminNote}
              onChangeText={setAdminNote}
              placeholder="Nhập ghi chú xử lý..."
            />

            <Button
              title={
                submitting
                  ? 'Đang lưu...'
                  : item.status === 'resolved'
                  ? 'Chuyển lại chờ xử lý'
                  : 'Đánh dấu đã xử lý'
              }
              onPress={handleToggleStatus}
              loading={submitting}
            />
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
  label: { fontSize: 14, fontWeight: '600', color: COLORS.ink },
  comment: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
});

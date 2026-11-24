import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants';
import { adminService, type AdminPredictionDetail } from '@/services/admin.service';
import { getErrorMessage } from '@/utils/api';
import ErrorBox from '@/components/ui/ErrorBox';

export default function AdminPredictionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState<AdminPredictionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      setDetail(await adminService.getPredictionById(id));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

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
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin/predictions' as Href))}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={s.title}>Chi tiết dự đoán AI</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {error && <ErrorBox message={error} />}
        {detail && (
          <>
            <View style={s.card}>
              <Text style={s.cardTitle}>Thông tin chung</Text>
              <Text style={s.rowText}>Người dùng: {detail.user?.fullName || '--'}</Text>
              <Text style={s.rowText}>Model: {detail.modelVersion || '--'}</Text>
              <Text style={s.rowText}>Trạng thái: {detail.status}</Text>
              <Text style={s.rowText}>
                Món user sửa thành: {detail.correctedFood ? detail.correctedFood.name : 'Không sửa'}
              </Text>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Top 3 dự đoán</Text>
              {detail.top3.map((t, idx) => {
                const pct = t.confidence <= 1 ? (t.confidence * 100).toFixed(1) : t.confidence.toFixed(1);
                return (
                  <Text key={idx} style={s.rowText}>
                    #{idx + 1}: {t.classId} ({pct}%)
                  </Text>
                );
              })}
            </View>
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
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 4 },
  rowText: { fontSize: 13, color: COLORS.muted },
});

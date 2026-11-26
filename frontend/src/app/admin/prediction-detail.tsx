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
            <View style={s.placeholderBox}>
              <Ionicons name="scan-circle-outline" size={38} color={COLORS.primary} />
              <Text style={s.placeholderTitle}>Bản ghi suy luận 3 mô hình AI</Text>
              <Text style={s.placeholderSub}>
                Ảnh quét được xử lý trực tiếp trên RAM để bảo vệ quyền riêng tư người dùng
              </Text>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Thông tin chung</Text>
              <Text style={s.rowText}>Người dùng: {detail.user?.fullName || '--'}</Text>
              <Text style={s.rowText}>
                Thời gian quét:{' '}
                {detail.createdAt ? new Date(detail.createdAt).toLocaleString('vi-VN') : '--'}
              </Text>
              <Text style={s.rowText}>
                Thời gian suy luận (Inference):{' '}
                {detail.inferenceMs != null ? `${detail.inferenceMs} ms` : '--'}
              </Text>
              <Text style={s.rowText}>Trạng thái bữa ăn: {detail.status}</Text>
              <Text style={s.rowText}>
                Kết quả đối chiếu:{' '}
                <Text style={detail.correctedFood ? s.correctedHighlight : s.okHighlight}>
                  {detail.correctedFood
                    ? `User đã sửa thành "${detail.correctedFood.name}"${
                        detail.correctedFood.aiClassId ? ` (${detail.correctedFood.aiClassId})` : ''
                      }`
                    : 'Giữ nguyên kết quả AI'}
                </Text>
              </Text>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Mô hình 1: YOLOv8 Detector (detect_to_mon.pt)</Text>
              <Text style={s.rowText}>
                Phát hiện vùng tô/dĩa:{' '}
                {detail.detected === undefined
                  ? 'Không ghi nhận (bản ghi cũ)'
                  : detail.detected
                  ? 'Có phát hiện bounding box'
                  : 'Không rõ viền tô (dùng toàn ảnh)'}
              </Text>
              <Text style={s.rowText}>
                Số phần ăn đếm được: {detail.bowlCount != null ? `${detail.bowlCount} tô/phần` : '1 phần'}
              </Text>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Mô hình 2 & 3: Phân loại 30 món & Khẩu phần PortionNet</Text>
              <Text style={s.modelVerText}>Pipeline: {detail.modelVersion || '--'}</Text>
              {detail.top3.map((t, idx) => {
                const pct =
                  t.confidence <= 1 ? (t.confidence * 100).toFixed(1) : t.confidence.toFixed(1);
                return (
                  <View key={idx} style={s.candBox}>
                    <View style={s.candTop}>
                      <Text style={s.candRank}>#{idx + 1} {t.classId}</Text>
                      <Text style={s.candConf}>{pct}%</Text>
                    </View>
                    {(t.grams != null || t.k != null) && (
                      <Text style={s.candPortion}>
                        PortionNet ước lượng: {t.grams != null ? `${t.grams}g` : '--'}
                        {t.k != null ? ` (hệ số k = ${t.k})` : ''}
                      </Text>
                    )}
                  </View>
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
  placeholderBox: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 4,
  },
  placeholderTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primaryDark },
  placeholderSub: { fontSize: 12, color: COLORS.muted, textAlign: 'center' },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 2 },
  rowText: { fontSize: 13, color: COLORS.muted, lineHeight: 20 },
  correctedHighlight: { color: '#B45309', fontWeight: '700' },
  okHighlight: { color: '#15803D', fontWeight: '700' },
  modelVerText: { fontSize: 12, color: COLORS.muted, marginBottom: 4 },
  candBox: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 3,
  },
  candTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  candRank: { fontSize: 13, fontWeight: '700', color: COLORS.ink },
  candConf: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  candPortion: { fontSize: 12, color: COLORS.primaryDark, fontWeight: '600' },
});

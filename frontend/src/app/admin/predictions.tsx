import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { COLORS } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { adminService, type AdminPredictionItem } from '@/services/admin.service';
import { getErrorMessage } from '@/utils/api';
import ErrorBox from '@/components/ui/ErrorBox';

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'corrected', label: 'Đã sửa' },
  { key: 'low', label: 'Tin cậy thấp (<70%)' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export default function AdminPredictionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout, refreshUser } = useAuth();

  const [items, setItems] = useState<AdminPredictionItem[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(
    async (targetPage: number, isRefresh = false) => {
      try {
        if (targetPage === 1 && !isRefresh) setLoading(true);
        if (targetPage > 1) setLoadingMore(true);
        setError(null);

        const res = await adminService.getPredictions({
          correctedOnly: filter === 'corrected' ? 'true' : undefined,
          maxConfidence: filter === 'low' ? '0.7' : undefined,
          page: targetPage,
          limit: 20,
        });
        setTotalPages(res.pagination.totalPages);
        setItems((prev) => (targetPage === 1 ? res.items : [...prev, ...res.items]));
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
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [filter, logout, refreshUser]
  );

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      fetchList(1);
    }, [fetchList])
  );

  const handleExport = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      const res = await adminService.exportPredictionsJson({ limit: 1000 });
      Alert.alert(
        'Xuất dataset thành công',
        `Số dòng: ${res.meta.totalRows}\nBỏ qua món tự thêm: ${res.meta.skippedCustomFood}\nCắt giới hạn: ${res.meta.truncated ? 'Có' : 'Không'}`
      );
    } catch (e) {
      Alert.alert('Lỗi xuất dữ liệu', getErrorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top + 10 }]}>
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin' as Href))}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={s.title}>Giám sát AI</Text>
        <TouchableOpacity style={s.exportBtn} onPress={handleExport} disabled={exporting}>
          <Ionicons name="download-outline" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={s.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.chip, active && s.chipActive]}
              onPress={() => {
                setFilter(f.key);
                setPage(1);
              }}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error && (
        <View style={{ marginBottom: 10 }}>
          <ErrorBox message={error} />
        </View>
      )}

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                setPage(1);
                fetchList(1, true);
              }}
            />
          }
          onEndReached={() => {
            if (!loadingMore && page < totalPages) {
              const next = page + 1;
              setPage(next);
              fetchList(next);
            }
          }}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => {
            const top1 = item.top3?.[0];
            const confPct = top1 ? (top1.confidence <= 1 ? Math.round(top1.confidence * 100) : Math.round(top1.confidence)) : 0;
            return (
              <TouchableOpacity
                style={s.card}
                onPress={() => router.push(`/admin/prediction-detail?id=${item._id}` as Href)}
              >
                <View style={s.thumbBox}>
                  <Ionicons name="scan-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.nameRow}>
                    <Text style={s.name}>{top1?.classId || '--'}</Text>
                    {item.isCorrected && (
                      <View style={s.correctedBadge}>
                        <Text style={s.correctedText}>Đã sửa</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.meta}>
                    Tin cậy: {confPct}% • {item.status}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.emptyText}>Chưa có dữ liệu dự đoán</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={{ marginVertical: 12 }} color={COLORS.primary} /> : undefined
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
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
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: COLORS.ink },
  exportBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  chipTextActive: { color: '#FFFFFF' },
  list: { paddingBottom: 24, gap: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  thumbBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  correctedBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  correctedText: { fontSize: 10, fontWeight: '700', color: '#B45309' },
  meta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: COLORS.muted },
});

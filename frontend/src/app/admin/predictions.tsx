import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants';
import { adminService, type AdminPredictionItem } from '@/services/admin.service';
import { getErrorMessage } from '@/utils/api';
import { resolveFoodImageUri } from '@/utils/foodImage';
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

  const [items, setItems] = useState<AdminPredictionItem[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedThumb, setFailedThumb] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchList = useCallback(
    async (targetPage: number, isRefresh = false) => {
      try {
        if (targetPage === 1 && !isRefresh) setLoading(true);
        if (targetPage > 1) setLoadingMore(true);
        setError(null);

        const res = await adminService.getPredictions({
          predictedClass: debouncedSearch.trim() || undefined,
          correctedOnly: filter === 'corrected' ? 'true' : undefined,
          maxConfidence: filter === 'low' ? '0.7' : undefined,
          page: targetPage,
          limit: 20,
        });
        setTotalPages(res.pagination.totalPages);
        setItems((prev) => (targetPage === 1 ? res.items : [...prev, ...res.items]));
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, filter]
  );

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      fetchList(1);
    }, [fetchList])
  );

  const handleExportCsv = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      const { csv, meta } = await adminService.exportPredictionsCsv({ limit: 5000 });

      if (meta.totalRows === 0) {
        Alert.alert(
          'Chưa có dữ liệu xuất',
          `Hiện chưa có ca dự đoán nào được sửa sang món thuộc 30 lớp AI${
            meta.skippedCustomFood > 0 ? ` (đã bỏ qua ${meta.skippedCustomFood} món tự thêm)` : ''
          }.`
        );
        return;
      }

      const fileName = `smartfood_retrain_${new Date().toISOString().slice(0, 10)}.csv`;

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Alert.alert(
          'Đã tải file CSV',
          `Tệp: ${fileName}\nSố dòng xuất: ${meta.totalRows}\nBỏ qua món tự thêm: ${meta.skippedCustomFood}${
            meta.truncated ? '\n(Đã giới hạn tối đa 5.000 dòng)' : ''
          }`
        );
      } else {
        await Share.share({
          title: fileName,
          message: csv,
        });
      }
    } catch (e) {
      Alert.alert('Lỗi xuất dữ liệu CSV', getErrorMessage(e));
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
        <TouchableOpacity style={s.exportBtn} onPress={handleExportCsv} disabled={exporting}>
          {exporting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="download-outline" size={16} color="#FFFFFF" />
              <Text style={s.exportBtnText}>CSV</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={18} color={COLORS.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Tìm theo lớp AI (vd: pho, bun_bo_hue)..."
          placeholderTextColor={COLORS.placeholder}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        )}
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
            const confPct = top1
              ? top1.confidence <= 1
                ? Math.round(top1.confidence * 100)
                : Math.round(top1.confidence)
              : 0;
            const thumbUri = top1?.classId ? resolveFoodImageUri(null, top1.classId) : null;
            return (
              <TouchableOpacity
                style={s.card}
                onPress={() => router.push(`/admin/prediction-detail?id=${item._id}` as Href)}
              >
                <View style={s.thumbBox}>
                  {thumbUri && !failedThumb[item._id] ? (
                    <Image
                      source={{ uri: thumbUri }}
                      style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                      onError={() => setFailedThumb((prev) => ({ ...prev, [item._id]: true }))}
                    />
                  ) : (
                    <Ionicons name="scan-outline" size={22} color={COLORS.primary} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.nameRow}>
                    <Text style={s.name}>{top1?.classId || '--'}</Text>
                    {item.isCorrected && (
                      <View style={s.correctedBadge}>
                        <Text style={s.correctedText}>
                          Đã sửa{item.correctedFood?.name ? ` → ${item.correctedFood.name}` : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.meta}>
                    Tin cậy: {confPct}%
                    {item.bowlCount ? ` • ${item.bowlCount} tô` : ''}
                    {item.inferenceMs ? ` • ${item.inferenceMs}ms` : ''} • {item.status}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
  },
  exportBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.ink },
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
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  thumbBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  name: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  correctedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  correctedText: { fontSize: 11, fontWeight: '700', color: '#B45309' },
  meta: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: COLORS.muted },
});

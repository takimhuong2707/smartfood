import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
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
import { adminService, type AdminAuditLogItem } from '@/services/admin.service';
import { getErrorMessage } from '@/utils/api';
import ErrorBox from '@/components/ui/ErrorBox';

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'Food', label: 'Món ăn' },
  { key: 'User', label: 'Người dùng' },
  { key: 'Feedback', label: 'Feedback' },
  { key: 'AiPrediction', label: 'AI' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

const ACTION_META: Record<
  string,
  { label: string; bg: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  CREATE_FOOD: { label: 'Thêm món', bg: '#DCFCE7', color: '#166534', icon: 'add-circle-outline' },
  UPDATE_FOOD: { label: 'Sửa món', bg: '#DBEAFE', color: '#1D4ED8', icon: 'create-outline' },
  UPDATE_FOOD_IMAGE: { label: 'Đổi ảnh', bg: '#E0F2FE', color: '#0369A1', icon: 'image-outline' },
  HIDE_FOOD: { label: 'Ẩn món', bg: '#FEF3C7', color: '#B45309', icon: 'eye-off-outline' },
  RESTORE_FOOD: { label: 'Khôi phục món', bg: '#DCFCE7', color: '#15803D', icon: 'refresh-circle-outline' },
  DELETE_FOOD: { label: 'Xóa món', bg: '#FEE2E2', color: '#B91C1C', icon: 'trash-outline' },
  UPDATE_USER: { label: 'Tài khoản', bg: '#F3E8FF', color: '#6B21A8', icon: 'person-outline' },
  RESET_USER_PASSWORD: { label: 'Đặt lại MK', bg: '#FCE7F3', color: '#9D174D', icon: 'key-outline' },
  UPDATE_FEEDBACK: { label: 'Feedback', bg: '#FFEDD5', color: '#C2410C', icon: 'chatbox-ellipses-outline' },
  EXPORT_PREDICTIONS: { label: 'Xuất AI', bg: '#E6F2EA', color: '#1F5C39', icon: 'download-outline' },
};

export default function AdminAuditLogsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<AdminAuditLogItem[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchLogs = useCallback(
    async (targetPage: number, isRefresh = false) => {
      try {
        if (targetPage === 1 && !isRefresh) setLoading(true);
        if (targetPage > 1) setLoadingMore(true);
        setError(null);

        const res = await adminService.getAuditLogs({
          targetType: filter === 'all' ? undefined : filter,
          search: debouncedSearch.trim() || undefined,
          page: targetPage,
          limit: 20,
        });

        setTotalPages(res.pagination.totalPages);
        setTotal(res.pagination.total);
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
      fetchLogs(1);
    }, [fetchLogs])
  );

  const renderItem = ({ item }: { item: AdminAuditLogItem }) => {
    const meta = ACTION_META[item.action] ?? {
      label: item.action,
      bg: COLORS.primarySoft,
      color: COLORS.primaryDark,
      icon: 'receipt-outline' as const,
    };

    const timeStr = item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '--';
    const actorName = item.admin?.fullName || item.admin?.email || 'Quản trị viên';

    return (
      <View style={s.card}>
        <View style={[s.iconBox, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.topRow}>
            <View style={[s.badge, { backgroundColor: meta.bg }]}>
              <Text style={[s.badgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <Text style={s.timeText}>{timeStr}</Text>
          </View>
          <Text style={s.summaryText}>{item.summary || `${item.targetType} #${item.targetId}`}</Text>
          <Text style={s.actorText} numberOfLines={1}>
            Thực hiện bởi: {actorName}
            {item.admin?.email ? ` (${item.admin.email})` : ''}
          </Text>
        </View>
      </View>
    );
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
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Nhật ký hoạt động</Text>
          <Text style={s.subtitle}>{total.toLocaleString('vi-VN')} bản ghi quản trị</Text>
        </View>
      </View>

      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={18} color={COLORS.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Tìm theo nội dung, mã thao tác..."
          placeholderTextColor={COLORS.placeholder}
          value={search}
          onChangeText={setSearch}
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
          <TouchableOpacity style={s.retryBtn} onPress={() => fetchLogs(1)}>
            <Text style={s.retryText}>Thử lại</Text>
          </TouchableOpacity>
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
          renderItem={renderItem}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                setPage(1);
                fetchLogs(1, true);
              }}
            />
          }
          onEndReached={() => {
            if (!loadingMore && page < totalPages) {
              const next = page + 1;
              setPage(next);
              fetchLogs(next);
            }
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.emptyText}>Chưa có nhật ký hoạt động nào</Text>
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
  title: { fontSize: 20, fontWeight: '700', color: COLORS.ink },
  subtitle: { fontSize: 12, color: COLORS.muted, marginTop: 1 },
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
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.ink },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 10 },
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
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  timeText: { fontSize: 11, color: COLORS.muted },
  summaryText: { fontSize: 14, fontWeight: '600', color: COLORS.ink, marginTop: 4, lineHeight: 19 },
  actorText: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: COLORS.muted },
  retryBtn: {
    alignSelf: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
});

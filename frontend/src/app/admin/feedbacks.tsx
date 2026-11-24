import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { adminService, type AdminFeedbackItem } from '@/services/admin.service';
import { getErrorMessage } from '@/utils/api';
import ErrorBox from '@/components/ui/ErrorBox';

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ xử lý' },
  { key: 'resolved', label: 'Đã xử lý' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export default function AdminFeedbacksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout, refreshUser } = useAuth();

  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [filter, setFilter] = useState<FilterKey>('pending');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(
    async (targetPage: number, isRefresh = false) => {
      try {
        if (targetPage === 1 && !isRefresh) setLoading(true);
        if (targetPage > 1) setLoadingMore(true);
        setError(null);

        const res = await adminService.getFeedbacks({
          status: filter === 'all' ? undefined : filter,
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

  return (
    <View style={[s.container, { paddingTop: insets.top + 10 }]}>
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin' as Href))}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={s.title}>Quản lý Feedback</Text>
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
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.card}
              onPress={() => router.push(`/admin/feedback-detail?id=${item._id}` as Href)}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.name}>
                  AI: {item.predictedClass || '--'} → Đúng: {item.correctFoodId?.name || '--'}
                </Text>
                {item.comment ? (
                  <Text style={s.comment} numberOfLines={2}>
                    {item.comment}
                  </Text>
                ) : null}
              </View>
              <View style={[s.badge, item.status === 'resolved' ? s.badgeOk : s.badgeWait]}>
                <Text style={[s.badgeText, item.status === 'resolved' ? s.badgeOkText : s.badgeWaitText]}>
                  {item.status === 'resolved' ? 'Đã xử lý' : 'Chờ xử lý'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.emptyText}>Không có feedback nào</Text>
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
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
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
  name: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  comment: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeOk: { backgroundColor: '#DCFCE7' },
  badgeOkText: { color: '#166534', fontSize: 11, fontWeight: '700' },
  badgeWait: { backgroundColor: '#FEF3C7' },
  badgeWaitText: { color: '#B45309', fontSize: 11, fontWeight: '700' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: COLORS.muted },
});

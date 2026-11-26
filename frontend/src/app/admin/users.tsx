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
import axios from 'axios';
import { COLORS } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { adminService, type AdminUserItem } from '@/services/admin.service';
import { getErrorMessage } from '@/utils/api';
import ErrorBox from '@/components/ui/ErrorBox';
import UserAvatar from '@/components/ui/UserAvatar';

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'admin', label: 'Admin' },
  { key: 'user', label: 'User' },
  { key: 'locked', label: 'Đã khóa' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export default function AdminUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout, refreshUser } = useAuth();

  const [items, setItems] = useState<AdminUserItem[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

  const fetchUsers = useCallback(
    async (targetPage: number, isRefresh = false) => {
      try {
        if (targetPage === 1 && !isRefresh) setLoading(true);
        if (targetPage > 1) setLoadingMore(true);
        setError(null);

        const params: { search?: string; role?: string; isActive?: string; page: number; limit: number } = {
          page: targetPage,
          limit: 20,
        };
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (filter === 'admin' || filter === 'user') params.role = filter;
        if (filter === 'locked') params.isActive = 'false';

        const res = await adminService.getUsers(params);
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
    [debouncedSearch, filter, logout, refreshUser]
  );

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      fetchUsers(1);
    }, [fetchUsers])
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
        <Text style={s.title}>Quản lý người dùng</Text>
      </View>

      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={18} color={COLORS.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Tìm theo tên hoặc email..."
          placeholderTextColor={COLORS.placeholder}
          value={search}
          onChangeText={setSearch}
        />
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
          <TouchableOpacity style={s.retryBtn} onPress={() => fetchUsers(1)}>
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
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                setPage(1);
                fetchUsers(1, true);
              }}
            />
          }
          onEndReached={() => {
            if (!loadingMore && page < totalPages) {
              const next = page + 1;
              setPage(next);
              fetchUsers(next);
            }
          }}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.card}
              activeOpacity={0.8}
              onPress={() => router.push(`/admin/user-detail?id=${item._id}` as Href)}
            >
              <UserAvatar
                uri={item.avatarUrl}
                name={item.fullName}
                size={42}
                borderRadius={21}
              />
              <View style={s.info}>
                <View style={s.nameRow}>
                  <Text style={s.name} numberOfLines={1}>
                    {item.fullName}
                  </Text>
                  {item.role === 'admin' && (
                    <View style={s.adminBadge}>
                      <Text style={s.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                  {!item.isActive && (
                    <View style={s.lockedBadge}>
                      <Text style={s.lockedBadgeText}>Đã khóa</Text>
                    </View>
                  )}
                </View>
                <Text style={s.email} numberOfLines={1}>
                  {item.email}
                </Text>
                {item.note?.text ? (
                  <Text style={s.noteSnippet} numberOfLines={1}>
                    💬 “{item.note.text}”
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.emptyText}>Không có người dùng nào</Text>
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
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  email: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  noteSnippet: { fontSize: 11.5, color: '#15803D', fontWeight: '600', marginTop: 3 },
  adminBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  adminBadgeText: { fontSize: 10, fontWeight: '700', color: '#166534' },
  lockedBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  lockedBadgeText: { fontSize: 10, fontWeight: '700', color: '#B91C1C' },
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

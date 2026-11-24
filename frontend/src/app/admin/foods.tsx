import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import { API_URL, COLORS } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { adminService, type AdminFood } from '@/services/admin.service';
import { getErrorMessage } from '@/utils/api';
import ErrorBox from '@/components/ui/ErrorBox';

const BASE_HOST = API_URL.replace(/\/api\/?$/, '');

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'system', label: 'Hệ thống' },
  { key: 'admin', label: 'Admin' },
  { key: 'user', label: 'User' },
  { key: 'ai', label: 'Có lớp AI' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export default function AdminFoodsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout, refreshUser } = useAuth();

  const [items, setItems] = useState<AdminFood[]>([]);
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

  const handleAuthError = useCallback(
    async (e: unknown): Promise<boolean> => {
      if (axios.isAxiosError(e)) {
        if (e.response?.status === 401) {
          await logout();
          return true;
        }
        if (e.response?.status === 403) {
          await refreshUser();
          return true;
        }
      }
      return false;
    },
    [logout, refreshUser]
  );

  const fetchFoods = useCallback(
    async (targetPage: number, isRefresh = false) => {
      try {
        if (targetPage === 1 && !isRefresh) setLoading(true);
        if (targetPage > 1) setLoadingMore(true);
        setError(null);

        const params: {
          search?: string;
          source?: string;
          hasAiClass?: string;
          page: number;
          limit: number;
        } = { page: targetPage, limit: 20 };

        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (filter === 'system' || filter === 'admin' || filter === 'user') params.source = filter;
        if (filter === 'ai') params.hasAiClass = 'true';

        const res = await adminService.getFoods(params);
        setTotalPages(res.pagination.totalPages);
        setItems((prev) => (targetPage === 1 ? res.items : [...prev, ...res.items]));
      } catch (e) {
        if (await handleAuthError(e)) return;
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, filter, handleAuthError]
  );

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      fetchFoods(1);
    }, [fetchFoods])
  );

  const handleDelete = (food: AdminFood) => {
    Alert.alert('Xác nhận xóa', `Bạn có chắc muốn xóa "${food.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await adminService.deleteFood(food._id);
            Alert.alert('Thông báo', res.message);
            setItems((prev) => prev.filter((f) => f._id !== food._id));
          } catch (e) {
            if (await handleAuthError(e)) return;
            Alert.alert('Không thể xóa', getErrorMessage(e));
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: AdminFood }) => {
    const imgUri = item.imageUrl?.startsWith('http')
      ? item.imageUrl
      : item.imageUrl
      ? `${BASE_HOST}${item.imageUrl}`
      : null;

    return (
      <View style={s.card}>
        <View style={s.thumbBox}>
          {imgUri ? (
            <Image source={{ uri: imgUri }} style={s.thumb} />
          ) : (
            <Ionicons name="restaurant-outline" size={22} color={COLORS.primary} />
          )}
        </View>
        <View style={s.info}>
          <Text style={s.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={s.meta}>
            {Math.round(item.nutritionPer100g?.kcal || 0)} kcal/100g • {item.source || 'system'}
            {item.aiClassId ? ` • AI: ${item.aiClassId}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={s.iconBtn}
          onPress={() => router.push(`/admin/food-form?id=${item._id}` as Href)}
        >
          <Ionicons name="create-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
        </TouchableOpacity>
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
        <Text style={s.title}>Quản lý món ăn</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => router.push('/admin/food-form' as Href)}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={18} color={COLORS.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Tìm theo tên món..."
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
          <TouchableOpacity style={s.retryBtn} onPress={() => fetchFoods(1)}>
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
                fetchFoods(1, true);
              }}
            />
          }
          onEndReached={() => {
            if (!loadingMore && page < totalPages) {
              const next = page + 1;
              setPage(next);
              fetchFoods(next);
            }
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.emptyText}>Không có món ăn nào</Text>
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
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  thumbBox: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: '100%', resizeMode: 'cover' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  meta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  iconBtn: { padding: 6 },
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

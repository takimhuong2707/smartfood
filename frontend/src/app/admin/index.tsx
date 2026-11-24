import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import {
  adminService,
  type AdminServicesHealthResponse,
  type AdminStatsResponse,
} from '@/services/admin.service';
import { getErrorMessage } from '@/utils/api';
import ErrorBox from '@/components/ui/ErrorBox';
import UserAvatar from '@/components/ui/UserAvatar';
import StoryModal, { type AvatarModalMode } from '@/components/ui/StoryModal';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const [storyMode, setStoryMode] = useState<AvatarModalMode>('closed');

  const [range, setRange] = useState<7 | 30>(7);
  const [chartMetric, setChartMetric] = useState<'scans' | 'meals' | 'newUsers'>('scans');
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [health, setHealth] = useState<AdminServicesHealthResponse | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    try {
      setCheckingHealth(true);
      const h = await adminService.getServicesHealth();
      setHealth(h);
    } catch {
      // Không chặn dashboard nếu kiểm tra health thất bại
    } finally {
      setCheckingHealth(false);
    }
  }, []);

  const loadStats = useCallback(
    async (targetRange: 7 | 30, isRefresh = false) => {
      try {
        if (!stats && !isRefresh) setLoading(true);
        setError(null);
        const data = await adminService.getStats(targetRange, isRefresh);
        setStats(data);
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [stats]
  );

  useEffect(() => {
    loadStats(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  const handleRangeChange = (next: 7 | 30) => {
    if (next === range || loading || refreshing) return;
    setRange(next);
  };

  const series = stats?.dailySeries ?? [];
  const maxMetricVal = Math.max(1, ...series.map((d) => d[chartMetric] || 0));
  const totalMetricInRange = series.reduce((acc, d) => acc + (d[chartMetric] || 0), 0);

  return (
    <View style={[s.container, { paddingTop: insets.top + 22 }]}>
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={s.title}>Quản trị</Text>
        <View style={s.rangeRow}>
          {([7, 30] as const).map((r) => (
            <TouchableOpacity
              key={r}
              style={[s.rangeChip, range === r && s.rangeChipActive]}
              onPress={() => handleRangeChange(r)}
            >
              <Text style={[s.rangeText, range === r && s.rangeTextActive]}>{r} ngày</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setStoryMode('menu')}
        >
          <UserAvatar
            uri={user?.avatarUrl}
            name={user?.fullName}
            size={40}
            borderRadius={20}
            noteText={user?.note?.text}
            showNotePrompt
            noteAlign="right"
            showEditBadge
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadStats(range, true);
            }}
          />
        }
      >
        {/* Lối tắt quản lý */}
        <TouchableOpacity
          style={s.navCard}
          onPress={() => router.push('/admin/foods' as Href)}
          activeOpacity={0.8}
        >
          <View style={s.navLeft}>
            <Ionicons name="restaurant-outline" size={22} color={COLORS.primary} />
            <View>
              <Text style={s.navTitle}>Quản lý món ăn</Text>
              <Text style={s.navSub}>Thêm, sửa, ẩn/xóa món & ảnh</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={s.navCard}
          onPress={() => router.push('/admin/users' as Href)}
          activeOpacity={0.8}
        >
          <View style={s.navLeft}>
            <Ionicons name="people-outline" size={22} color={COLORS.primary} />
            <View>
              <Text style={s.navTitle}>Quản lý người dùng</Text>
              <Text style={s.navSub}>Xem chi tiết, khóa/mở khóa & phân quyền</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={s.navCard}
          onPress={() => router.push('/admin/predictions' as Href)}
          activeOpacity={0.8}
        >
          <View style={s.navLeft}>
            <Ionicons name="scan-outline" size={22} color={COLORS.primary} />
            <View>
              <Text style={s.navTitle}>Giám sát AI</Text>
              <Text style={s.navSub}>Xem dự đoán, ca sửa & xuất dataset</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={s.navCard}
          onPress={() => router.push('/admin/feedbacks' as Href)}
          activeOpacity={0.8}
        >
          <View style={s.navLeft}>
            <Ionicons name="chatbox-ellipses-outline" size={22} color={COLORS.primary} />
            <View>
              <Text style={s.navTitle}>Feedback</Text>
              <Text style={s.navSub}>Xử lý góp ý sai lệch nhận diện</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {(stats?.overview.totalFeedbacks ?? 0) > 0 && (
              <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#B45309' }}>
                  {stats?.overview.totalFeedbacks}
                </Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.navCard}
          onPress={() => router.push('/admin/audit-logs' as Href)}
          activeOpacity={0.8}
        >
          <View style={s.navLeft}>
            <Ionicons name="receipt-outline" size={22} color={COLORS.primary} />
            <View>
              <Text style={s.navTitle}>Nhật ký hoạt động</Text>
              <Text style={s.navSub}>Tra cứu lịch sử thao tác của quản trị viên</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
        </TouchableOpacity>

        {error && (
          <View style={s.errorWrap}>
            <ErrorBox message={error} />
            <TouchableOpacity style={s.retryBtn} onPress={() => loadStats(range, true)}>
              <Text style={s.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && !stats ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : stats ? (
          <>
            {/* KPI Tổng quan */}
            <View style={s.kpiGrid}>
              <View style={s.kpiCard}>
                <Text style={s.kpiLabel}>Tổng người dùng</Text>
                <Text style={s.kpiValue}>{stats.overview.totalUsers.toLocaleString('vi-VN')}</Text>
                <Text style={s.kpiSub}>
                  {stats.overview.activeUsers.toLocaleString('vi-VN')} hoạt động • {stats.overview.lockedUsers.toLocaleString('vi-VN')} khóa
                </Text>
              </View>
              <View style={s.kpiCard}>
                <Text style={s.kpiLabel}>Tổng lượt scan AI</Text>
                <Text style={s.kpiValue}>{stats.overview.totalScans.toLocaleString('vi-VN')}</Text>
                <Text style={s.kpiSub}>Tin cậy TB: {stats.aiQuality.avgConfidence}%</Text>
              </View>
              <View style={s.kpiCard}>
                <Text style={s.kpiLabel}>Tổng bữa ăn</Text>
                <Text style={s.kpiValue}>{stats.overview.totalMeals.toLocaleString('vi-VN')}</Text>
                <Text style={s.kpiSub}>Tỉ lệ sửa AI: {stats.aiQuality.correctionRate}%</Text>
              </View>
              <View style={s.kpiCard}>
                <Text style={s.kpiLabel}>Phản hồi (Feedback)</Text>
                <Text style={s.kpiValue}>{stats.overview.totalFeedbacks.toLocaleString('vi-VN')}</Text>
                <Text style={s.kpiSub}>Chờ xử lý</Text>
              </View>
            </View>

            {/* Trạng thái Dịch vụ AI & Thống kê Chatbot */}
            <View style={s.card}>
              <View style={s.healthHeader}>
                <Text style={s.cardTitle}>Trạng thái dịch vụ AI & Chatbot</Text>
                <TouchableOpacity
                  style={s.healthRefreshBtn}
                  onPress={loadHealth}
                  disabled={checkingHealth}
                  activeOpacity={0.75}
                >
                  {checkingHealth ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <>
                      <Ionicons name="pulse-outline" size={14} color={COLORS.primary} />
                      <Text style={s.healthRefreshText}>Kiểm tra</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {[
                { label: 'AI Vision (3 Models • Port 8000)', item: health?.vision },
                { label: 'Chatbot RAG (Colab • ngrok)', item: health?.chatbot },
              ].map(({ label, item }) => {
                const st = item?.status ?? 'offline';
                const badgeBg =
                  st === 'online' ? '#DCFCE7' : st === 'unconfigured' ? '#FEF3C7' : '#FEE2E2';
                const badgeColor =
                  st === 'online' ? '#166534' : st === 'unconfigured' ? '#B45309' : '#B91C1C';
                const badgeText =
                  st === 'online'
                    ? `Online${item?.latencyMs != null ? ` (${item.latencyMs}ms)` : ''}`
                    : st === 'unconfigured'
                    ? 'Chưa cấu hình'
                    : 'Offline';

                return (
                  <View key={label} style={s.healthRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.healthName}>{label}</Text>
                      <Text style={s.healthDetail} numberOfLines={1}>
                        {item?.detail || (checkingHealth ? 'Đang kiểm tra kết nối...' : 'Chưa có dữ liệu')}
                      </Text>
                    </View>
                    <View style={[s.healthBadge, { backgroundColor: badgeBg }]}>
                      <View style={[s.healthDot, { backgroundColor: badgeColor }]} />
                      <Text style={[s.healthBadgeText, { color: badgeColor }]}>{badgeText}</Text>
                    </View>
                  </View>
                );
              })}

              {stats.chatbot && (
                <View style={s.chatStatsRow}>
                  <View style={s.chatStatCol}>
                    <Text style={s.chatStatVal}>
                      {stats.chatbot.totalQuestions.toLocaleString('vi-VN')}
                    </Text>
                    <Text style={s.chatStatLbl}>Tổng câu hỏi AI</Text>
                  </View>
                  <View style={s.chatStatCol}>
                    <Text style={s.chatStatVal}>
                      {stats.chatbot.rangeQuestions.toLocaleString('vi-VN')}
                    </Text>
                    <Text style={s.chatStatLbl}>Trong {range} ngày</Text>
                  </View>
                  <View style={s.chatStatCol}>
                    <Text style={s.chatStatVal}>
                      {stats.chatbot.activeUsers.toLocaleString('vi-VN')}
                    </Text>
                    <Text style={s.chatStatLbl}>User hỏi đáp</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Biểu đồ đa chỉ số theo ngày (đủ 7 hoặc 30 ngày) */}
            <View style={s.card}>
              <View style={s.chartHeaderRow}>
                <Text style={s.cardTitle}>Biểu đồ {range} ngày qua</Text>
                <Text style={s.chartSumBadge}>
                  Tổng: {totalMetricInRange.toLocaleString('vi-VN')}
                </Text>
              </View>

              <View style={s.metricTabsRow}>
                {(
                  [
                    { key: 'scans', label: 'Lượt scan AI' },
                    { key: 'meals', label: 'Bữa ăn' },
                    { key: 'newUsers', label: 'User mới' },
                  ] as const
                ).map((m) => {
                  const active = chartMetric === m.key;
                  return (
                    <TouchableOpacity
                      key={m.key}
                      style={[s.metricTab, active && s.metricTabActive]}
                      onPress={() => setChartMetric(m.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.metricTabText, active && s.metricTabTextActive]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {range === 30 ? (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.chartScrollRow}
                  >
                    {series.map((d) => {
                      const val = d[chartMetric] || 0;
                      const pct = val > 0 ? Math.max((val / maxMetricVal) * 100, 10) : 4;
                      return (
                        <View key={d.date} style={s.barColScroll}>
                          <Text style={s.barVal}>{val}</Text>
                          <View style={s.barTrack}>
                            <View style={[s.barFill, { height: `${pct}%` }]} />
                          </View>
                          <Text style={s.barDate}>{d.date.slice(5)}</Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                  <Text style={s.chartHint}>Vuốt ngang để xem đầy đủ 30 ngày</Text>
                </>
              ) : (
                <View style={s.chartRow}>
                  {series.map((d) => {
                    const val = d[chartMetric] || 0;
                    const pct = val > 0 ? Math.max((val / maxMetricVal) * 100, 10) : 4;
                    return (
                      <View key={d.date} style={s.barCol}>
                        <Text style={s.barVal}>{val}</Text>
                        <View style={s.barTrack}>
                          <View style={[s.barFill, { height: `${pct}%` }]} />
                        </View>
                        <Text style={s.barDate}>{d.date.slice(5)}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Top món được quét */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Top món quét nhiều nhất</Text>
              {stats.topFoods.length === 0 ? (
                <Text style={s.emptyText}>Chưa có dữ liệu quét trong khoảng thời gian này</Text>
              ) : (
                stats.topFoods.map((f, idx) => (
                  <View key={f.classId} style={s.topRow}>
                    <Text style={s.topRank}>#{idx + 1}</Text>
                    <Text style={s.topName} numberOfLines={1}>
                      {f.name}
                    </Text>
                    <Text style={s.topCount}>{f.count.toLocaleString('vi-VN')} lượt</Text>
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      <StoryModal
        mode={storyMode}
        onClose={() => setStoryMode('closed')}
        onChangeMode={setStoryMode}
        targetUser={user}
        isOwnProfile
        showGoProfileOption
        onGoProfile={() => router.push('/profile' as Href)}
        onUserUpdated={updateUser}
      />
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
  rangeRow: { flexDirection: 'row', gap: 6 },
  rangeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rangeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rangeText: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  rangeTextActive: { color: '#FFFFFF' },
  scroll: { paddingBottom: 32, gap: 10 },
  navCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navTitle: { fontSize: 15, fontWeight: '700', color: COLORS.ink },
  navSub: { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  kpiCard: {
    width: '48.5%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  kpiLabel: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  kpiValue: { fontSize: 22, fontWeight: '800', color: COLORS.ink, marginTop: 4 },
  kpiSub: { fontSize: 11, color: COLORS.primaryDark, marginTop: 4 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.ink },
  healthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  healthRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
  },
  healthRefreshText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2EC',
  },
  healthName: { fontSize: 13, fontWeight: '700', color: COLORS.ink },
  healthDetail: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  healthDot: { width: 6, height: 6, borderRadius: 3 },
  healthBadgeText: { fontSize: 11, fontWeight: '700' },
  chatStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 6,
  },
  chatStatCol: { alignItems: 'center' },
  chatStatVal: { fontSize: 16, fontWeight: '800', color: COLORS.primaryDark },
  chatStatLbl: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  chartHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chartSumBadge: { fontSize: 12, fontWeight: '700', color: COLORS.primaryDark },
  metricTabsRow: { flexDirection: 'row', gap: 6 },
  metricTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  metricTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  metricTabText: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  metricTabTextActive: { color: '#FFFFFF', fontWeight: '700' },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 130, paddingTop: 10 },
  chartScrollRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 130, paddingTop: 10, paddingRight: 4 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 4 },
  barColScroll: { width: 34, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 4 },
  chartHint: { fontSize: 11, color: COLORS.muted, textAlign: 'center' },
  barVal: { fontSize: 10, color: COLORS.muted, fontWeight: '600' },
  barTrack: { width: 16, height: 80, backgroundColor: COLORS.primarySoft, borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: COLORS.primary, borderRadius: 8 },
  barDate: { fontSize: 10, color: COLORS.muted },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  topRank: { width: 26, fontSize: 12, fontWeight: '700', color: COLORS.primary },
  topName: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.ink },
  topCount: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  emptyText: { fontSize: 13, color: COLORS.muted },
  center: { paddingVertical: 40, alignItems: 'center' },
  errorWrap: { gap: 8 },
  retryBtn: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.primary, borderRadius: 10 },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
});

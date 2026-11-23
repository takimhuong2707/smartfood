import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '@/components/ui/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/user.service';
import type { DailyChartItem, StatisticsData } from '@/types/stats';

export default function StatisticsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [periodDays, setPeriodDays] = useState<7 | 14 | 30>(7);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [data, setData] = useState<StatisticsData | null>(null);
  const [selectedDay, setSelectedDay] = useState<DailyChartItem | null>(null);

  // Modal ghi nhận cân nặng
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);

  const loadStatistics = async (days: number = periodDays, isRefresh: boolean = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await userService.getStatistics(days);
      setData(res);

      // Mặc định chọn ngày hôm nay hoặc ngày có dữ liệu gần nhất
      if (res?.dailyChart?.length) {
        const todayKey = new Date().toISOString().slice(0, 10);
        const matchToday = res.dailyChart.find((d) => d.date === todayKey);
        setSelectedDay(matchToday || res.dailyChart[res.dailyChart.length - 1]);
      }
    } catch (err: any) {
      console.warn('Lỗi tải thống kê:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStatistics(periodDays);
  }, [periodDays]);

  const handlePeriodChange = (days: 7 | 14 | 30) => {
    if (days === periodDays) return;
    setPeriodDays(days);
    setSelectedDay(null);
  };

  // Tính toán chiều cao các cột trong biểu đồ
  const chartConfig = useMemo(() => {
    if (!data?.dailyChart?.length) {
      return { maxKcal: 2000, targetKcal: 1800, targetPercent: 80 };
    }
    const targetKcal = data.targets?.kcal || 1800;
    const maxDataKcal = Math.max(...data.dailyChart.map((d) => d.kcal), 0);
    const maxKcal = Math.max(maxDataKcal, targetKcal * 1.25, 2000);
    const targetPercent = Math.min(Math.round((targetKcal / maxKcal) * 100), 95);
    return { maxKcal, targetKcal, targetPercent };
  }, [data]);

  const handleSaveWeight = async () => {
    const val = parseFloat(weightInput.replace(',', '.'));
    if (isNaN(val) || val < 20 || val > 300) {
      Alert.alert('Lỗi', 'Vui lòng nhập cân nặng hợp lệ từ 20kg đến 300kg');
      return;
    }

    try {
      setSavingWeight(true);
      await userService.recordWeight(val);
      setWeightModalVisible(false);
      setWeightInput('');
      Alert.alert('Thành công', `Đã cập nhật cân nặng mới: ${val} kg`);
      await loadStatistics(periodDays, true);
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể lưu cân nặng');
    } finally {
      setSavingWeight(false);
    }
  };

  const targetKcal = data?.targets?.kcal || 1800;
  const avgKcal = data?.kpi?.avgKcal || 0;

  return (
    <View style={s.screen}>
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 14 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadStatistics(periodDays, true)}
            tintColor="#1E5136"
            colors={['#1E5136']}
          />
        }
      >
        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.screenTitle}>Thống kê</Text>
            <Text style={s.screenSub}>Theo dõi dinh dưỡng & tiến trình sức khỏe</Text>
          </View>
          <TouchableOpacity
            style={s.refreshBtn}
            activeOpacity={0.75}
            onPress={() => loadStatistics(periodDays, true)}
          >
            <Ionicons name="refresh" size={18} color="#1E5136" />
          </TouchableOpacity>
        </View>

        {/* Filter Chips: 7 ngày | 14 ngày | 30 ngày */}
        <View style={s.filterRow}>
          <TouchableOpacity
            style={[s.filterChip, periodDays === 7 && s.filterChipActive]}
            activeOpacity={0.8}
            onPress={() => handlePeriodChange(7)}
          >
            <Text style={[s.filterText, periodDays === 7 && s.filterTextActive]}>7 ngày</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.filterChip, periodDays === 14 && s.filterChipActive]}
            activeOpacity={0.8}
            onPress={() => handlePeriodChange(14)}
          >
            <Text style={[s.filterText, periodDays === 14 && s.filterTextActive]}>14 ngày</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.filterChip, periodDays === 30 && s.filterChipActive]}
            activeOpacity={0.8}
            onPress={() => handlePeriodChange(30)}
          >
            <Text style={[s.filterText, periodDays === 30 && s.filterTextActive]}>30 ngày</Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color="#1E5136" />
            <Text style={s.loadingText}>Đang tải phân tích dữ liệu...</Text>
          </View>
        ) : (
          <>
            {/* 1. Quick KPI Cards Grid (4 chỉ số nhanh) */}
            <View style={s.kpiGrid}>
              <View style={s.kpiCard}>
                <View style={s.kpiIconWrap}>
                  <Ionicons name="flame-outline" size={18} color="#E0783A" />
                </View>
                <Text style={s.kpiLabel}>Calo trung bình</Text>
                <Text style={s.kpiValue}>
                  {avgKcal.toLocaleString('vi-VN')} <Text style={s.kpiUnit}>kcal</Text>
                </Text>
                <Text style={s.kpiSub}>Mục tiêu {targetKcal.toLocaleString('vi-VN')} kcal</Text>
              </View>

              <View style={s.kpiCard}>
                <View style={[s.kpiIconWrap, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#2E7D4F" />
                </View>
                <Text style={s.kpiLabel}>Ngày đạt mục tiêu</Text>
                <Text style={s.kpiValue}>
                  {data?.kpi?.daysOnTarget || 0}
                  <Text style={s.kpiUnit}>/{data?.dailyChart?.length || periodDays} ngày</Text>
                </Text>
                <Text style={s.kpiSub}>{data?.kpi?.daysExceeded || 0} ngày vượt calo</Text>
              </View>

              <View style={s.kpiCard}>
                <View style={[s.kpiIconWrap, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="restaurant-outline" size={18} color="#0284C7" />
                </View>
                <Text style={s.kpiLabel}>Tổng số bữa ăn</Text>
                <Text style={s.kpiValue}>
                  {data?.kpi?.totalMeals || 0} <Text style={s.kpiUnit}>bữa</Text>
                </Text>
                <Text style={s.kpiSub}>Trong {data?.kpi?.daysWithMeals || 0} ngày ghi nhận</Text>
              </View>

              <View style={s.kpiCard}>
                <View style={[s.kpiIconWrap, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="fitness-outline" size={18} color="#7E22CE" />
                </View>
                <Text style={s.kpiLabel}>Cơ thể ({user?.gender === 'male' ? 'Nam' : user?.gender === 'female' ? 'Nữ' : '--'})</Text>
                <Text style={s.kpiValue}>
                  {data?.weight?.currentKg || 47.0} <Text style={s.kpiUnit}>kg</Text>
                </Text>
                <Text style={s.kpiSub}>
                  Cao {user?.heightCm || (data?.weight?.currentKg && data?.weight?.bmi ? Math.round(Math.sqrt(data.weight.currentKg / data.weight.bmi) * 100) : '--')} cm • BMI {data?.weight?.bmi || '--'}
                </Text>
              </View>
            </View>

            {/* 2. Biểu đồ Kcal mỗi ngày (Matching Exactly User Reference Design + Interactive) */}
            <View style={s.card}>
              <View style={s.cardHeaderRow}>
                <Text style={s.cardTitle}>Kcal mỗi ngày</Text>
                <View style={s.avgBadge}>
                  <Text style={s.avgText}>TB {avgKcal.toLocaleString('vi-VN')}</Text>
                </View>
              </View>

              {/* Chart Visual Container */}
              <View style={s.chartOuterContainer}>
                {/* Dashed Target Line */}
                <View
                  style={[
                    s.targetLineWrap,
                    {
                      bottom: `${chartConfig.targetPercent}%`,
                    },
                  ]}
                >
                  <View style={s.dashedLine} />
                  <Text style={s.targetLineLabel}>Mục tiêu {chartConfig.targetKcal}</Text>
                </View>

                {/* Bars Container */}
                <View style={s.barsRow}>
                  {data?.dailyChart?.map((item, idx) => {
                    const isSelected = selectedDay?.date === item.date;
                    const heightPercent =
                      item.kcal > 0
                        ? Math.max(Math.min((item.kcal / chartConfig.maxKcal) * 100, 100), 10)
                        : 0;

                    // Cột cam là ngày vượt mục tiêu, xanh lá là ngày đạt mục tiêu
                    const barColor = item.isExceeded ? '#E0783A' : '#236B43';

                    return (
                      <TouchableOpacity
                        key={idx}
                        style={s.barColumn}
                        activeOpacity={0.7}
                        onPress={() => setSelectedDay(item)}
                      >
                        <View style={s.barTrack}>
                          {item.kcal > 0 ? (
                            <View
                              style={[
                                s.barFill,
                                {
                                  height: `${heightPercent}%`,
                                  backgroundColor: barColor,
                                },
                                isSelected && s.barFillSelected,
                              ]}
                            />
                          ) : (
                            <View style={s.barEmptyDot} />
                          )}
                        </View>
                        <Text style={[s.barLabel, isSelected && s.barLabelSelected]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Caption matching reference design */}
              <Text style={s.chartCaption}>
                Đường đứt là mục tiêu {targetKcal.toLocaleString('vi-VN')} kcal; cột cam là ngày vượt mục tiêu; cột xanh là ngày đạt mục tiêu.
              </Text>

              {/* Interactive Day Details Popover (Chạm cột để xem chi tiết) */}
              {selectedDay && (
                <View style={s.selectedDayCard}>
                  <View style={s.selectedDayHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.selectedDayTitle}>{selectedDay.dateLabel}</Text>
                      <Text style={s.selectedDayKcal}>
                        {selectedDay.kcal.toLocaleString('vi-VN')} / {targetKcal.toLocaleString('vi-VN')} kcal
                        {selectedDay.isExceeded ? (
                          <Text style={{ color: '#E0783A', fontWeight: '700' }}> · Vượt mục tiêu</Text>
                        ) : selectedDay.kcal > 0 ? (
                          <Text style={{ color: '#2E7D4F', fontWeight: '700' }}> · Đạt chuẩn</Text>
                        ) : (
                          <Text style={{ color: '#6B7280' }}> · Chưa có bữa ăn</Text>
                        )}
                      </Text>
                    </View>
                    <View style={s.selectedMacroCol}>
                      <Text style={s.selectedMacroText}>Đ: {selectedDay.protein}g</Text>
                      <Text style={s.selectedMacroText}>C: {selectedDay.carb}g</Text>
                      <Text style={s.selectedMacroText}>B: {selectedDay.fat}g</Text>
                    </View>
                  </View>

                  {/* Danh sách món ăn trong ngày được chọn */}
                  {selectedDay.meals && selectedDay.meals.length > 0 && (
                    <View style={s.dayMealsList}>
                      {selectedDay.meals.map((m, mIdx) => (
                        <View key={mIdx} style={s.dayMealItem}>
                          <Ionicons name="restaurant-outline" size={14} color="#2E7D4F" />
                          <Text style={s.dayMealName} numberOfLines={1}>
                            <Text style={s.dayMealType}>{m.mealTypeName}: </Text>
                            {m.title}
                          </Text>
                          <Text style={s.dayMealKcal}>{m.kcal} kcal</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* 3. Thẻ Tỉ lệ dinh dưỡng (Macronutrients) */}
            <View style={s.card}>
              <View style={s.cardHeaderRow}>
                <Text style={s.cardTitle}>Tỉ lệ dinh dưỡng</Text>
                <Text style={s.macroRecommendTag}>Carb - Đạm - Béo</Text>
              </View>

              {/* Thanh tỉ lệ đa sắc gộp */}
              <View style={s.multiProgressBar}>
                <View
                  style={[
                    s.multiBarSegment,
                    {
                      width: `${data?.macros?.protein?.percent || 20}%`,
                      backgroundColor: '#2E7D4F',
                    },
                  ]}
                />
                <View
                  style={[
                    s.multiBarSegment,
                    {
                      width: `${data?.macros?.carb?.percent || 55}%`,
                      backgroundColor: '#F59E0B',
                    },
                  ]}
                />
                <View
                  style={[
                    s.multiBarSegment,
                    {
                      width: `${data?.macros?.fat?.percent || 25}%`,
                      backgroundColor: '#8B5CF6',
                    },
                  ]}
                />
              </View>

              {/* Chi tiết từng chất: Đạm, Carb, Béo (Giống thiết kế ảnh + chi tiết hơn) */}
              <View style={s.macroRowsWrap}>
                {/* Đạm */}
                <View style={s.macroItemRow}>
                  <View style={s.macroItemInfo}>
                    <View style={[s.macroDot, { backgroundColor: '#2E7D4F' }]} />
                    <Text style={s.macroName}>Đạm (Protein)</Text>
                    <Text style={s.macroGrams}>
                      {data?.macros?.protein?.totalGrams || 0}g (TB {data?.macros?.protein?.avgGrams || 0}g/ngày)
                    </Text>
                  </View>
                  <Text style={s.macroPercent}>{data?.macros?.protein?.percent || 20}%</Text>
                </View>
                <View style={s.singleBarTrack}>
                  <View
                    style={[
                      s.singleBarFill,
                      {
                        width: `${Math.min(data?.macros?.protein?.percent || 20, 100)}%`,
                        backgroundColor: '#2E7D4F',
                      },
                    ]}
                  />
                </View>

                {/* Carb */}
                <View style={s.macroItemRow}>
                  <View style={s.macroItemInfo}>
                    <View style={[s.macroDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={s.macroName}>Tinh bột (Carb)</Text>
                    <Text style={s.macroGrams}>
                      {data?.macros?.carb?.totalGrams || 0}g (TB {data?.macros?.carb?.avgGrams || 0}g/ngày)
                    </Text>
                  </View>
                  <Text style={s.macroPercent}>{data?.macros?.carb?.percent || 55}%</Text>
                </View>
                <View style={s.singleBarTrack}>
                  <View
                    style={[
                      s.singleBarFill,
                      {
                        width: `${Math.min(data?.macros?.carb?.percent || 55, 100)}%`,
                        backgroundColor: '#F59E0B',
                      },
                    ]}
                  />
                </View>

                {/* Béo */}
                <View style={s.macroItemRow}>
                  <View style={s.macroItemInfo}>
                    <View style={[s.macroDot, { backgroundColor: '#8B5CF6' }]} />
                    <Text style={s.macroName}>Chất béo (Fat)</Text>
                    <Text style={s.macroGrams}>
                      {data?.macros?.fat?.totalGrams || 0}g (TB {data?.macros?.fat?.avgGrams || 0}g/ngày)
                    </Text>
                  </View>
                  <Text style={s.macroPercent}>{data?.macros?.fat?.percent || 25}%</Text>
                </View>
                <View style={s.singleBarTrack}>
                  <View
                    style={[
                      s.singleBarFill,
                      {
                        width: `${Math.min(data?.macros?.fat?.percent || 25, 100)}%`,
                        backgroundColor: '#8B5CF6',
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* 4. Thẻ Cân nặng & Thể trạng (Weight Tracker + Update Button) */}
            <View style={s.card}>
              <View style={s.cardHeaderRow}>
                <View>
                  <Text style={s.weightLabel}>Cân nặng</Text>
                  <Text style={s.weightMainValue}>
                    {data?.weight?.currentKg ? String(data.weight.currentKg).replace('.', ',') : '47,0'}{' '}
                    <Text style={s.weightUnit}>kg</Text>
                  </Text>
                </View>

                <View style={s.weightChangeCol}>
                  <Text style={s.weightDiffBadge}>
                    {data?.weight?.diffKg && data.weight.diffKg < 0
                      ? `giảm ${Math.abs(data.weight.diffKg).toString().replace('.', ',')} kg / ${periodDays} ngày`
                      : data?.weight?.diffKg && data.weight.diffKg > 0
                      ? `tăng ${data.weight.diffKg.toString().replace('.', ',')} kg / ${periodDays} ngày`
                      : `ổn định / ${periodDays} ngày`}
                  </Text>
                  <TouchableOpacity
                    style={s.updateWeightBtn}
                    activeOpacity={0.8}
                    onPress={() => setWeightModalVisible(true)}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={s.updateWeightBtnText}>Cập nhật</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* BMI Pill & Phân loại thể trạng */}
              <View style={s.bmiBox}>
                <Ionicons name="speedometer-outline" size={18} color="#1E5136" />
                <Text style={s.bmiText}>
                  Chỉ số BMI: <Text style={{ fontWeight: '800' }}>{data?.weight?.bmi || 19.3}</Text> · Thể trạng{' '}
                  <Text style={{ fontWeight: '700', color: '#1E5136' }}>
                    {data?.weight?.bmiStatus || 'Cân đối'}
                  </Text>
                </Text>
              </View>
            </View>

            {/* 5. Phân bổ Calo theo Bữa ăn (Sáng / Trưa / Tối / Phụ) */}
            {data?.mealBreakdown && data.mealBreakdown.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Phân bổ theo bữa ăn</Text>
                <View style={s.mealBreakdownGrid}>
                  {data.mealBreakdown.map((item, idx) => (
                    <View key={idx} style={s.mealBreakdownCol}>
                      <View style={[s.mealTypeBadge, { backgroundColor: `${item.color}15` }]}>
                        <Text style={[s.mealTypeName, { color: item.color }]}>{item.name}</Text>
                      </View>
                      <Text style={s.mealTypeKcal}>{item.kcal.toLocaleString('vi-VN')} kcal</Text>
                      <Text style={s.mealTypePercent}>{item.percent}%</Text>
                      <Text style={s.mealTypeCount}>{item.count} bữa</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 6. Top món ăn đóng góp nhiều calo nhất */}
            {data?.topFoods && data.topFoods.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Top món ăn nạp nhiều calo nhất</Text>
                <View style={s.topFoodsList}>
                  {data.topFoods.map((f, idx) => (
                    <View key={idx} style={s.topFoodRow}>
                      <View style={s.topFoodRank}>
                        <Text style={s.topFoodRankText}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.topFoodName}>{f.name}</Text>
                        <Text style={s.topFoodCount}>Đã ăn {f.count} lần</Text>
                      </View>
                      <Text style={s.topFoodKcal}>{f.totalKcal.toLocaleString('vi-VN')} kcal</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 7. Nhận xét & Lời khuyên dinh dưỡng thông minh (AI Insights) */}
            {data?.insights && data.insights.length > 0 && (
              <View style={s.insightCard}>
                <View style={s.insightHeader}>
                  <Ionicons name="sparkles" size={18} color="#1E5136" />
                  <Text style={s.insightTitle}>Nhận xét dinh dưỡng thông minh</Text>
                </View>
                {data.insights.map((msg, idx) => (
                  <View key={idx} style={s.insightBulletRow}>
                    <Text style={s.bulletPoint}>•</Text>
                    <Text style={s.insightBulletText}>{msg}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Modal Cập nhật Cân nặng nhanh */}
      <Modal
        visible={weightModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWeightModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Cập nhật cân nặng</Text>
              <TouchableOpacity onPress={() => setWeightModalVisible(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={s.modalDesc}>
              Nhập cân nặng mới nhất để hệ thống tự động tính toán lại mức calo tiêu chuẩn cho bạn:
            </Text>

            <View style={s.modalInputRow}>
              <TextInput
                style={s.modalInput}
                keyboardType="decimal-pad"
                placeholder={String(data?.weight?.currentKg || '47.0')}
                value={weightInput}
                onChangeText={setWeightInput}
                autoFocus
              />
              <Text style={s.modalInputUnit}>kg</Text>
            </View>

            <View style={s.modalQuickAdjustRow}>
              <TouchableOpacity
                style={s.quickAdjustBtn}
                onPress={() => {
                  const current = parseFloat(weightInput) || data?.weight?.currentKg || 47;
                  setWeightInput((current - 0.5).toFixed(1));
                }}
              >
                <Text style={s.quickAdjustText}>- 0.5 kg</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.quickAdjustBtn}
                onPress={() => {
                  const current = parseFloat(weightInput) || data?.weight?.currentKg || 47;
                  setWeightInput((current + 0.5).toFixed(1));
                }}
              >
                <Text style={s.quickAdjustText}>+ 0.5 kg</Text>
              </TouchableOpacity>
            </View>

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => setWeightModalVisible(false)}
              >
                <Text style={s.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.modalSaveBtn}
                onPress={handleSaveWeight}
                disabled={savingWeight}
              >
                {savingWeight ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={s.modalSaveText}>Lưu cân nặng</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Persistent Bottom Navigation */}
      <BottomNav activeTab="stats" />
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8F4',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#14261C',
    letterSpacing: -0.5,
  },
  screenSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#1E5136',
    borderColor: '#1E5136',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadingWrap: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 14,
  },
  kpiCard: {
    width: '48.2%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEF0EB',
  },
  kpiIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#14261C',
    marginTop: 2,
  },
  kpiUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  kpiSub: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },

  // Standard Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EEF0EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#14261C',
  },
  avgBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  avgText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E5136',
  },

  // Daily Calorie Chart
  chartOuterContainer: {
    height: 180,
    position: 'relative',
    justifyContent: 'flex-end',
    paddingTop: 20,
    marginBottom: 12,
  },
  targetLineWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#E0783A',
    borderStyle: 'dashed',
  },
  targetLineLabel: {
    fontSize: 10,
    color: '#E0783A',
    fontWeight: '600',
    marginLeft: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    paddingHorizontal: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 24,
    height: 130,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 6,
  },
  barFillSelected: {
    borderWidth: 2,
    borderColor: '#14261C',
    transform: [{ scaleX: 1.1 }],
  },
  barEmptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
  },
  barLabelSelected: {
    color: '#14261C',
    fontWeight: '800',
  },
  chartCaption: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
    marginTop: 4,
  },

  // Selected Day Details Card
  selectedDayCard: {
    marginTop: 14,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectedDayTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#14261C',
  },
  selectedDayKcal: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  selectedMacroCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  selectedMacroText: {
    fontSize: 10,
    color: '#4B5563',
    fontWeight: '600',
  },
  dayMealsList: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
    gap: 4,
  },
  dayMealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayMealName: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
  },
  dayMealType: {
    fontWeight: '700',
    color: '#1E5136',
  },
  dayMealKcal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#14261C',
  },

  // Macronutrients Card
  macroRecommendTag: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  multiProgressBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  multiBarSegment: {
    height: '100%',
  },
  macroRowsWrap: {
    gap: 12,
  },
  macroItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  macroItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  macroGrams: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 4,
  },
  macroPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  singleBarTrack: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  singleBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Weight Card
  weightLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  weightMainValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#14261C',
    marginTop: 2,
  },
  weightUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  weightChangeCol: {
    alignItems: 'flex-end',
    gap: 8,
  },
  weightDiffBadge: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  updateWeightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E5136',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  updateWeightBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bmiBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 14,
  },
  bmiText: {
    fontSize: 12,
    color: '#1E5136',
  },

  // Meal Breakdown
  mealBreakdownGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  mealBreakdownCol: {
    width: '23%',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: 10,
    borderRadius: 12,
  },
  mealTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  mealTypeName: {
    fontSize: 11,
    fontWeight: '700',
  },
  mealTypeKcal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#14261C',
  },
  mealTypePercent: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2E7D4F',
    marginTop: 2,
  },
  mealTypeCount: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Top Foods
  topFoodsList: {
    marginTop: 10,
    gap: 10,
  },
  topFoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  topFoodRank: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topFoodRankText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E5136',
  },
  topFoodName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  topFoodCount: {
    fontSize: 11,
    color: '#6B7280',
  },
  topFoodKcal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#14261C',
  },

  // AI Insights Card
  insightCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E5136',
  },
  insightBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 6,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#2E7D4F',
    fontWeight: '700',
    lineHeight: 18,
  },
  insightBulletText: {
    flex: 1,
    fontSize: 12,
    color: '#1E4620',
    lineHeight: 18,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#14261C',
  },
  modalDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 12,
  },
  modalInput: {
    fontSize: 24,
    fontWeight: '800',
    color: '#14261C',
    textAlign: 'center',
    minWidth: 80,
  },
  modalInputUnit: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
    marginLeft: 6,
  },
  modalQuickAdjustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  quickAdjustBtn: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  quickAdjustText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E5136',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  modalSaveBtn: {
    flex: 2,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#1E5136',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

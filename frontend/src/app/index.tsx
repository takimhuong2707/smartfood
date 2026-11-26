import { useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/user.service';
import type { TodaySummary } from '@/types/auth';
import WeekCalendar from '@/components/ui/WeekCalendar';
import GoalRoadmapSection from '@/components/ui/GoalRoadmapSection';
import CircularNutrition from '@/components/ui/CircularNutrition';
import BottomNav from '@/components/ui/BottomNav';
import UserAvatar from '@/components/ui/UserAvatar';
import StoryModal, { type AvatarModalMode } from '@/components/ui/StoryModal';

export default function HomeScreen() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [storyMode, setStoryMode] = useState<AvatarModalMode>('closed');

  const [summary, setSummary] = useState<TodaySummary>({
    targets: {
      bmr: 1205,
      tdee: 1657,
      kcal: user?.targets?.kcal || 1221,
      protein: user?.targets?.protein || 85,
      carb: user?.targets?.carb || 150,
      fat: user?.targets?.fat || 35,
    },
    consumed: { kcal: 0, protein: 0, carb: 0, fat: 0 },
    remainingKcal: user?.targets?.kcal || 1221,
    meals: [],
    recommendation: 'Chưa có bữa ăn nào được ghi nhận cho ngày này.',
  });

  const toDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const loadSummary = async (date: Date) => {
    try {
      setLoadingSummary(true);
      const dateStr = toDateKey(date);
      const data = await userService.getTodaySummary(dateStr);
      if (data) setSummary(data);
    } catch (err) {
      console.warn('Lỗi tải summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    loadSummary(selectedDate);
  }, [selectedDate]);

  const getDisplayDate = () => {
    if (summary.dateLabel) return summary.dateLabel;
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return `${days[selectedDate.getDay()]}, ${selectedDate.getDate()} tháng ${selectedDate.getMonth() + 1}`;
  };

  const targetKcal = user?.targets?.kcal || summary.targets.kcal || 1221;
  const targetProtein = user?.targets?.protein || summary.targets.protein || 85;
  const targetCarb = user?.targets?.carb || summary.targets.carb || 150;
  const targetFat = user?.targets?.fat || summary.targets.fat || 35;

  const remainingKcal = Math.max(targetKcal - summary.consumed.kcal, 0);

  return (
    <View style={s.screen}>
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loadingSummary}
            onRefresh={() => loadSummary(selectedDate)}
            tintColor="#1E5136"
            colors={['#1E5136']}
          />
        }
      >
        {/* Header: Greeting & User Avatar */}
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.dateText}>{getDisplayDate()}</Text>
            <Text style={s.greetingText}>
              Xin chào, <Text style={s.nameBold}>{user?.fullName || 'Bạn'}</Text>
            </Text>
          </View>
          <TouchableOpacity
            style={s.bellButton}
            activeOpacity={0.85}
            onPress={() => setStoryMode('menu')}
          >
            <UserAvatar
              uri={user?.avatarUrl}
              name={user?.fullName}
              size={46}
              borderRadius={23}
              noteText={user?.note?.text}
              showNotePrompt
              noteAlign="right"
              showEditBadge
            />
          </TouchableOpacity>
        </View>

        {/* Week Calendar Bar */}
        <WeekCalendar
          selectedDate={selectedDate}
          onSelectDate={(day) => setSelectedDate(day)}
          daysWithMeals={summary.daysWithMeals}
        />

        {/* Chế độ hướng đến (Giảm cân / Tăng cân / Duy trì) */}
        <GoalRoadmapSection />

        {/* Main Nutrition Card (Forest Green Gradient) */}
        <LinearGradient
          colors={['#143D28', '#1E5A3B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.nutritionCard}
        >
          {/* Top Half: Circle Progress + Remaining */}
          <View style={s.cardTopRow}>
            <CircularNutrition consumed={summary.consumed.kcal} target={targetKcal} />

            <View style={s.cardRightCol}>
              <Text style={s.remainingLabel}>Còn lại hôm nay</Text>
              <View style={s.remainingValueRow}>
                <Text style={s.remainingValue}>{remainingKcal.toLocaleString('vi-VN')}</Text>
                <Text style={s.remainingUnit}> kcal</Text>
              </View>

              <View style={s.goalBadge}>
                <Text style={s.goalText}>Mục tiêu {targetKcal.toLocaleString('vi-VN')} kcal</Text>
              </View>
            </View>
          </View>

          {/* Bottom Half: Macronutrients (Đạm, Carb, Béo) */}
          <View style={s.cardBottomRow}>
            {/* Đạm */}
            <View style={s.macroCol}>
              <View style={s.macroLabelRow}>
                <Text style={s.macroName}>Đạm</Text>
                <Text style={s.macroValue}>
                  {summary.consumed.protein}/{targetProtein}g
                </Text>
              </View>
              <View style={s.macroBarBg}>
                <View
                  style={[
                    s.macroBarFill,
                    {
                      width: `${Math.min(
                        Math.round((summary.consumed.protein / targetProtein) * 100),
                        100
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Carb */}
            <View style={s.macroCol}>
              <View style={s.macroLabelRow}>
                <Text style={s.macroName}>Carb</Text>
                <Text style={s.macroValue}>
                  {summary.consumed.carb}/{targetCarb}g
                </Text>
              </View>
              <View style={s.macroBarBg}>
                <View
                  style={[
                    s.macroBarFill,
                    {
                      width: `${Math.min(
                        Math.round((summary.consumed.carb / targetCarb) * 100),
                        100
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Béo */}
            <View style={s.macroCol}>
              <View style={s.macroLabelRow}>
                <Text style={s.macroName}>Béo</Text>
                <Text style={s.macroValue}>
                  {summary.consumed.fat}/{targetFat}g
                </Text>
              </View>
              <View style={s.macroBarBg}>
                <View
                  style={[
                    s.macroBarFill,
                    {
                      width: `${Math.min(
                        Math.round((summary.consumed.fat / targetFat) * 100),
                        100
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Section: Bữa ăn */}
        <View style={s.mealsHeader}>
          <Text style={s.mealsTitle}>
            {summary.isToday ? 'Bữa ăn hôm nay' : `Bữa ăn (${getDisplayDate()})`}
          </Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => loadSummary(selectedDate)}>
            <Text style={s.viewAllLink}>Làm mới</Text>
          </TouchableOpacity>
        </View>

        {/* Meals List */}
        <View style={s.mealsList}>
          {summary.meals.length === 0 ? (
            <TouchableOpacity
              style={s.emptyMealCard}
              activeOpacity={0.8}
              onPress={() => router.push('/scan' as any)}
            >
              <Ionicons name="camera-outline" size={32} color="#2E7D4F" />
              <Text style={s.emptyMealTitle}>Chưa có bữa ăn nào</Text>
              <Text style={s.emptyMealSub}>
                Nhấn vào đây để chụp ảnh món ăn và ghi lại dinh dưỡng cho ngày này
              </Text>
            </TouchableOpacity>
          ) : (
            summary.meals.map((item) => (
              <View key={item.id} style={s.mealCard}>
                <View
                  style={[
                    s.mealIconWrap,
                    { backgroundColor: item.iconBg || (item.done ? '#E8F5E9' : '#E0F2F1') },
                  ]}
                >
                  <Ionicons
                    name={item.done ? 'restaurant-outline' : 'add'}
                    size={22}
                    color={item.done ? '#2E7D4F' : '#00796B'}
                  />
                </View>

                <View style={s.mealInfo}>
                  <Text style={s.mealSub}>{item.mealLabel}</Text>
                  <Text style={s.mealMain}>{item.title}</Text>
                </View>

                {item.done ? (
                  <View style={s.mealKcalWrap}>
                    <Text style={s.mealKcalValue}>{item.kcal}</Text>
                    <Text style={s.mealKcalUnit}>kcal</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={s.addButton}
                    activeOpacity={0.8}
                    onPress={() => router.push('/scan' as any)}
                  >
                    <Text style={s.addButtonText}>Thêm</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>

        {/* Recommendation Card */}
        <TouchableOpacity
          style={s.recomCard}
          activeOpacity={0.85}
          onPress={() => router.push('/chatbot' as any)}
        >
          <View style={s.recomIconWrap}>
            <Ionicons name="sparkles" size={18} color="#2E7D4F" />
          </View>
          <Text style={s.recomText}>
            {summary.recommendation || `Còn ${remainingKcal} kcal. Bữa tối nên chọn món dưới 500 kcal, nhiều đạm.`}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#2E7D4F" />
        </TouchableOpacity>

        {/* Profile completion notice if needed */}
        {!user?.hasProfile && (
          <TouchableOpacity
            style={s.profileNoticeCard}
            activeOpacity={0.85}
            onPress={() => router.push('/profile' as any)}
          >
            <Ionicons name="information-circle" size={24} color="#D97706" />
            <View style={{ flex: 1 }}>
              <Text style={s.profileNoticeTitle}>Cập nhật thể trạng cá nhân</Text>
              <Text style={s.profileNoticeDesc}>
                Nhấn vào đây hoặc tab Hồ sơ để nhập chiều cao, cân nặng và tính toán chính xác mục tiêu calo.
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#D97706" />
          </TouchableOpacity>
        )}
      </ScrollView>

      <StoryModal
        mode={storyMode}
        onClose={() => setStoryMode('closed')}
        onChangeMode={setStoryMode}
        targetUser={user}
        isOwnProfile
        showGoProfileOption
        onGoProfile={() => router.push('/profile' as any)}
        onUserUpdated={updateUser}
      />

      {/* Persistent Bottom Navigation */}
      <BottomNav activeTab="home" />
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F7F3',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 18,
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  greetingText: {
    fontSize: 22,
    color: '#14261C',
    marginTop: 2,
  },
  nameBold: {
    fontWeight: '800',
    color: '#14261C',
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#EAEFE8',
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  nutritionCard: {
    borderRadius: 28,
    padding: 20,
    marginTop: 12,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#143D28',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  cardRightCol: {
    flex: 1,
    paddingLeft: 18,
    alignItems: 'flex-start',
  },
  remainingLabel: {
    fontSize: 13,
    color: '#B6DBC7',
    fontWeight: '500',
  },
  remainingValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
    marginBottom: 10,
  },
  remainingValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  remainingUnit: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  goalBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  goalText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E8F5E9',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    gap: 12,
  },
  macroCol: {
    flex: 1,
  },
  macroLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  macroName: {
    fontSize: 12,
    color: '#CDE5D7',
    fontWeight: '500',
  },
  macroValue: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  macroBarBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    backgroundColor: '#4ADE80',
    borderRadius: 3,
  },
  mealsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#14261C',
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F5C39',
  },
  mealsList: {
    gap: 10,
    marginBottom: 16,
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EBF0E9',
  },
  mealIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealInfo: {
    flex: 1,
    marginLeft: 14,
  },
  mealSub: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  mealMain: {
    fontSize: 15,
    fontWeight: '700',
    color: '#14261C',
    marginTop: 2,
  },
  mealKcalWrap: {
    alignItems: 'flex-end',
  },
  mealKcalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#14261C',
  },
  mealKcalUnit: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#1E5338',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  recomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    padding: 14,
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  recomIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recomText: {
    flex: 1,
    fontSize: 13,
    color: '#1E4620',
    fontWeight: '500',
    lineHeight: 18,
  },
  profileNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 18,
    padding: 14,
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  profileNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  profileNoticeDesc: {
    fontSize: 12,
    color: '#78350F',
    marginTop: 2,
    lineHeight: 16,
  },
  emptyMealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  emptyMealTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  emptyMealSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 260,
  },
});

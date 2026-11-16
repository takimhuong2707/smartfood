import { useEffect, useState } from 'react';
import {
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
import CircularNutrition from '@/components/ui/CircularNutrition';
import BottomNav from '@/components/ui/BottomNav';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [summary, setSummary] = useState<TodaySummary>({
    targets: {
      bmr: 1500,
      tdee: 1800,
      kcal: user?.targets?.kcal || 1800,
      protein: user?.targets?.protein || 110,
      carb: user?.targets?.carb || 230,
      fat: user?.targets?.fat || 55,
    },
    consumed: { kcal: 1240, protein: 62, carb: 150, fat: 38 },
    remainingKcal: 560,
    meals: [
      {
        id: '1',
        mealType: 'breakfast',
        mealLabel: 'Sáng · Vừa 450g',
        title: 'Bánh canh',
        kcal: 420,
        done: true,
        iconBg: '#E8F5E9',
      },
      {
        id: '2',
        mealType: 'lunch',
        mealLabel: 'Trưa · Vừa 550g',
        title: 'Bún bò Huế',
        kcal: 540,
        done: true,
        iconBg: '#FFF3E0',
      },
      {
        id: '3',
        mealType: 'dinner',
        mealLabel: 'Tối',
        title: 'Chụp món để ghi nhận',
        kcal: 0,
        done: false,
        iconBg: '#E0F2F1',
      },
    ],
    recommendation: 'Còn 560 kcal. Bữa tối nên chọn món dưới 500 kcal, nhiều đạm.',
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await userService.getTodaySummary();
        if (data) setSummary(data);
      } catch {
        // Fallback to default initial state if offline
      }
    })();
  }, []);

  const getVietnameseDate = () => {
    const now = new Date();
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return `${days[now.getDay()]}, ${now.getDate()} tháng ${now.getMonth() + 1}`;
  };

  const targetKcal = user?.targets?.kcal || summary.targets.kcal || 1800;
  const targetProtein = user?.targets?.protein || summary.targets.protein || 110;
  const targetCarb = user?.targets?.carb || summary.targets.carb || 230;
  const targetFat = user?.targets?.fat || summary.targets.fat || 55;

  const remainingKcal = Math.max(targetKcal - summary.consumed.kcal, 0);

  return (
    <View style={s.screen}>
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: Greeting & Notification */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.dateText}>{getVietnameseDate()}</Text>
            <Text style={s.greetingText}>
              Xin chào, <Text style={s.nameBold}>{user?.fullName || 'Bạn'}</Text>
            </Text>
          </View>
          <TouchableOpacity style={s.bellButton} activeOpacity={0.8}>
            <Ionicons name="notifications-outline" size={22} color="#1B2A22" />
            <View style={s.bellDot} />
          </TouchableOpacity>
        </View>

        {/* Week Calendar Bar */}
        <WeekCalendar />

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

        {/* Section: Bữa ăn hôm nay */}
        <View style={s.mealsHeader}>
          <Text style={s.mealsTitle}>Bữa ăn hôm nay</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={s.viewAllLink}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        {/* Meals List */}
        <View style={s.mealsList}>
          {summary.meals.map((item) => (
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
          ))}
        </View>

        {/* Recommendation Card */}
        <TouchableOpacity
          style={s.recomCard}
          activeOpacity={0.85}
          onPress={() => router.push('/profile' as any)}
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
    marginTop: 4,
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
});

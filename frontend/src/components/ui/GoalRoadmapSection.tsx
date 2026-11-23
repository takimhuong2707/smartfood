import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type GoalMode = 'lose' | 'gain' | 'maintain';
type MilestoneKey = '7d' | '14d' | '30d' | '3m' | '6m';
type DayKey = 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7';

interface MealPlan {
  session: string;
  dish: string;
  kcal: number;
}

interface WorkoutPlan {
  activity: string;
  duration: string;
  burnKcal: number;
}

const GOAL_MODES: { key: GoalMode; label: string; emoji: string; color: string; bg: string }[] = [
  { key: 'lose', label: 'Giảm cân', emoji: '🔥', color: '#C2410C', bg: '#FFF7ED' },
  { key: 'gain', label: 'Tăng cân', emoji: '💪', color: '#1D4ED8', bg: '#EFF6FF' },
  { key: 'maintain', label: 'Duy trì', emoji: '⚖️', color: '#15803D', bg: '#F0FDF4' },
];

const DAYS: DayKey[] = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const MILESTONES: { key: MilestoneKey; label: string }[] = [
  { key: '7d', label: '7 ngày' },
  { key: '14d', label: '14 ngày' },
  { key: '30d', label: '30 ngày' },
  { key: '3m', label: '3 tháng' },
  { key: '6m', label: '6 tháng' },
];

const MILESTONE_TARGETS: Record<GoalMode, Record<MilestoneKey, string>> = {
  lose: {
    '7d': 'Giảm 0.5 kg an toàn • 1.350 kcal/ngày',
    '14d': 'Giảm 1.0 - 1.2 kg an toàn • 1.300 kcal/ngày',
    '30d': 'Giảm 2.0 - 2.5 kg an toàn • 1.280 kcal/ngày',
    '3m': 'Giảm 5.5 - 6.5 kg bền vững • 1.320 kcal/ngày',
    '6m': 'Giảm 10 - 12 kg giữ dáng • 1.380 kcal/ngày',
  },
  gain: {
    '7d': 'Tăng 0.4 kg lành mạnh • 2.150 kcal/ngày',
    '14d': 'Tăng 0.8 - 1.0 kg • 2.200 kcal/ngày',
    '30d': 'Tăng 1.8 - 2.2 kg • 2.250 kcal/ngày',
    '3m': 'Tăng 4.5 - 6.0 kg tăng cơ • 2.300 kcal/ngày',
    '6m': 'Tăng 8.0 - 10 kg săn chắc • 2.350 kcal/ngày',
  },
  maintain: {
    '7d': 'Ổn định cân nặng • 1.650 kcal/ngày',
    '14d': 'Cân bằng năng lượng • 1.680 kcal/ngày',
    '30d': 'Giữ chuẩn BMI • 1.700 kcal/ngày',
    '3m': 'Duy trì thể lực dẻo dai • 1.720 kcal/ngày',
    '6m': 'Sống khỏe bền vững • 1.750 kcal/ngày',
  },
};

const ROADMAP_DATA: Record<
  GoalMode,
  {
    title: string;
    dailyTarget: string;
    outcomes: Record<MilestoneKey, string>;
    days: Record<DayKey, { meals: MealPlan[]; workouts: WorkoutPlan[] }>;
  }
> = {
  lose: {
    title: 'Lộ trình Giảm cân an toàn',
    dailyTarget: '1.250 - 1.400 kcal/ngày',
    outcomes: {
      '7d': 'Dự kiến giảm 0.4 - 0.6 kg, cơ thể nhẹ nhàng hơn',
      '14d': 'Dự kiến giảm 0.9 - 1.2 kg, giảm mỡ bụng rõ rệt',
      '30d': 'Dự kiến giảm 2.0 - 2.5 kg, cải thiện vòng eo',
      '3m': 'Dự kiến giảm 5.5 - 7.0 kg, vóc dáng thon gọn',
      '6m': 'Dự kiến giảm 10 - 12 kg, duy trì cân nặng lý tưởng',
    },
    days: {
      T2: {
        meals: [
          { session: 'Sáng', dish: 'Phở gà ít bánh + 1 quả trứng', kcal: 360 },
          { session: 'Trưa', dish: 'Cơm gạo lứt + ức gà áp chảo + rau luộc', kcal: 420 },
          { session: 'Phụ', dish: 'Sữa chua không đường + hạt chia', kcal: 120 },
          { session: 'Tối', dish: 'Canh chua cá lóc + 1/2 chén cơm', kcal: 350 },
        ],
        workouts: [
          { activity: 'Đi bộ nhanh / Chạy bộ nhẹ', duration: '35 phút', burnKcal: 240 },
          { activity: 'Plank & gập bụng cơ bản', duration: '15 phút', burnKcal: 110 },
        ],
      },
      T3: {
        meals: [
          { session: 'Sáng', dish: 'Bánh mì đen + 2 trứng ốp la + dưa leo', kcal: 350 },
          { session: 'Trưa', dish: 'Bún gạo lứt trộn thịt bò xào + rau sống', kcal: 440 },
          { session: 'Phụ', dish: '1 quả táo xanh + 10 hạt hạnh nhân', kcal: 140 },
          { session: 'Tối', dish: 'Cá thu áp chảo + bông cải xanh luộc', kcal: 330 },
        ],
        workouts: [
          { activity: 'Nhảy dây hoặc Cardio HIIT', duration: '25 phút', burnKcal: 260 },
          { activity: 'Giãn cơ toàn thân', duration: '15 phút', burnKcal: 70 },
        ],
      },
      T4: {
        meals: [
          { session: 'Sáng', dish: 'Cháo yến mạch thịt bằm + hành ngò', kcal: 320 },
          { session: 'Trưa', dish: 'Cơm gạo lứt + tôm hấp + canh bí đao', kcal: 410 },
          { session: 'Phụ', dish: '1 ly nước ép cần tây + ổi', kcal: 110 },
          { session: 'Tối', dish: 'Salad ức gà + dầu giấm', kcal: 340 },
        ],
        workouts: [
          { activity: 'Đạp xe ngoài trời / Máy', duration: '40 phút', burnKcal: 280 },
          { activity: 'Squat & Lunges nhẹ', duration: '15 phút', burnKcal: 100 },
        ],
      },
      T5: {
        meals: [
          { session: 'Sáng', dish: 'Bún riêu cua ít bún + nhiều rau', kcal: 370 },
          { session: 'Trưa', dish: 'Cơm gạo lứt + cá hồi nướng + măng tây', kcal: 450 },
          { session: 'Phụ', dish: '1 hũ sữa chua Hy Lạp', kcal: 130 },
          { session: 'Tối', dish: 'Đậu hũ non hấp + canh rong biển', kcal: 290 },
        ],
        workouts: [
          { activity: 'Chạy bộ nhịp độ vừa', duration: '30 phút', burnKcal: 250 },
          { activity: 'Jumping Jacks & Mountain Climber', duration: '15 phút', burnKcal: 130 },
        ],
      },
      T6: {
        meals: [
          { session: 'Sáng', dish: 'Khoai lang luộc (150g) + 1 ly sữa đậu nành', kcal: 310 },
          { session: 'Trưa', dish: 'Gỏi cuốn tôm thịt (4 cuốn) + nước chấm', kcal: 400 },
          { session: 'Phụ', dish: '1/2 quả bưởi da xanh', kcal: 95 },
          { session: 'Tối', dish: 'Ức gà luộc xé phay + rau củ luộc', kcal: 360 },
        ],
        workouts: [
          { activity: 'Aerobic / Zumba đốt mỡ', duration: '35 phút', burnKcal: 270 },
          { activity: 'Tập bụng & eo', duration: '15 phút', burnKcal: 100 },
        ],
      },
      T7: {
        meals: [
          { session: 'Sáng', dish: 'Bánh cuốn nhân thịt (ít chả) + rau thơm', kcal: 360 },
          { session: 'Trưa', dish: 'Cơm gạo lứt + thịt heo luộc + dưa giá', kcal: 430 },
          { session: 'Phụ', dish: '1 quả chuối + trà xanh', kcal: 105 },
          { session: 'Tối', dish: 'Canh cải nấu tôm + 1/2 chén cơm', kcal: 320 },
        ],
        workouts: [
          { activity: 'Bơi lội hoặc đi bộ công viên', duration: '45 phút', burnKcal: 300 },
          { activity: 'Yoga phục hồi', duration: '20 phút', burnKcal: 80 },
        ],
      },
    },
  },
  gain: {
    title: 'Lộ trình Tăng cân & Tăng cơ',
    dailyTarget: '2.100 - 2.400 kcal/ngày',
    outcomes: {
      '7d': 'Dự kiến tăng 0.3 - 0.5 kg, ăn ngon miệng hơn',
      '14d': 'Dự kiến tăng 0.8 - 1.0 kg, tăng sức bền cơ bắp',
      '30d': 'Dự kiến tăng 1.8 - 2.2 kg, cơ thể đầy đặn hơn',
      '3m': 'Dự kiến tăng 4.5 - 6.0 kg, tăng cơ nạc rõ rệt',
      '6m': 'Dự kiến tăng 8.0 - 10 kg, vóc dáng săn chắc',
    },
    days: {
      T2: {
        meals: [
          { session: 'Sáng', dish: 'Bánh mì ốp la 2 trứng + 1 ly sữa tươi', kcal: 560 },
          { session: 'Trưa', dish: 'Cơm tấm sườn bì chả + canh rong biển', kcal: 720 },
          { session: 'Phụ', dish: 'Sinh tố bơ chuối + hạnh nhân', kcal: 340 },
          { session: 'Tối', dish: 'Bún bò Huế tô lớn + thêm thịt bò', kcal: 620 },
        ],
        workouts: [
          { activity: 'Tập tạ / Kháng lực thân trên', duration: '45 phút', burnKcal: 250 },
          { activity: 'Chống đẩy & Kéo xà', duration: '20 phút', burnKcal: 130 },
        ],
      },
      T3: {
        meals: [
          { session: 'Sáng', dish: 'Xôi xéo chả lụa + 1 ly sữa đậu nành', kcal: 580 },
          { session: 'Trưa', dish: 'Cơm trắng (2 chén) + cá kho tộ + canh chua', kcal: 690 },
          { session: 'Phụ', dish: 'Bánh flan + 1 nắm hạt điều', kcal: 320 },
          { session: 'Tối', dish: 'Mì xào hải sản + rau cải', kcal: 610 },
        ],
        workouts: [
          { activity: 'Tập chân (Squat, Deadlift)', duration: '45 phút', burnKcal: 280 },
          { activity: 'Core & Plank', duration: '15 phút', burnKcal: 90 },
        ],
      },
      T4: {
        meals: [
          { session: 'Sáng', dish: 'Phở bò tái nạm tô lớn + quẩy', kcal: 600 },
          { session: 'Trưa', dish: 'Cơm gà xối mỡ + salad dầu ô liu', kcal: 740 },
          { session: 'Phụ', dish: 'Sữa chua + ngũ cốc Granola + mật ong', kcal: 310 },
          { session: 'Tối', dish: 'Bún thịt nướng chả giò', kcal: 590 },
        ],
        workouts: [
          { activity: 'Nghỉ ngơi / Đi bộ nhẹ phục hồi cơ', duration: '25 phút', burnKcal: 110 },
        ],
      },
      T5: {
        meals: [
          { session: 'Sáng', dish: 'Bánh bao 2 trứng cút + 1 hộp sữa Milo', kcal: 540 },
          { session: 'Trưa', dish: 'Cơm trắng + bò lúc lắc khoai tây', kcal: 760 },
          { session: 'Phụ', dish: 'Sinh tố xoài sữa đặc', kcal: 330 },
          { session: 'Tối', dish: 'Hủ tiếu Nam Vang thập cẩm', kcal: 580 },
        ],
        workouts: [
          { activity: 'Tập vai, tay & lưng', duration: '45 phút', burnKcal: 240 },
          { activity: 'Tập tạ đơn', duration: '20 phút', burnKcal: 120 },
        ],
      },
      T6: {
        meals: [
          { session: 'Sáng', dish: 'Cơm chiên dương châu + 1 trứng ốp la', kcal: 610 },
          { session: 'Trưa', dish: 'Cơm trắng + thịt kho tàu + trứng vịt', kcal: 730 },
          { session: 'Phụ', dish: '2 quả chuối + bơ đậu phộng', kcal: 350 },
          { session: 'Tối', dish: 'Cao lầu Hội An + thêm thịt xá xíu', kcal: 590 },
        ],
        workouts: [
          { activity: 'Tập toàn thân (Full Body)', duration: '45 phút', burnKcal: 270 },
        ],
      },
      T7: {
        meals: [
          { session: 'Sáng', dish: 'Bánh canh cua giò heo', kcal: 590 },
          { session: 'Trưa', dish: 'Cơm trắng + gà rang gừng + canh bí đỏ', kcal: 680 },
          { session: 'Phụ', dish: 'Chè đậu xanh nước cốt dừa', kcal: 340 },
          { session: 'Tối', dish: 'Bánh xèo (2 cái) + thịt nướng', kcal: 620 },
        ],
        workouts: [
          { activity: 'Bơi lội hoặc chơi thể thao nhẹ', duration: '40 phút', burnKcal: 240 },
        ],
      },
    },
  },
  maintain: {
    title: 'Lộ trình Duy trì vóc dáng',
    dailyTarget: '1.600 - 1.800 kcal/ngày',
    outcomes: {
      '7d': 'Giữ cân ổn định, nhịp sinh học & tiêu hóa tốt',
      '14d': 'Duy trì năng lượng đều đặn suốt cả ngày',
      '30d': 'Cân nặng ổn định, chỉ số BMI trong ngưỡng chuẩn',
      '3m': 'Duy trì thể lực dẻo dai và sức khỏe tim mạch',
      '6m': 'Hình thành thói quen ăn uống lành mạnh bền vững',
    },
    days: {
      T2: {
        meals: [
          { session: 'Sáng', dish: 'Bún riêu cua + rau sống', kcal: 430 },
          { session: 'Trưa', dish: 'Cơm trắng + cá kho tộ + canh rau ngót', kcal: 540 },
          { session: 'Phụ', dish: 'Trái cây tươi (táo/ổi) + 1 hộp sữa chua', kcal: 160 },
          { session: 'Tối', dish: 'Hủ tiếu Nam Vang (ít nước béo)', kcal: 480 },
        ],
        workouts: [
          { activity: 'Đi bộ thư giãn / Đạp xe', duration: '30 phút', burnKcal: 180 },
        ],
      },
      T3: {
        meals: [
          { session: 'Sáng', dish: 'Bánh mì thịt chả + rau dưa', kcal: 440 },
          { session: 'Trưa', dish: 'Cơm trắng + thịt luộc cà pháo + canh cua', kcal: 550 },
          { session: 'Phụ', dish: '1 ly sữa hạt không đường', kcal: 150 },
          { session: 'Tối', dish: 'Phở bò tái (ít bánh)', kcal: 460 },
        ],
        workouts: [
          { activity: 'Yoga hoặc giãn cơ', duration: '30 phút', burnKcal: 140 },
        ],
      },
      T4: {
        meals: [
          { session: 'Sáng', dish: 'Xôi gấc + chả lụa (phần vừa)', kcal: 450 },
          { session: 'Trưa', dish: 'Cơm trắng + gà kho gừng + rau cải luộc', kcal: 530 },
          { session: 'Phụ', dish: '1 quả cam + 10 hạt óc chó', kcal: 170 },
          { session: 'Tối', dish: 'Bún thịt nướng (ít mỡ hành)', kcal: 490 },
        ],
        workouts: [
          { activity: 'Chạy bộ nhẹ nhàng', duration: '25 phút', burnKcal: 190 },
        ],
      },
      T5: {
        meals: [
          { session: 'Sáng', dish: 'Bánh cuốn nóng + chả quế', kcal: 420 },
          { session: 'Trưa', dish: 'Cơm trắng + tôm rim + canh mồng tơi', kcal: 520 },
          { session: 'Phụ', dish: 'Sữa chua nếp cẩm', kcal: 180 },
          { session: 'Tối', dish: 'Bánh canh cá lóc', kcal: 470 },
        ],
        workouts: [
          { activity: 'Cầu lông / Bóng bàn', duration: '35 phút', burnKcal: 210 },
        ],
      },
      T6: {
        meals: [
          { session: 'Sáng', dish: 'Cháo sườn quẩy', kcal: 410 },
          { session: 'Trưa', dish: 'Cơm trắng + đậu hũ nhồi thịt + canh chua', kcal: 560 },
          { session: 'Phụ', dish: '1 quả lê + trà hoa cúc', kcal: 120 },
          { session: 'Tối', dish: 'Bún mắm (phần vừa)', kcal: 500 },
        ],
        workouts: [
          { activity: 'Đi bộ nhanh buổi tối', duration: '30 phút', burnKcal: 170 },
        ],
      },
      T7: {
        meals: [
          { session: 'Sáng', dish: 'Bánh giò + dưa góp', kcal: 430 },
          { session: 'Trưa', dish: 'Cơm tấm sườn (bỏ bì) + canh khổ qua', kcal: 580 },
          { session: 'Phụ', dish: 'Sinh tố dưa hấu không đường', kcal: 130 },
          { session: 'Tối', dish: 'Gỏi cuốn tôm thịt + bún tươi', kcal: 460 },
        ],
        workouts: [
          { activity: 'Đạp xe dạo công viên', duration: '35 phút', burnKcal: 200 },
        ],
      },
    },
  },
};

export default function GoalRoadmapSection() {
  const [selectedMode, setSelectedMode] = useState<GoalMode | null>(null);
  const [milestone, setMilestone] = useState<MilestoneKey>('7d');
  const [selectedDay, setSelectedDay] = useState<DayKey>('T2');

  const activeData = selectedMode ? ROADMAP_DATA[selectedMode] : null;
  const dayPlan = activeData ? activeData.days[selectedDay] : null;
  const totalMealKcal = dayPlan ? dayPlan.meals.reduce((sum, m) => sum + m.kcal, 0) : 0;

  return (
    <View style={s.container}>
      <Text style={s.sectionTitle}>Chế độ bạn muốn hướng đến</Text>
      <View style={s.modesRow}>
        {GOAL_MODES.map((m) => {
          const isActive = selectedMode === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              style={[
                s.modeCard,
                { backgroundColor: m.bg },
                isActive && { borderColor: m.color, borderWidth: 1.5 },
              ]}
              activeOpacity={0.8}
              onPress={() => setSelectedMode(m.key)}
            >
              <Text style={s.modeEmoji}>{m.emoji}</Text>
              <Text style={[s.modeLabel, { color: m.color }]}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal
        visible={!!selectedMode}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedMode(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={s.modalTitle}>{activeData?.title}</Text>
                <Text style={s.modalSub}>
                  Mục tiêu: {selectedMode ? MILESTONE_TARGETS[selectedMode][milestone] : ''}
                </Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={() => setSelectedMode(null)}>
                <Ionicons name="close" size={20} color="#4B5563" />
              </TouchableOpacity>
            </View>

            {/* Cột mốc thời gian */}
            <Text style={s.blockLabel}>Chọn cột mốc mục tiêu</Text>
            <View style={s.milestoneWrap}>
              {MILESTONES.map((ms) => {
                const active = milestone === ms.key;
                return (
                  <TouchableOpacity
                    key={ms.key}
                    style={[s.msChip, active && s.msChipActive]}
                    onPress={() => setMilestone(ms.key)}
                  >
                    <Text style={[s.msText, active && s.msTextActive]}>{ms.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Chọn ngày Thứ 2 -> Thứ 7 */}
            <View style={s.daysRow}>
              {DAYS.map((d) => {
                const active = selectedDay === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[s.dayChip, active && s.dayChipActive]}
                    onPress={() => setSelectedDay(d)}
                  >
                    <Text style={[s.dayText, active && s.dayTextActive]}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.bodyScrollContent}
            >
              {/* Thành tích dự kiến */}
              <View style={s.outcomeBox}>
                <Ionicons name="trophy-outline" size={18} color="#15803D" />
                <Text style={s.outcomeText}>{activeData?.outcomes[milestone]}</Text>
              </View>

              {/* Lộ trình ăn uống */}
              <View style={s.blockHeader}>
                <Text style={s.blockLabel}>Thực đơn {selectedDay}</Text>
                <Text style={s.totalKcalText}>Tổng: {totalMealKcal} kcal</Text>
              </View>
              <View style={s.listCard}>
                {dayPlan?.meals.map((meal, idx) => (
                  <View
                    key={idx}
                    style={[s.itemRow, idx < dayPlan.meals.length - 1 && s.itemBorder]}
                  >
                    <View style={s.sessionBadge}>
                      <Text style={s.sessionText}>{meal.session}</Text>
                    </View>
                    <Text style={s.dishText} numberOfLines={2}>
                      {meal.dish}
                    </Text>
                    <Text style={s.kcalText}>{meal.kcal} kcal</Text>
                  </View>
                ))}
              </View>

              {/* Vận động tiêu hao calo */}
              <Text style={[s.blockLabel, { marginTop: 14 }]}>Vận động tiêu hao calo ({selectedDay})</Text>
              <View style={s.workoutGrid}>
                {dayPlan?.workouts.map((w, idx) => (
                  <View key={idx} style={s.workoutCard}>
                    <View style={s.workoutIconWrap}>
                      <Ionicons name="bicycle-outline" size={18} color="#C2410C" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.dishText}>{w.activity}</Text>
                      <Text style={s.durationText}>Thời lượng: {w.duration}</Text>
                    </View>
                    <View style={s.burnBadge}>
                      <Text style={s.burnText}>-{w.burnKcal} kcal</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  modesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  modeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  modeEmoji: {
    fontSize: 16,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#14261C',
  },
  modalSub: {
    fontSize: 13,
    color: '#1E5136',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  milestoneWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  msChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
  },
  msChipActive: {
    backgroundColor: '#1E5136',
  },
  msText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  msTextActive: {
    color: '#FFFFFF',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 12,
  },
  dayChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  dayChipActive: {
    backgroundColor: '#2E7D4F',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  bodyScrollContent: {
    paddingBottom: 12,
  },
  outcomeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  outcomeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalKcalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E5136',
    marginBottom: 8,
  },
  listCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sessionBadge: {
    backgroundColor: '#E6F2EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 46,
    alignItems: 'center',
  },
  sessionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E5136',
  },
  dishText: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
  },
  kcalText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E5136',
  },
  workoutGrid: {
    gap: 8,
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    gap: 10,
  },
  workoutIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  burnBadge: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  burnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C2410C',
  },
});

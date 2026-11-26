import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { userService } from '@/services/user.service';
import { COLORS } from '@/constants';
import BottomNav from '@/components/ui/BottomNav';
import UserAvatar from '@/components/ui/UserAvatar';
import StoryModal, { type AvatarModalMode } from '@/components/ui/StoryModal';

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Ít vận động', desc: 'Chủ yếu ngồi, làm việc bàn giấy' },
  { value: 'light', label: 'Vận động nhẹ', desc: 'Tập thể dục 1-3 ngày/tuần' },
  { value: 'moderate', label: 'Vừa phải', desc: 'Tập thể thao 3-5 ngày/tuần' },
  { value: 'active', label: 'Năng động', desc: 'Vận động cường độ cao 6-7 ngày/tuần' },
  { value: 'very_active', label: 'Rất nhiều', desc: 'Vận động viên hoặc lao động nặng' },
] as const;

const GOAL_OPTIONS = [
  { value: 'lose', label: 'Giảm cân', icon: 'trending-down-outline', desc: '-450 kcal/ngày' },
  { value: 'maintain', label: 'Duy trì', icon: 'fitness-outline', desc: 'Giữ vóc dáng' },
  { value: 'gain_muscle', label: 'Tăng cơ', icon: 'barbell-outline', desc: '+350 kcal/ngày' },
  { value: 'balanced', label: 'Cân bằng', icon: 'leaf-outline', desc: 'Sống lành mạnh' },
] as const;

export default function ProfileScreen() {
  const { user, updateUser, logout } = useAuth();
  const { isAdmin } = useIsAdmin();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Bảng 1: Model User
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [gender, setGender] = useState<'male' | 'female'>(user?.gender || 'male');
  const [birthYear, setBirthYear] = useState(user?.birthYear ? String(user?.birthYear) : '2000');
  const [activityLevel, setActivityLevel] = useState<
    'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  >(user?.activityLevel || 'light');
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain_muscle' | 'balanced'>(
    user?.goal || 'maintain'
  );

  // Bảng 2: Model BodyMetric
  const [heightCm, setHeightCm] = useState(
    user?.latestMetric?.heightCm ? String(user.latestMetric.heightCm) : '170'
  );
  const [weightKg, setWeightKg] = useState(
    user?.latestMetric?.weightKg ? String(user.latestMetric.weightKg) : '65'
  );

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.avatarUrl);
  const [avatarModalMode, setAvatarModalMode] = useState<AvatarModalMode>('closed');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setAvatarUrl(user?.avatarUrl);
  }, [user?.avatarUrl]);

  useEffect(() => {
    (async () => {
      try {
        const profile = await userService.getProfile();
        if (profile) {
          updateUser(profile);
          if (profile.fullName) setFullName(profile.fullName);
          if (profile.avatarUrl) setAvatarUrl(profile.avatarUrl);
          if (profile.gender) setGender(profile.gender);
          if (profile.birthYear) setBirthYear(String(profile.birthYear));
          if (profile.activityLevel) setActivityLevel(profile.activityLevel);
          if (profile.goal) setGoal(profile.goal);
          if (profile.latestMetric?.heightCm) setHeightCm(String(profile.latestMetric.heightCm));
          if (profile.latestMetric?.weightKg) setWeightKg(String(profile.latestMetric.weightKg));
        }
      } catch {}
    })();
  }, []);

  const uploadPickedAvatar = async (uri: string) => {
    try {
      setUploadingAvatar(true);
      setMessage(null);
      setAvatarUrl(uri); // hiển thị xem trước ngay lập tức
      const updated = await userService.uploadAvatar(uri);
      setAvatarUrl(updated.avatarUrl);
      updateUser(updated);
      setMessage({ type: 'success', text: 'Đã cập nhật ảnh đại diện thành công!' });
    } catch (e: any) {
      setAvatarUrl(user?.avatarUrl);
      setMessage({ type: 'error', text: e?.message || 'Không thể tải ảnh đại diện lên' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickAvatarFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép truy cập thư viện ảnh để chọn ảnh đại diện.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      await uploadPickedAvatar(res.assets[0].uri);
    }
  };

  const takeAvatarPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Cần quyền máy ảnh', 'Vui lòng cấp quyền máy ảnh để chụp ảnh đại diện.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      await uploadPickedAvatar(res.assets[0].uri);
    }
  };

  const handleChangeAvatar = () => {
    if (uploadingAvatar) return;
    setAvatarModalMode('menu');
  };

  // Tính BMI tự động
  const h = Number(heightCm) / 100;
  const w = Number(weightKg);
  const bmi = h > 0 && w > 0 ? (w / (h * h)).toFixed(1) : null;

  const getBmiCategory = (val: number) => {
    if (val < 18.5) return { label: 'Thiếu cân', color: '#D97706', bg: '#FEF3C7' };
    if (val < 24.9) return { label: 'Bình thường (Cân đối)', color: '#059669', bg: '#D1FAE5' };
    if (val < 29.9) return { label: 'Thừa cân', color: '#D97706', bg: '#FEF3C7' };
    return { label: 'Béo phì', color: '#DC2626', bg: '#FEE2E2' };
  };

  const bmiCategory = bmi ? getBmiCategory(Number(bmi)) : null;

  const handleSave = async () => {
    if (!fullName.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập họ và tên' });
      return;
    }
    if (!heightCm || isNaN(Number(heightCm)) || Number(heightCm) <= 0) {
      setMessage({ type: 'error', text: 'Chiều cao không hợp lệ' });
      return;
    }
    if (!weightKg || isNaN(Number(weightKg)) || Number(weightKg) <= 0) {
      setMessage({ type: 'error', text: 'Cân nặng không hợp lệ' });
      return;
    }
    if (!birthYear || isNaN(Number(birthYear)) || Number(birthYear) < 1920) {
      setMessage({ type: 'error', text: 'Năm sinh không hợp lệ' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const updated = await userService.updateProfile({
        fullName: fullName.trim(),
        gender,
        birthYear: Number(birthYear),
        activityLevel,
        goal,
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
      });

      updateUser(updated);
      setMessage({
        type: 'success',
        text: 'Đã lưu thông tin thể trạng và tính toán mục tiêu dinh dưỡng thành công!',
      });
    } catch (e: any) {
      setMessage({
        type: 'error',
        text: e.response?.data?.message || 'Có lỗi xảy ra khi cập nhật hồ sơ',
      });
    } finally {
      setSaving(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const age = birthYear && !isNaN(Number(birthYear)) ? currentYear - Number(birthYear) : null;

  return (
    <View style={s.screen}>
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.headerRow}>
          <TouchableOpacity
            style={s.backButton}
            onPress={() => router.replace('/')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#14261C" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Hồ sơ thể trạng</Text>
          <TouchableOpacity
            style={s.logoutIconButton}
            onPress={() => {
              Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất không?', [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Đăng xuất', style: 'destructive', onPress: logout },
              ]);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={22} color="#DC2626" />
          </TouchableOpacity>
        </View>

        {/* Success/Error Toast Banner */}
        {message && (
          <View
            style={[
              s.alertBox,
              message.type === 'success' ? s.alertSuccess : s.alertError,
            ]}
          >
            <View
              style={[
                s.alertIconCircle,
                { backgroundColor: message.type === 'success' ? '#10B981' : '#EF4444' },
              ]}
            >
              <Ionicons
                name={message.type === 'success' ? 'checkmark' : 'alert'}
                size={14}
                color="#FFFFFF"
              />
            </View>
            <Text
              style={[
                s.alertText,
                { color: message.type === 'success' ? '#065F46' : '#991B1B' },
              ]}
            >
              {message.text}
            </Text>
            <TouchableOpacity onPress={() => setMessage(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* BẢNG 2: THỂ TRẠNG (BodyMetric Model) */}
        <View style={s.sectionCard}>
          <View style={s.sectionTitleRow}>
            <TouchableOpacity onPress={handleChangeAvatar} activeOpacity={0.8}>
              <UserAvatar
                uri={avatarUrl}
                name={fullName || user?.fullName}
                size={46}
                borderRadius={23}
                noteText={user?.note?.text}
                showEditBadge
              />
            </TouchableOpacity>
            <View>
              <Text style={s.sectionTitle}>Chỉ số thể trạng</Text>
              <Text style={s.sectionSubtitle}>Dữ liệu lưu vào bảng BodyMetric</Text>
            </View>
          </View>

          <View style={s.inputRow}>
            <View style={s.inputCol}>
              <Text style={s.fieldLabel}>Chiều cao (cm)</Text>
              <View style={s.inputWrapper}>
                <TextInput
                  style={s.textInput}
                  value={heightCm}
                  onChangeText={setHeightCm}
                  keyboardType="numeric"
                  placeholder="170"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={s.unitSuffix}>cm</Text>
              </View>
            </View>

            <View style={s.inputCol}>
              <Text style={s.fieldLabel}>Cân nặng (kg)</Text>
              <View style={s.inputWrapper}>
                <TextInput
                  style={s.textInput}
                  value={weightKg}
                  onChangeText={setWeightKg}
                  keyboardType="numeric"
                  placeholder="65"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={s.unitSuffix}>kg</Text>
              </View>
            </View>
          </View>

          {/* BMI Live Preview */}
          {bmi && bmiCategory && (
            <View style={[s.bmiBadge, { backgroundColor: bmiCategory.bg }]}>
              <Text style={s.bmiLabel}>
                Chỉ số BMI: <Text style={{ fontWeight: '800' }}>{bmi}</Text>
              </Text>
              <Text style={[s.bmiCategory, { color: bmiCategory.color }]}>
                {bmiCategory.label}
              </Text>
            </View>
          )}
        </View>

        {/* BẢNG 1: THÔNG TIN CÁ NHÂN (User Model) */}
        <View style={s.sectionCard}>
          <View style={[s.sectionTitleRow, { marginTop: 10 }]}>
            <TouchableOpacity onPress={handleChangeAvatar} disabled={uploadingAvatar} activeOpacity={0.8}>
              {uploadingAvatar ? (
                <View style={[s.sectionIconWrap, { backgroundColor: '#DCFCE7', width: 46, height: 46, borderRadius: 23 }]}>
                  <ActivityIndicator size="small" color="#15803D" />
                </View>
              ) : (
                <UserAvatar
                  uri={avatarUrl}
                  name={fullName || user?.fullName}
                  size={46}
                  borderRadius={23}
                  noteText={user?.note?.text}
                  showNotePrompt
                  showEditBadge
                />
              )}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionTitle}>Thông tin cá nhân</Text>
              <Text style={s.sectionSubtitle}>Dữ liệu lưu vào bảng User</Text>
            </View>
          </View>

          {/* Họ và tên */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Họ và tên</Text>
            <TextInput
              style={s.singleInput}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nguyễn Văn A"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Email (Readonly) */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Email tài khoản</Text>
            <View style={s.readonlyBox}>
              <Ionicons name="mail-outline" size={18} color="#6B7280" />
              <Text style={s.readonlyText}>{user?.email || 'Chưa có'}</Text>
            </View>
          </View>

          {/* Giới tính & Năm sinh */}
          <View style={s.inputRow}>
            {/* Giới tính */}
            <View style={s.inputCol}>
              <Text style={s.fieldLabel}>Giới tính</Text>
              <View style={s.genderRow}>
                <TouchableOpacity
                  style={[s.genderPill, gender === 'male' && s.genderPillActive]}
                  onPress={() => setGender('male')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="male"
                    size={16}
                    color={gender === 'male' ? '#FFFFFF' : '#4B5563'}
                  />
                  <Text style={[s.genderText, gender === 'male' && s.genderTextActive]}>Nam</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.genderPill, gender === 'female' && s.genderPillActive]}
                  onPress={() => setGender('female')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="female"
                    size={16}
                    color={gender === 'female' ? '#FFFFFF' : '#4B5563'}
                  />
                  <Text style={[s.genderText, gender === 'female' && s.genderTextActive]}>Nữ</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Năm sinh */}
            <View style={s.inputCol}>
              <Text style={s.fieldLabel}>
                Năm sinh {age !== null && age > 0 ? `(${age} tuổi)` : ''}
              </Text>
              <TextInput
                style={s.singleInput}
                value={birthYear}
                onChangeText={setBirthYear}
                keyboardType="numeric"
                placeholder="2000"
                placeholderTextColor="#9CA3AF"
                maxLength={4}
              />
            </View>
          </View>

          {/* Mức độ vận động */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Mức độ vận động (Activity Level)</Text>
            <View style={s.optionsList}>
              {ACTIVITY_OPTIONS.map((opt) => {
                const isSelected = activityLevel === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[s.optionItem, isSelected && s.optionItemActive]}
                    onPress={() => setActivityLevel(opt.value)}
                    activeOpacity={0.8}
                  >
                    <View style={s.radioCircle}>
                      {isSelected && <View style={s.radioDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.optionTitle, isSelected && s.optionTitleActive]}>
                        {opt.label}
                      </Text>
                      <Text style={s.optionDesc}>{opt.desc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Mục tiêu sức khỏe */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Mục tiêu dinh dưỡng (Goal)</Text>
            <View style={s.goalGrid}>
              {GOAL_OPTIONS.map((g) => {
                const isSelected = goal === g.value;
                return (
                  <TouchableOpacity
                    key={g.value}
                    style={[s.goalCard, isSelected && s.goalCardActive]}
                    onPress={() => setGoal(g.value)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={g.icon as any}
                      size={24}
                      color={isSelected ? '#15803D' : '#6B7280'}
                    />
                    <Text style={[s.goalCardTitle, isSelected && s.goalCardTitleActive]}>
                      {g.label}
                    </Text>
                    <Text style={s.goalCardDesc}>{g.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* TÍNH TOÁN MỤC TIÊU DINH DƯỠNG (Targets Result) */}
        {user?.targets?.kcal && (
          <View style={[s.sectionCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <View style={s.sectionTitleRow}>
              <View style={[s.sectionIconWrap, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="calculator-outline" size={20} color="#15803D" />
              </View>
              <View>
                <Text style={[s.sectionTitle, { color: '#14532D' }]}>
                  Mục tiêu dinh dưỡng tự động
                </Text>
                <Text style={s.sectionSubtitle}>Dựa trên công thức Mifflin-St Jeor & TDEE</Text>
              </View>
            </View>

            <View style={s.targetStatsGrid}>
              <View style={s.statBox}>
                <Text style={s.statLabel}>BMR Cơ bản</Text>
                <Text style={s.statValue}>{user.targets.bmr} kcal</Text>
              </View>
              <View style={s.statBox}>
                <Text style={s.statLabel}>TDEE Tiêu hao</Text>
                <Text style={s.statValue}>{user.targets.tdee} kcal</Text>
              </View>
              <View style={[s.statBox, { backgroundColor: '#15803D' }]}>
                <Text style={[s.statLabel, { color: '#D1FAE5' }]}>Mục tiêu / ngày</Text>
                <Text style={[s.statValue, { color: '#FFFFFF', fontSize: 18 }]}>
                  {user.targets.kcal} kcal
                </Text>
              </View>
            </View>

            <View style={s.macroSummaryRow}>
              <View style={s.macroSummaryCol}>
                <Text style={s.macroSummaryLabel}>Đạm (Protein)</Text>
                <Text style={s.macroSummaryValue}>{user.targets.protein}g</Text>
              </View>
              <View style={s.macroSummaryCol}>
                <Text style={s.macroSummaryLabel}>Tinh bột (Carb)</Text>
                <Text style={s.macroSummaryValue}>{user.targets.carb}g</Text>
              </View>
              <View style={s.macroSummaryCol}>
                <Text style={s.macroSummaryLabel}>Chất béo (Fat)</Text>
                <Text style={s.macroSummaryValue}>{user.targets.fat}g</Text>
              </View>
            </View>
          </View>
        )}

        {/* Nút lưu */}
        <TouchableOpacity
          style={[s.saveButton, saving && s.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#FFFFFF" />
              <Text style={s.saveButtonText}>Lưu thông tin hồ sơ</Text>
            </>
          )}
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity
            style={[s.logoutButton, { borderColor: '#C8DEC8', backgroundColor: '#EDF7ED', marginBottom: 10 }]}
            onPress={() => router.push('/admin' as Href)}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color="#1E5136" />
            <Text style={[s.logoutButtonText, { color: '#1E5136' }]}>Quản trị</Text>
          </TouchableOpacity>
        )}

        {/* Nút đăng xuất phụ */}
        <TouchableOpacity
          style={s.logoutButton}
          onPress={logout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={s.logoutButtonText}>Đăng xuất tài khoản</Text>
        </TouchableOpacity>

        <Text style={s.copyrightText}>
          ©Bản quyền thuộc về Nguyễn Thị Diễm Quỳnh & Tạ Kim Hương
        </Text>
      </ScrollView>

      {/* Bottom Sheet đổi ảnh & Ghi chú kiểu Instagram */}
      <StoryModal
        mode={avatarModalMode}
        onClose={() => setAvatarModalMode('closed')}
        onChangeMode={setAvatarModalMode}
        targetUser={{
          fullName: fullName || user?.fullName,
          avatarUrl: avatarUrl || user?.avatarUrl,
          role: user?.role,
          note: user?.note,
        }}
        isOwnProfile
        onPickAvatarCamera={takeAvatarPhoto}
        onPickAvatarLibrary={pickAvatarFromLibrary}
        onUserUpdated={(u) => {
          updateUser(u);
          setAvatarUrl(u.avatarUrl);
        }}
        onFeedbackMessage={(type, text) => setMessage({ type, text })}
      />

      {/* Bottom Nav với tab profile active */}
      <BottomNav activeTab="profile" />
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
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#14261C',
  },
  logoutIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  alertIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  alertError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EBF0E9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#14261C',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  inputCol: {
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
  },
  textInput: {
    flex: 1,
    height: 46,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  unitSuffix: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 6,
  },
  singleInput: {
    height: 46,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  readonlyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 46,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
  },
  readonlyText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  bmiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    marginTop: 4,
  },
  bmiLabel: {
    fontSize: 13,
    color: '#374151',
  },
  bmiCategory: {
    fontSize: 13,
    fontWeight: '700',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderPill: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  genderPillActive: {
    backgroundColor: '#1E5338',
    borderColor: '#1E5338',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  genderTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  optionsList: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  optionItemActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  optionTitleActive: {
    color: '#065F46',
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  goalCard: {
    width: '48%',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    gap: 4,
  },
  goalCardActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  goalCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  goalCardTitleActive: {
    color: '#065F46',
  },
  goalCardDesc: {
    fontSize: 11,
    color: '#6B7280',
  },
  targetStatsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#14261C',
    marginTop: 2,
  },
  macroSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
  },
  macroSummaryCol: {
    alignItems: 'center',
  },
  macroSummaryLabel: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
  },
  macroSummaryValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#14261C',
    marginTop: 2,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E5338',
    height: 52,
    borderRadius: 18,
    marginTop: 8,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#1E5338',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: 16,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  copyrightText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
});

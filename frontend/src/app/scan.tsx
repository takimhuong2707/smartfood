import { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { mealService } from '@/services/meal.service';
import type {
  PredictionCandidate,
  PortionOption,
  FoodItem,
  PredictionItem,
} from '@/types/meal';

type ScanStage = 'camera' | 'analyzing' | 'result';

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<any>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [stage, setStage] = useState<ScanStage>('camera');

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [predictionId, setPredictionId] = useState<string | null>(null);

  // Model 1: Số tô và danh sách tô phát hiện
  const [bowlCount, setBowlCount] = useState<number>(1);
  const [detected, setDetected] = useState<boolean>(false);
  const [predictionItems, setPredictionItems] = useState<PredictionItem[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);

  // Model 2 & 3: Candidates và Khẩu phần ước lượng
  const [candidates, setCandidates] = useState<PredictionCandidate[]>([]);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);
  const [selectedPortion, setSelectedPortion] = useState<PortionOption | null>(null);
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');

  // Search/pick other dish modal
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [allFoods, setAllFoods] = useState<FoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  // Lưu lại món Top-1 ban đầu do AI dự đoán cho từng tô để so sánh isCorrected & gửi Feedback
  const [aiTopByBowl, setAiTopByBowl] = useState<Record<number, { classId: string; name: string }>>({});
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [feedbackFood, setFeedbackFood] = useState<{ _id: string; name: string } | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Set default meal type based on hour
  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) setMealType('breakfast');
    else if (h >= 11 && h < 15) setMealType('lunch');
    else if (h >= 15 && h < 21) setMealType('dinner');
    else setMealType('snack');
  }, []);

  // Tự xin quyền camera ngay khi mở màn hình nếu chưa cấp
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission().catch(() => null);
    }
  }, [permission, requestPermission]);

  const handleCapture = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      // 1. Đảm bảo đã có quyền camera
      if (!permission?.granted) {
        const camPerm = await requestPermission();
        if (!camPerm.granted) {
          const pickerPerm = await ImagePicker.requestCameraPermissionsAsync();
          if (!pickerPerm.granted) {
            Alert.alert('Cần quyền máy ảnh', 'Vui lòng cấp quyền máy ảnh trong Cài đặt để chụp món ăn.');
            return;
          }
        }
      }

      // 2. Ưu tiên chụp trực tiếp từ CameraView nếu đã sẵn sàng
      if (cameraRef.current && cameraReady) {
        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.75,
          });
          if (photo?.uri) {
            await processImage(photo.uri);
            return;
          }
        } catch (camErr) {
          console.warn('CameraView takePictureAsync lỗi, chuyển sang ImagePicker:', camErr);
        }
      }

      // 3. Fallback an toàn sang trình máy ảnh hệ thống (hoạt động trên mọi máy Android/iOS/Web)
      const pickerPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (!pickerPerm.granted) {
        Alert.alert('Cần quyền máy ảnh', 'Vui lòng cấp quyền máy ảnh để chụp ảnh.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.75,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        await processImage(res.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Lỗi chụp ảnh', err?.message || 'Không thể chụp ảnh, vui lòng chọn từ Thư viện.');
    } finally {
      setCapturing(false);
    }
  };

  const handlePickLibrary = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Cần quyền thư viện ảnh', 'Vui lòng cho phép truy cập thư viện ảnh để chọn ảnh món ăn.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        await processImage(res.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Lỗi chọn ảnh', err?.message || 'Không thể chọn ảnh từ thư viện');
    }
  };

  const processImage = async (uri: string) => {
    setImageUri(uri);
    setStage('analyzing');

    try {
      const res = await mealService.predictImage(uri);
      setPredictionId(res.predictionId);
      setBowlCount(res.bowlCount || 1);
      setDetected(res.detected);

      const items = res.items && res.items.length > 0 ? res.items : [{ index: 1, candidates: res.candidates }];
      setPredictionItems(items);
      setSelectedItemIndex(0);
      setFeedbackSent(false);
      setFeedbackComment('');
      setFeedbackFood(null);

      const topMap: Record<number, { classId: string; name: string }> = {};
      items.forEach((it, idx) => {
        const top = it.candidates?.[0];
        if (top) topMap[idx] = { classId: top.classId, name: top.name };
      });
      setAiTopByBowl(topMap);

      const firstItemCandidates = items[0]?.candidates || res.candidates || [];
      setCandidates(firstItemCandidates);
      setSelectedCandidateIndex(0);

      // Default to the portion marked as default (Model 3 AI estimated portion)
      const defaultPortion =
        firstItemCandidates[0]?.portions.find((p) => p.isDefault) ||
        firstItemCandidates[0]?.portions[1] ||
        firstItemCandidates[0]?.portions[0] ||
        null;
      setSelectedPortion(defaultPortion);

      setStage('result');
    } catch (err: any) {
      Alert.alert(
        'Lỗi nhận diện',
        err.response?.data?.message || err.message || 'Có lỗi khi phân tích ảnh',
        [{ text: 'Thử lại', onPress: () => setStage('camera') }]
      );
    }
  };

  const handleSelectItem = (itemIdx: number) => {
    setSelectedItemIndex(itemIdx);
    const item = predictionItems[itemIdx];
    if (item && item.candidates.length > 0) {
      setCandidates(item.candidates);
      setSelectedCandidateIndex(0);
      const defaultPortion =
        item.candidates[0].portions.find((p) => p.isDefault) ||
        item.candidates[0].portions[1] ||
        item.candidates[0].portions[0] ||
        null;
      setSelectedPortion(defaultPortion);
    }
  };

  const handleSelectCandidate = (idx: number) => {
    setSelectedCandidateIndex(idx);
    const candidate = candidates[idx];
    if (candidate) {
      const p =
        candidate.portions.find((pt) => pt.isDefault) ||
        candidate.portions[1] ||
        candidate.portions[0] ||
        null;
      setSelectedPortion(p);
    }
  };

  const openSearchModal = async () => {
    try {
      if (allFoods.length === 0) {
        const foods = await mealService.getAllFoods();
        setAllFoods(foods);
      }
      setShowSearchModal(true);
    } catch {
      setShowSearchModal(true);
    }
  };

  const handleSelectManualFood = (food: FoodItem) => {
    const stdGrams = food.servingSizes?.find((s) => s.isDefault)?.grams || 500;
    const smallGrams = Math.round(stdGrams * 0.75);
    const largeGrams = Math.round(stdGrams * 1.25);

    const calc = (g: number) => {
      const factor = g / 100;
      const n = food.nutritionPer100g || { kcal: 100, protein: 5, carb: 15, fat: 3 };
      return {
        kcal: Math.round(n.kcal * factor),
        protein: Math.round((n.protein || 0) * factor),
        carb: Math.round((n.carb || 0) * factor),
        fat: Math.round((n.fat || 0) * factor),
      };
    };

    const newCandidate: PredictionCandidate = {
      foodId: food._id,
      classId: food.classId,
      name: food.name,
      confidence: 100,
      kValue: 1.0,
      portions: [
        { label: 'Nhỏ', grams: smallGrams, isDefault: false, isAiEstimated: false, ...calc(smallGrams) },
        { label: 'Vừa', grams: stdGrams, isDefault: true, isAiEstimated: false, ...calc(stdGrams) },
        { label: 'Lớn', grams: largeGrams, isDefault: false, isAiEstimated: false, ...calc(largeGrams) },
      ],
    };

    setCandidates([newCandidate, ...candidates]);
    setSelectedCandidateIndex(0);
    setSelectedPortion(newCandidate.portions[1]);
    setShowSearchModal(false);
  };

  const openFeedbackModal = async () => {
    try {
      let list = allFoods;
      if (list.length === 0) {
        list = await mealService.getAllFoods();
        setAllFoods(list);
      }
      const aiTop = aiTopByBowl[selectedItemIndex];
      const cur = candidates[selectedCandidateIndex];
      if (cur && aiTop && cur.classId !== aiTop.classId) {
        setFeedbackFood({ _id: cur.foodId, name: cur.name });
      }
      setFeedbackSearch('');
      setShowFeedbackModal(true);
    } catch {
      setShowFeedbackModal(true);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!predictionId) {
      Alert.alert('Thông báo', 'Chưa có mã nhận diện AI để gửi góp ý');
      return;
    }
    if (!feedbackFood) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn món ăn đúng bên dưới');
      return;
    }
    setSendingFeedback(true);
    try {
      const aiTop = aiTopByBowl[selectedItemIndex];
      await mealService.submitFeedback({
        predictionId,
        correctFoodId: feedbackFood._id,
        predictedClass: aiTop?.classId || undefined,
        comment: feedbackComment.trim() || undefined,
      });
      setFeedbackSent(true);
      setShowFeedbackModal(false);
      Alert.alert('Cảm ơn bạn!', 'Đã gửi góp ý để cải thiện độ chính xác của mô hình AI.');
    } catch (err: any) {
      Alert.alert('Không thể gửi góp ý', err.response?.data?.message || err.message || 'Vui lòng thử lại');
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleSaveMeal = async () => {
    const currentCandidate = candidates[selectedCandidateIndex];
    if (!currentCandidate || !selectedPortion) {
      Alert.alert('Lỗi', 'Chưa chọn món ăn hoặc khẩu phần');
      return;
    }

    setSaving(true);
    try {
      const aiTop = aiTopByBowl[selectedItemIndex];
      await mealService.saveMeal({
        foodId: currentCandidate.foodId,
        foodName: currentCandidate.name,
        portionLabel: `${selectedPortion.label} ${selectedPortion.grams}g`,
        portionGrams: selectedPortion.grams,
        mealType,
        predictionId: predictionId || undefined,
        predictedClass: aiTop?.classId || undefined,
        imageUrl: imageUri || undefined,
        nutrition: {
          kcal: selectedPortion.kcal,
          protein: selectedPortion.protein,
          carb: selectedPortion.carb,
          fat: selectedPortion.fat,
        },
      });

      Alert.alert('Thành công', 'Đã lưu bữa ăn vào nhật ký hôm nay!', [
        { text: 'Về trang chủ', onPress: () => router.replace('/') },
      ]);
    } catch (err: any) {
      Alert.alert('Lỗi lưu bữa ăn', err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const currentCandidate = candidates[selectedCandidateIndex];

  // ================= STAGE 2: ANALYZING =================
  if (stage === 'analyzing') {
    return (
      <View style={s.analyzingScreen}>
        <View style={s.analyzingBox}>
          {imageUri && <Image source={{ uri: imageUri }} style={s.analyzingPreview} />}
          <ActivityIndicator size="large" color="#4ADE80" style={{ marginTop: 24 }} />
          <Text style={s.analyzingTitle}>Đang phân tích 3 mô hình AI...</Text>
          <View style={s.aiStepsList}>
            <Text style={s.aiStepItem}>1. YOLO Detector: Đếm số lượng tô/phần ăn</Text>
            <Text style={s.aiStepItem}>2. Food Classifier: Nhận diện 30 món ăn Việt</Text>
            <Text style={s.aiStepItem}>3. PortionNet: Ước lượng khẩu phần thực tế</Text>
          </View>
        </View>
      </View>
    );
  }

  // ================= STAGE 3: RESULT SCREEN (Image 2) =================
  if (stage === 'result' && currentCandidate && selectedPortion) {
    return (
      <View style={s.resultScreen}>
        <ScrollView
          style={s.scrollView}
          contentContainerStyle={[s.resultContent, { paddingTop: insets.top + 12 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={s.resultHeader}>
            <TouchableOpacity
              style={s.backRoundBtn}
              onPress={() => setStage('camera')}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color="#14261C" />
            </TouchableOpacity>
            <Text style={s.resultHeaderTitle}>Kết quả nhận diện</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Captured Image Preview */}
          <View style={s.imagePreviewWrap}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={s.capturedImage} resizeMode="cover" />
            ) : (
              <View style={s.placeholderImage}>
                <Ionicons name="image-outline" size={48} color="#9CA3AF" />
                <Text style={s.placeholderText}>Ảnh món vừa chụp</Text>
              </View>
            )}
          </View>

          {/* MÔ HÌNH 1: THÔNG TIN PHÁT HIỆN & ĐẾM SỐ TÔ */}
          <View style={s.detectionBadge}>
            <View style={s.detectionIconWrap}>
              <Ionicons name="restaurant" size={18} color="#15803D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.detectionBadgeTitle}>
                {detected
                  ? `Model YOLO đã đếm được: ${bowlCount} tô/phần ăn`
                  : 'Chưa phát hiện rõ viền tô (sử dụng toàn bộ ảnh)'}
              </Text>
              <Text style={s.detectionBadgeSub}>
                Mô hình 1: detect_to_mon.pt
              </Text>
            </View>
          </View>

          {/* Chọn tô nếu phát hiện nhiều hơn 1 tô */}
          {predictionItems.length > 1 && (
            <View style={s.bowlSelectorRow}>
              <Text style={s.bowlSelectorLabel}>Chọn tô để ghi nhận:</Text>
              <View style={s.bowlTabs}>
                {predictionItems.map((item, idx) => {
                  const isSelected = selectedItemIndex === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[s.bowlTabPill, isSelected && s.bowlTabPillActive]}
                      onPress={() => handleSelectItem(idx)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="restaurant-outline"
                        size={14}
                        color={isSelected ? '#FFFFFF' : '#15803D'}
                      />
                      <Text style={[s.bowlTabText, isSelected && s.bowlTabTextActive]}>
                        Tô #{item.index}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* MÔ HÌNH 2: "Có phải món này không?" */}
          <View style={s.sectionBlock}>
            <Text style={s.sectionHeaderLabel}>Có phải món này không? (Mô hình 2: food_cls.pt)</Text>
            <View style={s.candidatePillsRow}>
              {candidates.map((cand, idx) => {
                const isSelected = selectedCandidateIndex === idx;
                return (
                  <TouchableOpacity
                    key={cand.classId || idx}
                    style={[s.candidatePill, isSelected && s.candidatePillActive]}
                    onPress={() => handleSelectCandidate(idx)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        s.candidatePillText,
                        isSelected && s.candidatePillTextActive,
                      ]}
                    >
                      {cand.name} {cand.confidence}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={s.dishActionRow}>
              <TouchableOpacity
                style={s.otherDishBtn}
                onPress={openSearchModal}
                activeOpacity={0.7}
              >
                <Text style={s.otherDishText}>Không đúng? Tìm món khác</Text>
              </TouchableOpacity>

              {predictionId && (
                <TouchableOpacity
                  style={[s.reportFeedbackBtn, feedbackSent && s.reportFeedbackBtnSent]}
                  onPress={openFeedbackModal}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={feedbackSent ? 'checkmark-circle' : 'flag-outline'}
                    size={14}
                    color={feedbackSent ? '#15803D' : '#B45309'}
                  />
                  <Text style={[s.reportFeedbackText, feedbackSent && s.reportFeedbackTextSent]}>
                    {feedbackSent ? 'Đã gửi góp ý AI' : 'Báo AI nhận sai'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* MÔ HÌNH 3: "Khẩu phần" (ƯỚC LƯỢNG KHẨU PHẦN TỪ PORTIONNET) */}
          <View style={s.sectionBlock}>
            <View style={s.portionTitleRow}>
              <Text style={s.sectionHeaderLabel}>Khẩu phần (Mô hình 3: portion_best.pt)</Text>
              {selectedPortion.isAiEstimated && (
                <View style={s.aiBadgePill}>
                  <Ionicons name="sparkles" size={12} color="#15803D" />
                  <Text style={s.aiBadgeText}>AI ước lượng</Text>
                </View>
              )}
            </View>

            <View style={s.portionPillsRow}>
              {currentCandidate.portions.map((p, idx) => {
                const isSelected = selectedPortion?.label === p.label;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[s.portionPill, isSelected && s.portionPillActive]}
                    onPress={() => setSelectedPortion(p)}
                    activeOpacity={0.8}
                  >
                    <View style={{ alignItems: 'center' }}>
                      <Text
                        style={[
                          s.portionPillText,
                          isSelected && s.portionPillTextActive,
                        ]}
                      >
                        {p.label} {p.grams}g
                      </Text>
                      {p.isAiEstimated && (
                        <Text
                          style={[
                            s.portionSubAi,
                            isSelected && s.portionSubAiActive,
                          ]}
                        >
                          (k={p.kValue || currentCandidate.kValue || 1.0})
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Ghi chú về kết quả ước lượng của Model 3 */}
            {selectedPortion.isAiEstimated && (
              <View style={s.portionAiNoteBox}>
                <Ionicons name="sparkles" size={16} color="#15803D" />
                <Text style={s.portionAiNoteText}>
                  Mô hình PortionNet đã phân tích kích thước tô trong ảnh và ước lượng khẩu phần thực tế là{' '}
                  <Text style={{ fontWeight: '800' }}>{selectedPortion.grams}g</Text> (hệ số k={selectedPortion.kValue || currentCandidate.kValue || 1.0}).
                </Text>
              </View>
            )}
          </View>

          {/* Thẻ Dinh dưỡng hiển thị tính toán */}
          <View style={s.nutritionCard}>
            <View style={s.nutritionCol}>
              <Text style={s.nutritionValue}>{selectedPortion.kcal}</Text>
              <Text style={s.nutritionLabel}>kcal</Text>
            </View>
            <View style={s.nutritionCol}>
              <Text style={s.nutritionValue}>{selectedPortion.protein}g</Text>
              <Text style={s.nutritionLabel}>Đạm</Text>
            </View>
            <View style={s.nutritionCol}>
              <Text style={s.nutritionValue}>{selectedPortion.carb}g</Text>
              <Text style={s.nutritionLabel}>Carb</Text>
            </View>
            <View style={s.nutritionCol}>
              <Text style={s.nutritionValue}>{selectedPortion.fat}g</Text>
              <Text style={s.nutritionLabel}>Béo</Text>
            </View>
          </View>

          {/* Meal Type Selector (Sáng, Trưa, Tối, Phụ) */}
          <View style={s.mealTypeRow}>
            {[
              { key: 'breakfast', label: 'Sáng' },
              { key: 'lunch', label: 'Trưa' },
              { key: 'dinner', label: 'Tối' },
              { key: 'snack', label: 'Phụ' },
            ].map((m) => {
              const isSelected = mealType === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[s.mealTypePill, isSelected && s.mealTypePillActive]}
                  onPress={() => setMealType(m.key as any)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      s.mealTypeText,
                      isSelected && s.mealTypeTextActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Save to Log Button */}
          <TouchableOpacity
            style={[s.saveMealBtn, saving && s.saveMealBtnDisabled]}
            onPress={handleSaveMeal}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={s.saveMealBtnText}>Lưu vào nhật ký</Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Modal: Tìm món khác */}
        <Modal visible={showSearchModal} animationType="slide" transparent>
          <View style={s.modalOverlay}>
            <View style={[s.modalContent, { paddingBottom: insets.bottom + 16 }]}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Chọn món ăn</Text>
                <TouchableOpacity
                  onPress={() => setShowSearchModal(false)}
                  style={s.modalCloseBtn}
                >
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>

              <View style={s.modalSearchBox}>
                <Ionicons name="search" size={20} color="#6B7280" />
                <TextInput
                  style={s.modalSearchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Tìm tên món (vd: phở, bún chả...)"
                  placeholderTextColor="#9CA3AF"
                  autoFocus
                />
              </View>

              <ScrollView style={{ maxHeight: 380 }}>
                {allFoods
                  .filter((f) =>
                    f.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
                  )
                  .map((f) => (
                    <TouchableOpacity
                      key={f._id}
                      style={s.foodSelectItem}
                      onPress={() => handleSelectManualFood(f)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={s.foodSelectName}>{f.name}</Text>
                        <Text style={s.foodSelectCal}>
                          {f.nutritionPer100g.kcal} kcal / 100g
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal: Báo AI nhận diện sai (Feedback) */}
        <Modal visible={showFeedbackModal} animationType="slide" transparent>
          <View style={s.modalOverlay}>
            <View style={[s.modalContent, { paddingBottom: insets.bottom + 16 }]}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Góp ý kết quả nhận diện AI</Text>
                <TouchableOpacity
                  onPress={() => setShowFeedbackModal(false)}
                  style={s.modalCloseBtn}
                >
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>

              <Text style={s.feedbackSubLabel}>
                AI dự đoán ban đầu:{' '}
                <Text style={{ fontWeight: '700', color: '#14261C' }}>
                  {aiTopByBowl[selectedItemIndex]?.name || aiTopByBowl[selectedItemIndex]?.classId || '--'}
                </Text>
              </Text>

              <Text style={s.feedbackFieldLabel}>
                Món ăn đúng là: {feedbackFood ? <Text style={{ color: '#15803D' }}>{feedbackFood.name}</Text> : '(chưa chọn)'}
              </Text>

              <View style={s.modalSearchBox}>
                <Ionicons name="search" size={18} color="#6B7280" />
                <TextInput
                  style={s.modalSearchInput}
                  value={feedbackSearch}
                  onChangeText={setFeedbackSearch}
                  placeholder="Tìm món ăn đúng..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <ScrollView style={{ maxHeight: 190, marginBottom: 12 }}>
                {allFoods
                  .filter((f) =>
                    f.name.toLowerCase().includes(feedbackSearch.toLowerCase().trim())
                  )
                  .map((f) => {
                    const selected = feedbackFood?._id === f._id;
                    return (
                      <TouchableOpacity
                        key={f._id}
                        style={[s.foodSelectItem, selected && s.foodSelectItemActive]}
                        onPress={() => setFeedbackFood({ _id: f._id, name: f.name })}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[s.foodSelectName, selected && { color: '#15803D' }]}>{f.name}</Text>
                        </View>
                        <Ionicons
                          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                          size={20}
                          color={selected ? '#15803D' : '#9CA3AF'}
                        />
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>

              <Text style={s.feedbackFieldLabel}>Ghi chú thêm (tùy chọn)</Text>
              <TextInput
                style={s.feedbackCommentInput}
                value={feedbackComment}
                onChangeText={setFeedbackComment}
                placeholder="VD: Ảnh chụp hơi tối, món bún riêu bị nhầm thành bún bò..."
                placeholderTextColor="#9CA3AF"
                maxLength={500}
                multiline
              />

              <TouchableOpacity
                style={[s.saveMealBtn, sendingFeedback && s.saveMealBtnDisabled]}
                onPress={handleSubmitFeedback}
                disabled={sendingFeedback}
                activeOpacity={0.85}
              >
                {sendingFeedback ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={s.saveMealBtnText}>Gửi góp ý cho Quản trị viên</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ================= STAGE 1: CAMERA SCREEN (Image 1) =================
  return (
    <View style={s.cameraScreen}>
      {/* Live Camera Viewfinder */}
      {permission?.granted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          onCameraReady={() => setCameraReady(true)}
          onMountError={() => setCameraReady(false)}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, s.cameraFallback]}>
          <Text style={s.cameraFallbackText}>
            {permission
              ? 'Cần cấp quyền truy cập máy ảnh'
              : 'Đang kiểm tra quyền máy ảnh...'}
          </Text>
          <TouchableOpacity
            style={s.grantPermissionBtn}
            onPress={requestPermission}
          >
            <Text style={s.grantPermissionText}>Cấp quyền máy ảnh</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Top Controls: "Đóng" & Title */}
      <View style={[s.cameraTopBar, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity
          style={s.closePillBtn}
          onPress={() => router.replace('/')}
          activeOpacity={0.8}
        >
          <Text style={s.closePillText}>Đóng</Text>
        </TouchableOpacity>

        <Text style={s.cameraHeaderTitle}>Chụp món ăn</Text>

        <View style={{ width: 64 }} />
      </View>

      {/* Center Dashed Viewfinder Frame */}
      <View style={s.viewfinderContainer} pointerEvents="none">
        <View style={s.dashedFrame}>
          <Text style={s.dashedFrameText}>
            Đặt một món vào khung, chụp chính diện, đủ sáng
          </Text>
        </View>
      </View>

      {/* Bottom Controls: "Thư viện" - Capture Button - "Lật" */}
      <View style={[s.cameraBottomBar, { paddingBottom: insets.bottom + 28 }]}>
        <TouchableOpacity
          style={s.roundDarkBtn}
          onPress={handlePickLibrary}
          activeOpacity={0.8}
        >
          <Text style={s.roundDarkBtnText}>Thư viện</Text>
        </TouchableOpacity>

        {/* Big White Capture Shutter */}
        <TouchableOpacity
          style={[s.shutterOuter, capturing && { opacity: 0.6 }]}
          onPress={handleCapture}
          disabled={capturing}
          activeOpacity={0.7}
        >
          {capturing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={s.shutterInner} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={s.roundDarkBtn}
          onPress={() => {
            setCameraReady(false);
            setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
          }}
          activeOpacity={0.8}
        >
          <Text style={s.roundDarkBtnText}>Lật</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // Camera screen styles (Image 1)
  cameraScreen: {
    flex: 1,
    backgroundColor: '#0C1C14',
    position: 'relative',
  },
  cameraFallback: {
    backgroundColor: '#0C1C14',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  cameraFallbackText: {
    color: '#D1E7DD',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  grantPermissionBtn: {
    backgroundColor: '#1E5338',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  grantPermissionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cameraTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    zIndex: 10,
    elevation: 10,
  },
  closePillBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(25, 40, 32, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  closePillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cameraHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  viewfinderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  dashedFrame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#86EFAC',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  dashedFrameText: {
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '600',
    opacity: 0.95,
  },
  cameraBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    zIndex: 10,
    elevation: 10,
  },
  roundDarkBtn: {
    width: 82,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(25, 40, 32, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  roundDarkBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#4ADE80',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
  },

  // Analyzing stage
  analyzingScreen: {
    flex: 1,
    backgroundColor: '#0C1C14',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  analyzingBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzingPreview: {
    width: 180,
    height: 180,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#4ADE80',
  },
  analyzingTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 20,
  },
  aiStepsList: {
    marginTop: 14,
    gap: 6,
  },
  aiStepItem: {
    color: '#A7F3D0',
    fontSize: 13,
    fontWeight: '500',
  },

  // Result screen styles (Image 2)
  resultScreen: {
    flex: 1,
    backgroundColor: '#F5F7F3',
  },
  scrollView: {
    flex: 1,
  },
  resultContent: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backRoundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resultHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#14261C',
  },
  imagePreviewWrap: {
    width: '100%',
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#E2E8DF',
    marginBottom: 14,
  },
  capturedImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },

  // Detection badge
  detectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 16,
    padding: 12,
    gap: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  detectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectionBadgeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#14532D',
  },
  detectionBadgeSub: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
  },
  bowlSelectorRow: {
    marginBottom: 14,
  },
  bowlSelectorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  bowlTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  bowlTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  bowlTabPillActive: {
    backgroundColor: '#1E5338',
    borderColor: '#1E5338',
  },
  bowlTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#15803D',
  },
  bowlTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  sectionBlock: {
    marginBottom: 16,
  },
  sectionHeaderLabel: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
    marginBottom: 8,
  },
  candidatePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  candidatePill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  candidatePillActive: {
    backgroundColor: '#1E5338',
    borderColor: '#1E5338',
  },
  candidatePillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  candidatePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dishActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  otherDishBtn: {
    paddingVertical: 4,
  },
  otherDishText: {
    fontSize: 13,
    color: '#1E5338',
    fontWeight: '700',
  },
  reportFeedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  reportFeedbackBtnSent: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  reportFeedbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  reportFeedbackTextSent: {
    color: '#15803D',
  },
  feedbackSubLabel: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 8,
  },
  feedbackFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  foodSelectItemActive: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  feedbackCommentInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
    minHeight: 64,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  portionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  aiBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  portionPillsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  portionPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  portionPillActive: {
    backgroundColor: '#1E5338',
    borderColor: '#1E5338',
  },
  portionPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  portionPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  portionSubAi: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  portionSubAiActive: {
    color: '#D1FAE5',
  },
  portionAiNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  portionAiNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#15803D',
    lineHeight: 16,
  },
  nutritionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 18,
  },
  nutritionCol: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#14261C',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  mealTypePill: {
    flex: 1,
    height: 44,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  mealTypePillActive: {
    backgroundColor: '#1E5338',
    borderColor: '#1E5338',
  },
  mealTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  mealTypeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  saveMealBtn: {
    height: 52,
    borderRadius: 20,
    backgroundColor: '#1E5338',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#1E5338',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  saveMealBtnDisabled: {
    opacity: 0.7,
  },
  saveMealBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#14261C',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  foodSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  foodSelectName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  foodSelectCal: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});

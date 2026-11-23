import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL, COLORS } from '@/constants';
import { api } from '@/utils/api';
import BottomNav from '@/components/ui/BottomNav';

interface FoodItem {
  _id: string;
  classId?: string;
  className?: string;
  name?: string;
  displayName?: string;
  category?: string;
  servingGram?: number;
  imageUrl?: string;
  nutritionPer100g: {
    kcal: number;
    protein: number;
    carb: number;
    fat: number;
  };
}

const FILTER_CHIPS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'com', label: 'Cơm' },
  { key: 'bun_pho', label: 'Bún & Phở' },
  { key: 'banh', label: 'Bánh' },
  { key: 'other', label: 'Khác' },
];

function toSlug(name?: string): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const BASE_HOST = API_URL.replace(/\/api\/?$/, '');

function getFoodExtraInfo(name: string) {
  const n = name.toLowerCase();
  if (n.includes('phở') || n.includes('bún') || n.includes('hủ tiếu') || n.includes('cao lầu') || n.includes('bánh canh')) {
    return {
      ingredients: 'Sợi bún/phở/mì, thịt (bò, heo hoặc hải sản), nước dùng hầm xương, hành ngò và rau sống.',
      cooking: 'Hầm xương lấy nước dùng ngọt thanh, nêm gia vị vừa ăn rồi chan nóng lên sợi và topping.',
      mealTime: 'Buổi sáng hoặc buổi trưa (nạp năng lượng tốt, dễ tiêu hóa).',
    };
  }
  if (n.includes('cơm')) {
    return {
      ingredients: 'Gạo trắng/gạo tấm, thịt (sườn nướng, gà hoặc cá), trứng, đồ chua và rau sống.',
      cooking: 'Nấu cơm chín dẻo, ướp thịt với gia vị rồi nướng/chiên áp chảo, ăn kèm nước mắm pha.',
      mealTime: 'Buổi trưa (cung cấp đủ tinh bột và đạm cho hoạt động cả ngày).',
    };
  }
  if (n.includes('canh') || n.includes('cá kho')) {
    return {
      ingredients: 'Cá tươi, cà chua, thơm (dứa), bạc hà, đậu bắp, me chua và rau thơm.',
      cooking: 'Nấu sôi nước với me, cho cá và rau củ vào nấu chín tới, nêm nước mắm và hành ngò.',
      mealTime: 'Buổi trưa hoặc buổi tối (thanh mát, nhẹ bụng, dễ tiêu).',
    };
  }
  if (n.includes('bánh mì') || n.includes('bánh bao') || n.includes('xôi')) {
    return {
      ingredients: 'Bột mì/gạo nếp, nhân thịt, chả, pate, trứng, đồ chua và rau mùi.',
      cooking: 'Nướng giòn hoặc hấp chín phần vỏ, kẹp/nhân cùng thịt và nước sốt đậm đà.',
      mealTime: 'Buổi sáng (nhanh gọn, giàu năng lượng cho ngày mới).',
    };
  }
  if (n.includes('bánh')) {
    return {
      ingredients: 'Bột gạo/bột năng, tôm thịt, đậu xanh, hành phi và nước mắm chấm.',
      cooking: 'Pha bột mịn, hấp hoặc nướng chín cùng phần nhân rồi thưởng thức với nước mắm chua ngọt.',
      mealTime: 'Buổi sáng hoặc bữa phụ chiều.',
    };
  }
  return {
    ingredients: 'Nguyên liệu tươi tự nhiên, thịt/cá, rau củ và gia vị truyền thống Việt Nam.',
    cooking: 'Sơ chế sạch, ướp gia vị vừa ăn rồi chế biến chín tới để giữ trọn dinh dưỡng.',
    mealTime: 'Buổi trưa hoặc buổi tối.',
  };
}

export default function FoodLibraryScreen() {
  const insets = useSafeAreaInsets();
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);

  // Modal thêm món ăn thủ công
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newServing, setNewServing] = useState('100');
  const [newKcal, setNewKcal] = useState('');
  const [newProtein, setNewProtein] = useState('');
  const [newCarb, setNewCarb] = useState('');
  const [newFat, setNewFat] = useState('');
  const [newImageUri, setNewImageUri] = useState<string | null>(null);

  const pickFoodImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền thư viện ảnh để chọn ảnh món ăn.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setNewImageUri(res.assets[0].uri);
    }
  };

  const handleDeleteFood = (item: FoodItem) => {
    const foodName = item.name || item.displayName || 'món ăn này';
    Alert.alert('Xóa món ăn', `Bạn có chắc muốn xóa "${foodName}" khỏi thư viện?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          setFoods((prev) => prev.filter((f) => f._id !== item._id));
          if (selectedFood?._id === item._id) setSelectedFood(null);
        },
      },
    ]);
  };

  const loadFoods = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/meals/foods');
      setFoods(Array.isArray(res.data) ? res.data : res.data?.foods ?? []);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải thư viện món ăn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFoods();
  }, []);

  const handleAddManualFood = () => {
    const name = newName.trim();
    const kcal = Number(newKcal);
    const serving = Number(newServing) || 100;

    if (!name) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên món ăn.');
      return;
    }
    if (!kcal || kcal <= 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập lượng calo hợp lệ.');
      return;
    }

    const factor = 100 / serving;
    const item: FoodItem = {
      _id: `manual-${Date.now()}`,
      classId: toSlug(name),
      name,
      servingGram: serving,
      imageUrl: newImageUri || undefined,
      nutritionPer100g: {
        kcal: Math.round(kcal * factor),
        protein: Number(((Number(newProtein) || 0) * factor).toFixed(1)),
        carb: Number(((Number(newCarb) || 0) * factor).toFixed(1)),
        fat: Number(((Number(newFat) || 0) * factor).toFixed(1)),
      },
    };

    setFoods((prev) => [item, ...prev]);
    setNewName('');
    setNewServing('100');
    setNewKcal('');
    setNewProtein('');
    setNewCarb('');
    setNewFat('');
    setNewImageUri(null);
    setModalVisible(false);
  };

  const filteredFoods = useMemo(() => {
    const q = search.trim().toLowerCase();
    return foods.filter((item) => {
      const name = (item.name || item.displayName || '').toLowerCase();
      const matchSearch = !q || name.includes(q);
      if (!matchSearch) return false;

      if (selectedTag === 'all') return true;
      if (selectedTag === 'com') return name.includes('cơm');
      if (selectedTag === 'bun_pho')
        return name.includes('bún') || name.includes('phở') || name.includes('mì') || name.includes('hủ tiếu');
      if (selectedTag === 'banh') return name.includes('bánh');
      return (
        !name.includes('cơm') &&
        !name.includes('bún') &&
        !name.includes('phở') &&
        !name.includes('mì') &&
        !name.includes('hủ tiếu') &&
        !name.includes('bánh')
      );
    });
  }, [foods, search, selectedTag]);

  const renderFoodItem = ({ item }: { item: FoodItem }) => {
    const foodName = item.name || item.displayName || item.classId || 'Món ăn';
    const kcal100 = Math.round(item.nutritionPer100g?.kcal || 0);
    const imgKey = item._id || item.classId || foodName;
    const imgUri = item.imageUrl || `${BASE_HOST}/food-images/${toSlug(foodName)}.jpg?v=3`;
    const hasImgError = failedImages[imgKey];

    return (
      <TouchableOpacity
        style={s.gridCard}
        activeOpacity={0.85}
        onPress={() => setSelectedFood(item)}
      >
        <View style={s.imageBox}>
          {!hasImgError ? (
            <Image
              source={{ uri: imgUri }}
              style={s.foodImage}
              onError={() => setFailedImages((prev) => ({ ...prev, [imgKey]: true }))}
            />
          ) : (
            <View style={s.fallbackBox}>
              <Ionicons name="restaurant-outline" size={32} color={COLORS.primary} />
              <Text style={s.fallbackName} numberOfLines={2}>
                {foodName}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={s.deleteCardBtn}
            onPress={() => handleDeleteFood(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={14} color="#DC2626" />
          </TouchableOpacity>
        </View>

        <Text style={s.gridFoodName} numberOfLines={1}>
          {foodName}
        </Text>

        <View style={s.gridFooter}>
          <View>
            <Text style={s.gridKcalValue}>{kcal100}</Text>
            <Text style={s.gridKcalUnit}>kcal/100g</Text>
          </View>
          <TouchableOpacity
            style={s.viewBtn}
            onPress={() => setSelectedFood(item)}
            activeOpacity={0.8}
          >
            <Text style={s.viewBtnText}>Xem</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Thư viện món ăn</Text>
        <Text style={s.headerSub}>{foods.length} món ăn Việt Nam</Text>
      </View>

      {/* Search Bar */}
      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={18} color={COLORS.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Tìm món ăn (vd: Phở bò, Cơm tấm)..."
          placeholderTextColor={COLORS.placeholder}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <View style={s.chipsWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_CHIPS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={s.chipsList}
          renderItem={({ item }) => {
            const active = selectedTag === item.key;
            return (
              <TouchableOpacity
                style={[s.chip, active && s.chipActive]}
                onPress={() => setSelectedTag(item.key)}
                activeOpacity={0.8}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Content */}
      {loading ? (
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.statusText}>Đang tải thư viện món...</Text>
        </View>
      ) : error ? (
        <View style={s.centerBox}>
          <Ionicons name="alert-circle-outline" size={40} color={COLORS.error} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadFoods}>
            <Text style={s.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredFoods}
          numColumns={2}
          keyExtractor={(item) => item._id || item.classId || String(Math.random())}
          renderItem={renderFoodItem}
          columnWrapperStyle={s.columnWrap}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="fast-food-outline" size={40} color={COLORS.muted} />
              <Text style={s.statusText}>Không tìm thấy món ăn phù hợp</Text>
            </View>
          }
          ListFooterComponent={
            <TouchableOpacity
              style={s.addManualBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text style={s.addManualText}>Thêm món ăn thủ công</Text>
            </TouchableOpacity>
          }
        />
      )}

      {/* Modal chi tiết món ăn */}
      <Modal
        visible={!!selectedFood}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedFood(null)}
      >
        <View style={s.detailOverlay}>
          <View style={s.detailCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {selectedFood?.name || selectedFood?.displayName || 'Chi tiết món ăn'}
              </Text>
              <TouchableOpacity onPress={() => setSelectedFood(null)}>
                <Ionicons name="close" size={22} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
            <Text style={s.detailSub}>Giá trị dinh dưỡng trên 100g:</Text>
            <View style={s.detailGrid}>
              <View style={s.detailBox}>
                <Text style={s.detailVal}>{Math.round(selectedFood?.nutritionPer100g?.kcal || 0)}</Text>
                <Text style={s.detailLbl}>kcal</Text>
              </View>
              <View style={s.detailBox}>
                <Text style={s.detailVal}>{selectedFood?.nutritionPer100g?.protein || 0}g</Text>
                <Text style={s.detailLbl}>Đạm</Text>
              </View>
              <View style={s.detailBox}>
                <Text style={s.detailVal}>{selectedFood?.nutritionPer100g?.carb || 0}g</Text>
                <Text style={s.detailLbl}>Carb</Text>
              </View>
              <View style={s.detailBox}>
                <Text style={s.detailVal}>{selectedFood?.nutritionPer100g?.fat || 0}g</Text>
                <Text style={s.detailLbl}>Béo</Text>
              </View>
            </View>

            {(() => {
              const extra = getFoodExtraInfo(selectedFood?.name || selectedFood?.displayName || '');
              return (
                <View style={s.extraInfoBox}>
                  <View style={s.extraRow}>
                    <Text style={s.extraEmoji}>🥗</Text>
                    <View style={s.extraTextWrap}>
                      <Text style={s.extraLabel}>Thành phần chính</Text>
                      <Text style={s.extraValue}>{extra.ingredients}</Text>
                    </View>
                  </View>
                  <View style={s.extraRow}>
                    <Text style={s.extraEmoji}>🍳</Text>
                    <View style={s.extraTextWrap}>
                      <Text style={s.extraLabel}>Cách nấu ngắn gọn</Text>
                      <Text style={s.extraValue}>{extra.cooking}</Text>
                    </View>
                  </View>
                  <View style={s.extraRow}>
                    <Text style={s.extraEmoji}>⏰</Text>
                    <View style={s.extraTextWrap}>
                      <Text style={s.extraLabel}>Nên ăn vào buổi nào</Text>
                      <Text style={s.extraValue}>{extra.mealTime}</Text>
                    </View>
                  </View>
                </View>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Modal thêm món ăn thủ công */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Thêm món ăn thủ công</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <Text style={s.inputLabel}>Hình ảnh món ăn (tùy chọn)</Text>
            <TouchableOpacity style={s.imagePickerBtn} onPress={pickFoodImage} activeOpacity={0.8}>
              {newImageUri ? (
                <Image source={{ uri: newImageUri }} style={s.previewImg} />
              ) : (
                <View style={s.imagePickerPlaceholder}>
                  <Ionicons name="image-outline" size={22} color={COLORS.primary} />
                  <Text style={s.imagePickerText}>Chọn ảnh từ thư viện</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={s.inputLabel}>Tên món ăn *</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Ví dụ: Cơm gà xối mỡ"
              placeholderTextColor={COLORS.placeholder}
              value={newName}
              onChangeText={setNewName}
            />

            <View style={s.rowInputs}>
              <View style={s.halfInput}>
                <Text style={s.inputLabel}>Khẩu phần (g)</Text>
                <TextInput
                  style={s.modalInput}
                  keyboardType="numeric"
                  placeholder="100"
                  placeholderTextColor={COLORS.placeholder}
                  value={newServing}
                  onChangeText={setNewServing}
                />
              </View>
              <View style={s.halfInput}>
                <Text style={s.inputLabel}>Calo (kcal) *</Text>
                <TextInput
                  style={s.modalInput}
                  keyboardType="numeric"
                  placeholder="450"
                  placeholderTextColor={COLORS.placeholder}
                  value={newKcal}
                  onChangeText={setNewKcal}
                />
              </View>
            </View>

            <View style={s.rowInputs}>
              <View style={s.thirdInput}>
                <Text style={s.inputLabel}>Đạm (g)</Text>
                <TextInput
                  style={s.modalInput}
                  keyboardType="numeric"
                  placeholder="20"
                  placeholderTextColor={COLORS.placeholder}
                  value={newProtein}
                  onChangeText={setNewProtein}
                />
              </View>
              <View style={s.thirdInput}>
                <Text style={s.inputLabel}>Carb (g)</Text>
                <TextInput
                  style={s.modalInput}
                  keyboardType="numeric"
                  placeholder="55"
                  placeholderTextColor={COLORS.placeholder}
                  value={newCarb}
                  onChangeText={setNewCarb}
                />
              </View>
              <View style={s.thirdInput}>
                <Text style={s.inputLabel}>Béo (g)</Text>
                <TextInput
                  style={s.modalInput}
                  keyboardType="numeric"
                  placeholder="15"
                  placeholderTextColor={COLORS.placeholder}
                  value={newFat}
                  onChangeText={setNewFat}
                />
              </View>
            </View>

            <TouchableOpacity style={s.saveBtn} onPress={handleAddManualFood} activeOpacity={0.85}>
              <Text style={s.saveBtnText}>Lưu vào thư viện</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomNav activeTab="library" />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.ink,
  },
  headerSub: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.ink,
  },
  chipsWrapper: {
    marginTop: 12,
    marginBottom: 8,
  },
  chipsList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 110,
    gap: 12,
  },
  columnWrap: {
    justifyContent: 'space-between',
    gap: 12,
  },
  gridCard: {
    flex: 1,
    maxWidth: '48.5%',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imageBox: {
    width: '100%',
    height: 115,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    overflow: 'hidden',
    marginBottom: 8,
    position: 'relative',
  },
  deleteCardBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerBtn: {
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  imagePickerPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imagePickerText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  previewImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  foodImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  fallbackBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  fallbackName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryDark,
    textAlign: 'center',
  },
  gridFoodName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 6,
  },
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  gridKcalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  gridKcalUnit: {
    fontSize: 11,
    color: COLORS.muted,
  },
  viewBtn: {
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  addManualBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
  },
  addManualText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  detailCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
  },
  detailSub: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 12,
  },
  detailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailBox: {
    flex: 1,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  detailVal: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  detailLbl: {
    fontSize: 11,
    color: COLORS.primaryDark,
    marginTop: 2,
  },
  extraInfoBox: {
    marginTop: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  extraEmoji: {
    fontSize: 20,
    lineHeight: 24,
  },
  extraTextWrap: {
    flex: 1,
  },
  extraLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
  },
  extraValue: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 17,
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: COLORS.ink,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  thirdInput: {
    flex: 1,
  },
  saveBtn: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

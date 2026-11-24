import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_URL, COLORS } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { adminService } from '@/services/admin.service';
import { getErrorMessage } from '@/utils/api';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import ErrorBox from '@/components/ui/ErrorBox';

const BASE_HOST = API_URL.replace(/\/api\/?$/, '');

export default function AdminFoodFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout, refreshUser } = useAuth();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [createdFoodId, setCreatedFoodId] = useState<string | null>(id ?? null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carb, setCarb] = useState('');
  const [fat, setFat] = useState('');
  const [aiClassId, setAiClassId] = useState('');
  const [hasLockedAiClass, setHasLockedAiClass] = useState(false);
  const [ingredients, setIngredients] = useState('');
  const [cookingMethod, setCookingMethod] = useState('');
  const [mealTime, setMealTime] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const food = await adminService.getFoodById(id);
        setName(food.name || '');
        setKcal(String(food.nutritionPer100g?.kcal ?? ''));
        setProtein(String(food.nutritionPer100g?.protein ?? ''));
        setCarb(String(food.nutritionPer100g?.carb ?? ''));
        setFat(String(food.nutritionPer100g?.fat ?? ''));
        setAiClassId(food.aiClassId || '');
        setHasLockedAiClass(Boolean(food.aiClassId));
        setIngredients(food.ingredients || '');
        setCookingMethod(food.cookingMethod || '');
        setMealTime(food.mealTime || '');
        setExistingImageUrl(food.imageUrl || null);
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền thư viện ảnh.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setImageUri(res.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      let targetId = createdFoodId;

      if (!targetId) {
        const created = await adminService.createFood({
          name: name.trim(),
          aiClassId: aiClassId.trim() || undefined,
          ingredients: ingredients.trim() || undefined,
          cookingMethod: cookingMethod.trim() || undefined,
          mealTime: mealTime.trim() || undefined,
          nutritionPer100g: {
            kcal: Number(kcal),
            protein: protein ? Number(protein) : 0,
            carb: carb ? Number(carb) : 0,
            fat: fat ? Number(fat) : 0,
          },
        });
        targetId = created._id;
        setCreatedFoodId(targetId);
      } else if (isEdit) {
        await adminService.updateFood(targetId, {
          name: name.trim(),
          ...(hasLockedAiClass ? {} : { aiClassId: aiClassId.trim() || undefined }),
          ingredients: ingredients.trim() || undefined,
          cookingMethod: cookingMethod.trim() || undefined,
          mealTime: mealTime.trim() || undefined,
          nutritionPer100g: {
            kcal: Number(kcal),
            protein: protein ? Number(protein) : 0,
            carb: carb ? Number(carb) : 0,
            fat: fat ? Number(fat) : 0,
          },
        });
      }

      if (imageUri && targetId) {
        try {
          await adminService.uploadFoodImage(targetId, imageUri);
        } catch (imgErr) {
          setError(
            `Món ăn đã được lưu, nhưng tải ảnh thất bại: ${getErrorMessage(imgErr)}. Bạn có thể bấm Lưu lại để thử tải ảnh.`
          );
          setSubmitting(false);
          return;
        }
      }

      Alert.alert('Thành công', isEdit ? 'Đã cập nhật món ăn' : 'Đã thêm món ăn mới', [
        { text: 'OK', onPress: () => router.replace('/admin/foods' as Href) },
      ]);
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
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const previewUri =
    imageUri ||
    (existingImageUrl?.startsWith('http')
      ? existingImageUrl
      : existingImageUrl
      ? `${BASE_HOST}${existingImageUrl}`
      : null);

  return (
    <KeyboardAvoidingView
      style={[s.container, { paddingTop: insets.top + 10 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin/foods' as Href))}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={s.title}>{isEdit ? 'Sửa món ăn' : 'Thêm món ăn'}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {error && (
          <View style={{ marginBottom: 12 }}>
            <ErrorBox message={error} />
          </View>
        )}

        <TouchableOpacity style={s.imageBox} onPress={pickImage} activeOpacity={0.8}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={s.previewImg} />
          ) : (
            <View style={s.imagePlaceholder}>
              <Ionicons name="image-outline" size={26} color={COLORS.primary} />
              <Text style={s.imageText}>Chọn ảnh món ăn (tùy chọn)</Text>
            </View>
          )}
        </TouchableOpacity>

        <Field label="Tên món ăn *" icon="restaurant-outline" value={name} onChangeText={setName} placeholder="VD: Cơm gà xối mỡ" />
        <Field
          label="Calo (kcal / 100g) *"
          icon="flame-outline"
          value={kcal}
          onChangeText={setKcal}
          keyboardType="numeric"
          placeholder="VD: 180"
        />
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Field label="Đạm (g)" icon="nutrition-outline" value={protein} onChangeText={setProtein} keyboardType="numeric" placeholder="0" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Carb (g)" icon="leaf-outline" value={carb} onChangeText={setCarb} keyboardType="numeric" placeholder="0" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Béo (g)" icon="water-outline" value={fat} onChangeText={setFat} keyboardType="numeric" placeholder="0" />
          </View>
        </View>

        <Field
          label={hasLockedAiClass ? 'Lớp AI (không thể đổi)' : 'Lớp AI (30 lớp, tùy chọn)'}
          icon="sparkles-outline"
          value={aiClassId}
          onChangeText={setAiClassId}
          editable={!hasLockedAiClass}
          placeholder="VD: pho, bun_bo_hue..."
        />
        <Field label="Thành phần" icon="list-outline" value={ingredients} onChangeText={setIngredients} placeholder="VD: Gạo, thịt gà..." />
        <Field label="Cách nấu" icon="bonfire-outline" value={cookingMethod} onChangeText={setCookingMethod} placeholder="VD: Luộc, chiên..." />
        <Field label="Buổi ăn phù hợp" icon="time-outline" value={mealTime} onChangeText={setMealTime} placeholder="VD: Buổi trưa" />

        <Button
          title={submitting ? 'Đang lưu...' : createdFoodId && !isEdit ? 'Thử tải lại ảnh' : 'Lưu món ăn'}
          onPress={handleSubmit}
          loading={submitting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
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
  scroll: { paddingBottom: 32, gap: 10 },
  imageBox: {
    height: 130,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholder: { alignItems: 'center', gap: 6 },
  imageText: { fontSize: 13, fontWeight: '600', color: COLORS.primaryDark },
  previewImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  row: { flexDirection: 'row', gap: 8 },
});

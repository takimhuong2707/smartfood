import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants';

export default function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View style={s.box} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={18} color={COLORS.error} />
      <Text style={s.text}>{message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.errorBg,
  },
  text: { flex: 1, fontSize: 14, color: COLORS.error },
});
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { COLORS } from '@/constants';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'outline';
};

export default function Button({ title, onPress, loading, variant = 'primary' }: Props) {
  const outline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.btn,
        outline ? s.outline : s.primary,
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        loading && { opacity: 0.7 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={outline ? COLORS.primary : '#fff'} />
      ) : (
        <Text style={[s.text, outline && { color: COLORS.primary }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primary: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  outline: { backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.primary },
  text: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
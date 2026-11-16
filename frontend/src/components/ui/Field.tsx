import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants';

type Props = TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  invalid?: boolean;
};

export default function Field({ label, icon, invalid, secureTextEntry, onFocus, onBlur, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isPassword = Boolean(secureTextEntry);

  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.box, focused && s.boxFocus, invalid && s.boxInvalid]}>
        <Ionicons name={icon} size={20} color={focused ? COLORS.primary : COLORS.muted} />
        <TextInput
          style={s.input}
          placeholderTextColor={COLORS.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
          secureTextEntry={isPassword && hidden}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {isPassword && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Hiện mật khẩu' : 'Ẩn mật khẩu'}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={COLORS.muted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#FAFBF8',
  },
  boxFocus: { borderColor: COLORS.primary, backgroundColor: COLORS.card },
  boxInvalid: { borderColor: COLORS.error },
  input: { flex: 1, fontSize: 16, color: COLORS.ink, paddingVertical: 0 },
});
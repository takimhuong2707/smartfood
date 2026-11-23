import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants';

type Props = { title: string; subtitle: string; children: ReactNode };

export default function AuthLayout({ title, subtitle, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.hero, { paddingTop: insets.top + 32 }]}
        >
          <View style={s.logo}>
            <Ionicons name="restaurant" size={34} color={COLORS.primary} />
          </View>
          <Text style={s.brand}>SmartFood</Text>
          <Text style={s.tagline}>Chụp món ăn, biết ngay calo và dinh dưỡng</Text>
        </LinearGradient>

        <View style={[s.card, { marginBottom: insets.bottom + 24 }]}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.subtitle}>{subtitle}</Text>
          <View style={{ gap: 16, marginTop: 20 }}>{children}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingBottom: 72,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  brand: { fontSize: 26, fontWeight: '800', color: '#fff' },
  tagline: { marginTop: 6, fontSize: 14, color: '#D7EBDD', textAlign: 'center' },
  card: {
    marginTop: -40,
    marginHorizontal: 20,
    padding: 22,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    shadowColor: '#1B2A22',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.ink },
  subtitle: { marginTop: 4, fontSize: 14, color: COLORS.muted },
});
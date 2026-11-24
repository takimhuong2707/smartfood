import type { ReactNode } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants';

const LOGO_IMG = require('../../../assets/images/smartfood-logo.png');

type Props = { title: string; subtitle: string; children: ReactNode };

export default function AuthLayout({ title, subtitle, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <View style={[s.hero, { paddingTop: insets.top + 14 }]}>
            <Image source={LOGO_IMG} style={s.logoImg} resizeMode="contain" />
          </View>

          <View style={s.card}>
            <Text style={s.title}>{title}</Text>
            <Text style={s.subtitle}>{subtitle}</Text>
            <View style={{ gap: 16, marginTop: 20 }}>{children}</View>
          </View>
        </View>

        <View style={[s.copyrightWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text style={s.copyrightText}>
            ©Bản quyền thuộc về Nguyễn Thị Diễm Quỳnh & Tạ Kim Hương
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  hero: {
    alignItems: 'center',
    backgroundColor: '#324A3C',
    paddingBottom: 48,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  logoImg: {
    width: 210,
    height: 210,
  },
  card: {
    marginTop: -34,
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
  copyrightWrap: {
    marginTop: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  copyrightText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});

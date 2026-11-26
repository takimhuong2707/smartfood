import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, StyleSheet, Text, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider } from '@/components/providers/AuthProvider';
import FloatingChatbot from '@/components/ui/FloatingChatbot';
import { useAuth } from '@/hooks/useAuth';

const LOGO_IMG = require('../../assets/images/smartfood-logo.png');

function IntroSplashScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <View style={s.splashScreen}>
      <StatusBar style="light" />
      <View style={s.splashCenter}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            alignItems: 'center',
          }}
        >
          <Image source={LOGO_IMG} style={s.splashLogo} resizeMode="contain" />
          <ActivityIndicator size="small" color="#F7CE3A" style={{ marginTop: 14 }} />
        </Animated.View>
      </View>

      <View style={[s.copyrightFooter, { paddingBottom: Math.max(insets.bottom, 18) }]}>
        <Text style={s.copyrightText}>
          ©Bản quyền thuộc về Nguyễn Thị Diễm Quỳnh & Tạ Kim Hương
        </Text>
      </View>
    </View>
  );
}

function Guard() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [minIntroDone, setMinIntroDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinIntroDone(true), 1600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading || !minIntroDone) return;
    const first = segments[0] as string | undefined;
    const inAuth = first === 'login' || first === 'register';
    if (!user && !inAuth) router.replace('/login');
    else if (user && inAuth) router.replace('/');
  }, [user, loading, minIntroDone, segments, router]);

  if (loading || !minIntroDone) {
    return <IntroSplashScreen />;
  }

  const first = segments[0] as string | undefined;
  const hideChatbot =
    !user ||
    first === 'login' ||
    first === 'register' ||
    first === 'chatbot' ||
    first === 'scan' ||
    first === 'admin';

  return (
    <View style={{ flex: 1 }}>
      <Slot />
      {!hideChatbot && <FloatingChatbot />}
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Guard />
    </AuthProvider>
  );
}

const s = StyleSheet.create({
  splashScreen: {
    flex: 1,
    backgroundColor: '#324A3C',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splashCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  splashLogo: {
    width: 300,
    height: 300,
  },
  copyrightFooter: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  copyrightText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.82)',
    textAlign: 'center',
    fontWeight: '500',
  },
});

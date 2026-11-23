import React, { useRef } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants';

const BTN_SIZE = 54;
const MARGIN = 16;

export default function FloatingChatbot() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = Dimensions.get('window');

  const minX = MARGIN;
  const maxX = screenW - BTN_SIZE - MARGIN;
  const minY = Math.max(insets.top + 12, 56);
  const maxY = screenH - BTN_SIZE - Math.max(insets.bottom + 84, 100);

  const pos = useRef(new Animated.ValueXY({ x: maxX, y: maxY })).current;
  const currentPos = useRef({ x: maxX, y: maxY });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pos.setOffset({ x: currentPos.current.x, y: currentPos.current.y });
        pos.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => {
        pos.flattenOffset();

        // Nếu chỉ chạm nhẹ (không kéo), mở màn hình Chatbot
        if (Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6) {
          router.push('/chatbot' as any);
          return;
        }

        const rawX = currentPos.current.x + gesture.dx;
        const rawY = currentPos.current.y + gesture.dy;

        // Giữ nút trong vùng an toàn của màn hình, thả đâu đứng đó
        const clampedX = Math.max(minX, Math.min(rawX, maxX));
        const clampedY = Math.max(minY, Math.min(rawY, maxY));

        currentPos.current = { x: clampedX, y: clampedY };
        Animated.spring(pos, {
          toValue: { x: clampedX, y: clampedY },
          useNativeDriver: false,
          friction: 7,
          tension: 60,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        s.wrapper,
        {
          transform: pos.getTranslateTransform(),
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={s.button}
        activeOpacity={0.9}
        onPress={() => router.push('/chatbot' as any)}
      >
        <Ionicons name="chatbubble-ellipses" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 999,
  },
  button: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
});

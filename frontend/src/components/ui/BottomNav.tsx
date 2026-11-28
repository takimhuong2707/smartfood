import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants';

type TabType = 'home' | 'stats' | 'camera' | 'library' | 'profile' | 'chat';

interface BottomNavProps {
  activeTab: TabType;
  onCameraPress?: () => void;
}

export default function BottomNav({ activeTab, onCameraPress }: BottomNavProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleTabPress = (tab: TabType) => {
    if (tab === 'home') {
      router.replace('/');
    } else if (tab === 'stats') {
      router.replace('/stats' as any);
    } else if (tab === 'library') {
      router.replace('/foods' as any);
    } else if (tab === 'profile') {
      router.replace('/profile' as any);
    } else if (tab === 'camera') {
      if (onCameraPress) onCameraPress();
      else router.push('/scan' as any);
    }
  };

  return (
    <View style={[s.container, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <TouchableOpacity
        style={s.tab}
        activeOpacity={0.7}
        onPress={() => handleTabPress('home')}
      >
        <Ionicons
          name={activeTab === 'home' ? 'home' : 'home-outline'}
          size={22}
          color={activeTab === 'home' ? COLORS.primary : COLORS.muted}
        />
        <Text style={[s.label, activeTab === 'home' && s.labelActive]}>Hôm nay</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={s.tab}
        activeOpacity={0.7}
        onPress={() => handleTabPress('stats')}
      >
        <Ionicons
          name={activeTab === 'stats' ? 'stats-chart' : 'stats-chart-outline'}
          size={22}
          color={activeTab === 'stats' ? COLORS.primary : COLORS.muted}
        />
        <Text style={[s.label, activeTab === 'stats' && s.labelActive]}>Thống kê</Text>
      </TouchableOpacity>

      {/* Floating Camera Button */}
      <View style={s.centerButtonWrapper}>
        <TouchableOpacity
          style={s.cameraButton}
          activeOpacity={0.85}
          onPress={() => handleTabPress('camera')}
        >
          <Ionicons name="camera" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={s.tab}
        activeOpacity={0.7}
        onPress={() => handleTabPress('library')}
      >
        <Ionicons
          name={activeTab === 'library' ? 'book' : 'book-outline'}
          size={22}
          color={activeTab === 'library' ? COLORS.primary : COLORS.muted}
        />
        <Text style={[s.label, activeTab === 'library' && s.labelActive]}>Thư viện</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={s.tab}
        activeOpacity={0.7}
        onPress={() => handleTabPress('profile')}
      >
        <Ionicons
          name={activeTab === 'profile' ? 'person' : 'person-outline'}
          size={22}
          color={activeTab === 'profile' ? COLORS.primary : COLORS.muted}
        />
        <Text style={[s.label, activeTab === 'profile' && s.labelActive]}>Hồ sơ</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#ECEFEA',
    paddingTop: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  centerButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
  },
  cameraButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#1F5C39',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    elevation: 6,
    shadowColor: '#1F5C39',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
});

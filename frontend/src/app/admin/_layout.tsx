import { ActivityIndicator, View } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { COLORS } from '@/constants';

export default function AdminLayout() {
  const { isAdmin, loading } = useIsAdmin();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!isAdmin) {
    return <Redirect href="/" />;
  }

  return <Slot />;
}

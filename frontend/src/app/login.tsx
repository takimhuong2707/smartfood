import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/api';
import { COLORS } from '@/constants';
import AuthLayout from '@/components/ui/AuthLayout';
import Field from '@/components/ui/Field';
import Button from '@/components/ui/Button';
import ErrorBox from '@/components/ui/ErrorBox';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !password) return setError('Vui lòng nhập email và mật khẩu');
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password); // thành công thì Guard tự chuyển màn hình
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Chào mừng trở lại" subtitle="Đăng nhập để tiếp tục theo dõi dinh dưỡng">
      <Field
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        placeholder="ban@email.com"
        keyboardType="email-address"
        autoComplete="email"
        returnKeyType="next"
      />
      <Field
        label="Mật khẩu"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        placeholder="Nhập mật khẩu"
        secureTextEntry
        autoComplete="password"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />
      <ErrorBox message={error} />
      <Button title="Đăng nhập" onPress={onSubmit} loading={loading} />

      <View style={s.footer}>
        <Text style={s.footerText}>Chưa có tài khoản? </Text>
        <Link href="/register" style={s.link}>Đăng ký ngay</Link>
      </View>
    </AuthLayout>
  );
}

const s = StyleSheet.create({
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  footerText: { color: COLORS.muted, fontSize: 14 },
  link: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
});
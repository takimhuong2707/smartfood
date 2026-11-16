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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;

  const onSubmit = async () => {
    if (!fullName.trim()) return setError('Vui lòng nhập họ tên');
    if (!EMAIL_RE.test(email.trim())) return setError('Email không hợp lệ');
    if (password.length < 6) return setError('Mật khẩu tối thiểu 6 ký tự');
    if (password !== confirm) return setError('Mật khẩu nhập lại không khớp');
    setError('');
    setLoading(true);
    try {
      await register(fullName.trim(), email.trim(), password);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Tạo tài khoản" subtitle="Chỉ mất một phút để bắt đầu">
      <Field
        label="Họ tên"
        icon="person-outline"
        value={fullName}
        onChangeText={setFullName}
        placeholder="Nguyễn Văn A"
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="next"
      />
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
        placeholder="Tối thiểu 6 ký tự"
        secureTextEntry
        autoComplete="new-password"
        returnKeyType="next"
      />
      <Field
        label="Nhập lại mật khẩu"
        icon="shield-checkmark-outline"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Nhập lại mật khẩu"
        secureTextEntry
        autoComplete="new-password"
        invalid={mismatch}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />
      {mismatch && <Text style={s.hint}>Mật khẩu nhập lại chưa khớp</Text>}
      <ErrorBox message={error} />
      <Button title="Đăng ký" onPress={onSubmit} loading={loading} />

      <View style={s.footer}>
        <Text style={s.footerText}>Đã có tài khoản? </Text>
        <Link href="/login" style={s.link}>Đăng nhập</Link>
      </View>
    </AuthLayout>
  );
}

const s = StyleSheet.create({
  hint: { color: COLORS.error, fontSize: 13, marginTop: -8 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  footerText: { color: COLORS.muted, fontSize: 14 },
  link: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
});
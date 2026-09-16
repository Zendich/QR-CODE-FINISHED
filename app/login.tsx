import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { signIn } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: authError } = await signIn(email.trim(), password);
      if (authError) {
        setError(authError.message);
      } else if (!data.session) {
        setError('Sign-in did not create a session. Confirm your email and try again.');
      } else {
        router.replace('/(tabs)');
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Sign in to manage your attendance.</Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={COLORS.textSecondary}
        style={styles.input}
        value={email}
      />
      <TextInput
        autoCapitalize="none"
        autoComplete="password"
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={COLORS.textSecondary}
        secureTextEntry
        style={styles.input}
        value={password}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : (
        <AppButton icon="log-in-outline" onPress={handleLogin} theme="primary" title="Sign In" />
      )}
      <Link href="/register" style={styles.link}>Don't have an account? Sign Up</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: COLORS.background },
  title: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '700', textAlign: 'left', letterSpacing: 0.2 },
  subtitle: { color: COLORS.textSecondary, fontSize: 15, marginBottom: 28, marginTop: 8, textAlign: 'left', lineHeight: 21 },
  input: { backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 10, borderWidth: 1, color: COLORS.textPrimary, fontSize: 16, marginBottom: 12, padding: 15 },
  error: { color: COLORS.danger, marginBottom: 12, textAlign: 'left' },
  loader: { marginVertical: 20 },
  link: { color: COLORS.primary, fontSize: 15, marginTop: 8, textAlign: 'center' },
});
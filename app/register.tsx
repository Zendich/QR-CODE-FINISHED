import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { signUp } from '@/lib/auth';
import type { Role } from '@/lib/profiles';

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError(null);
    setMessage(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await signUp(email.trim(), password, {
        full_name: fullName.trim(),
        role,
      });
      if (authError) {
        setError(authError.message);
      } else if (data.session) {
        router.replace('/(tabs)');
      } else {
        setMessage('Account created. Check your email to confirm your account, then sign in.');
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Register to start tracking attendance.</Text>
      <TextInput autoCapitalize="words" onChangeText={setFullName} placeholder="Full name" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={fullName} />
      <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="Email" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={email} />
      <TextInput autoCapitalize="none" autoComplete="new-password" onChangeText={setPassword} placeholder="Password" placeholderTextColor={COLORS.textSecondary} secureTextEntry style={styles.input} value={password} />
      <TextInput autoCapitalize="none" autoComplete="new-password" onChangeText={setConfirmation} placeholder="Confirm password" placeholderTextColor={COLORS.textSecondary} secureTextEntry style={styles.input} value={confirmation} />
      <Text style={styles.label}>I am a...</Text>
      <View style={styles.roleRow}>
        {(['student', 'teacher'] as Role[]).map((option) => (
          <Pressable key={option} onPress={() => setRole(option)} style={[styles.roleChip, role === option && styles.roleChipActive]}>
            <Text style={[styles.roleChipText, role === option && styles.roleChipTextActive]}>
              {option === 'student' ? 'Student' : 'Teacher'}
            </Text>
          </Pressable>
        ))}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {message && <Text style={styles.message}>{message}</Text>}
      {loading ? <ActivityIndicator color={COLORS.primary} style={styles.loader} /> : <AppButton icon="person-add-outline" onPress={handleRegister} theme="primary" title="Sign Up" />}
      <Link href="/login" style={styles.link}>Already have an account? Sign In</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: COLORS.background },
  title: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '700', textAlign: 'left', letterSpacing: 0.2 },
  subtitle: { color: COLORS.textSecondary, fontSize: 15, marginBottom: 28, marginTop: 8, textAlign: 'left', lineHeight: 21 },
  input: { backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 10, borderWidth: 1, color: COLORS.textPrimary, fontSize: 16, marginBottom: 12, padding: 15 },
  label: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  roleChip: { backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 10, borderWidth: 1, flex: 1, padding: 13, alignItems: 'center' },
  roleChipActive: { backgroundColor: COLORS.primary + '14', borderColor: COLORS.primary },
  roleChipText: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  roleChipTextActive: { color: COLORS.primary, fontWeight: '700' },
  error: { color: COLORS.danger, marginBottom: 12, textAlign: 'left' },
  message: { color: COLORS.success, marginBottom: 12, textAlign: 'left' },
  loader: { marginVertical: 20 },
  link: { color: COLORS.primary, fontSize: 15, marginTop: 8, textAlign: 'center' },
});
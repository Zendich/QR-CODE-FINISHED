import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { signOut, useAuth } from '@/lib/auth';
import { getProfile, updateProfile, type Profile } from '@/lib/profiles';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const loadedProfile = await getProfile(user.id);
    setProfile(loadedProfile);
    setDraftName(loadedProfile?.full_name ?? '');
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSaveName = async () => {
    if (!user) return;
    setSaving(true);
    const trimmedName = draftName.trim();
    const { error } = await updateProfile(user.id, { full_name: trimmedName });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setProfile((current) => (current ? { ...current, full_name: trimmedName } : current));
    setEditing(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to sign out.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Profile</Text>
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : (
        <>
          <View style={[styles.roleBadge, profile?.role === 'teacher' ? styles.teacherBadge : styles.studentBadge]}>
            <Text style={styles.roleBadgeText}>
              {profile?.role === 'teacher' ? 'Teacher' : 'Student'}
            </Text>
          </View>
          {editing ? (
            <View style={styles.nameEditRow}>
              <TextInput
                autoCapitalize="words"
                onChangeText={setDraftName}
                placeholder="Full name"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.nameInput}
                value={draftName}
              />
              <Pressable disabled={saving} onPress={handleSaveName} style={styles.saveButton}>
                <Text style={styles.saveText}>{saving ? '...' : 'Save'}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setEditing(true)} style={styles.nameRow}>
              <Text style={styles.name}>{profile?.full_name || 'Tap to add your name'}</Text>
              <Text style={styles.editHint}>Edit</Text>
            </Pressable>
          )}
          <Text style={styles.email}>{profile?.email ?? user?.email ?? 'Signed-in user'}</Text>
          <Text style={styles.id}>{user?.id}</Text>
        </>
      )}
      <AppButton icon="log-out-outline" onPress={handleSignOut} title="Sign Out" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', backgroundColor: COLORS.background, flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 18 },
  loader: { marginVertical: 24 },
  roleBadge: { borderRadius: 16, marginBottom: 14, paddingHorizontal: 18, paddingVertical: 8 },
  teacherBadge: { backgroundColor: COLORS.warning },
  studentBadge: { backgroundColor: COLORS.primary },
  roleBadgeText: { color: COLORS.textOnPrimary, fontSize: 14, fontWeight: '700' },
  nameRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 8 },
  name: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '600' },
  editHint: { color: COLORS.primary, fontSize: 14 },
  nameEditRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 8, width: '100%' },
  nameInput: { backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 10, borderWidth: 1, color: COLORS.textPrimary, flex: 1, padding: 12 },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  saveText: { color: COLORS.textOnPrimary, fontWeight: '700' },
  email: { color: COLORS.textSecondary, fontSize: 15, textAlign: 'center' },
  id: { color: COLORS.textSecondary, fontSize: 11, marginBottom: 24, marginTop: 5, textAlign: 'center' },
});

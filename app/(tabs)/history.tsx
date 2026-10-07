import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import { getProfile } from '@/lib/profiles';
import type { Role } from '@/lib/profiles';

export default function HistoryScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setError('Please sign in to view attendance history.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const currentRole = (await getProfile(user.id))?.role ?? 'student';
      setRole(currentRole);

      if (currentRole === 'teacher') {
        setTeacherEvents(await getTeacherEventAttendance(user.id));
        setStudentRecords([]);
      } else {
        setStudentRecords(await getAttendanceHistory(user.id));
        setTeacherEvents([]);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not load attendance history.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {role === 'teacher' ? 'My Event Attendance' : 'Attendance History'}
      </Text>

      {loading ? (
        <Text style={styles.subtitle}>Loading records...</Text>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : role === 'teacher' ? (
        <TeacherHistory events={teacherEvents} />
      ) : studentRecords.length === 0 ? (
        <Text style={styles.subtitle}>
          No records yet. Scan a QR code to register your attendance.
        </Text>
      ) : (
        <FlatList
          data={studentRecords}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.eventTitle}>{item.eventTitle}</Text>
              <Text style={styles.eventMeta}>{item.eventId}</Text>
              <Text style={styles.eventMeta}>{formatDate(item.scannedAt)}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function TeacherHistory({ events }: { events: TeacherEventAttendance[] }) {
  if (events.length === 0) {
    return <Text style={styles.subtitle}>You have not created any events yet.</Text>;
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.eventId}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventTitle}>{item.title}</Text>
          </View>
          <Text style={styles.countText}>{formatAttendanceHeadline(item.attendeeCount)} have scanned this event.</Text>
          <Text style={styles.eventMeta}>{item.eventCode}</Text>
          {item.startTime && <Text style={styles.eventMeta}>Starts: {formatDate(item.startTime)}</Text>}
          {item.attendees.length === 0 ? (
            <Text style={styles.emptyAttendees}>No students have scanned this event.</Text>
          ) : (
            item.attendees.map((attendee) => (
              <View key={`${attendee.studentId}-${attendee.scannedAt}`} style={styles.attendeeRow}>
                <Text style={styles.attendeeId}>{shortId(attendee.studentId)}</Text>
                <Text style={styles.eventMeta}>{formatDate(attendee.scannedAt)}</Text>
              </View>
            ))
          )}
        </View>
      )}
    />
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function formatAttendanceHeadline(count: number) {
  return count === 1
    ? '1 attendee'
    : `${count} attendees`;
}

function shortId(id: string) {
  return id ? `...${id.slice(-8)}` : 'unknown';
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  title: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 16, letterSpacing: 0.2 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 32, textAlign: 'center' },
  error: { color: COLORS.danger, fontSize: 14, lineHeight: 20, marginTop: 32, textAlign: 'center' },
  list: { paddingBottom: 24 },
  card: { backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 10, borderWidth: 1, marginBottom: 12, padding: 16, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  eventHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  eventTitle: { color: COLORS.textPrimary, flex: 1, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  eventMeta: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  countText: { color: COLORS.primary, fontSize: 14, fontWeight: '700', marginBottom: 6 },
  emptyAttendees: { color: COLORS.textSecondary, fontSize: 13, marginTop: 12 },
  attendeeRow: { borderTopColor: COLORS.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8 },
  attendeeId: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
});

import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { createEvent } from '@/lib/database';

function toLocalISO(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
  );
}

function formatDateTime(date: Date) {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function TeacherScreen() {
  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(
    () => new Date(Date.now() + 60 * 60 * 1000)
  );
  const [editTarget, setEditTarget] = useState<'start' | 'end' | null>(null);
  const [editingPart, setEditingPart] = useState<'date' | 'time'>('date');
  const [payload, setPayload] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const openPicker = (target: 'start' | 'end') => {
    setEditTarget(target);
    setEditingPart('date');
  };

  const onPickerChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (event.type === 'dismissed') {
      setEditTarget(null);
      return;
    }

    if (!selectedDate) return;

    if (Platform.OS === 'android') {
      if (editingPart === 'date') {
        const current = editTarget === 'start' ? startDate : endDate;
        const updated = new Date(selectedDate);
        updated.setHours(current.getHours(), current.getMinutes());

        if (editTarget === 'start') setStartDate(updated);
        else setEndDate(updated);

        setEditingPart('time');
      } else {
        if (editTarget === 'start') setStartDate(selectedDate);
        else setEndDate(selectedDate);

        setEditTarget(null);
      }
    } else {
      if (editTarget === 'start') setStartDate(selectedDate);
      else setEndDate(selectedDate);
    }
  };

  const addDurationMinutes = (minutes: number) => {
    setEndDate(new Date(startDate.getTime() + minutes * 60 * 1000));
  };

  const handleCreateEvent = () => {
    const trimmedTitle = title.trim();
    const trimmedEventId = eventId.trim();

    if (!trimmedTitle || !trimmedEventId) {
      setMessage('All fields are required.');
      return;
    }

    if (startDate.getTime() >= endDate.getTime()) {
      setMessage('Start time must be before end time.');
      return;
    }

    const eventData = {
      eventId: trimmedEventId,
      title: trimmedTitle,
      start: toLocalISO(startDate),
      end: toLocalISO(endDate),
    };

    createEvent(eventData).then(() => {
      setMessage('Event saved! Scan the QR with the Scan tab to test it.');
      // Fix 5.2: Payload uses key `event` to match scanner validation
      setPayload(
        JSON.stringify({
          v: 1,
          event: eventData.eventId,
          title: eventData.title,
          start: eventData.start,
          end: eventData.end,
        })
      );
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Create Event QR</Text>
      <Text style={styles.subtitle}>
        Fill in the event details, then scan the generated QR with the Scan tab.
      </Text>

      <Text style={styles.label}>Event Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Founders Day Assembly"
        placeholderTextColor={COLORS.textSecondary}
      />

      <Text style={styles.label}>Event Code</Text>
      <TextInput
        style={styles.input}
        value={eventId}
        onChangeText={setEventId}
        placeholder="e.g. EVT-2026-0002"
        placeholderTextColor={COLORS.textSecondary}
        autoCapitalize="characters"
      />

      <Text style={styles.label}>Start Time</Text>
      <Pressable style={styles.pickerField} onPress={() => openPicker('start')}>
        <Ionicons name="sunny-outline" size={20} color={COLORS.textSecondary} />
        <Text style={styles.pickerText}>{formatDateTime(startDate)}</Text>
      </Pressable>

      <Text style={styles.label}>End Time</Text>
      <Pressable style={styles.pickerField} onPress={() => openPicker('end')}>
        <Ionicons name="moon-outline" size={20} color={COLORS.textSecondary} />
        <Text style={styles.pickerText}>{formatDateTime(endDate)}</Text>
      </Pressable>

      <View style={styles.chipRow}>
        <Pressable
          style={styles.chip}
          onPress={() => addDurationMinutes(30)}
        >
          <Text style={styles.chipText}>+30 min</Text>
        </Pressable>
        <Pressable
          style={styles.chip}
          onPress={() => addDurationMinutes(60)}
        >
          <Text style={styles.chipText}>+1 hour</Text>
        </Pressable>
        <Pressable
          style={styles.chip}
          onPress={() => addDurationMinutes(120)}
        >
          <Text style={styles.chipText}>+2 hours</Text>
        </Pressable>
      </View>

      {editTarget && (
        <DateTimePicker
          value={editTarget === 'start' ? startDate : endDate}
          mode={Platform.OS === 'android' ? editingPart : 'datetime'}
          display={Platform.OS === 'android' ? 'default' : 'spinner'}
          onChange={onPickerChange}
        />
      )}

      {message && <Text style={styles.message}>{message}</Text>}

      <AppButton
        theme="primary"
        title="Create Event"
        icon="add-circle-outline"
        onPress={handleCreateEvent}
      />

      {payload && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>
            Scan this QR code with the Scan tab:
          </Text>
          <View style={styles.qrBox}>
            <QRCode value={payload} size={200} />
          </View>
          <Text style={styles.payloadText}>{payload}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  chip: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  message: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  resultCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  payloadText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
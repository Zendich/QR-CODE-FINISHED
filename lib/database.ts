import * as SQLite from 'expo-sqlite';

export type AttendanceRecord = {
  id: number;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
};

export type Event = {
  eventId: string;
  title: string;
  start: string;
  end: string;
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
};

let db: SQLite.SQLiteDatabase | null = null;

async function getDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('qr-attendance.db');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS events (
        eventId TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        start TEXT NOT NULL,
        end TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        studentId TEXT NOT NULL,
        eventId TEXT NOT NULL,
        scannedAt TEXT NOT NULL,
        UNIQUE (studentId, eventId)
      );
    `);
  }
  return db;
}

export async function registerAttendance(
  rawPayload: string,
  studentId: string
): Promise<RegisterResult> {
  let payload: any;
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return { success: false, message: 'Invalid QR code.' };
  }

  if (payload.v !== 1 || !payload.event) {
    return { success: false, message: 'Not an attendance QR code.' };
  }

  let eventId: string;
  let title: string;
  let startStr = '';
  let endStr = '';

  if (typeof payload.event === 'object' && payload.event !== null) {
    eventId = payload.event.id;
    title = payload.event.title || payload.event.id;
    startStr = payload.event.start || payload.start || '';
    endStr = payload.event.end || payload.end || '';
  } else {
    eventId = String(payload.event);
    title = payload.title || eventId;
    startStr = payload.start || '';
    endStr = payload.end || '';
  }

  if (!eventId) {
    return { success: false, message: 'Invalid QR code structure.' };
  }

  const now = Date.now();
  const start = startStr ? new Date(startStr).getTime() : null;
  const end = endStr ? new Date(endStr).getTime() : null;

  if (start && now < start) {
    return { success: false, message: 'Event has not started yet.' };
  }
  if (end && now > end) {
    return { success: false, message: 'Event has already ended.' };
  }

  const database = await getDb();

  await database.runAsync(
    'INSERT OR IGNORE INTO events (eventId, title, start, end) VALUES (?, ?, ?, ?)',
    [eventId, title, startStr, endStr]
  );

  const result = await database.runAsync(
    'INSERT OR IGNORE INTO attendance (studentId, eventId, scannedAt) VALUES (?, ?, ?)',
    [studentId, eventId, new Date().toISOString()]
  );

  if (result.changes === 0) {
    return {
      success: false,
      message: 'Already registered for this event.',
      eventTitle: title,
    };
  }

  return { success: true, message: 'Attendance recorded!', eventTitle: title };
}

export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<AttendanceRecord>(
    `SELECT a.id, a.eventId, COALESCE(e.title, a.eventId) AS eventTitle, a.scannedAt
     FROM attendance a
     LEFT JOIN events e ON e.eventId = a.eventId
     WHERE a.studentId = ?
     ORDER BY a.scannedAt DESC`,
    [studentId]
  );
  return rows;
}

export async function createEvent(event: Event): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    'INSERT OR REPLACE INTO events (eventId, title, start, end) VALUES (?, ?, ?, ?)',
    [event.eventId, event.title, event.start, event.end]
  );
}
import { InspectionSession } from '../types/inspection';
import { normalizeRoom } from './syncProtocol';
const DB_NAME = 'EHS_Walkthrough_DB';
const roomNow = () => normalizeRoom(localStorage.getItem('ehs_sync_room') || 'FSE-MAIN') || 'FSE-MAIN';
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('active_session')) db.createObjectStore('active_session', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('history_sessions')) db.createObjectStore('history_sessions', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('sync_rooms')) db.createObjectStore('sync_rooms');
      if (!db.objectStoreNames.contains('history_rooms')) {
        const store = db.createObjectStore('history_rooms', { keyPath: 'key' });
        store.createIndex('room', 'room');
        const room = normalizeRoom(localStorage.getItem('ehs_legacy_room') || roomNow());
        const active = request.transaction!.objectStore('active_session');
        const oldActive = active.get('current');
        oldActive.onsuccess = () => {
          let session = oldActive.result?.session;
          if (!session) {
            try { session = JSON.parse(localStorage.getItem('ehs_active_session_v1') || 'null'); } catch { /* retain malformed backup */ }
          }
          if (session?.id) active.put({ key: `current:${room}`, session });
        };
        try {
          const old = JSON.parse(localStorage.getItem('ehs_inspection_history_v1') || '[]');
          if (Array.isArray(old)) for (const session of old) if (session?.id) store.put({ key: `${room}:${session.id}`, room, session });
        } catch { /* malformed legacy backup does not block the primary DB */ }
        const cursor = request.transaction!.objectStore('history_sessions').openCursor();
        cursor.onsuccess = () => {
          const c = cursor.result;
          if (c) { store.put({ key: `${room}:${c.value.id}`, room, session: c.value }); c.continue(); }
        };
      }
    };
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other EHS tabs to upgrade storage'));
  });
}
async function transaction<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const request = run(tx.objectStore(store));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = tx.onerror = () => reject(tx.error || new Error('Storage transaction aborted'));
    });
  } finally { db.close(); }
}
export async function saveActiveSessionDb(session: InspectionSession, room = roomNow()): Promise<void> {
  await transaction('active_session', 'readwrite', s => s.put({ key: `current:${room}`, session }));
}
export async function getActiveSessionDb(room = roomNow()): Promise<InspectionSession | null> {
  const record = await transaction('active_session', 'readonly', s => s.get(`current:${room}`));
  return record?.session || null;
}
export async function saveHistorySessionDb(session: InspectionSession, room = roomNow()): Promise<void> {
  await transaction('history_rooms', 'readwrite', s => s.put({ key: `${room}:${session.id}`, room, session }));
}
export async function getAllHistorySessionsDb(room = roomNow()): Promise<InspectionSession[]> {
  const records = await transaction('history_rooms', 'readonly', s => s.index('room').getAll(room));
  return records.map(r => r.session).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function deleteHistorySessionDb(id: string, room = roomNow()): Promise<void> {
  await transaction('history_rooms', 'readwrite', s => s.delete(`${room}:${id}`));
}
export function readSyncRecord<T>(room: string): Promise<T | undefined> {
  return transaction('sync_rooms', 'readonly', s => s.get(room));
}
export async function writeSyncRecord<T>(room: string, value: T): Promise<void> {
  await transaction('sync_rooms', 'readwrite', s => s.put(value, room));
}

import { InspectionSession } from '../types/inspection';

const DB_NAME = 'EHS_Walkthrough_DB';
const DB_VERSION = 1;
const STORE_ACTIVE = 'active_session';
const STORE_HISTORY = 'history_sessions';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_ACTIVE)) {
        db.createObjectStore(STORE_ACTIVE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        const historyStore = db.createObjectStore(STORE_HISTORY, { keyPath: 'id' });
        historyStore.createIndex('date', 'date', { unique: false });
        historyStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveActiveSessionDb(session: InspectionSession): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_ACTIVE, 'readwrite');
    const store = tx.objectStore(STORE_ACTIVE);
    store.put({ key: 'current', session });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    // Fallback to localStorage
    try {
      localStorage.setItem('ehs_active_session_v1', JSON.stringify(session));
    } catch {
      console.warn('Fallback storage failed', err);
    }
  }
}

export async function getActiveSessionDb(): Promise<InspectionSession | null> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_ACTIVE, 'readonly');
    const store = tx.objectStore(STORE_ACTIVE);
    const request = store.get('current');
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        if (request.result && request.result.session) {
          resolve(request.result.session);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Fallback to localStorage
    try {
      const saved = localStorage.getItem('ehs_active_session_v1');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }
}

export async function saveHistorySessionDb(session: InspectionSession): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_HISTORY, 'readwrite');
    const store = tx.objectStore(STORE_HISTORY);
    store.put(session);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB saveHistory failed', err);
  }
}

export async function getAllHistorySessionsDb(): Promise<InspectionSession[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_HISTORY, 'readonly');
    const store = tx.objectStore(STORE_HISTORY);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const list = request.result || [];
        // sort by date/createdAt descending
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

export async function deleteHistorySessionDb(id: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_HISTORY, 'readwrite');
    const store = tx.objectStore(STORE_HISTORY);
    store.delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB delete failed', err);
  }
}

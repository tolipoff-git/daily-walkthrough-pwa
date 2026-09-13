import { useState, useEffect, useCallback, useRef } from 'react';
import { InspectionSession } from '../types/inspection';
import { getAllHistorySessionsDb, saveHistorySessionDb, deleteHistorySessionDb } from '../utils/indexedDb';

// Out-of-band notification channel: other hooks that write history records
// directly to IndexedDB (bypassing saveInspectionToHistory) call
// notifyHistoryStoreChanged() so the useHistory in-memory state re-reads the
// DB and the "История" modal reflects the new records without a page reload.
const historyChangeListeners = new Set<() => void>();

export function notifyHistoryStoreChanged() {
  historyChangeListeners.forEach((listener) => listener());
}

export function useHistory() {
  const [history, setHistory] = useState<InspectionSession[]>(() => {
    try {
      const saved = localStorage.getItem('ehs_inspection_history_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const isInitialMount = useRef(true);

  // Reload the in-memory history from IndexedDB. Also re-reads the initial
  // localStorage snapshot so a raw (non-DB) record kept there is preserved.
  const refreshHistory = useCallback(() => {
    const loadFromLocalStorage = () => {
      try {
        const local = localStorage.getItem('ehs_inspection_history_v1');
        if (local) {
          const localList = JSON.parse(local);
          if (Array.isArray(localList)) {
            return localList as InspectionSession[];
          }
        }
      } catch {
        // ignore malformed localStorage snapshot
      }
      return [];
    };

    getAllHistorySessionsDb().then((dbHistory) => {
      if (dbHistory && dbHistory.length > 0) {
        const merged = new Map<string, InspectionSession>();
        loadFromLocalStorage().forEach((s) => merged.set(s.id, s));
        dbHistory.forEach((s) => merged.set(s.id, s));
        setHistory([...merged.values()]);
      } else {
        setHistory(loadFromLocalStorage());
      }
    }).catch(() => {
      setHistory(loadFromLocalStorage());
    });
  }, []);

  // Load from IndexedDB
  useEffect(() => {
    isInitialMount.current = true;
    refreshHistory();
  }, [refreshHistory]);

  // Keep state in sync with hooks that write history records directly to
  // IndexedDB (auto-rollover, reset, cloud stale-date / Completed-collision).
  const onHistoryStoreChanged = useCallback(() => {
    refreshHistory();
  }, [refreshHistory]);
  useEffect(() => {
    historyChangeListeners.add(onHistoryStoreChanged);
    return () => {
      historyChangeListeners.delete(onHistoryStoreChanged);
    };
  }, [onHistoryStoreChanged]);

  // Sync to localStorage lightweight list
  useEffect(() => {
    if (isInitialMount.current) return;
    try {
      // Strip photos from localStorage backup to avoid quota limit
      const lightHistory = history.map((h) => ({
        ...h,
        items: h.items.map((it) => ({
          ...it,
          defectDetails: it.defectDetails
            ? { ...it.defectDetails, photos: [] }
            : undefined,
        })),
      }));
      localStorage.setItem('ehs_inspection_history_v1', JSON.stringify(lightHistory));
    } catch (e) {
      console.warn('History localStorage quota reached', e);
    }
  }, [history]);

  const saveInspectionToHistory = useCallback((session?: InspectionSession | null) => {
    if (!session || !session.id) return;
    saveHistorySessionDb(session).catch((err) => console.warn('Failed to save to DB history', err));
    setHistory((prev) => {
      const existingIndex = prev.findIndex((s) => s.id === session.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = session;
        return updated;
      }
      return [session, ...prev];
    });
  }, []);

  const deleteFromHistory = useCallback((id: string) => {
    deleteHistorySessionDb(id).catch((err) => console.warn('Failed to delete from DB history', err));
    setHistory((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      await Promise.all(history.map((h) => deleteHistorySessionDb(h.id)));
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  }, [history]);

  return {
    history,
    saveInspectionToHistory,
    refreshHistory,
    deleteFromHistory,
    clearHistory,
  };
}

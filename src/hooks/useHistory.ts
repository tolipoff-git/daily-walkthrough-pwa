import { useState, useEffect, useCallback, useRef } from 'react';
import { InspectionSession } from '../types/inspection';
import { getAllHistorySessionsDb, saveHistorySessionDb, deleteHistorySessionDb } from '../utils/indexedDb';

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

  // Load from IndexedDB
  useEffect(() => {
    getAllHistorySessionsDb().then((dbHistory) => {
      if (dbHistory && dbHistory.length > 0 && isInitialMount.current) {
        setHistory(dbHistory);
      }
      isInitialMount.current = false;
    }).catch(() => {
      isInitialMount.current = false;
    });
  }, []);

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

  const saveInspectionToHistory = useCallback((session: InspectionSession) => {
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

  const clearHistory = useCallback(() => {
    history.forEach((h) => deleteHistorySessionDb(h.id));
    setHistory([]);
  }, [history]);

  return {
    history,
    saveInspectionToHistory,
    deleteFromHistory,
    clearHistory,
  };
}

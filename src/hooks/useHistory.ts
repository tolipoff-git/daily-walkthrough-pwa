import { useState, useEffect, useCallback } from 'react';
import { InspectionSession } from '../types/inspection';
import { getAllHistorySessionsDb, saveHistorySessionDb, deleteHistorySessionDb } from '../utils/indexedDb';
const listeners = new Set<() => void>();
export function notifyHistoryStoreChanged() { listeners.forEach(fn => fn()); }
export function useHistory() {
  const [history, setHistory] = useState<InspectionSession[]>([]);
  const refreshHistory = useCallback(() => {
    const room = localStorage.getItem('ehs_sync_room') || 'FSE-MAIN';
    void getAllHistorySessionsDb(room).then(rows => {
      if (room === (localStorage.getItem('ehs_sync_room') || 'FSE-MAIN')) setHistory(rows);
    }).catch(err => console.error('History read failed', err));
  }, []);
  useEffect(() => { refreshHistory(); listeners.add(refreshHistory); return () => { listeners.delete(refreshHistory); }; }, [refreshHistory]);
  const saveInspectionToHistory = useCallback((session?: InspectionSession | null) => {
    if (session) void saveHistorySessionDb(session).then(notifyHistoryStoreChanged).catch(err => console.error('History save failed', err));
  }, []);
  const deleteFromHistory = useCallback(async (id: string) => { await deleteHistorySessionDb(id); refreshHistory(); }, [refreshHistory]);
  const clearHistory = useCallback(async () => { for (const s of history) await deleteHistorySessionDb(s.id); refreshHistory(); }, [history, refreshHistory]);
  return { history, saveInspectionToHistory, refreshHistory, deleteFromHistory, clearHistory };
}

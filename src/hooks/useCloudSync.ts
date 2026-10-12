import { useState, useEffect, useRef, useCallback } from 'react';
import { InspectionSession } from '../types/inspection';
import { getActiveSyncRoom, setActiveSyncRoom, getOrCreateDeviceId } from '../utils/syncApi';
import { SyncEngine, SyncStatus } from '../utils/syncEngine';
import { normalizeRoom, same, wireSession } from '../utils/syncProtocol';
import { notifyHistoryStoreChanged } from './useHistory';
import { createNewInspectionSession } from '../data/checklistData';
export type { SyncStatus } from '../utils/syncEngine';

export function useCloudSync({ session, onRemoteUpdate, ready = true }: {
  session: InspectionSession; onRemoteUpdate(s: InspectionSession): void; ready?: boolean;
}) {
  const [syncRoom, setRoom] = useState(getActiveSyncRoom);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [syncStatus, setStatus] = useState<SyncStatus>('pending');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isOnline, setOnline] = useState(navigator.onLine);
  const [deviceId] = useState(getOrCreateDeviceId);
  const engine = useRef<SyncEngine>();
  const latest = useRef(session); latest.current = session;
  const apply = useRef(onRemoteUpdate); apply.current = onRemoteUpdate;
  const applied = useRef<InspectionSession | null>(null);
  const roomChanged = useRef(false);
  const observed = useRef(session);
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const client = new SyncEngine(syncRoom, {
      apply(s) { if (alive) { observed.current = s; applied.current = s; apply.current(s); } },
      status(s) { if (alive) { setStatus(s); setActiveSessionId(client.activeSessionId); } },
      synced() { if (alive) setLastSyncedAt(new Date()); },
    });
    engine.current = client;
    const initial = roomChanged.current ? createNewInspectionSession(localStorage.getItem('ehs_walkthrough_lang') === 'en' ? 'en' : 'ru') : latest.current;
    roomChanged.current = false;
    void client.start(initial).catch(() => { if (alive) setStatus('error'); });
    const refresh = () => { setOnline(navigator.onLine); if (navigator.onLine) void client.tick(true); else setStatus('offline'); };
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void client.tick(); }, 3000);
    window.addEventListener('online', refresh); window.addEventListener('offline', refresh);
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', visible);
    return () => {
      alive = false; client.stop(); clearInterval(timer);
      window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh);
      window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', visible);
    };
  }, [syncRoom, ready]);
  useEffect(() => {
    if (!ready || same(wireSession(session), wireSession(observed.current)) || (applied.current && same(wireSession(session), wireSession(applied.current)))) return;
    observed.current = session;
    void engine.current?.edit(session, false, true).catch(() => setStatus('error'));
  }, [session, ready]);
  const changeRoom = useCallback((room: string) => {
    const clean = normalizeRoom(room);
    if (!clean || clean === syncRoom) return;
    engine.current?.stop();
    setActiveSyncRoom(clean); notifyHistoryStoreChanged(); roomChanged.current = true;
    setLastSyncedAt(null); setStatus('pending'); setRoom(clean);
  }, [syncRoom]);
  return {
    activeSessionId, syncRoom, setSyncRoom: changeRoom, syncStatus, lastSyncedAt, isOnline, deviceId,
    forcePush: (s?: InspectionSession) => engine.current?.force(s) || Promise.resolve(false),
    forcePull: () => engine.current?.tick(true) || Promise.resolve(),
    removeHistory: (s: InspectionSession) => engine.current?.remove(s).catch(() => setStatus('error')),
    resolveConflict: (choice: 'local' | 'remote') => engine.current?.resolve(choice).catch(() => setStatus('error')),
  };
}

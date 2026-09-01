import { useState, useEffect, useRef, useCallback } from 'react';
import { InspectionSession } from '../types/inspection';
import { 
  getOrCreateDeviceId, 
  getActiveSyncRoom, 
  setActiveSyncRoom as saveActiveSyncRoom,
  pushSessionToCloud, 
  pullSessionFromCloud, 
  SyncPayload 
} from '../utils/syncApi';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'pending' | 'error';

interface UseCloudSyncProps {
  session: InspectionSession;
  onRemoteUpdate: (remoteSession: InspectionSession) => void;
}

export function useCloudSync({ session, onRemoteUpdate }: UseCloudSyncProps) {
  const [syncRoom, setSyncRoomState] = useState<string>(getActiveSyncRoom);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastRemoteDevice, setLastRemoteDevice] = useState<string>('');

  const deviceIdRef = useRef<string>(getOrCreateDeviceId());
  const lastPushedTimestampRef = useRef<string>('');
  const lastReceivedTimestampRef = useRef<string>('');
  const versionRef = useRef<number>(1);
  const isSyncingRef = useRef<boolean>(false);
  const sessionRef = useRef<InspectionSession>(session);

  // Keep latest session in ref for async functions
  sessionRef.current = session;

  // Track online/offline browser state
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerPull();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const changeRoom = useCallback((newRoom: string) => {
    const clean = (newRoom || 'FSE-MAIN').trim().toUpperCase();
    saveActiveSyncRoom(clean);
    setSyncRoomState(clean);
    lastPushedTimestampRef.current = '';
    lastReceivedTimestampRef.current = '';
    // Trigger initial pull for new room
    setTimeout(() => {
      triggerPull(clean);
    }, 100);
  }, []);

  // Push local session to cloud
  const pushToCloud = useCallback(async (currentRoom: string = syncRoom) => {
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    const currentSession = sessionRef.current;
    if (!currentSession) return;

    // Don't push if this state was just received from remote
    if (currentSession.updatedAt === lastReceivedTimestampRef.current) {
      return;
    }

    // Don't re-push identical timestamp
    if (currentSession.updatedAt === lastPushedTimestampRef.current) {
      return;
    }

    setSyncStatus('syncing');
    isSyncingRef.current = true;
    versionRef.current += 1;

    const payload: SyncPayload = {
      session: currentSession,
      deviceId: deviceIdRef.current,
      updatedAt: currentSession.updatedAt || new Date().toISOString(),
      version: versionRef.current,
    };

    const ok = await pushSessionToCloud(currentRoom, payload);
    isSyncingRef.current = false;

    if (ok) {
      lastPushedTimestampRef.current = payload.updatedAt;
      setLastSyncedAt(new Date());
      setSyncStatus('synced');
    } else {
      setSyncStatus('error');
    }
  }, [syncRoom]);

  // Pull remote session from cloud
  const triggerPull = useCallback(async (currentRoom: string = syncRoom) => {
    if (!navigator.onLine || isSyncingRef.current) return;

    const remote = await pullSessionFromCloud(currentRoom);
    if (!remote || !remote.session) return;

    // If change was made by this same device, ignore
    if (remote.deviceId === deviceIdRef.current) {
      return;
    }

    const localTime = new Date(sessionRef.current.updatedAt || 0).getTime();
    const remoteTime = new Date(remote.updatedAt || 0).getTime();

    // If remote has newer data by timestamp
    if (remoteTime > localTime && remote.updatedAt !== lastReceivedTimestampRef.current) {
      lastReceivedTimestampRef.current = remote.updatedAt;
      setLastRemoteDevice(remote.deviceId);
      setLastSyncedAt(new Date());
      setSyncStatus('synced');
      onRemoteUpdate(remote.session);
    }
  }, [syncRoom, onRemoteUpdate]);

  // Debounced auto-push on local session changes
  useEffect(() => {
    const timer = setTimeout(() => {
      pushToCloud();
    }, 450);

    return () => clearTimeout(timer);
  }, [session, pushToCloud]);

  // Periodic polling loop (every 2.5s when active) + on window focus & visibilitychange
  useEffect(() => {
    let intervalId: any;

    const startPolling = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          triggerPull();
        }
      }, 2500);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerPull();
        startPolling();
      }
    };

    const handleFocus = () => {
      triggerPull();
    };

    startPolling();
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Initial pull on mount
    triggerPull();

    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [triggerPull]);

  return {
    syncRoom,
    setSyncRoom: changeRoom,
    syncStatus,
    lastSyncedAt,
    isOnline,
    lastRemoteDevice,
    deviceId: deviceIdRef.current,
    forcePush: () => pushToCloud(syncRoom),
    forcePull: () => triggerPull(syncRoom),
  };
}

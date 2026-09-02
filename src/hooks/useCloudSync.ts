import { useState, useEffect, useRef, useCallback } from 'react';
import { InspectionSession } from '../types/inspection';
import { 
  getOrCreateDeviceId, 
  getActiveSyncRoom, 
  setActiveSyncRoom as saveActiveSyncRoom,
  pushSessionToCloud, 
  pullSessionFromCloud, 
  subscribeToLiveCloudStream,
  SyncPayload 
} from '../utils/syncApi';
import { saveActiveSessionDb } from '../utils/indexedDb';

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

  // Process incoming remote payload (from SSE stream or pull)
  const handleRemotePayload = useCallback((remote: SyncPayload) => {
    if (!remote || !remote.session || typeof remote.session !== 'object') return;
    if (!Array.isArray(remote.session.items)) return;

    // If change was made by this same device, ignore echo
    if (remote.deviceId === deviceIdRef.current) {
      return;
    }

    const localTime = new Date(sessionRef.current?.updatedAt || 0).getTime();
    const remoteTime = new Date(remote.updatedAt || 0).getTime();

    // If remote has newer or equal data by timestamp
    if (remoteTime >= localTime && remote.updatedAt !== lastReceivedTimestampRef.current) {
      lastReceivedTimestampRef.current = remote.updatedAt;
      setLastRemoteDevice(remote.deviceId);
      setLastSyncedAt(new Date());
      setSyncStatus('synced');

      // Persist to IndexedDB immediately
      saveActiveSessionDb(remote.session).catch(() => {});

      // Notify React state
      onRemoteUpdate(remote.session);
    }
  }, [onRemoteUpdate]);

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
  }, []);

  // Push local session to cloud
  const pushToCloud = useCallback(async (currentRoom: string = syncRoom, explicitSession?: InspectionSession) => {
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return false;
    }

    const currentSession = explicitSession || sessionRef.current;
    if (!currentSession) return false;

    // Don't push if this state was just received from remote (unless explicit)
    if (!explicitSession && currentSession.updatedAt === lastReceivedTimestampRef.current) {
      return false;
    }

    // Don't re-push identical timestamp (unless explicit)
    if (!explicitSession && currentSession.updatedAt === lastPushedTimestampRef.current) {
      return false;
    }

    setSyncStatus('syncing');
    isSyncingRef.current = true;
    versionRef.current += 1;

    // Strip base64 photos from the sync payload: they are megabytes each and
    // would be re-uploaded on every keystroke (and can exceed KV's 25 MB value
    // limit). Photos stay on the device (IndexedDB) and in its exports.
    const sessionForSync: InspectionSession = {
      ...currentSession,
      items: currentSession.items.map((i) =>
        i.defectDetails?.photos?.length
          ? { ...i, defectDetails: { ...i.defectDetails, photos: [] } }
          : i
      ),
    };

    const payload: SyncPayload = {
      session: sessionForSync,
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
      return true;
    } else {
      setSyncStatus('error');
      return false;
    }
  }, [syncRoom]);

  // Pull remote session from cloud
  const triggerPull = useCallback(async (currentRoom: string = syncRoom) => {
    if (!navigator.onLine || isSyncingRef.current) return;

    const remote = await pullSessionFromCloud(currentRoom);
    if (remote) {
      handleRemotePayload(remote);
    }
  }, [syncRoom, handleRemotePayload]);

  // Debounced auto-push on local session changes
  useEffect(() => {
    const timer = setTimeout(() => {
      pushToCloud();
    }, 450);

    return () => clearTimeout(timer);
  }, [session, pushToCloud]);

  // Real-time Live SSE Subscription + Background Polling Fallback
  useEffect(() => {
    // 1. Subscribe to Live Ping Broadcast: a ping means "pull from Worker API"
    const unsubscribeSse = subscribeToLiveCloudStream(syncRoom, (ping) => {
      // Ignore echoes of our own pushes
      if (ping.deviceId === deviceIdRef.current) return;
      if (ping.updatedAt === lastReceivedTimestampRef.current) return;
      triggerPull();
    });

    // 2. Periodic polling backup (every 2.5s when active)
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

    // Initial pull on mount or room switch
    triggerPull();

    return () => {
      unsubscribeSse();
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [syncRoom, triggerPull]);

  return {
    syncRoom,
    setSyncRoom: changeRoom,
    syncStatus,
    lastSyncedAt,
    isOnline,
    lastRemoteDevice,
    deviceId: deviceIdRef.current,
    forcePush: (explicitSession?: InspectionSession) => pushToCloud(syncRoom, explicitSession),
    forcePull: () => triggerPull(syncRoom),
  };
}

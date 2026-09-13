import { useState, useEffect, useRef, useCallback } from 'react';
import { InspectionSession, DefectPhoto } from '../types/inspection';
import { 
  getOrCreateDeviceId, 
  getActiveSyncRoom, 
  setActiveSyncRoom as saveActiveSyncRoom,
  pushSessionToCloud, 
  pullSessionFromCloud, 
  pushPhotoToCloud,
  pullPhotoFromCloud,
  subscribeToLiveCloudStream,
  SyncPayload 
} from '../utils/syncApi';
import { saveActiveSessionDb, saveHistorySessionDb } from '../utils/indexedDb';
import { getLocalTodayDate } from '../data/checklistData';

// Canonical serialization of the session bytes that actually go over the wire.
// Used for content-based echo detection: peers relay our payload back with its
// updatedAt echoed verbatim, so timestamps alone can't prove "this is just my
// own push returning". Photo binary bytes are excluded (they sync out-of-band);
// only ids/timestamps/captions count.
export function serializeSessionForEchoCheck(s: InspectionSession): string {
  const items = s.items.map((item) => ({
    id: item.id,
    status: item.status,
    itemNotes: item.itemNotes || '',
    defectDetails: item.defectDetails
      ? {
          location: item.defectDetails.location || '',
          zonePreset: item.defectDetails.zonePreset || '',
          description: item.defectDetails.description || '',
          priority: item.defectDetails.priority || 'P2',
          assignedTo: item.defectDetails.assignedTo || 'Maintenance',
          targetDate: item.defectDetails.targetDate || 'Today',
          photos: item.defectDetails.photos.map((p) => {
            const ref: DefectPhoto = { id: p.id, url: '', timestamp: p.timestamp };
            if (p.caption) ref.caption = p.caption;
            return ref;
          }),
          isRepeatIssue: Boolean(item.defectDetails.isRepeatIssue),
          resolutionStatus: item.defectDetails.resolutionStatus || 'Open',
        }
      : undefined,
  }));
  return JSON.stringify({
    id: s.id,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    facilityName: s.facilityName,
    facilityArea: s.facilityArea,
    shift: s.shift,
    inspectorName: s.inspectorName,
    inspectorRole: s.inspectorRole,
    generalNotes: s.generalNotes || '',
    status: s.status,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    items,
  });
}

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
  // Exact serialized session we last pushed — the content proof that a remote
  // payload is (or isn't) just a peer relaying our own push back at us.
  const lastPushedRef = useRef<string>('');
  const versionRef = useRef<number>(1);
  const isSyncingRef = useRef<boolean>(false);
  const sessionRef = useRef<InspectionSession>(session);
  // Photos already uploaded to / known to exist in the cloud (by photo id),
  // plus a resolution cache so polling doesn't refetch the same photo
  const pushedPhotoIdsRef = useRef<Set<string>>(new Set());
  const photoCacheRef = useRef<Map<string, DefectPhoto>>(new Map());

  // Keep latest session in ref for async functions
  sessionRef.current = session;
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  onRemoteUpdateRef.current = onRemoteUpdate;

  // Process incoming remote payload (from SSE stream or pull)
  const handleRemotePayload = useCallback((remote: SyncPayload) => {
    if (!remote || !remote.session || typeof remote.session !== 'object') return;
    if (!Array.isArray(remote.session.items)) return;

    // Past-day stale overwrite protection
    if (remote.session.date && remote.session.date < getLocalTodayDate()) {
      saveHistorySessionDb(remote.session).catch(() => {});
      return;
    }

    // Protection: never let a remote Completed session overwrite an active In Progress session with a different ID
    if (
      remote.session.status === 'Completed' &&
      sessionRef.current?.status === 'In Progress' &&
      remote.session.id !== sessionRef.current?.id
    ) {
      saveHistorySessionDb(remote.session).catch(() => {});
      return;
    }

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

      // Content-based echo guard: if this payload is byte-identical to the
      // exact session we last pushed, it's our own push relayed by a peer
      // (its updatedAt is echoed verbatim). Re-applying it would only churn
      // state and re-trigger the debounced auto-push — skip it.
      if (lastPushedRef.current && serializeSessionForEchoCheck(remote.session) === lastPushedRef.current) {
        return;
      }

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
      triggerPull().catch((err) => console.warn('Online sync triggerPull failed', err));
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
    lastPushedRef.current = '';
    pushedPhotoIdsRef.current = new Set();
    photoCacheRef.current = new Map();
  }, []);

  // In-flight push promise: while one push is running, repeated calls return the
  // same promise instead of starting a second concurrent upload (with a newer
  // updatedAt, which could interleave and leave the cloud stale)
  const pushInFlightRef = useRef<Promise<boolean> | null>(null);

  // Push local session to cloud
  const pushToCloud = useCallback(async (currentRoom: string = syncRoom, explicitSession?: InspectionSession | null) => {
    if (pushInFlightRef.current) {
      return pushInFlightRef.current;
    }
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return false;
    }

    const currentSession = explicitSession || sessionRef.current;
    if (!currentSession || !Array.isArray(currentSession.items)) return false;

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

    const runPush = (async () => {
      // Photos sync as separate KV keys (photo_<ROOM>_<id>), uploaded once per
      // device; the session payload carries only id references (url: '').
      // If a photo upload fails, the full photo is inlined as a fallback.
      const itemsForSync = [] as InspectionSession['items'];
      for (const item of currentSession.items) {
        const photos = item.defectDetails?.photos;
        if (!photos?.length) {
          itemsForSync.push(item);
          continue;
        }
        const refs: DefectPhoto[] = [];
        for (const photo of photos) {
          if (!photo.url) {
            refs.push(photo); // already a reference
            continue;
          }
          photoCacheRef.current.set(photo.id, photo);
          if (!pushedPhotoIdsRef.current.has(photo.id)) {
            const ok = await pushPhotoToCloud(currentRoom, photo);
            if (ok) {
              pushedPhotoIdsRef.current.add(photo.id);
            } else {
              refs.push(photo); // fallback: keep the photo inline
              continue;
            }
          }
          refs.push({ id: photo.id, url: '', caption: photo.caption, timestamp: photo.timestamp });
        }
        itemsForSync.push({ ...item, defectDetails: { ...item.defectDetails!, photos: refs } });
      }

      const sessionForSync: InspectionSession = { ...currentSession, items: itemsForSync };

      const payload: SyncPayload = {
        session: sessionForSync,
        deviceId: deviceIdRef.current,
        updatedAt: currentSession.updatedAt || new Date().toISOString(),
        version: versionRef.current,
      };

      const ok = await pushSessionToCloud(currentRoom, payload);

      if (ok) {
        lastPushedTimestampRef.current = payload.updatedAt;
        // Snapshot the exact serialized bytes we just sent: a peer relaying
        // this payload back will carry these exact bytes (photo refs, echoed
        // updatedAt), so this is the ground truth for echo detection.
        lastPushedRef.current = serializeSessionForEchoCheck(sessionForSync);
        setLastSyncedAt(new Date());
        setSyncStatus('synced');
        return true;
      } else {
        setSyncStatus('error');
        return false;
      }
    })();

    pushInFlightRef.current = runPush;
    runPush.finally(() => {
      pushInFlightRef.current = null;
      isSyncingRef.current = false;
    });
    return runPush;
  }, [syncRoom]);

  // Resolve photo references (url: '') in a pulled payload: cache first,
  // then local session, then fetch from the Worker API by photo id
  const resolveRemotePhotos = useCallback(async (remote: SyncPayload, room: string): Promise<SyncPayload> => {
    const localPhotosById = new Map<string, DefectPhoto>();
    for (const item of sessionRef.current?.items ?? []) {
      for (const p of item.defectDetails?.photos ?? []) {
        if (p.url) localPhotosById.set(p.id, p);
      }
    }

    const items = await Promise.all(remote.session.items.map(async (item) => {
      const photos = item.defectDetails?.photos;
      if (!photos?.length) return item;

      const resolved = (await Promise.all(photos.map(async (p) => {
        if (p.url) {
          pushedPhotoIdsRef.current.add(p.id);
          photoCacheRef.current.set(p.id, p);
          return p;
        }
        const cached = photoCacheRef.current.get(p.id) || localPhotosById.get(p.id);
        if (cached?.url) {
          pushedPhotoIdsRef.current.add(p.id);
          return cached;
        }
        const fetched = await pullPhotoFromCloud(room, p.id);
        if (fetched?.url) {
          pushedPhotoIdsRef.current.add(fetched.id);
          photoCacheRef.current.set(fetched.id, fetched);
          return fetched;
        }
        return null; // unresolvable ref — dropped rather than a broken image
      }))).filter((p): p is DefectPhoto => Boolean(p));

      return { ...item, defectDetails: { ...item.defectDetails!, photos: resolved } };
    }));

    return { ...remote, session: { ...remote.session, items } };
  }, []);

  // Pull remote session from cloud
  const triggerPull = useCallback(async (currentRoom: string = syncRoom) => {
    if (!navigator.onLine || isSyncingRef.current) return;

    try {
      const remote = await pullSessionFromCloud(currentRoom);
      if (remote) {
        if (remote.session.date && remote.session.date < getLocalTodayDate()) {
          saveHistorySessionDb(remote.session).catch(() => {});
          return;
        }
        if (
          remote.session.status === 'Completed' &&
          sessionRef.current?.status === 'In Progress' &&
          remote.session.id !== sessionRef.current.id
        ) {
          saveHistorySessionDb(remote.session).catch(() => {});
          return;
        }
        const resolved = await resolveRemotePhotos(remote, currentRoom);
        handleRemotePayload(resolved);
      }
    } catch (err) {
      console.error('Trigger pull error:', err);
    }
  }, [syncRoom, handleRemotePayload, resolveRemotePhotos]);

  // A session the user hasn't really touched yet (fresh page load, no marks)
  const isPristineSession = (s: InspectionSession | undefined): boolean => {
    if (!s) return true;
    if (s.status === 'Completed' || s.generalNotes) return false;
    return s.items.every((i) => i.status === 'PENDING' && !i.itemNotes && !i.defectDetails);
  };

  // Initial sync: PULL FIRST, and only then allow pushes. This prevents the
  // mount auto-push from clobbering a newer shared session in KV with a stale
  // (or freshly-created empty) local one.
  const initialSyncDoneRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    initialSyncDoneRef.current = false;

    (async () => {
      try {
        const remote = navigator.onLine ? await pullSessionFromCloud(syncRoom) : null;
        if (cancelled) return;

        if (remote) {
          if (remote.session.date && remote.session.date < getLocalTodayDate()) {
            saveHistorySessionDb(remote.session).catch(() => {});
            if (!cancelled) {
              await pushToCloud(syncRoom);
            }
            return;
          }

          // If remote session is Completed and local is In Progress (and different ID),
          // archive remote to history and publish local to room
          if (
            remote.session.status === 'Completed' &&
            sessionRef.current?.status === 'In Progress' &&
            remote.session.id !== sessionRef.current?.id
          ) {
            saveHistorySessionDb(remote.session).catch(() => {});
            if (!cancelled) {
              await pushToCloud(syncRoom);
            }
            return;
          }

          const resolved = await resolveRemotePhotos(remote, syncRoom);
          if (cancelled) return;
          handleRemotePayload(resolved);

          const remoteTime = new Date(remote.updatedAt || 0).getTime();
          const localTime = new Date(sessionRef.current?.updatedAt || 0).getTime();

          // Remote is older, but local is a pristine untouched session — take
          // the remote one instead of publishing an empty session over it,
          // UNLESS remote is already Completed
          if (
            remoteTime < localTime &&
            isPristineSession(sessionRef.current) &&
            remote.session.status !== 'Completed'
          ) {
            if (cancelled) return;
            lastReceivedTimestampRef.current = remote.updatedAt;
            setLastRemoteDevice(remote.deviceId);
            setLastSyncedAt(new Date());
            setSyncStatus('synced');
            saveActiveSessionDb(resolved.session).catch(() => {});
            onRemoteUpdateRef.current(resolved.session);
          } else if (localTime > remoteTime && !cancelled) {
            // Local has genuine newer work (e.g. edited offline) — publish it
            await pushToCloud(syncRoom);
          }
        } else if (!cancelled) {
          // Room empty (or offline) — publish local state
          await pushToCloud(syncRoom);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Initial sync error:', err);
        setSyncStatus('error');
      } finally {
        if (!cancelled) {
          initialSyncDoneRef.current = true;
        }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncRoom]);

  // Debounced auto-push on local session changes (only after the initial
  // pull-first sync completed, so we never clobber a newer remote session)
  useEffect(() => {
    if (!initialSyncDoneRef.current) return;
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
      triggerPull().catch((err) => console.warn('SSE live ping triggerPull failed', err));
    });

    // 2. Periodic polling backup (every 2.5s when active)
    let intervalId: any;
    const startPolling = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          triggerPull().catch((err) => console.warn('Interval polling triggerPull failed', err));
        }
      }, 2500);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerPull().catch((err) => console.warn('Visibility change triggerPull failed', err));
        startPolling();
      }
    };

    const handleFocus = () => {
      triggerPull().catch((err) => console.warn('Focus triggerPull failed', err));
    };

    startPolling();
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // NOTE: initial pull on mount/room switch happens in the dedicated
    // pull-first initial-sync effect above

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

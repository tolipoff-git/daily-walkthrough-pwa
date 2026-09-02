import { InspectionSession, DefectPhoto } from '../types/inspection';

export interface SyncPayload {
  session: InspectionSession;
  deviceId: string;
  updatedAt: string;
  version: number;
}

export interface SyncResponse {
  success: boolean;
  payload?: SyncPayload;
  timestamp?: string;
  notFound?: boolean;
  error?: string;
}

// Ping broadcast over the public relay. Contains NO session data —
// it only tells peers "room X changed at time T, pull from the Worker API".
interface SyncPing {
  ehsSyncPing: true;
  room: string;
  deviceId: string;
  updatedAt: string;
}

// Generate or retrieve persistent local device ID
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let deviceId = localStorage.getItem('ehs_device_id');
  if (!deviceId) {
    deviceId = `dev_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    localStorage.setItem('ehs_device_id', deviceId);
  }
  return deviceId;
}

// Active sync room from URL or localStorage (default: FSE-MAIN)
export function getActiveSyncRoom(): string {
  if (typeof window === 'undefined') return 'FSE-MAIN';
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room') || urlParams.get('sync');
  if (roomParam) {
    const clean = roomParam.trim().toUpperCase();
    localStorage.setItem('ehs_sync_room', clean);
    return clean;
  }
  return localStorage.getItem('ehs_sync_room') || 'FSE-MAIN';
}

export function setActiveSyncRoom(room: string): void {
  if (typeof window === 'undefined') return;
  const clean = (room || 'FSE-MAIN').trim().toUpperCase();
  localStorage.setItem('ehs_sync_room', clean);

  // Update URL without reload for easy sharing/bookmarking
  const url = new URL(window.location.href);
  url.searchParams.set('room', clean);
  window.history.replaceState({}, '', url.toString());
}

function getCloudTopic(room: string): string {
  const clean = (room || 'FSE-MAIN').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
  return `fse_ehs_sync_${clean}`;
}

function getWorkerSyncUrl(room: string): string {
  const clean = (room || 'FSE-MAIN').trim().toUpperCase();
  return `/api/sync/session_${encodeURIComponent(clean)}`;
}

function isValidPayload(payload: any): payload is SyncPayload {
  return Boolean(
    payload &&
    payload.session &&
    typeof payload.session === 'object' &&
    Array.isArray(payload.session.items) &&
    payload.updatedAt
  );
}

/**
 * Pushes session state to the Cloudflare Worker API (authoritative store),
 * then broadcasts a data-free ping over the public relay so peers pull.
 * Returns true only if the Worker API actually accepted the payload.
 */
export async function pushSessionToCloud(room: string, payload: SyncPayload): Promise<boolean> {
  const cleanRoom = (room || 'FSE-MAIN').trim().toUpperCase();
  const payloadString = JSON.stringify(payload);

  // 1. Authoritative write to the Cloudflare Worker API
  let workerOk = false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(getWorkerSyncUrl(cleanRoom), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': payload.deviceId,
      },
      body: payloadString,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    workerOk = res.ok;
  } catch (err) {
    console.warn('Sync push to Worker API failed:', err);
  }

  // 2. Broadcast a data-free ping so subscribed peers pull the new state.
  //    Best-effort only — peers also poll, so a lost ping is not fatal.
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const ping: SyncPing = {
      ehsSyncPing: true,
      room: cleanRoom,
      deviceId: payload.deviceId,
      updatedAt: payload.updatedAt,
    };

    await fetch(`https://ntfy.sh/${encodeURIComponent(getCloudTopic(cleanRoom))}`, {
      method: 'POST',
      headers: {
        'Title': `FSE Sync ${cleanRoom}`,
        'Priority': 'default',
        'X-Device-ID': payload.deviceId,
      },
      body: JSON.stringify(ping),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch {
    // Ping relay unreachable — polling fallback covers this
  }

  return workerOk;
}

/**
 * Pulls latest session state from the Cloudflare Worker API.
 */
export async function pullSessionFromCloud(room: string): Promise<SyncPayload | null> {
  const cleanRoom = (room || 'FSE-MAIN').trim().toUpperCase();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${getWorkerSyncUrl(cleanRoom)}?t=${Date.now()}`, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (isValidPayload(data)) {
        return data;
      }
    }
  } catch {}

  return null;
}

/**
 * Uploads a single photo to the Worker API as its own KV key
 * (photo_<ROOM>_<photoId>), so the session payload stays small and each
 * photo travels over the network at most once per device.
 */
export async function pushPhotoToCloud(room: string, photo: DefectPhoto): Promise<boolean> {
  const cleanRoom = (room || 'FSE-MAIN').trim().toUpperCase();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(
      `/api/sync/photo_${encodeURIComponent(cleanRoom)}_${encodeURIComponent(photo.id)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(photo),
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetches a single photo by id from the Worker API.
 */
export async function pullPhotoFromCloud(room: string, photoId: string): Promise<DefectPhoto | null> {
  const cleanRoom = (room || 'FSE-MAIN').trim().toUpperCase();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(
      `/api/sync/photo_${encodeURIComponent(cleanRoom)}_${encodeURIComponent(photoId)}?t=${Date.now()}`,
      { method: 'GET', headers: { 'Cache-Control': 'no-cache' }, signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.id === 'string' && typeof data.url === 'string' && data.url) {
        return data as DefectPhoto;
      }
    }
  } catch {}
  return null;
}

/**
 * Subscribes to live Server-Sent Events (SSE) for instant sync notifications.
 * The stream carries data-free pings only; on a ping from another device
 * the onPing callback fires and the caller pulls from the Worker API.
 */
export function subscribeToLiveCloudStream(
  room: string,
  onPing: (ping: SyncPing) => void
): () => void {
  if (typeof window === 'undefined' || !window.EventSource) {
    return () => {};
  }

  const cleanRoom = (room || 'FSE-MAIN').trim().toUpperCase();
  const topic = getCloudTopic(cleanRoom);
  let eventSource: EventSource | null = null;

  try {
    eventSource = new EventSource(`https://ntfy.sh/${encodeURIComponent(topic)}/sse`);

    eventSource.onmessage = (event) => {
      try {
        if (!event.data) return;
        const parsed = JSON.parse(event.data);
        if (parsed.event !== 'message' || !parsed.message) return;
        const ping = JSON.parse(parsed.message);
        // Only well-formed pings for this room are accepted; anything else
        // on the public topic is ignored silently.
        if (ping && ping.ehsSyncPing === true && ping.room === cleanRoom && ping.deviceId) {
          onPing(ping as SyncPing);
        }
      } catch {
        // Not a ping — ignore third-party noise on the public topic
      }
    };

    eventSource.onerror = () => {
      // Automatic browser reconnect handled by EventSource
    };
  } catch (err) {
    console.warn('SSE subscription error:', err);
  }

  return () => {
    if (eventSource) {
      eventSource.close();
    }
  };
}

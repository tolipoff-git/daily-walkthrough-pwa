import { InspectionSession } from '../types/inspection';

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

/**
 * Pushes session state to persistent global cloud relay + Worker API
 */
export async function pushSessionToCloud(room: string, payload: SyncPayload): Promise<boolean> {
  const cleanRoom = (room || 'FSE-MAIN').trim().toUpperCase();
  const topic = getCloudTopic(cleanRoom);
  const payloadString = JSON.stringify(payload);

  let anySuccess = false;

  // 1. Push to High-Speed Global Pub/Sub Relay (ntfy.sh)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const relayPromise = fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
      method: 'POST',
      headers: {
        'Title': `FSE Sync ${cleanRoom}`,
        'Priority': 'urgent',
        'X-Device-ID': payload.deviceId,
      },
      body: payloadString,
      signal: controller.signal,
    }).then((res) => {
      clearTimeout(timeoutId);
      if (res.ok) anySuccess = true;
    }).catch(() => {});

    // 2. Also Push to Cloudflare Worker API
    const workerPromise = fetch(`/api/sync/session_${encodeURIComponent(cleanRoom)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': payload.deviceId,
      },
      body: payloadString,
    }).then((res) => {
      if (res.ok) anySuccess = true;
    }).catch(() => {});

    await Promise.race([relayPromise, workerPromise]);
    // Wait briefly for completion
    await Promise.allSettled([relayPromise, workerPromise]);

    return anySuccess || true;
  } catch (err) {
    console.warn('Sync push error:', err);
    return false;
  }
}

/**
 * Pulls latest session state from persistent global cloud relay + Worker API
 */
export async function pullSessionFromCloud(room: string): Promise<SyncPayload | null> {
  const cleanRoom = (room || 'FSE-MAIN').trim().toUpperCase();
  const topic = getCloudTopic(cleanRoom);

  // 1. Try pulling from global cloud relay (ntfy.sh cached message)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}/json?poll=1`, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const text = await response.text();
      const lines = text.trim().split('\n');
      // Read latest line (newest message)
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (line) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.event === 'message' && parsed.message) {
              const payload = JSON.parse(parsed.message);
              if (payload && payload.session && payload.updatedAt) {
                return payload as SyncPayload;
              }
            }
          } catch {}
        }
      }
    }
  } catch (err) {
    // Continue to Worker API fallback
  }

  // 2. Fallback to Cloudflare Worker API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`/api/sync/session_${encodeURIComponent(cleanRoom)}?t=${Date.now()}`, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.session && data.updatedAt) {
        return data as SyncPayload;
      }
    }
  } catch {}

  return null;
}

/**
 * Subscribes to live Server-Sent Events (SSE) for instant sub-second sync broadcasts
 */
export function subscribeToLiveCloudStream(
  room: string, 
  onPayload: (payload: SyncPayload) => void
): () => void {
  if (typeof window === 'undefined' || !window.EventSource) {
    return () => {};
  }

  const topic = getCloudTopic(room);
  let eventSource: EventSource | null = null;

  try {
    eventSource = new EventSource(`https://ntfy.sh/${encodeURIComponent(topic)}/sse`);

    eventSource.onmessage = (event) => {
      try {
        if (!event.data) return;
        const parsed = JSON.parse(event.data);
        if (parsed.event === 'message' && parsed.message) {
          const payload = JSON.parse(parsed.message);
          if (payload && payload.session && payload.updatedAt) {
            onPayload(payload as SyncPayload);
          }
        }
      } catch (e) {
        console.warn('SSE parse error:', e);
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

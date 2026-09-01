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

/**
 * Pushes session state to the Cloudflare Worker Sync API
 */
export async function pushSessionToCloud(room: string, payload: SyncPayload): Promise<boolean> {
  const cleanRoom = (room || 'FSE-MAIN').trim().toUpperCase();
  const key = `session_${cleanRoom}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`/api/sync/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': payload.deviceId,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (err) {
    console.warn('Sync push error:', err);
    return false;
  }
}

/**
 * Pulls latest session state from the Cloudflare Worker Sync API
 */
export async function pullSessionFromCloud(room: string): Promise<SyncPayload | null> {
  const cleanRoom = (room || 'FSE-MAIN').trim().toUpperCase();
  const key = `session_${cleanRoom}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`/api/sync/${encodeURIComponent(key)}?t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data && data.session && data.updatedAt) {
      return data as SyncPayload;
    }
    return null;
  } catch (err) {
    // Expected when offline or worker starting
    return null;
  }
}

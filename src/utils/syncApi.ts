import { DefectPhoto } from '../types/inspection';
import { RoomState, SyncOperation, SyncAck, normalizeRoom, validSession } from './syncProtocol';

export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem('ehs_device_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('ehs_device_id', id); }
  return id;
}
export function getActiveSyncRoom(): string {
  if (!localStorage.getItem('ehs_legacy_room')) localStorage.setItem('ehs_legacy_room', normalizeRoom(localStorage.getItem('ehs_sync_room') || 'FSE-MAIN'));
  const params = new URLSearchParams(location.search);
  const room = normalizeRoom(params.get('room') || params.get('sync') || localStorage.getItem('ehs_sync_room') || 'FSE-MAIN') || 'FSE-MAIN';
  localStorage.setItem('ehs_sync_room', room);
  return room;
}
export function setActiveSyncRoom(room: string) {
  const clean = normalizeRoom(room);
  if (!clean) throw new Error('Invalid room');
  localStorage.setItem('ehs_sync_room', clean);
  const url = new URL(location.href); url.searchParams.set('room', clean);
  history.replaceState({}, '', url);
}
export function buildSyncQrPayload(room: string): string {
  const url = new URL('/', location.origin); url.searchParams.set('room', normalizeRoom(room)); return url.toString();
}
export class SyncError extends Error {
  constructor(public status: number, public body: unknown) { super(`Sync HTTP ${status}`); }
}
export async function syncRequest<T>(room: string, path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const token = localStorage.getItem('ehs_sync_token') || '';
    const response = await fetch(`/api/rooms/${encodeURIComponent(normalizeRoom(room))}/${path}`, {
      ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, signal: controller.signal,
    });
    const body = await response.json();
    if (!response.ok) throw new SyncError(response.status, body);
    return body as T;
  } finally { clearTimeout(timeout); }
}
export async function pullRoom(room: string): Promise<RoomState> {
  const state = await syncRequest<RoomState>(room, 'state');
  if (!Number.isSafeInteger(state.revision) || state.revision < 0 || (state.session !== null && !validSession(state.session))) throw new Error('Invalid sync response');
  return state;
}
export async function sendOperation(room: string, op: SyncOperation): Promise<SyncAck> {
  const ack = await syncRequest<SyncAck>(room, 'state', { method: 'POST', body: JSON.stringify(op) });
  if (ack.operationId !== op.id || !Number.isSafeInteger(ack.revision) || !validSession(ack.saved)) throw new Error('Invalid sync acknowledgement');
  return ack;
}
export async function pushPhotoToCloud(room: string, photo: DefectPhoto): Promise<boolean> {
  try {
    const ack = await syncRequest<{success: boolean}>(room, `photos/${encodeURIComponent(photo.id)}`, { method: 'PUT', body: JSON.stringify(photo) });
    return ack.success === true;
  } catch { return false; }
}
export async function pullPhotoFromCloud(room: string, id: string): Promise<DefectPhoto | null> {
  try {
    const photo = await syncRequest<DefectPhoto>(room, `photos/${encodeURIComponent(id)}`);
    return photo.id === id && typeof photo.url === 'string' && photo.url ? photo : null;
  } catch { return null; }
}

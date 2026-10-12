import { InspectionSession } from '../types/inspection';

export interface RoomState { revision: number; session: InspectionSession | null }
export interface SyncOperation { id: string; session: InspectionSession; base: InspectionSession | null; archive?: boolean; activateFrom?: string | null; remove?: boolean }
export interface SyncAck extends RoomState { operationId: string; saved: InspectionSession }
export const normalizeRoom = (room: string): string => room.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 40);
export function validSession(value: unknown): value is InspectionSession {
  if (!value || typeof value !== 'object') return false;
  const s = value as InspectionSession;
  return typeof s.createdAt === 'string' && typeof s.generalNotes === 'string' && !!s.signatures && typeof s.signatures === 'object' && typeof s.id === 'string' && /^[\w-]{1,100}$/.test(s.id) &&
    typeof s.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.date) &&
    typeof s.updatedAt === 'string' && Number.isFinite(Date.parse(s.updatedAt)) &&
    ['In Progress', 'Completed', 'Signed Off'].includes(s.status) &&
    Array.isArray(s.items) && s.items.length <= 100 && new Set(s.items.map(i => i?.id)).size === s.items.length &&
    s.items.every(i => i && typeof i.id === 'string' && ['PENDING', 'PASS', 'FAIL', 'NA'].includes(i.status) &&
      (!i.defectDetails || (Array.isArray(i.defectDetails.photos) && i.defectDetails.photos.length <= 50 &&
        i.defectDetails.photos.every(p => p && /^[\w-]{1,150}$/.test(p.id) && typeof p.url === 'string'))));
}
export function wireSession(s: InspectionSession): InspectionSession {
  return { ...s, items: s.items.map(i => ({ ...i, itemNotes: i.itemNotes || '', defectDetails: i.defectDetails ? {
    ...i.defectDetails, zonePreset: i.defectDetails.zonePreset || '', isRepeatIssue: Boolean(i.defectDetails.isRepeatIssue),
    photos: i.defectDetails.photos.map(p => ({ ...p, url: '' })),
  } : undefined })) };
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  return value;
}
export const same = (a: unknown, b: unknown): boolean => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
export const pristine = (s: InspectionSession): boolean => s.status === 'In Progress' && !s.generalNotes &&
  s.items.every(i => i.status === 'PENDING' && !i.itemNotes && !i.defectDetails);

// Three-way merge; never use client clocks for conflict resolution. Arrays with
// stable IDs merge by ID, including explicit deletion. Conflicting leaves stop.
export function mergeSession(base: InspectionSession | null, local: InspectionSession, remote: InspectionSession | null): InspectionSession | null {
  local = wireSession(local); remote = remote ? wireSession(remote) : null; base = base ? wireSession(base) : null;
  if (!remote) return base ? null : local;
  if (same(local, remote)) return remote;
  if (!base || base.id !== local.id || remote.id !== local.id) return null;
  let conflict = false;
  function merge(b: unknown, l: unknown, r: unknown, key = ''): unknown {
    if (key === 'updatedAt') return r;
    if (same(l, r)) return l;
    if (same(l, b)) return r;
    if (same(r, b)) return l;
    if ([b, l, r].every(v => v && typeof v === 'object' && !Array.isArray(v))) {
      const bo = b as Record<string, unknown>, lo = l as Record<string, unknown>, ro = r as Record<string, unknown>;
      return Object.fromEntries([...new Set([...Object.keys(bo), ...Object.keys(lo), ...Object.keys(ro)])]
        .map(k => [k, merge(bo[k], lo[k], ro[k], k)]));
    }
    if (Array.isArray(b) && Array.isArray(l) && Array.isArray(r) && [b, l, r].every(a => a.every(v => v && typeof v.id === 'string'))) {
      const ids = [...new Set([...r, ...l, ...b].map(v => v.id))];
      return ids.map(id => merge(b.find(v => v.id === id), l.find(v => v.id === id), r.find(v => v.id === id))).filter(v => v !== undefined);
    }
    conflict = true;
    return l;
  }
  const result = merge(base, local, remote) as InspectionSession;
  return conflict ? null : result;
}

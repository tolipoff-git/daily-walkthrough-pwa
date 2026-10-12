import { InspectionSession } from '../src/types/inspection';
import { SyncRoom, Storage } from '../src/worker/SyncRoom';
import { createNewInspectionSession } from '../src/data/checklistData';
export function session(id = 'walk-1'): InspectionSession {
  const s = createNewInspectionSession('en');
  return { ...s, id, startTime: '08:00', signatures: { ...s.signatures, timestamp: '2026-10-10T10:00:00Z' }, date: '2026-10-10', createdAt: '2026-10-10T10:00:00Z', updatedAt: '2026-10-10T10:00:00Z' };
}
export class MemoryStorage implements Storage {
  data = new Map<string, unknown>();
  private tail = Promise.resolve();
  async get<T>(k: string) { return structuredClone(this.data.get(k)) as T | undefined; }
  async put<T>(k: string, v: T) { this.data.set(k, structuredClone(v)); }
  async list<T>({ prefix, startAfter, limit }: {prefix: string; startAfter?: string; limit: number}) {
    return new Map([...this.data].filter(([k]) => k.startsWith(prefix) && (!startAfter || k > startAfter)).sort(([a], [b]) => a.localeCompare(b)).slice(0, limit)) as Map<string,T>;
  }
  transaction<T>(fn: (tx: Storage) => Promise<T>): Promise<T> {
    const work = this.tail.then(async () => {
      const backup = structuredClone(this.data);
      try { return await fn(this); } catch (e) { this.data = backup; throw e; }
    });
    this.tail = work.then(()=>{},()=>{}); return work;
  }
}
export function roomServer(legacy: InspectionSession | null = null) {
  const storage = new MemoryStorage();
  let init = Promise.resolve();
  const room = new SyncRoom({ storage, blockConcurrencyWhile(fn) { const p=init.then(fn);init=p.then(()=>{},()=>{});return p; } },
    { EHS_KV: { get: async k => k.startsWith('session_') && legacy ? JSON.stringify({ session: legacy }) : null } });
  return { storage, room, request: (path='state', init?: RequestInit) => room.fetch(new Request(`https://test/${path}${path.includes('?')?'&':'?'}room=TEST`,init)) };
}

import { InspectionSession, DefectPhoto } from '../types/inspection';
import { RoomState, SyncOperation, mergeSession, same, validSession, wireSession } from '../utils/syncProtocol';

export interface Storage {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  list<T>(options: { prefix: string; startAfter?: string; limit: number }): Promise<Map<string, T>>;
  transaction<T>(fn: (tx: Storage) => Promise<T>): Promise<T>;
}
interface Context { storage: Storage; blockConcurrencyWhile<T>(fn: () => Promise<T>): Promise<T> }
interface LegacyEnv { EHS_KV?: { get(key: string): Promise<string | null> } }
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export class SyncRoom {
  constructor(private ctx: Context, private env: LegacyEnv) {}
  private async migrate(room: string) {
    await this.ctx.blockConcurrencyWhile(async () => {
      if (await this.ctx.storage.get('initialized')) return;
      if (!this.env.EHS_KV) throw new Error('Legacy storage unavailable');
      const raw = await this.env.EHS_KV.get(`session_${room}`);
      const legacy = raw ? JSON.parse(raw).session : null;
      if (raw && !validSession(legacy)) throw new Error('Invalid legacy session; migration refused');
      // Persist embedded legacy photos before converting to references.
      if (legacy) for (const item of legacy.items) for (const photo of item.defectDetails?.photos || []) {
        if (photo.url) await this.writePhoto(photo);
      }
      await this.ctx.storage.transaction(async tx => {
        if (legacy) await tx.put(`session:${legacy.id}`, wireSession(legacy));
        await tx.put('state', { revision: legacy ? 1 : 0, session: legacy ? wireSession(legacy) : null });
        await tx.put('initialized', true);
      });
    });
  }
  private async hash(value: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  }
  private async writePhoto(photo: DefectPhoto) {
    const hash = await this.hash(photo.url);
    const chunks = photo.url.match(/.{1,48000}/g) || [];
    await this.ctx.storage.transaction(async tx => {
      const old = await tx.get<{ hash?: string }>(`photo:${photo.id}:meta`);
      if (old?.hash && old.hash !== hash) throw new Error('Photo ID collision');
      for (let i = 0; i < chunks.length; i++) await tx.put(`photo:${photo.id}:${i}`, chunks[i]);
      await tx.put(`photo:${photo.id}:meta`, { ...photo, url: '', hash, chunks: chunks.length });
    });
  }
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const room = url.searchParams.get('room') || '';
    try {
      await this.migrate(room);
      const photoId = url.searchParams.get('photo');
      if (photoId) {
        if (!/^[\w-]{1,150}$/.test(photoId)) return json({ error: 'Invalid photo ID' }, 400);
        if (request.method === 'PUT') {
          const raw = await request.text();
          if (raw.length > 5_000_000) return json({ error: 'Photo too large' }, 413);
          const photo = JSON.parse(raw) as DefectPhoto;
          if (photo.id !== photoId || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo.url)) return json({ error: 'Invalid image' }, 400);
          const current = await this.ctx.storage.get<DefectPhoto & { hash?: string }>(`photo:${photo.id}:meta`);
          const hash = await this.hash(photo.url);
          if (current?.hash && current.hash !== hash) return json({ error: 'Photo IDs are immutable' }, 409);
          await this.writePhoto(photo);
          return json({ success: true });
        }
        if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
        let meta = await this.ctx.storage.get<DefectPhoto & { chunks: number }>(`photo:${photoId}:meta`);
        if (!meta) {
          const raw = await this.env.EHS_KV?.get(`photo_${room}_${photoId}`);
          if (!raw) return json({ error: 'Photo unavailable' }, 404);
          const photo = JSON.parse(raw) as DefectPhoto;
          if (!photo.url) return json({ error: 'Photo unavailable' }, 404);
          await this.writePhoto(photo);
          meta = await this.ctx.storage.get(`photo:${photoId}:meta`);
        }
        if (!meta) return json({ error: 'Photo unavailable' }, 404);
        const parts = await Promise.all(Array.from({ length: meta.chunks }, (_, i) => this.ctx.storage.get<string>(`photo:${photoId}:${i}`)));
        if (parts.some(p => p === undefined)) return json({ error: 'Incomplete photo' }, 503);
        const { chunks: _, ...photo } = meta;
        return json({ ...photo, url: parts.join('') });
      }
      if (url.pathname.endsWith('/history')) {
        if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
        const records = await this.ctx.storage.list<InspectionSession>({ prefix: 'session:', startAfter: url.searchParams.get('cursor') || undefined, limit: 50 });
        return json({ sessions: [...records.values()], cursor: records.size === 50 ? [...records.keys()][records.size - 1] : null });
      }
      if (request.method === 'GET') return json(await this.ctx.storage.get<RoomState>('state'));
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
      const raw = await request.text();
      if (raw.length > 100_000) return json({ error: 'Session too large' }, 413);
      const op = JSON.parse(raw) as SyncOperation;
      if (!op || typeof op.id !== 'string' || !/^[\w-]{1,100}$/.test(op.id) || !validSession(op.session) || (op.base !== null && !validSession(op.base))) return json({ error: 'Invalid operation' }, 400);
      return await this.ctx.storage.transaction(async tx => {
        const previous = await tx.get(`ack:${op.id}`);
        if (previous) return json(previous);
        const state = (await tx.get<RoomState>('state'))!;
        const remote = await tx.get<InspectionSession>(`session:${op.session.id}`) || null;
        if (remote?.syncDeleted || (op.remove && (!remote || !same(op.base, remote) || state.session?.id === remote.id)))
          return json({ error: 'conflict', remote, state }, 409);
        if (!remote && !op.archive && state.session && state.session.id !== op.activateFrom)
          return json({ error: 'conflict', remote: state.session, state }, 409);
        const merged = mergeSession(op.base, op.session, remote);
        if (!merged) return json({ error: 'conflict', remote, state }, 409);
        const saved = { ...wireSession(merged), ...(op.remove ? { syncDeleted: true } : {}), updatedAt: new Date().toISOString() };
        if (new TextEncoder().encode(JSON.stringify(saved)).byteLength > 48000) return json({ error: 'Session metadata too large' }, 413);
        await tx.put(`session:${saved.id}`, saved);
        const next: RoomState = { revision: state.revision + 1, session: op.archive || (remote && state.session?.id !== saved.id) ? state.session : saved };
        await tx.put('state', next);
        const ack = { ...next, operationId: op.id, saved };
        await tx.put(`ack:${op.id}`, ack);
        return json(ack);
      });
    } catch (error) {
      if (error instanceof SyntaxError) return json({ error: 'Invalid JSON' }, 400);
      console.error('Room storage failure', error);
      return json({ error: 'storage_unavailable' }, 503);
    }
  }
}

import { DefectPhoto, InspectionSession } from '../types/inspection';
import { SyncOperation, RoomState, wireSession, same, pristine } from './syncProtocol';
import { pullRoom, sendOperation, pushPhotoToCloud, pullPhotoFromCloud, syncRequest, SyncError } from './syncApi';
import { readSyncRecord, writeSyncRecord, saveHistorySessionDb, getAllHistorySessionsDb, deleteHistorySessionDb } from './indexedDb';
import { notifyHistoryStoreChanged } from '../hooks/useHistory';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'pending' | 'error' | 'conflict';
interface RecordState {
  base: InspectionSession | null;
  draft: InspectionSession;
  queue: (SyncOperation & { attempted?: boolean })[];
  revision: number;
  activeId: string | null;
  conflict?: { remote: InspectionSession | null; state: RoomState };
  uploaded: string[];
  imported?: boolean;
}
interface Callbacks { apply(s: InspectionSession): void; status(s: SyncStatus): void; synced(): void }
export class SyncEngine {
  private record!: RecordState;
  private stopped = false;
  private running: Promise<void> | null = null;
  private writes: Promise<void> = Promise.resolve();
  private photoCache = new Map<string, DefectPhoto>();
  private retryAt = 0;
  private failures = 0;
  private historyRevision = -1;
  private historyMissing = false;
  get activeSessionId() { return this.record?.activeId || null; }
  private editGeneration = 0;
  private earlyEdit: InspectionSession | null = null;
  private resolving = false;
  private debounce: ReturnType<typeof setTimeout> | undefined;
  constructor(readonly room: string, private callbacks: Callbacks) {}
  stop() { this.stopped = true; clearTimeout(this.debounce); }
  private status(s: SyncStatus) { if (!this.stopped) this.callbacks.status(s); }
  private persist() {
    const snapshot = structuredClone(this.record);
    this.writes = this.writes.catch(() => {}).then(() => writeSyncRecord(this.room, snapshot));
    return this.writes;
  }
  async start(local: InspectionSession) {
    const saved = await readSyncRecord<RecordState>(this.room);
    if (this.stopped) return;
    this.record = saved || { base: null, draft: local, queue: [], revision: -1, activeId: null, uploaded: [] };
    const early = this.earlyEdit;
    this.earlyEdit = null;
    if (early) await this.edit(early);
    else this.apply(this.record.draft);
    await this.persist();
    await this.tick();
  }
  private apply(s: InspectionSession) {
    if (this.stopped) return;
    this.record.draft = s;
    this.callbacks.apply(s);
  }
  async edit(s: InspectionSession, archive = false, defer = false) {
    if (this.stopped) return false;
    if (!this.record) { this.earlyEdit = structuredClone(s); return false; }
    if (!archive && same(wireSession(s), wireSession(this.record.draft))) return true;
    this.editGeneration++;
    const previous = [...this.record.queue].reverse().find(op => op.session.id === s.id)?.session ||
      (this.record.base?.id === s.id ? this.record.base : null);
    const tail = this.record.queue[this.record.queue.length - 1];
    if (tail && !tail.attempted && !tail.remove && tail.session.id === s.id && tail.archive === archive && tail.session.status === s.status) {
      tail.session = structuredClone(s);
    } else {
      this.record.queue.push({ id: crypto.randomUUID(), session: structuredClone(s), base: previous ? wireSession(previous) : null,
        archive, activateFrom: this.record.draft.id });
    }
    if (!archive) this.record.draft = structuredClone(s);
    this.status(this.record.conflict ? 'conflict' : 'pending');
    await this.persist();
    if (defer) {
      clearTimeout(this.debounce);
      this.debounce = setTimeout(() => { void this.tick(); }, 450);
      return false;
    }
    await this.tick();
    return !this.record.queue.length;
  }
  async remove(session: InspectionSession) {
    if (!this.record || this.stopped || session.id === this.record.activeId) return;
    this.record.queue.push({ id: crypto.randomUUID(), session: wireSession(session), base: wireSession(session), archive: true, remove: true });
    this.status('pending'); await this.persist(); await this.tick(true);
  }
  async force(s?: InspectionSession) {
    if (s) await this.edit(s);
    await this.tick(true);
    return !!this.record && !this.record.queue.length && !this.record.conflict;
  }
  async resolve(choice: 'local' | 'remote') {
    if (!this.record?.conflict || this.resolving || this.stopped) return;
    this.resolving = true;
    try {
      const { remote, state } = this.record.conflict;
      const pending = this.record.queue[0];
      if (!pending) return;
      const generation = this.editGeneration;
      const local = this.record.draft.id === pending.session.id ? this.record.draft : pending.session;
      await saveHistorySessionDb({ ...local, id: `${local.id.slice(0,50)}-conflict-${crypto.randomUUID()}` }, this.room);
      if (this.stopped || generation !== this.editGeneration) return;
      const accepted = remote?.syncDeleted ? state.session : remote || state.session;
      const resolved = choice === 'remote' && accepted ? await this.resolvePhotos(accepted) : null;
      if (this.stopped || generation !== this.editGeneration) return;
      this.record.queue = this.record.queue.filter(op => op.session.id !== pending.session.id);
      if (choice === 'remote') {
        if (accepted && resolved) {
          this.record.base = accepted;
          if (!this.record.queue.some(op => !op.archive)) this.apply(resolved);
        }
      } else {
        // A remotely deleted report can only be retained as a new report, never
        // resurrected under the tombstoned ID by a stale client.
        const session = remote?.syncDeleted ? { ...local, id: crypto.randomUUID(), syncDeleted: undefined } : local;
        this.record.queue.unshift({ ...pending, id: crypto.randomUUID(), session,
          base: remote && remote.id === session.id ? remote : null, activateFrom: state.session?.id || null });
      }
      this.record.conflict = undefined;
      await this.persist(); notifyHistoryStoreChanged(); await this.tick(true);
    } finally { this.resolving = false; }
  }
  private remember(photo: DefectPhoto) {
    this.photoCache.delete(photo.id); this.photoCache.set(photo.id, photo);
    while (this.photoCache.size > 32) this.photoCache.delete(this.photoCache.keys().next().value!);
  }
  private async resolvePhotos(s: InspectionSession, existing?: InspectionSession): Promise<InspectionSession> {
    for (const item of [...this.record.draft.items, ...(existing?.items || [])])
      for (const p of item.defectDetails?.photos || []) if (p.url) this.remember(p);
    const items = [];
    for (const item of s.items) {
      if (!item.defectDetails) { items.push(item); continue; }
      const photos = [];
      for (const ref of item.defectDetails.photos) {
        if (this.stopped) return s;
        const full = ref.url ? ref : this.photoCache.get(ref.id) || await pullPhotoFromCloud(this.room, ref.id);
        if (full?.url) this.remember(full);
        photos.push({ ...ref, url: full?.url || '' });
      }
      items.push({ ...item, defectDetails: { ...item.defectDetails, photos } });
    }
    return { ...s, items };
  }
  private async upload(s: InspectionSession) {
    const uploaded = new Set(this.record.uploaded);
    for (const item of s.items) for (const p of item.defectDetails?.photos || []) {
      if (this.stopped) return;
      if (!p.url || uploaded.has(p.id)) continue;
      if (!await pushPhotoToCloud(this.room, p)) throw new Error('Photo upload failed');
      uploaded.add(p.id); this.remember(p);
    }
    this.record.uploaded = [...uploaded]; await this.persist();
  }
  private async history() {
    this.historyMissing = false;
    let cursor: string | null = null;
    const local = new Map((await getAllHistorySessionsDb(this.room)).map(s => [s.id, s]));
    const ids = new Set<string>();
    do {
      const page: { sessions: InspectionSession[]; cursor: string | null } = await syncRequest(this.room, `history${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`);
      if (this.stopped) return;
      for (const session of page.sessions) {
        ids.add(session.id);
        if (this.record.queue.some(op => op.session.id === session.id)) continue;
        if (session.syncDeleted) await deleteHistorySessionDb(session.id, this.room);
        else {
          // Restore legacy photo bytes still available on this device, even
          // when the server already has the report's reference-only metadata.
          const existing = local.get(session.id);
          if (!this.record.imported && existing) await this.upload(existing);
          const resolved = await this.resolvePhotos(session, existing);
          if (resolved.items.some(i => i.defectDetails?.photos.some(p => !p.url))) this.historyMissing = true;
          if (this.stopped) return;
          if (!this.record.queue.some(op => op.session.id === session.id)) await saveHistorySessionDb(resolved, this.room);
        }
      }
      cursor = page.cursor;
    } while (cursor && !this.stopped);
    if (this.stopped) return;
    if (!this.record.imported) {
      for (const s of local.values()) {
        if (!ids.has(s.id) && s.id !== this.record.draft.id && !this.record.queue.some(op => op.session.id === s.id) && !s.id.includes('-conflict-'))
          this.record.queue.push({ id: crypto.randomUUID(), session: s, base: null, archive: true });
      }
      this.record.imported = true;
    }
    notifyHistoryStoreChanged(); await this.persist();
  }
  tick(force = false): Promise<void> {
    if (this.stopped || !this.record) return Promise.resolve();
    if (this.running) return this.running;
    if (!navigator.onLine) { this.status('offline'); return Promise.resolve(); }
    if (!force && Date.now() < this.retryAt) return Promise.resolve();
    this.running = this.run().catch(() => {
      this.failures++;
      this.retryAt = Date.now() + Math.min(60000, 1000 * 2 ** Math.min(this.failures, 6)) + Math.random() * 500;
      this.status(navigator.onLine ? 'error' : 'offline');
    }).finally(() => { this.running = null; });
    return this.running;
  }
  private async run() {
    if (this.record.conflict) { this.status('conflict'); return; }
    this.status('syncing'); await this.persist();
    const generation = this.editGeneration;
    const state = await pullRoom(this.room);
    if (this.stopped) return;
    if (this.record.revision === -1 && !this.record.queue.length) {
      if (state.session && pristine(this.record.draft)) this.record.base = state.session;
      else if (!state.session || !same(wireSession(this.record.draft), state.session)) {
        this.record.queue.push({ id: crypto.randomUUID(), session: this.record.draft, base: null, activateFrom: state.session?.id || null });
        if (state.session) {
          this.record.conflict = { remote: state.session, state };
          await this.persist(); this.status('conflict'); return;
        }
      } else this.record.base = state.session;
    }
    // Early edits queued before first pull have no trustworthy baseline. Never
    // publish them over an existing room automatically.
    if (this.record.revision === -1 && this.record.queue.length && state.session && !this.record.base) {
      this.record.conflict = { remote: state.session, state };
      await this.persist(); this.status('conflict'); return;
    }
    this.record.activeId = state.session?.id || null;
    this.record.revision = state.revision;
    if (!this.record.queue.length && state.session) {
      const resolved = await this.resolvePhotos(state.session);
      if (this.stopped) return;
      if (!this.record.queue.length && generation === this.editGeneration) { this.record.base = state.session; this.apply(resolved); }
    }
    await this.persist();
    if (this.historyMissing || this.historyRevision !== state.revision) {
      await this.history(); this.historyRevision = state.revision;
    }
    while (this.record.queue.length && !this.stopped) {
      const op = this.record.queue[0];
      op.attempted = true;
      await this.persist();
      await this.upload(op.session); if (this.stopped) return;
      // The operation stays immutable until acknowledged: retry after a lost
      // response sends exactly the same ID and bytes.
      await this.persist();
      try {
        const ack = await sendOperation(this.room, { ...op, session: wireSession(op.session) });
        if (this.stopped) return;
        const resolved = await this.resolvePhotos(ack.saved);
        if (this.stopped) return;
        if (ack.saved.syncDeleted) await deleteHistorySessionDb(ack.saved.id, this.room);
        else await saveHistorySessionDb(resolved, this.room);
        this.record.queue.shift();
        if (!op.archive && !this.record.queue.some(q => !q.archive) && this.record.draft.id === op.session.id) {
          this.record.base = ack.saved; this.apply(resolved);
        }
        this.record.revision = ack.revision;
        this.record.activeId = ack.session?.id || null;
        await this.persist();
      } catch (err) {
        if (err instanceof SyncError && err.status === 409) {
          this.record.conflict = err.body as RecordState['conflict'];
          await this.persist(); this.status('conflict'); return;
        }
        throw err;
      }
    }
    if (this.stopped) return;
    this.failures = 0; this.retryAt = 0; notifyHistoryStoreChanged();
    const missing = this.record.draft.items.some(i => i.defectDetails?.photos.some(p => !p.url));
    this.status(missing || this.record.queue.length ? 'pending' : 'synced');
    if (!missing && !this.record.queue.length) this.callbacks.synced();
  }
}

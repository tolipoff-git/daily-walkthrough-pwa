import { beforeEach,describe,it,expect,vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { session } from './helpers';
import { getActiveSessionDb,saveActiveSessionDb,saveHistorySessionDb,getAllHistorySessionsDb,writeSyncRecord,readSyncRecord,deleteHistorySessionDb } from '../src/utils/indexedDb';
beforeEach(()=>{vi.stubGlobal('indexedDB',new IDBFactory());localStorage.clear();});
describe('device persistence',()=>{
 it('separates active sessions, history and outboxes by room',async()=>{
  localStorage.setItem('ehs_sync_room','A');await saveActiveSessionDb(session('a'));await saveHistorySessionDb(session('same'),'A');await writeSyncRecord('A',{queue:['unsent']});
  localStorage.setItem('ehs_sync_room','B');expect(await getActiveSessionDb()).toBeNull();expect(await getAllHistorySessionsDb('B')).toEqual([]);expect(await readSyncRecord('B')).toBeUndefined();
  await saveHistorySessionDb({...session('same'),generalNotes:'B'},'B');await deleteHistorySessionDb('same','B');expect(await getAllHistorySessionsDb('A')).toHaveLength(1);
 });
 it('captures the room before asynchronous database opening',async()=>{
  localStorage.setItem('ehs_sync_room','A');const save=saveActiveSessionDb(session('a'));
  localStorage.setItem('ehs_sync_room','B');await save;
  expect(await getActiveSessionDb('B')).toBeNull();expect((await getActiveSessionDb('A'))?.id).toBe('a');
 });
 it('imports a localStorage-only legacy active session into its original room',async()=>{
  localStorage.setItem('ehs_legacy_room','A');localStorage.setItem('ehs_active_session_v1',JSON.stringify(session('legacy')));
  expect((await getActiveSessionDb('A'))?.id).toBe('legacy');expect(await getActiveSessionDb('B')).toBeNull();
 });
 it('migrates v1 rich photo history and active state once without deleting legacy data',async()=>{
  localStorage.setItem('ehs_sync_room','B');localStorage.setItem('ehs_legacy_room','A');
  await new Promise<void>((resolve,reject)=>{const r=indexedDB.open('EHS_Walkthrough_DB',1);r.onupgradeneeded=()=>{r.result.createObjectStore('active_session',{keyPath:'key'});r.result.createObjectStore('history_sessions',{keyPath:'id'});};r.onsuccess=()=>{const db=r.result;const tx=db.transaction(['active_session','history_sessions'],'readwrite');tx.objectStore('active_session').put({key:'current',session:session('old')});tx.objectStore('history_sessions').put(session('old'));tx.oncomplete=()=>{db.close();resolve();};};r.onerror=()=>reject(r.error);});
  expect(await getActiveSessionDb()).toBeNull();expect((await getAllHistorySessionsDb('A'))[0].id).toBe('old');localStorage.setItem('ehs_sync_room','A');expect((await getActiveSessionDb())!.id).toBe('old');
 });
});

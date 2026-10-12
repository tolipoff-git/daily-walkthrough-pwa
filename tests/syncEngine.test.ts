import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest';
import { session,roomServer } from './helpers';
import { SyncEngine } from '../src/utils/syncEngine';
import { wireSession } from '../src/utils/syncProtocol';
const records=vi.hoisted(()=>new Map<string,any>());
const archives=vi.hoisted(()=>new Map<string,Map<string,any>>());
vi.mock('../src/utils/indexedDb',()=>({
 readSyncRecord:vi.fn(async(room:string)=>structuredClone(records.get(room))),
 writeSyncRecord:vi.fn(async(room:string,v:any)=>{records.set(room,structuredClone(v));}),
 getAllHistorySessionsDb:vi.fn(async(room:string)=>[...(archives.get(room)?.values()||[])]),
 saveHistorySessionDb:vi.fn(async(s:any,room:string)=>{if(!archives.has(room))archives.set(room,new Map());archives.get(room)!.set(s.id,structuredClone(s));}),
 deleteHistorySessionDb:vi.fn(async(id:string,room:string)=>archives.get(room)?.delete(id)),
}));
vi.mock('../src/hooks/useHistory',()=>({notifyHistoryStoreChanged:vi.fn()}));
let server:ReturnType<typeof roomServer>;
let route:(url:string,init?:RequestInit)=>Promise<Response>;
function client(room:string){let current=session();let status='';const engine=new SyncEngine(room,{apply:s=>{current=s;},status:s=>{status=s;},synced:vi.fn()});return {engine,get current(){return current;},get status(){return status;}};}
beforeEach(()=>{records.clear();archives.clear();localStorage.clear();Object.defineProperty(navigator,'onLine',{value:true,configurable:true});server=roomServer(session());route=async(url,init)=>{const u=new URL(url,'https://test');const photo=u.pathname.match(/photos\/(.+)$/)?.[1];return server.request(photo?`state?photo=${photo}`:u.pathname.endsWith('/history')?'history'+u.search:'state',init);};vi.stubGlobal('fetch',vi.fn((url,init)=>route(String(url),init)));});
afterEach(()=>vi.unstubAllGlobals());
describe('persistent outbox',()=>{
 it('merges changes from two clients on different fields',async()=>{
  const a=client('PHONE'),b=client('LAPTOP');await a.engine.start(session('blank-a'));await b.engine.start(session('blank-b'));
  const as={...a.current,generalNotes:'phone note'};const bs=structuredClone(b.current);bs.items[0].status='PASS';
  await a.engine.edit(as);await b.engine.edit(bs);await a.engine.tick(true);
  expect(a.current.generalNotes).toBe('phone note');expect(a.current.items[0].status).toBe('PASS');expect(a.status).toBe('synced');
 });
 it('replays offline edits after reload',async()=>{
  const a=client('PHONE');await a.engine.start(session('blank'));Object.defineProperty(navigator,'onLine',{value:false,configurable:true});await a.engine.edit({...a.current,generalNotes:'offline'});a.engine.stop();
  Object.defineProperty(navigator,'onLine',{value:true,configurable:true});const b=client('PHONE');await b.engine.start(session('blank'));
  expect(b.current.generalNotes).toBe('offline');expect(b.status).toBe('synced');expect(records.get('PHONE').queue).toHaveLength(0);
 });
 it('drains a completion submitted while a push is in flight',async()=>{
  const a=client('PHONE');await a.engine.start(session('blank'));const direct=route;let release!:()=>void;let entered!:()=>void;const started=new Promise<void>(r=>entered=r);let hold=true;
  route=async(u,i)=>{if(i?.method==='POST'&&hold){hold=false;entered();await new Promise<void>(r=>release=r);}return direct(u,i);};
  const first=a.engine.edit({...a.current,generalNotes:'editing'});await started;
  const done=a.engine.edit({...a.current,generalNotes:'finished',status:'Completed'});release();await Promise.all([first,done]);
  expect((await(await server.request()).json()).session.status).toBe('Completed');expect(records.get('PHONE').queue).toHaveLength(0);
 });
 it('activates a new walkthrough after completing the previous one',async()=>{
  const a=client('PHONE'),b=client('LAPTOP');await a.engine.start(session('blank'));await b.engine.start(session('blank'));
  await a.engine.force({...a.current,status:'Completed'});await a.engine.force(session('next-walk'));await b.engine.tick(true);
  expect(b.current.id).toBe('next-walk');expect(b.current.status).toBe('In Progress');
  expect(archives.get('PHONE')!.get('walk-1').status).toBe('Completed');
 });
 it('does not queue deletion of the active report',async()=>{
  const a=client('PHONE');await a.engine.start(session('blank'));await a.engine.remove(a.current);
  expect(records.get('PHONE').queue).toHaveLength(0);expect(a.status).toBe('synced');
 });
 it('preserves edits made while server conflict photos are loading',async()=>{
  const a=client('PHONE'),b=client('LAPTOP');await a.engine.start(session('blank'));await b.engine.start(session('blank'));
  const remote=structuredClone(a.current);remote.generalNotes='server';remote.items[0].defectDetails={location:'',description:'',priority:'P2',assignedTo:'Maintenance',targetDate:'Today',resolutionStatus:'Open',photos:[{id:'missing',url:'',timestamp:'now'}]};
  await a.engine.edit(remote);await b.engine.edit({...b.current,generalNotes:'local'});expect(b.status).toBe('conflict');
  let release!:()=>void;let entered!:()=>void;const started=new Promise<void>(r=>entered=r);const direct=route;
  route=async(u,i)=>{if(u.includes('/photos/')){entered();await new Promise<void>(r=>release=r);}return direct(u,i);};
  const resolving=b.engine.resolve('remote');await started;await b.engine.edit({...records.get('LAPTOP').draft,generalNotes:'latest local'});release();await resolving;
  expect(records.get('LAPTOP').queue.length).toBeGreaterThan(0);expect(records.get('LAPTOP').draft.generalNotes).toBe('latest local');expect(b.status).toBe('conflict');
 });
 it('does not initialize over a failed pull',async()=>{const a=client('PHONE');route=async()=>new Response('{}',{status:503});await a.engine.start(session());expect(a.status).toBe('error');expect(vi.mocked(fetch).mock.calls.some(c=>c[1]?.method==='POST')).toBe(false);});
 it('preserves queue after lost ACK and retries idempotently',async()=>{
  const a=client('PHONE');await a.engine.start(session('blank'));const direct=route;let lose=true;route=async(u,i)=>{const response=await direct(u,i);if(i?.method==='POST'&&lose){lose=false;throw new Error('lost ACK');}return response;};
  await a.engine.edit({...a.current,generalNotes:'once'});expect(a.status).toBe('error');const rev=(await(await server.request()).json()).revision;await a.engine.tick(true);
  expect((await(await server.request()).json()).revision).toBe(rev);expect(a.status).toBe('synced');
 });
 it('stopped room cannot apply delayed response',async()=>{const a=client('OLD');let release!:()=>void;const direct=route;route=async(u,i)=>{await new Promise<void>(r=>release=r);return direct(u,i);};const start=a.engine.start(session('blank'));while(!release)await new Promise(r=>setTimeout(r,0));a.engine.stop();release();await start;expect(a.current.id).toBe('blank');});
 it('retains missing photo reference and retries its bytes without a new revision',async()=>{
  const s=session();s.items[0].status='FAIL';s.items[0].defectDetails={location:'',description:'',priority:'P2',assignedTo:'Maintenance',targetDate:'Today',resolutionStatus:'Open',photos:[{id:'p',url:'',caption:'caption',timestamp:'now'}]};server=roomServer(s);
  const a=client('PHONE');await a.engine.start(session('blank'));expect(a.current.items[0].defectDetails!.photos).toHaveLength(1);expect(a.status).toBe('pending');
  await server.request('state?photo=p',{method:'PUT',body:JSON.stringify({id:'p',url:'data:image/png;base64,YQ==',timestamp:'now'})});await a.engine.tick(true);
  expect(a.current.items[0].defectDetails!.photos[0].url).toContain('data:');expect(a.status).toBe('synced');
 });
 it('same-field conflict is retained until explicit resolution',async()=>{
  const a=client('PHONE'),b=client('LAPTOP');await a.engine.start(session('blank'));await b.engine.start(session('blank'));
  await a.engine.edit({...a.current,generalNotes:'phone'});await b.engine.edit({...b.current,generalNotes:'laptop'});expect(b.status).toBe('conflict');expect(records.get('LAPTOP').draft.generalNotes).toBe('laptop');
  await b.engine.resolve('local');expect(b.status).toBe('synced');expect((await(await server.request()).json()).session.generalNotes).toBe('laptop');expect([...archives.get('LAPTOP')!.keys()].some(id=>id.includes('-conflict-'))).toBe(true);
 });
 it('an empty new client adopts the room instead of overwriting it',async()=>{const a=client('PHONE');await a.engine.start(session('new-blank'));expect(a.current.id).toBe('walk-1');expect(wireSession(a.current)).toEqual(wireSession(session()));});
});

import { describe,it,expect } from 'vitest';
import { session,roomServer } from './helpers';
import worker from '../src/worker/index';
const post=(op:unknown)=>({method:'POST',body:JSON.stringify(op)});
describe('durable room protocol',()=>{
 it('migrates legacy snapshot without deleting KV',async()=>{const s=session(),r=roomServer(s);expect(await(await r.request()).json()).toMatchObject({revision:1,session:{id:s.id}});});
 it('merges two clients, detects conflict and deduplicates lost ACK retries',async()=>{
  const b=session(),r=roomServer(b);await r.request();
  const a={id:'a',base:b,session:{...b,generalNotes:'phone'}};
  const first=await(await r.request('state',post(a))).json();
  const replay=await(await r.request('state',post(a))).json();expect(replay).toEqual(first);
  const l=structuredClone(b);l.items[0].status='PASS';
  const second=await(await r.request('state',post({id:'b',base:b,session:l}))).json();expect(second.saved.generalNotes).toBe('phone');expect(second.saved.items[0].status).toBe('PASS');
  expect((await r.request('state',post({id:'c',base:b,session:{...b,generalNotes:'laptop'}}))).status).toBe(409);
 });
 it('cannot replace newer active walkthrough by editing old history',async()=>{
  const b=session(),r=roomServer(b);await r.request();
  const next=session('walk-2');await r.request('state',post({id:'new',base:null,session:next,activateFrom:b.id}));
  const response=await r.request('state',post({id:'old',base:b,session:{...b,generalNotes:'old fix'}}));expect(response.status).toBe(200);
  expect((await(await r.request()).json()).session.id).toBe('walk-2');
 });
 it('archives missed sessions and rejects stale resurrection after deletion',async()=>{
  const b=session(),r=roomServer(b);await r.request();const old=session('old');
  const ack=await(await r.request('state',post({id:'old',base:null,session:old,archive:true}))).json();
  const del=await r.request('state',post({id:'delete',base:ack.saved,session:ack.saved,archive:true,remove:true}));expect(del.status).toBe(200);
  expect((await r.request('state',post({id:'revive',base:ack.saved,session:{...ack.saved,generalNotes:'stale'}}))).status).toBe(409);
  const history=await(await r.request('history')).json();expect(history.sessions.find((s:any)=>s.id==='old').syncDeleted).toBe(true);
 });
 it('stores photo bytes without TTL and rejects ID reuse for different bytes',async()=>{
  const r=roomServer();const photo={id:'p',url:'data:image/png;base64,YQ==',timestamp:'now'};
  expect((await r.request('state?photo=p',{method:'PUT',body:JSON.stringify(photo)})).status).toBe(200);
  expect((await(await r.request('state?photo=p')).json()).url).toBe(photo.url);
  expect((await r.request('state?photo=p',{method:'PUT',body:JSON.stringify({...photo,url:'data:image/png;base64,Yg=='})})).status).toBe(409);
 });
 it('rejects legacy unconditional writes and missing bindings',async()=>{
  const env={ASSETS:{fetch:async()=>new Response('HTML')}};
  expect((await worker.fetch(new Request('https://test/api/sync/session_TEST',post({})),env)).status).toBe(426);
  expect((await worker.fetch(new Request('https://test/api/rooms/TEST/state'),env)).status).toBe(503);
 });
 it('enforces configured access key',async()=>{const env={ASSETS:{fetch:async()=>new Response('HTML')},EHS_SYNC_TOKEN:'test-secret'};expect((await worker.fetch(new Request('https://test/api/rooms/TEST/state'),env)).status).toBe(401);});
 it('returns 400 for malformed JSON',async()=>{const r=roomServer();expect((await r.request('state',{method:'POST',body:'{'})).status).toBe(400);});
});

import { describe,it,expect } from 'vitest';
import { session } from './helpers';
import { mergeSession, wireSession } from '../src/utils/syncProtocol';
describe('three-way merge',()=>{
 it('preserves concurrent edits to distinct items despite reversed device clocks',()=>{
  const b=session(), l=structuredClone(b),r=structuredClone(b);
  l.items[0].status='PASS';r.items[1].status='FAIL';l.updatedAt='2099-01-01T00:00:00Z';r.updatedAt='2000-01-01T00:00:00Z';
  const merged=mergeSession(b,l,r)!;expect(merged.items[0].status).toBe('PASS');expect(merged.items[1].status).toBe('FAIL');
 });
 it('detects simultaneous edits to the same leaf',()=>{ const b=session(),l={...b,generalNotes:'phone'},r={...b,generalNotes:'laptop'};expect(mergeSession(b,l,r)).toBeNull(); });
 it('propagates last-photo deletion without resurrecting evidence',()=>{
  const b=session();b.items[0].defectDetails={location:'',description:'',priority:'P2',assignedTo:'Maintenance',targetDate:'Today',resolutionStatus:'Open',photos:[{id:'p',url:'',timestamp:'now'}]};
  const l=structuredClone(b),r=structuredClone(b);l.items[0].defectDetails!.photos=[];r.generalNotes='other field';
  expect(mergeSession(b,l,r)!.items[0].defectDetails!.photos).toEqual([]);
 });
 it('wire references preserve captions and omit image bytes',()=>{const b=session();b.items[0].defectDetails={location:'',description:'',priority:'P2',assignedTo:'Maintenance',targetDate:'Today',resolutionStatus:'Open',photos:[{id:'p',url:'data:image/png;base64,YQ==',timestamp:'now',caption:'current'}]};expect(wireSession(b).items[0].defectDetails!.photos[0]).toMatchObject({url:'',caption:'current'});});
});

process.env.NODE_ENV = 'test';
import { unstable_dev } from 'wrangler';
import { chromium, expect } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const persistence = await mkdtemp(path.join(tmpdir(), 'ehs-browser-'));
let worker, browser;
const pages = [];
try {
  worker = await unstable_dev('src/worker/index.ts', {
    config: 'wrangler.jsonc', logLevel: 'error', local: true, persist: true, persistTo: persistence, ip: '127.0.0.1', port: 8791,
    experimental: { disableExperimentalWarning: true },
  });
  const origin = `http://${worker.address}:${worker.port}`;
  browser = await chromium.launch({ headless: true, ...(process.env.EHS_CHROMIUM_PATH ? { executablePath: process.env.EHS_CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}) });
  const contexts = await Promise.all([browser.newContext(), browser.newContext({viewport:{width:412,height:915},isMobile:true})]);
  for (const c of contexts) await c.addInitScript(() => localStorage.setItem('ehs_walkthrough_lang','en'));
  const [laptop, phone] = await Promise.all(contexts.map(c=>c.newPage()));
  pages.push(laptop,phone);
  const errors=[];
  for(const [i,page] of [laptop,phone].entries()) {
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',i,m.text());});

  }
  const state = async()=>{const response=await fetch(`${origin}/api/rooms/QA/state`);if(!response.ok)throw new Error(`Worker status ${response.status}: ${await response.text()}`);return response.json();};
  await laptop.goto(`${origin}/?room=QA`);
  await expect.poll(async()=>(await state()).session?.id, {timeout:20000}).toBeTruthy();
  await phone.goto(`${origin}/?room=QA`);
  // The general-notes textarea has a stable id; fail if the UI mapping changes.
  const general = page=>page.locator('#general-notes');
  await expect(general(laptop)).toBeVisible();
  await general(laptop).fill('laptop edit');
  await expect.poll(async()=>(await state()).session.generalNotes,{timeout:15000}).toBe('laptop edit');
  await expect(general(phone)).toHaveValue('laptop edit',{timeout:20000});
  await general(phone).fill('phone edit');
  await expect(general(laptop)).toHaveValue('phone edit',{timeout:20000});
  await phone.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await contexts[1].setOffline(true);
  await general(phone).fill('offline phone edit');
  await expect.poll(async()=>phone.evaluate(async()=>{
    const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('EHS_Walkthrough_DB');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    const record=await new Promise(resolve=>{const r=db.transaction('sync_rooms').objectStore('sync_rooms').get('QA');r.onsuccess=()=>resolve(r.result);});db.close();return record?.queue?.length||0;
  })).toBeGreaterThan(0);
  await phone.reload();
  await expect(general(phone)).toHaveValue('offline phone edit');
  await contexts[1].setOffline(false);
  await expect(general(laptop)).toHaveValue('offline phone edit',{timeout:20000});
  // Both users edit the same field while phone is offline: no silent overwrite.
  await contexts[1].setOffline(true);await general(phone).fill('phone conflicting edit');
  await general(laptop).fill('laptop conflicting edit');await expect.poll(async()=>(await state()).session.generalNotes).toBe('laptop conflicting edit');
  await contexts[1].setOffline(false);
  await expect(phone.getByText(/conflict • QA/)).toBeVisible({timeout:20000});
  await phone.getByText(/conflict • QA/).click();
  await phone.getByRole('button',{name:'Keep my changes',exact:true}).click();
  await expect(general(laptop)).toHaveValue('phone conflicting edit',{timeout:20000});
  await phone.getByRole('button',{name:'Close',exact:true}).last().click();
  // Completing and starting the next walkthrough must update both devices.
  const finishedId = (await state()).session.id;
  await laptop.getByRole('button',{name:'Complete',exact:true}).click();
  await expect.poll(async()=>(await state()).session.status).toBe('Completed');
  await laptop.getByRole('button',{name:'Close',exact:true}).last().click();
  await expect(phone.getByRole('button',{name:'New Walkthrough',exact:true})).toBeVisible({timeout:20000});
  await laptop.getByRole('button',{name:'New Walkthrough',exact:true}).click();
  await expect.poll(async()=>(await state()).session.id).not.toBe(finishedId);
  await expect(general(phone)).toHaveValue('',{timeout:20000});
  const archived = await (await fetch(`${origin}/api/rooms/QA/history`)).json();
  if(archived.sessions.find(s=>s.id===finishedId)?.status !== 'Completed') throw new Error('Completed report missing from shared history');
  // A fresh installation must reload entirely offline after its first visit.
  await laptop.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await contexts[0].setOffline(true);await laptop.reload();
  await expect(general(laptop)).toHaveValue('',{timeout:10000});
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('PASS: real Worker/SQLite + laptop/phone contexts; bidirectional edits, reconnect, conflicts, completion/new walkthrough, first-install offline reload');
} catch (error) {
  console.error('BROWSER FAILURE',error);
  for (const page of pages) console.log('CLIENT', await page.evaluate(async()=>{
    const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('EHS_Walkthrough_DB');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    const record=await new Promise(resolve=>{const r=db.transaction('sync_rooms').objectStore('sync_rooms').get('QA');r.onsuccess=()=>resolve(r.result);});db.close();
    return {status:[...document.querySelectorAll('button')].map(b=>b.innerText).filter(t=>t.includes('QA')),record:record ? {revision:record.revision,queue:record.queue.length,conflict:!!record.conflict,draft:record.draft.id} : null};
  }).catch(e=>({debugError:e.message})));
  throw error;
} finally {
  await browser?.close();await worker?.stop();await rm(persistence,{recursive:true,force:true});
}

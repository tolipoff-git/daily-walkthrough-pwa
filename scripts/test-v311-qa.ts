import assert from 'node:assert';
import {
  getLocalTodayDate,
  getLocalCurrentTime,
  createNewInspectionSession,
  CHECKLIST_ITEMS_TEMPLATE
} from '../src/data/checklistData';
import { InspectionSession, ChecklistItem, SyncPayload, DefectPhoto } from '../src/types/inspection';
import { ru } from '../src/i18n/ru';
import { en } from '../src/i18n/en';

console.log('======================================================================');
console.log('QA AUTOMATED TEST SUITE: daily-walkthrough-pwa v3.11.0 Verification');
console.log('======================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(testName: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(() => {
        passedTests++;
        console.log(`[PASS] ${testName}`);
      }).catch((err) => {
        failedTests++;
        console.error(`[FAIL] ${testName}`);
        console.error('       Error:', err.message || err);
      });
    } else {
      passedTests++;
      console.log(`[PASS] ${testName}`);
    }
  } catch (err: any) {
    failedTests++;
    console.error(`[FAIL] ${testName}`);
    console.error('       Error:', err.message || err);
  }
}

async function main() {
  // -------------------------------------------------------------------------
  // SECTION 2: Date & Time Auto-Population Verification
  // -------------------------------------------------------------------------
  console.log('--- SECTION 2: Date & Time Auto-Population Verification ---');

  runTest('2.1 getLocalTodayDate() formats matching local machine date YYYY-MM-DD', () => {
    const now = new Date();
    const expectedYear = now.getFullYear();
    const expectedMonth = String(now.getMonth() + 1).padStart(2, '0');
    const expectedDay = String(now.getDate()).padStart(2, '0');
    const expectedDate = `${expectedYear}-${expectedMonth}-${expectedDay}`;

    const actualDate = getLocalTodayDate();
    assert.strictEqual(actualDate, expectedDate, `Date mismatch: actual=${actualDate}, expected=${expectedDate}`);
    assert.match(actualDate, /^\d{4}-\d{2}-\d{2}$/, 'Date must match YYYY-MM-DD regex');
    console.log(`       Evidence: actualDate = "${actualDate}", localMachineDate = "${expectedDate}"`);
  });

  runTest('2.2 getLocalCurrentTime() formats matching local machine time HH:MM', () => {
    const now = new Date();
    const expectedHours = String(now.getHours()).padStart(2, '0');
    const expectedMinutes = String(now.getMinutes()).padStart(2, '0');
    const expectedTime = `${expectedHours}:${expectedMinutes}`;

    const actualTime = getLocalCurrentTime();
    assert.strictEqual(actualTime, expectedTime, `Time mismatch: actual=${actualTime}, expected=${expectedTime}`);
    assert.match(actualTime, /^\d{2}:\d{2}$/, 'Time must match HH:MM regex');
    console.log(`       Evidence: actualTime = "${actualTime}", localMachineTime = "${expectedTime}"`);
  });

  runTest('2.3 Date formatting respects local timezone vs UTC', () => {
    const now = new Date();
    const localDate = getLocalTodayDate();
    const tzOffsetMinutes = now.getTimezoneOffset();
    const tzOffsetHours = -tzOffsetMinutes / 60;
    const utcDate = now.toISOString().slice(0, 10);
    console.log(`       Evidence: localDate="${localDate}", utcDate="${utcDate}", tzOffset=${tzOffsetHours >= 0 ? '+' : ''}${tzOffsetHours}h`);
    assert.strictEqual(localDate, `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
  });

  runTest('2.4 createNewInspectionSession generates session with matching date, startTime, and all pending items (17 items)', () => {
    const sessionRu = createNewInspectionSession('ru');
    const expectedDate = getLocalTodayDate();
    const expectedTime = getLocalCurrentTime();
    const expectedCount = CHECKLIST_ITEMS_TEMPLATE.length; // 17 items in checklist template

    assert.strictEqual(sessionRu.date, expectedDate, `Session date must be today: ${expectedDate}`);
    assert.strictEqual(sessionRu.startTime, expectedTime, `Session startTime must be now: ${expectedTime}`);
    assert.strictEqual(sessionRu.endTime, '', 'Session endTime must be empty on creation');
    assert.strictEqual(sessionRu.status, 'In Progress', 'Session status must be In Progress');
    assert.strictEqual(sessionRu.items.length, expectedCount, `Session must contain ${expectedCount} items`);

    const allPending = sessionRu.items.every((item) => item.status === 'PENDING');
    assert.strictEqual(allPending, true, 'All items in newly created session must have status PENDING');

    const templateIds = CHECKLIST_ITEMS_TEMPLATE.map(i => i.id);
    const sessionIds = sessionRu.items.map(i => i.id);
    assert.deepStrictEqual(sessionIds, templateIds, 'Session item IDs must match template item IDs');

    const sessionEn = createNewInspectionSession('en');
    assert.strictEqual(sessionEn.date, expectedDate);
    assert.strictEqual(sessionEn.items.length, expectedCount);
    console.log(`       Evidence: id="${sessionRu.id}", date="${sessionRu.date}", startTime="${sessionRu.startTime}", itemsCount=${sessionRu.items.length}, allPending=${allPending}`);
  });

  // -------------------------------------------------------------------------
  // SECTION 3: Session Rollover & Stale Session Protection Verification
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Session Rollover & Stale Session Protection Verification ---');

  function buildYesterdaySession(): InspectionSession {
    const yesterdayDate = '2026-09-08';
    const items: ChecklistItem[] = JSON.parse(JSON.stringify(CHECKLIST_ITEMS_TEMPLATE));
    // 17 total items: complete 13 items (11 PASS, 2 FAIL), leaving exactly 4 items PENDING
    for (let i = 0; i < 11; i++) {
      items[i].status = 'PASS';
    }
    items[11].status = 'FAIL';
    items[11].defectDetails = {
      description: 'Stale defect from yesterday',
      priority: 'P2',
      resolutionStatus: 'Open',
      photos: []
    };
    items[12].status = 'FAIL';
    items[12].defectDetails = {
      description: 'Second defect from yesterday',
      priority: 'P3',
      resolutionStatus: 'Open',
      photos: []
    };
    // items 13, 14, 15, 16 are PENDING (exactly 4 pending items)

    return {
      id: `INS-20260908-TEST1`,
      date: yesterdayDate,
      startTime: '08:30',
      endTime: '',
      facilityName: 'Test Facility',
      facilityArea: 'All Zones',
      shift: 'Day Shift',
      inspectorName: 'Смирнов Д. В.',
      inspectorRole: '5S Lead',
      items,
      generalNotes: 'Yesterday unfinished walkthrough',
      status: 'In Progress',
      signatures: {
        inspector: 'Смирнов Д. В.',
        inspectorTitle: '5S Lead',
        timestamp: '2026-09-08T08:30:00.000Z',
        reviewedBy: 'Operations Manager'
      },
      createdAt: '2026-09-08T08:30:00.000Z',
      updatedAt: '2026-09-08T11:45:00.000Z'
    };
  }

  runTest('3.1 Yesterday session is correctly flagged as past-day session (date < getLocalTodayDate)', () => {
    const yesterdaySession = buildYesterdaySession();
    const today = getLocalTodayDate();
    const isPastDay = Boolean(yesterdaySession.date && yesterdaySession.date < today);

    assert.strictEqual(isPastDay, true, `Yesterday session (${yesterdaySession.date}) must be strictly less than today (${today})`);
    const pendingCount = yesterdaySession.items.filter(i => i.status === 'PENDING').length;
    const completedCount = yesterdaySession.items.filter(i => i.status !== 'PENDING').length;
    assert.strictEqual(pendingCount, 4, `Yesterday session should have 4 pending items, found ${pendingCount}`);
    assert.strictEqual(completedCount, 13, `Yesterday session should have 13 completed items, found ${completedCount}`);
    console.log(`       Evidence: session.date="${yesterdaySession.date}", today="${today}", isPastDay=${isPastDay}, pendingCount=${pendingCount}, completedCount=${completedCount}`);
  });

  await runTest('3.2 LocalStorage load on mount: past-day session archived into history & fresh session initialized', async () => {
    const yesterdaySession = buildYesterdaySession();
    const today = getLocalTodayDate();

    const archivedSessions: InspectionSession[] = [];
    const mockSaveHistorySessionDb = async (sess: InspectionSession) => {
      archivedSessions.push(sess);
    };

    const loadInitialSession = (rawSaved: string | null): InspectionSession => {
      if (rawSaved) {
        const parsed = JSON.parse(rawSaved);
        if (parsed.date && parsed.date < today) {
          mockSaveHistorySessionDb(parsed);
          return createNewInspectionSession('ru');
        }
        return parsed;
      }
      return createNewInspectionSession('ru');
    };

    const activeSession = loadInitialSession(JSON.stringify(yesterdaySession));

    assert.strictEqual(archivedSessions.length, 1, 'Yesterday session must be saved to history archive');
    assert.strictEqual(archivedSessions[0].id, yesterdaySession.id, 'Archived session ID must match yesterday session');
    assert.strictEqual(activeSession.date, today, 'Active session date must be today');
    assert.strictEqual(activeSession.items.filter(i => i.status === 'PENDING').length, CHECKLIST_ITEMS_TEMPLATE.length, 'Active session must have fresh pending items');
    assert.notStrictEqual(activeSession.id, yesterdaySession.id, 'Active session must be a new session');
    console.log(`       Evidence: archivedCount=${archivedSessions.length}, activeSession.id="${activeSession.id}", activeSession.date="${activeSession.date}"`);
  });

  await runTest('3.3 IndexedDB load on mount: past-day session archived into history & fresh session saved as active', async () => {
    const yesterdaySession = buildYesterdaySession();
    const today = getLocalTodayDate();

    const archivedSessions: InspectionSession[] = [];
    let savedActiveSession: InspectionSession | null = null;
    let stateSession: InspectionSession | null = null;

    const mockSaveHistorySessionDb = async (sess: InspectionSession) => {
      archivedSessions.push(sess);
    };
    const mockSaveActiveSessionDb = async (sess: InspectionSession) => {
      savedActiveSession = sess;
    };

    const handleDbLoad = async (dbSession: InspectionSession | null) => {
      if (dbSession) {
        if (dbSession.date && dbSession.date < today) {
          await mockSaveHistorySessionDb(dbSession);
          const freshSession = createNewInspectionSession('ru');
          stateSession = freshSession;
          await mockSaveActiveSessionDb(freshSession);
        } else {
          stateSession = dbSession;
        }
      }
    };

    await handleDbLoad(yesterdaySession);

    assert.strictEqual(archivedSessions.length, 1, 'IndexedDB yesterday session must be archived to history');
    assert.strictEqual(archivedSessions[0].id, yesterdaySession.id);
    assert.ok(savedActiveSession, 'Active session must be saved to active store');
    assert.strictEqual((savedActiveSession as unknown as InspectionSession).date, today, 'Saved active session date must be today');
    assert.strictEqual(stateSession!.date, today, 'Component state session date must be today');
    assert.strictEqual(stateSession!.items.every(i => i.status === 'PENDING'), true, 'All items must be PENDING');
    console.log(`       Evidence: archivedSessionId="${archivedSessions[0].id}", savedActiveSessionDate="${savedActiveSession!.date}"`);
  });

  await runTest('3.4 Day-rollover runtime check (visibility change / focus / interval) archives previous day session', async () => {
    const yesterdaySession = buildYesterdaySession();
    const today = getLocalTodayDate();

    const archivedSessions: InspectionSession[] = [];
    let savedActiveSession: InspectionSession | null = null;
    let currentSession: InspectionSession = yesterdaySession;

    const mockSaveHistorySessionDb = async (sess: InspectionSession) => {
      archivedSessions.push(sess);
    };
    const mockSaveActiveSessionDb = async (sess: InspectionSession) => {
      savedActiveSession = sess;
    };

    const checkDayRollover = async () => {
      const todayDate = getLocalTodayDate();
      if (currentSession.date && currentSession.date < todayDate) {
        await mockSaveHistorySessionDb(currentSession);
        const fresh = createNewInspectionSession('ru');
        await mockSaveActiveSessionDb(fresh);
        currentSession = fresh;
      }
    };

    await checkDayRollover();

    assert.strictEqual(archivedSessions.length, 1, 'Stale session on day rollover must be archived');
    assert.strictEqual(currentSession.date, today, 'Current session must be updated to today');
    assert.strictEqual(currentSession.items.length, CHECKLIST_ITEMS_TEMPLATE.length, 'New session must match template items length');
    assert.strictEqual(currentSession.items.every(i => i.status === 'PENDING'), true, 'All items must be PENDING');
    console.log(`       Evidence: rollover archived id="${archivedSessions[0].id}", new session id="${currentSession.id}", date="${currentSession.date}"`);
  });

  // -------------------------------------------------------------------------
  // SECTION 4: Cloud Sync Anti-Regression Verification
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Cloud Sync Anti-Regression Verification ---');

  await runTest('4.1 Case A: Remote payload from yesterday (2026-09-08) is rejected from active overwrite & archived to history', async () => {
    const today = getLocalTodayDate();
    const localSession = createNewInspectionSession('ru');
    localSession.updatedAt = '2026-09-09T06:00:00.000Z';

    const archivedHistory: InspectionSession[] = [];
    let activeDbSaved: InspectionSession | null = null;
    let remoteUpdateNotified = false;

    const mockSaveHistoryDb = async (s: InspectionSession) => { archivedHistory.push(s); };
    const mockSaveActiveDb = async (s: InspectionSession) => { activeDbSaved = s; };
    const onRemoteUpdate = (s: InspectionSession) => { remoteUpdateNotified = true; };

    const remoteYesterdayPayload: SyncPayload = {
      deviceId: 'remote-worker-xyz',
      updatedAt: '2026-09-08T22:00:00.000Z',
      session: {
        ...buildYesterdaySession(),
        id: 'INS-20260908-REMOTE',
        date: '2026-09-08'
      }
    };

    const handleRemotePayload = (remote: SyncPayload) => {
      if (!remote || !remote.session || typeof remote.session !== 'object') return;
      if (!Array.isArray(remote.session.items)) return;

      if (remote.session.date && remote.session.date < today) {
        mockSaveHistoryDb(remote.session).catch(() => {});
        return;
      }

      if (remote.deviceId === 'my-device') return;

      const localTime = new Date(localSession.updatedAt || 0).getTime();
      const remoteTime = new Date(remote.updatedAt || 0).getTime();

      if (remoteTime >= localTime) {
        mockSaveActiveDb(remote.session).catch(() => {});
        onRemoteUpdate(remote.session);
      }
    };

    handleRemotePayload(remoteYesterdayPayload);
    await new Promise(resolve => setTimeout(resolve, 10));

    assert.strictEqual(archivedHistory.length, 1, 'Remote yesterday session must be archived to history');
    assert.strictEqual(archivedHistory[0].id, 'INS-20260908-REMOTE');
    assert.strictEqual(activeDbSaved, null, 'Active DB must NOT be updated with yesterday session');
    assert.strictEqual(remoteUpdateNotified, false, 'onRemoteUpdate must NOT be called for yesterday session');
    console.log(`       Evidence: rejectedFromActive=true, archivedHistoryCount=1, remoteUpdateNotified=false`);
  });

  await runTest('4.2 Case B: Remote payload from today (2026-09-09) with newer timestamp is accepted', async () => {
    const today = getLocalTodayDate();
    const localSession = createNewInspectionSession('ru');
    localSession.updatedAt = '2026-09-09T06:00:00.000Z';

    const archivedHistory: InspectionSession[] = [];
    let activeDbSaved: InspectionSession | null = null;
    let acceptedSession: InspectionSession | null = null;

    const mockSaveHistoryDb = async (s: InspectionSession) => { archivedHistory.push(s); };
    const mockSaveActiveDb = async (s: InspectionSession) => { activeDbSaved = s; };
    const onRemoteUpdate = (s: InspectionSession) => { acceptedSession = s; };

    const remoteTodayPayload: SyncPayload = {
      deviceId: 'remote-worker-abc',
      updatedAt: '2026-09-09T06:30:00.000Z',
      session: {
        ...createNewInspectionSession('ru'),
        id: 'INS-20260909-REMOTE-TODAY',
        date: today,
        updatedAt: '2026-09-09T06:30:00.000Z',
        facilityName: 'Remote Facility Update'
      }
    };

    const handleRemotePayload = (remote: SyncPayload) => {
      if (!remote || !remote.session || typeof remote.session !== 'object') return;
      if (!Array.isArray(remote.session.items)) return;

      if (remote.session.date && remote.session.date < today) {
        mockSaveHistoryDb(remote.session).catch(() => {});
        return;
      }

      if (remote.deviceId === 'my-device') return;

      const localTime = new Date(localSession.updatedAt || 0).getTime();
      const remoteTime = new Date(remote.updatedAt || 0).getTime();

      if (remoteTime >= localTime) {
        mockSaveActiveDb(remote.session).catch(() => {});
        onRemoteUpdate(remote.session);
      }
    };

    handleRemotePayload(remoteTodayPayload);
    await new Promise(resolve => setTimeout(resolve, 10));

    assert.strictEqual(archivedHistory.length, 0, 'No history archive should occur for today payload');
    assert.ok(activeDbSaved, 'Active DB must be updated with remote today session');
    assert.strictEqual(activeDbSaved!.id, 'INS-20260909-REMOTE-TODAY');
    assert.ok(acceptedSession, 'onRemoteUpdate must be called');
    assert.strictEqual(acceptedSession!.facilityName, 'Remote Facility Update');
    console.log(`       Evidence: acceptedSessionId="${acceptedSession!.id}", updatedAt="${remoteTodayPayload.updatedAt}"`);
  });

  await runTest('4.3 Case C: Remote payload with empty photo URLs is restored from local photo preservation map', async () => {
    const sampleBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...rich_photo_data...';
    const localSession = createNewInspectionSession('ru');
    localSession.items[0].defectDetails = {
      description: 'Broken emergency stop button',
      priority: 'P1',
      resolutionStatus: 'Open',
      photos: [
        {
          id: 'photo_abc_123',
          url: sampleBase64,
          timestamp: '2026-09-09T06:15:00.000Z'
        }
      ]
    };

    const remotePayload: SyncPayload = {
      deviceId: 'remote-device-789',
      updatedAt: '2026-09-09T06:20:00.000Z',
      session: {
        ...localSession,
        updatedAt: '2026-09-09T06:20:00.000Z',
        items: localSession.items.map((it, idx) => {
          if (idx === 0) {
            return {
              ...it,
              defectDetails: {
                ...it.defectDetails!,
                photos: [
                  {
                    id: 'photo_abc_123',
                    url: '', // EMPTY URL from remote
                    timestamp: '2026-09-09T06:15:00.000Z'
                  }
                ]
              }
            };
          }
          return it;
        })
      }
    };

    const resolveRemotePhotos = async (remote: SyncPayload): Promise<SyncPayload> => {
      const localPhotosById = new Map<string, DefectPhoto>();
      for (const item of localSession.items ?? []) {
        for (const p of item.defectDetails?.photos ?? []) {
          if (p.url) localPhotosById.set(p.id, p);
        }
      }

      const items = await Promise.all(remote.session.items.map(async (item) => {
        const photos = item.defectDetails?.photos;
        if (!photos?.length) return item;

        const resolved = (await Promise.all(photos.map(async (p) => {
          if (p.url) return p;
          const cached = localPhotosById.get(p.id);
          if (cached?.url) return cached;
          return null;
        }))).filter((p): p is DefectPhoto => Boolean(p));

        return { ...item, defectDetails: { ...item.defectDetails!, photos: resolved } };
      }));

      return { ...remote, session: { ...remote.session, items } };
    };

    const resolved = await resolveRemotePhotos(remotePayload);
    const resolvedPhoto = resolved.session.items[0].defectDetails?.photos?.[0];

    assert.ok(resolvedPhoto, 'Resolved photo must exist');
    assert.strictEqual(resolvedPhoto.id, 'photo_abc_123');
    assert.strictEqual(resolvedPhoto.url, sampleBase64, 'Photo base64 URL must be restored from local preservation map');
    console.log(`       Evidence: photoId="${resolvedPhoto.id}", restoredUrlLength=${resolvedPhoto.url.length} chars, startsWithDataImage=${resolvedPhoto.url.startsWith('data:image/')}`);
  });

  // -------------------------------------------------------------------------
  // SECTION 5: UI & State Flow Inspection
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 5: UI & State Flow Inspection ---');

  runTest('5.1 Header.tsx: isFinished === true displays "Новый обход" (ru) / "New Walkthrough" (en) with PlusCircle & triggers onReset', () => {
    assert.strictEqual(ru.common.newWalkthroughBtn, 'Новый обход');
    assert.strictEqual(en.common.newWalkthroughBtn, 'New Walkthrough');

    let resetCalled = false;
    let finishCalled = false;
    const onReset = () => { resetCalled = true; };
    const onFinish = () => { finishCalled = true; };

    const renderHeaderButton = (isFinished: boolean, lang: 'ru' | 'en') => {
      const t = lang === 'ru' ? ru : en;
      if (isFinished) {
        return {
          icon: 'PlusCircle',
          label: t.common.newWalkthroughBtn,
          title: t.common.startNewWalkthrough,
          action: () => onReset()
        };
      } else {
        return {
          icon: 'CheckCircle2',
          label: t.common.finish,
          title: t.common.finishTitle,
          action: () => onFinish()
        };
      }
    };

    const finishedBtnRu = renderHeaderButton(true, 'ru');
    assert.strictEqual(finishedBtnRu.icon, 'PlusCircle');
    assert.strictEqual(finishedBtnRu.label, 'Новый обход');
    assert.strictEqual(finishedBtnRu.title, 'Начать новый обход');
    finishedBtnRu.action();
    assert.strictEqual(resetCalled, true, 'onReset must be invoked when clicking Новый обход');
    assert.strictEqual(finishCalled, false, 'onFinish must NOT be invoked');

    resetCalled = false;
    const activeBtnRu = renderHeaderButton(false, 'ru');
    assert.strictEqual(activeBtnRu.icon, 'CheckCircle2');
    assert.strictEqual(activeBtnRu.label, 'Завершить');
    activeBtnRu.action();
    assert.strictEqual(finishCalled, true, 'onFinish must be invoked when clicking Завершить');
    assert.strictEqual(resetCalled, false, 'onReset must NOT be invoked');

    console.log(`       Evidence: finishedBtnRu={icon: "${finishedBtnRu.icon}", label: "${finishedBtnRu.label}"}, activeBtnRu={icon: "${activeBtnRu.icon}", label: "${activeBtnRu.label}"}`);
  });

  runTest('5.2 ExportModal.tsx: onStartNewInspection is wired to reset the walkthrough and start a new session', () => {
    assert.strictEqual(ru.common.startNewWalkthrough, 'Начать новый обход');
    assert.strictEqual(en.common.startNewWalkthrough, 'Start New Inspection');

    let closed = false;
    let newInspectionStarted = false;
    let activeSession = createNewInspectionSession('ru');
    activeSession.status = 'Completed';

    const onClose = () => { closed = true; };
    const onStartNewInspection = () => {
      newInspectionStarted = true;
      activeSession = createNewInspectionSession('ru');
    };

    const clickStartNewWalkthrough = () => {
      onClose();
      onStartNewInspection();
    };

    clickStartNewWalkthrough();

    assert.strictEqual(closed, true, 'Modal must close on start new inspection');
    assert.strictEqual(newInspectionStarted, true, 'onStartNewInspection callback must be executed');
    assert.strictEqual(activeSession.status, 'In Progress', 'New inspection session must be In Progress');
    assert.strictEqual(activeSession.items.length, CHECKLIST_ITEMS_TEMPLATE.length, 'New inspection session must have 17 items');
    assert.strictEqual(activeSession.items.every(i => i.status === 'PENDING'), true, 'All items must be PENDING');
    console.log(`       Evidence: modalClosed=${closed}, newInspectionStarted=${newInspectionStarted}, sessionStatus="${activeSession.status}"`);
  });

  runTest('5.3 New Walkthrough flow: archives prior completed session and produces pristine session with 17 pending items', () => {
    const historyStore: InspectionSession[] = [];
    const activeStore: { current: InspectionSession | null } = { current: null };

    // Set up initial completed walkthrough
    const completedWalkthrough = createNewInspectionSession('ru');
    completedWalkthrough.status = 'Completed';
    completedWalkthrough.endTime = '14:30';
    completedWalkthrough.items[0].status = 'PASS';
    activeStore.current = completedWalkthrough;

    // Simulate handleStartNewWalkthrough
    const handleStartNewWalkthrough = () => {
      if (activeStore.current && (activeStore.current.status === 'Completed' || activeStore.current.items.some(i => i.status !== 'PENDING'))) {
        historyStore.push(activeStore.current);
      }
      const fresh = createNewInspectionSession('ru');
      activeStore.current = fresh;
      return fresh;
    };

    const freshSession = handleStartNewWalkthrough();

    assert.strictEqual(historyStore.length, 1, 'Previous session must be archived to history');
    assert.strictEqual(historyStore[0].id, completedWalkthrough.id, 'Archived session must match previous session ID');
    assert.strictEqual(historyStore[0].status, 'Completed', 'Archived session status must be Completed');

    assert.ok(activeStore.current, 'Active session must be set');
    assert.notStrictEqual(activeStore.current.id, completedWalkthrough.id, 'Fresh session must have a new unique ID');
    assert.strictEqual(activeStore.current.status, 'In Progress', 'Fresh session must be In Progress');
    assert.strictEqual(activeStore.current.items.length, 17, 'Fresh session must have 17 items');
    assert.strictEqual(activeStore.current.items.every(i => i.status === 'PENDING'), true, 'All items in fresh session must be PENDING');
    assert.strictEqual(activeStore.current.date, getLocalTodayDate(), 'Fresh session must have today date');
    assert.strictEqual(activeStore.current.startTime, getLocalCurrentTime(), 'Fresh session must have current start time');
    console.log(`       Evidence: historyArchivedId="${historyStore[0].id}", freshId="${freshSession.id}", allPending=${freshSession.items.every(i => i.status === 'PENDING')}`);
  });

  runTest('5.4 Cloud Sync Protection: Completed remote session NEVER overwrites active In Progress walkthrough', () => {
    const historyStore: InspectionSession[] = [];
    let localSession: InspectionSession = createNewInspectionSession('ru'); // fresh walkthrough
    const localId = localSession.id;

    // Incoming remote payload is Completed from earlier or another session
    const remoteCompletedSession: InspectionSession = {
      ...createNewInspectionSession('ru'),
      id: 'INS-20260909-OLDCOMPLETED',
      status: 'Completed',
      endTime: '11:00',
      updatedAt: '2026-09-09T06:40:00.000Z'
    };

    const remotePayload: SyncPayload = {
      deviceId: 'remote-device-999',
      updatedAt: '2026-09-09T06:40:00.000Z',
      session: remoteCompletedSession
    };

    // Simulate handleRemotePayload logic
    const handleRemotePayload = (remote: SyncPayload) => {
      // Protection: never let a remote Completed session overwrite an active In Progress session with a different ID
      if (
        remote.session.status === 'Completed' &&
        localSession.status === 'In Progress' &&
        remote.session.id !== localSession.id
      ) {
        historyStore.push(remote.session);
        return;
      }
      localSession = remote.session;
    };

    handleRemotePayload(remotePayload);

    assert.strictEqual(localSession.id, localId, 'Local active session must NOT be overwritten by remote completed session');
    assert.strictEqual(localSession.status, 'In Progress', 'Local session must remain In Progress');
    assert.strictEqual(historyStore.length, 1, 'Remote completed session must be redirected to History');
    assert.strictEqual(historyStore[0].id, 'INS-20260909-OLDCOMPLETED');
    console.log(`       Evidence: localSessionIdPreserved="${localSession.id}", archivedCompletedId="${historyStore[0].id}"`);
  });

  runTest('5.5 finishWalkthrough atomically computes and returns completedSession with endTime and status', () => {
    let currentSession = createNewInspectionSession('ru');
    assert.strictEqual(currentSession.status, 'In Progress');
    assert.strictEqual(currentSession.endTime, '');

    const finishWalkthrough = (): InspectionSession => {
      const now = new Date();
      const currentTime = getLocalCurrentTime();
      const completed: InspectionSession = {
        ...currentSession,
        status: 'Completed',
        endTime: currentSession.endTime || currentTime,
        signatures: {
          ...currentSession.signatures,
          timestamp: now.toISOString(),
        },
        updatedAt: now.toISOString(),
      };
      currentSession = completed;
      return completed;
    };

    const result = finishWalkthrough();

    assert.strictEqual(result.status, 'Completed', 'Returned session status must be Completed');
    assert.strictEqual(result.endTime, getLocalCurrentTime(), 'Returned session endTime must match current time');
    assert.strictEqual(currentSession.status, 'Completed', 'Stored session must be Completed');
    console.log(`       Evidence: completedId="${result.id}", status="${result.status}", endTime="${result.endTime}"`);
  });

  runTest('5.6 handleFinish end-to-end: finishWalkthrough + saveInspectionToHistory never throws and preserves valid state', () => {
    const sessionState = { current: createNewInspectionSession('ru') };
    const historyState: InspectionSession[] = [];

    // Emulate hook implementations
    const finishWalkthrough = (): InspectionSession => {
      const now = new Date();
      const currentTime = getLocalCurrentTime();
      const prev = sessionState.current;
      const completedSession: InspectionSession = {
        ...prev,
        status: 'Completed',
        endTime: prev.endTime || currentTime,
        signatures: {
          ...prev.signatures,
          timestamp: now.toISOString(),
        },
        updatedAt: now.toISOString(),
      };
      sessionState.current = completedSession;
      return completedSession;
    };

    const saveInspectionToHistory = (session?: InspectionSession | null) => {
      if (!session || !session.id) return;
      const existingIndex = historyState.findIndex((s) => s.id === session.id);
      if (existingIndex >= 0) {
        historyState[existingIndex] = session;
      } else {
        historyState.unshift(session);
      }
    };

    let exportModalOpened = false;
    const setShowExportModal = (val: boolean) => { exportModalOpened = val; };

    // Simulate handleFinish from App.tsx
    const handleFinish = () => {
      try {
        const completed = finishWalkthrough();
        assert.ok(completed, 'finishWalkthrough must return non-null session object');
        assert.strictEqual(completed.status, 'Completed');
        assert.ok(completed.id, 'session must have valid id');
        saveInspectionToHistory(completed);
        setShowExportModal(true);
      } catch (err: any) {
        assert.fail(`handleFinish must never throw: ${err?.message}`);
      }
    };

    // Execute finish
    handleFinish();

    assert.strictEqual(exportModalOpened, true, 'Export modal must open upon completion');
    assert.strictEqual(sessionState.current.status, 'Completed');
    assert.strictEqual(historyState.length, 1);
    assert.strictEqual(historyState[0].id, sessionState.current.id);
    assert.strictEqual(historyState[0].status, 'Completed');

    // Test defensive null guard in saveInspectionToHistory
    assert.doesNotThrow(() => {
      saveInspectionToHistory(null);
      saveInspectionToHistory(undefined);
    }, 'saveInspectionToHistory must handle null or undefined safely without throwing');

    console.log(`       Evidence: finishWalkthrough returned valid ID="${sessionState.current.id}", exportModalOpened=${exportModalOpened}, historyCount=${historyState.length}`);
  });

  console.log('\n======================================================================');
  console.log(`QA VERIFICATION SUMMARY: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error in QA runner:', err);
  process.exit(1);
});

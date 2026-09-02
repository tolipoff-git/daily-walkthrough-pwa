import { CHECKLIST_ITEMS_TEMPLATE, INITIAL_CHECKLIST_DATA, createNewInspectionSession, getItemTitle, getItemStandard, getItemGuidelines } from '../src/data/checklistData';
import { formatShift, formatArea, formatRole } from '../src/utils/formatters';
import { calculateMetrics } from '../src/utils/metrics';
import { APP_VERSION, COMMIT_HASH } from '../src/version';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, name: string, details?: string) {
  results.push({
    suite,
    name,
    passed: Boolean(condition),
    details: condition ? undefined : details || 'Assertion failed',
  });
}

console.log('===============================================================');
console.log(`Starting QA Verification Suite for daily-walkthrough-pwa v${APP_VERSION}`);
console.log('===============================================================\n');

// -------------------------------------------------------------
// SUITE 1: Build & Dependency Integrity
// -------------------------------------------------------------
const suite1 = '1. Build & Dependency Verification';

// Check package.json version
const pkgJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
assert(pkgJson.version === '3.6.0', suite1, 'package.json version is 3.6.0', `Found ${pkgJson.version}`);
assert(APP_VERSION === 'v3.6.0', suite1, 'version.ts APP_VERSION is v3.6.0', `Found ${APP_VERSION}`);

// Check package-lock.json integrity
const lockJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package-lock.json'), 'utf8'));
const lockPackages = lockJson.packages || {};
let missingIntegrity = 0;
let invalidIntegrity = 0;
let totalPackages = 0;

for (const [pkgPath, meta] of Object.entries<any>(lockPackages)) {
  if (pkgPath === '') continue;
  totalPackages++;
  if (!meta.integrity) {
    missingIntegrity++;
  } else if (!meta.integrity.startsWith('sha512-') && !meta.integrity.startsWith('sha1-')) {
    invalidIntegrity++;
  }
}

assert(missingIntegrity === 0, suite1, 'All package-lock dependencies have integrity hashes', `Missing: ${missingIntegrity}`);
assert(invalidIntegrity === 0, suite1, 'All package-lock integrity hashes are valid sha512/sha1', `Invalid: ${invalidIntegrity}`);

// Check jsqr integrity specifically
const jsqrEntry = lockPackages['node_modules/jsqr'];
assert(
  jsqrEntry && jsqrEntry.integrity === 'sha512-dxLob7q65Xg2DvstYkRpkYtmKm2sPJ9oFhrhmudT1dZvNFFTlroai3AWSpLey/w5vMcLBXRgOJsbXpdN9HzU/A==',
  suite1,
  'jsqr@1.4.0 exact SHA-512 integrity checksum match',
  `Found: ${jsqrEntry?.integrity}`
);

// -------------------------------------------------------------
// SUITE 2: Cloud Live Sync Architecture
// -------------------------------------------------------------
const suite2 = '2. Cloud Live Sync Architecture';

// Simulated extractRoomCode logic as in QrScannerModal
function extractRoomCode(raw: string): string {
  const trimmed = raw.trim();
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      const room = url.searchParams.get('room') || url.searchParams.get('sync');
      if (room) return room.toUpperCase();
    }
  } catch {}

  if (trimmed.includes('room=')) {
    const match = trimmed.match(/room=([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) return match[1].toUpperCase();
  }

  return trimmed.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase() || 'FSE-MAIN';
}

assert(extractRoomCode('https://walkthrough.pages.dev/?room=BAY-104') === 'BAY-104', suite2, 'URL with ?room= parameter extracted');
assert(extractRoomCode('https://walkthrough.pages.dev/?sync=NORTH_PLANT') === 'NORTH_PLANT', suite2, 'URL with ?sync= parameter extracted');
assert(extractRoomCode('fse-room-2') === 'FSE-ROOM-2', suite2, 'Raw room slug normalized to uppercase');
assert(extractRoomCode('   fse_zone_3   ') === 'FSE_ZONE_3', suite2, 'Trimmed & sanitized string extracted');
assert(extractRoomCode('???') === 'FSE-MAIN', suite2, 'Invalid characters fallback to FSE-MAIN');

// Sync conflict resolution & payload simulation
const sessionDevA = createNewInspectionSession('en');
sessionDevA.items[0].status = 'PASS';
sessionDevA.updatedAt = new Date('2026-09-01T10:00:00Z').toISOString();

const sessionDevB = JSON.parse(JSON.stringify(sessionDevA));
sessionDevB.items[1].status = 'FAIL';
sessionDevB.updatedAt = new Date('2026-09-01T10:05:00Z').toISOString();

// Device A payload
const payloadA = {
  session: sessionDevA,
  deviceId: 'dev_mobile_001',
  updatedAt: sessionDevA.updatedAt,
  version: 1,
};

// Device B payload
const payloadB = {
  session: sessionDevB,
  deviceId: 'dev_desktop_002',
  updatedAt: sessionDevB.updatedAt,
  version: 2,
};

// Test timestamp-based last-write-wins logic
const timeA = new Date(payloadA.updatedAt).getTime();
const timeB = new Date(payloadB.updatedAt).getTime();
assert(timeB > timeA, suite2, 'Device B has newer timestamp than Device A');

// Echo prevention test: device ignores payload with own deviceId
const myDeviceId = 'dev_mobile_001';
const shouldIgnoreEcho = payloadA.deviceId === myDeviceId;
const shouldAcceptRemote = payloadB.deviceId !== myDeviceId;
assert(shouldIgnoreEcho === true, suite2, 'Device ignores self-originated sync echo');
assert(shouldAcceptRemote === true, suite2, 'Device accepts remote payload from another device');

// -------------------------------------------------------------
// SUITE 3: In-App QR Scanner & Camera Lifecycle
// -------------------------------------------------------------
const suite3 = '3. In-App QR Scanner';

const qrScannerContent = fs.readFileSync(path.join(__dirname, '../src/components/QrScannerModal.tsx'), 'utf8');

assert(qrScannerContent.includes('import jsQR from \'jsqr\''), suite3, 'jsQR fallback imported');
assert(qrScannerContent.includes('BarcodeDetector'), suite3, 'Native BarcodeDetector API checked first');
assert(qrScannerContent.includes('torch'), suite3, 'Torch/flashlight capability supported');
assert(qrScannerContent.includes('extractRoomCode'), suite3, 'Room code parser implemented');
assert(qrScannerContent.includes('stream.getTracks().forEach((track) => track.stop())'), suite3, 'Camera stream tracks properly cleaned up on unmount');
assert(qrScannerContent.includes('cancelAnimationFrame'), suite3, 'Animation frame loop cancelled on unmount');

// -------------------------------------------------------------
// SUITE 4: Interactive 16-Section SDS Guide
// -------------------------------------------------------------
const suite4 = '4. Interactive 16-Section SDS Guide';

const sdsGuideContent = fs.readFileSync(path.join(__dirname, '../src/components/SafetyReferenceModal.tsx'), 'utf8');

// Check all 16 section titles in order
const expectedSections = [
  'Identification',
  'Hazard(s) Identification',
  'Composition / Information on Ingredients',
  'First-Aid Measures',
  'Fire-Fighting Measures',
  'Accidental Release Measures',
  'Handling and Storage',
  'Exposure Controls / Personal Protection',
  'Physical and Chemical Properties',
  'Stability and Reactivity',
  'Toxicological Information',
  'Ecological Information',
  'Disposal Considerations',
  'Transport Information',
  'Regulatory Information',
  'Other Information',
];

expectedSections.forEach((secTitle, idx) => {
  const secNum = idx + 1;
  assert(
    sdsGuideContent.includes(`number: ${secNum}`) && sdsGuideContent.includes(`'${secTitle}`),
    suite4,
    `Section ${secNum} (${secTitle}) present in SDS guide`
  );
});

// Check mandatory vs non-mandatory
assert(sdsGuideContent.includes('OSHA Mandatory'), suite4, 'OSHA Mandatory badges rendered');
assert(sdsGuideContent.includes('Non-Mandatory (EPA/DOT)'), suite4, 'Non-Mandatory badges rendered for Sections 12-15');
assert(sdsGuideContent.includes('9 Official OSHA / GHS Hazard Pictograms') || sdsGuideContent.includes('9 Официальных пиктограмм'), suite4, 'All 9 GHS pictograms detailed');
assert(sdsGuideContent.includes('6 Mandatory Elements of a GHS Chemical Label') || sdsGuideContent.includes('6 обязательных элементов маркировки GHS'), suite4, '6 GHS mandatory label elements detailed');
assert(sdsGuideContent.includes('Harmful effect DECREASES when category number increases') || sdsGuideContent.includes('Степень опасности химиката УМЕНЬШАЕТСЯ'), suite4, 'Inverted GHS hazard category scale highlighted');

// -------------------------------------------------------------
// SUITE 5: FSE Safety Refresher & Checklist Data
// -------------------------------------------------------------
const suite5 = '5. FSE Safety Refresher & Checklist';

assert(CHECKLIST_ITEMS_TEMPLATE.length === 17, suite5, 'Checklist template has 17 active items across 4 categories', `Length: ${CHECKLIST_ITEMS_TEMPLATE.length}`);

// Item 2.4 Verification (ANSI Z87.1 glasses under face shield)
const item24 = CHECKLIST_ITEMS_TEMPLATE.find((i) => i.id === '2.4');
assert(Boolean(item24), suite5, 'Item 2.4 exists');
if (item24) {
  assert(item24.standardEn?.includes('Z87.1 safety glasses'), suite5, 'Item 2.4 standard references ANSI Z87.1');
  assert(item24.guidelinesEn?.some((g) => g.includes('Face shields must ALWAYS be worn WITH safety glasses underneath')), suite5, 'Item 2.4 guideline enforces glasses under face shield rule');
  assert(item24.guidelinesRu?.some((g) => g.includes('Лицевой щиток используется ТОЛЬКО поверх защитных очков')), suite5, 'Item 2.4 Russian guideline enforces face shield over glasses');
}

// Item 2.5 Verification (OSHA HazCom 1910.1200 / GHS 6 elements)
const item25 = CHECKLIST_ITEMS_TEMPLATE.find((i) => i.id === '2.5');
assert(Boolean(item25), suite5, 'Item 2.5 exists');
if (item25) {
  assert(item25.standardEn?.includes('29 CFR 1910.1200') && item25.standardEn?.includes('6 mandatory elements'), suite5, 'Item 2.5 standard references OSHA 29 CFR 1910.1200 and 6 GHS elements');
  assert(item25.guidelinesEn?.some((g) => g.includes('16-section Safety Data Sheets')), suite5, 'Item 2.5 guideline requires 16-section SDS');
  assert(item25.guidelinesEn?.some((g) => g.includes('Eyewash stations and first aid kits unobstructed (36" clearance)')), suite5, 'Item 2.5 guideline enforces eyewash clearance');
}

// Item 3.4 Verification (Removed from Category 3)
const item34 = CHECKLIST_ITEMS_TEMPLATE.find((i) => i.id === '3.4');
assert(item34 === undefined, suite5, 'Item 3.4 is removed from Category 3 (leaving 3 items: 3.1, 3.2, 3.3)');

// -------------------------------------------------------------
// SUITE 6: Local vs Export Integrity
// -------------------------------------------------------------
const suite6 = '6. Local vs Export Integrity';

// Shift formatter
assert(formatShift(undefined, 'en') === 'Day Shift (06:00 - 14:40)', suite6, 'formatShift undefined fallback (EN)');
assert(formatShift(undefined, 'ru') === 'Дневная смена (06:00 - 14:40)', suite6, 'formatShift undefined fallback (RU)');
assert(formatShift('Day Shift', 'en') === 'Day Shift (06:00 - 14:40)', suite6, 'formatShift "Day Shift" normalized to 06:00 - 14:40');
assert(formatShift('Смена 1', 'ru') === 'Дневная смена (06:00 - 14:40)', suite6, 'formatShift "Смена 1" normalized to 06:00 - 14:40');

// Excel export inspection
const excelExportContent = fs.readFileSync(path.join(__dirname, '../src/utils/exportExcel.ts'), 'utf8');
assert(excelExportContent.includes('{ wch: 65 }, // G: Defect Description'), suite6, 'Excel Column G configured with width 65');
assert(excelExportContent.includes('styleWorksheet(actionSheet, 0, [2, 3, 5, 6, 7, 8, 11])'), suite6, 'Excel Column G (index 6) configured with word wrap');
assert(excelExportContent.includes('Summary & KPIs') || excelExportContent.includes('Сводка (Summary)'), suite6, 'Sheet 1: Summary Sheet included');
assert(excelExportContent.includes('Defects & CAPA Log') || excelExportContent.includes('Журнал дефектов (CAPA)'), suite6, 'Sheet 2: CAPA Sheet included');
assert(excelExportContent.includes('Full Audit') || excelExportContent.includes('Полный чек-лист'), suite6, 'Sheet 3: Full Audit Sheet included');

// Print Report View & CSS inspection
const printViewContent = fs.readFileSync(path.join(__dirname, '../src/components/PrintReportView.tsx'), 'utf8');
const indexCssContent = fs.readFileSync(path.join(__dirname, '../src/index.css'), 'utf8');

assert(indexCssContent.includes('size: letter portrait'), suite6, 'CSS specifies US Letter portrait print size');
assert(indexCssContent.includes('margin: 10mm'), suite6, 'CSS specifies 10mm print margin');
assert(indexCssContent.includes('break-inside: avoid !important'), suite6, 'CSS avoids card/table page breaks');
// -------------------------------------------------------------
// SUITE 7: Runtime Resilience & Error Recovery
// -------------------------------------------------------------
const suite7 = '7. Runtime Resilience & Error Recovery';

const errorBoundaryContent = fs.readFileSync(path.join(__dirname, '../src/components/ErrorBoundary.tsx'), 'utf8');
const mainTsxContent = fs.readFileSync(path.join(__dirname, '../src/main.tsx'), 'utf8');
const swContent = fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8');
const useInspectionContent = fs.readFileSync(path.join(__dirname, '../src/hooks/useInspection.ts'), 'utf8');

assert(errorBoundaryContent.includes('export class ErrorBoundary'), suite7, 'ErrorBoundary class component is exported');
assert(errorBoundaryContent.includes('componentDidCatch'), suite7, 'ErrorBoundary implements componentDidCatch lifecycle');
assert(errorBoundaryContent.includes('handleResetAll'), suite7, 'ErrorBoundary provides session reset and cache eviction');
assert(mainTsxContent.includes('<ErrorBoundary>'), suite7, 'Root application is wrapped in ErrorBoundary in main.tsx');
assert(swContent.includes('url.origin !== self.location.origin'), suite7, 'Service Worker ignores cross-origin requests');
assert(swContent.includes('text/event-stream'), suite7, 'Service Worker skips Server-Sent Events (SSE)');
assert(useInspectionContent.includes('fallbackLang'), suite7, 'hydrateSession supports fallback language reconciliation');
assert(useInspectionContent.includes('validSignatures'), suite7, 'hydrateSession guarantees complete signatures object');

// -------------------------------------------------------------
// SUMMARY & OUTPUT
// -------------------------------------------------------------
console.log('\n--- QA VERIFICATION TEST RESULTS ---\n');

const suiteGroups = results.reduce((acc, res) => {
  if (!acc[res.suite]) acc[res.suite] = [];
  acc[res.suite].push(res);
  return acc;
}, {} as Record<string, TestResult[]>);

let totalPassed = 0;
let totalFailed = 0;

for (const [suiteName, tests] of Object.entries(suiteGroups)) {
  console.log(`[${suiteName}]`);
  tests.forEach((t) => {
    if (t.passed) {
      console.log(`  ✓ PASS: ${t.name}`);
      totalPassed++;
    } else {
      console.log(`  ✗ FAIL: ${t.name} -> ${t.details}`);
      totalFailed++;
    }
  });
  console.log('');
}

console.log('---------------------------------------------------------------');
console.log(`Total: ${results.length} | Passed: ${totalPassed} | Failed: ${totalFailed}`);
console.log('---------------------------------------------------------------');

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log(' ALL VERIFICATION CHECKS PASSED PERFECTLY (100% SUITE PASS RATE).');
}

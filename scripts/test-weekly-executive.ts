import {
  aggregateWeeklyExecutiveReport,
  resolveCanonicalZone,
  classifyDefectTier,
  WeeklyExecutiveReportData,
  ConsolidatedWeeklyDefect
} from '../src/utils/weeklyReport';
import { InspectionSession, ChecklistItem } from '../src/types/inspection';
import { CHECKLIST_ITEMS_TEMPLATE } from '../src/data/checklistData';

function cloneTemplate(): ChecklistItem[] {
  return JSON.parse(JSON.stringify(CHECKLIST_ITEMS_TEMPLATE));
}

console.log('======================================================================');
console.log('QA AUTOMATED TEST: Canonical Zone Resolution & Weekly Deduplication');
console.log('======================================================================\n');

// Build 5 sessions across Monday to Friday
// Monday: 2026-08-31
// Tuesday: 2026-09-01
// Wednesday: 2026-09-02
// Thursday: 2026-09-03
// Friday: 2026-09-04

// 1. Session 1: Monday (2026-08-31)
const itemsMon = cloneTemplate();
const item14_Mon = itemsMon.find((i) => i.id === '1.4')!;
item14_Mon.status = 'FAIL';
item14_Mon.defectDetails = {
  description: 'Доступ к электрощиту QF-4 заблокирован паллетой с деталями Wabtec',
  location: 'Участок Wabtec, линия сборки',
  zonePreset: 'WABTEC',
  priority: 'P1',
  assignedTo: 'Facilities',
  resolutionStatus: 'Open',
  notes: 'Загроможден проход 1м',
  photos: [{ id: 'p1', url: 'blob:photo1', timestamp: '2026-08-31T09:15:00Z' }]
};

const sessionMon: InspectionSession = {
  id: 'INS-20260831-7K91',
  inspectorName: 'Смирнов Д. В.',
  inspectorRole: 'EHS Lead',
  date: '2026-08-31',
  startTime: '09:00',
  endTime: '09:45',
  shift: 'Day Shift (1-я смена)',
  facilityArea: 'Участок WABTEC / Цех сборки',
  status: 'Completed',
  items: itemsMon,
};

// 2. Session 2: Tuesday (2026-09-01) - Isolated Defect in Warehouse
const itemsTue = cloneTemplate();
const item32_Tue = itemsTue.find((i) => i.id === '3.2')!;
item32_Tue.status = 'FAIL';
item32_Tue.defectDetails = {
  description: 'Паллета со стретч-пленкой опасно накренилась на ярусе 3',
  location: 'Склад готовой продукции, ряд 4',
  zonePreset: 'WAREHOUSE',
  priority: 'P2',
  assignedTo: 'Warehouse',
  resolutionStatus: 'Open',
  notes: 'Требуется перепаллетирование',
  photos: []
};

// Also Bottleneck in Tool Cage: 2.3
const item23_Tue = itemsTue.find((i) => i.id === '2.3')!;
item23_Tue.status = 'FAIL';
item23_Tue.defectDetails = {
  description: 'Разбросан слесарный инструмент, нет фиксации на шадоу-борде',
  location: 'Инструменталка Tool Cage пост 2',
  zonePreset: 'TOOL CAGE',
  priority: 'P2',
  assignedTo: 'Maintenance',
  resolutionStatus: 'Open',
  notes: '5S не выполнен',
  photos: []
};

const sessionTue: InspectionSession = {
  id: 'INS-20260901-8A12',
  inspectorName: 'Ковалев А. И.',
  inspectorRole: 'Safety Specialist',
  date: '2026-09-01',
  startTime: '10:00',
  endTime: '10:50',
  shift: 'Day Shift (1-я смена)',
  facilityArea: 'Склад и инструментальный участок',
  status: 'Completed',
  items: itemsTue,
};

// 3. Session 3: Wednesday (2026-09-02) - Checkpoint 1.4 recurrence at Wabtec!
const itemsWed = cloneTemplate();
const item14_Wed = itemsWed.find((i) => i.id === '1.4')!;
item14_Wed.status = 'FAIL';
item14_Wed.defectDetails = {
  description: 'Повторно заблокирован электрощит QF-4 ящиками с комплектующими Wabtec',
  location: 'Wabtec пост 3',
  zonePreset: 'WABTEC',
  priority: 'P1',
  assignedTo: 'Facilities',
  resolutionStatus: 'In Progress',
  notes: 'Ранее выдавалось замечание в понедельник',
  photos: [{ id: 'p2', url: 'blob:photo2', timestamp: '2026-09-02T14:20:00Z' }]
};

const sessionWed: InspectionSession = {
  id: 'INS-20260902-9C33',
  inspectorName: 'Смирнов Д. В.',
  inspectorRole: 'EHS Lead',
  date: '2026-09-02',
  startTime: '14:00',
  endTime: '14:40',
  shift: 'Evening Shift (2-я смена)',
  facilityArea: 'Участок Wabtec',
  status: 'Completed',
  items: itemsWed,
};

// 4. Session 4: Thursday (2026-09-03) - Culture defect: 4.4 PPE
const itemsThu = cloneTemplate();
const item44_Thu = itemsThu.find((i) => i.id === '4.4')!;
item44_Thu.status = 'FAIL';
item44_Thu.defectDetails = {
  description: 'Слесарь работал возле шлифстанка без защитных очков Z87.1',
  location: 'Мастерская Workshop зона 1',
  zonePreset: 'WORKSHOP',
  priority: 'P2',
  assignedTo: 'Operations',
  resolutionStatus: 'Open',
  notes: 'Проведен внеплановый инструктаж',
  photos: []
};

const sessionThu: InspectionSession = {
  id: 'INS-20260903-4D77',
  inspectorName: 'Федоров П. С.',
  inspectorRole: 'Operations Lead',
  date: '2026-09-03',
  startTime: '11:00',
  endTime: '11:35',
  shift: 'Day Shift (1-я смена)',
  facilityArea: 'Мастерская и цех ремонта',
  status: 'Completed',
  items: itemsThu,
};

// 5. Session 5: Friday (2026-09-04) - Clean session with 0 defects
const itemsFri = cloneTemplate();
itemsFri.forEach((i) => (i.status = 'PASS'));

const sessionFri: InspectionSession = {
  id: 'INS-20260904-5E99',
  inspectorName: 'Смирнов Д. В.',
  inspectorRole: 'EHS Lead',
  date: '2026-09-04',
  startTime: '15:00',
  endTime: '15:30',
  shift: 'Day Shift (1-я смена)',
  facilityArea: 'Все зоны завода',
  status: 'Completed',
  items: itemsFri,
};

const sessionPool: InspectionSession[] = [
  sessionMon,
  sessionTue,
  sessionWed,
  sessionThu,
  sessionFri,
];

console.log(`Created test session pool with ${sessionPool.length} sessions (2026-08-31 to 2026-09-04).\n`);

// Run aggregateWeeklyExecutiveReport
const report: WeeklyExecutiveReportData = aggregateWeeklyExecutiveReport(
  sessionPool,
  '2026-08-31',
  '2026-09-04'
);

let allPassed = true;
function assertTest(condition: boolean, title: string, evidence: string) {
  if (condition) {
    console.log(`[PASS] ${title}`);
    console.log(`       Evidence: ${evidence}`);
  } else {
    console.error(`[FAIL] ${title}`);
    console.error(`       Evidence: ${evidence}`);
    allPassed = false;
  }
}

// -------------------------------------------------------------
// ASSERTION 1: Checkpoint tag contains canonical zone (e.g. `WABTEC | 1.4 • ...`). No "Floor / Unassigned"
// -------------------------------------------------------------
const allConsolidated = [
  ...report.defectRegister.criticalTierDefects,
  ...report.defectRegister.bottleneckTierDefects,
  ...report.defectRegister.cultureTierDefects,
];

const unassignedCount = allConsolidated.filter(
  (d) =>
    d.zoneLabelRu.toLowerCase().includes('unassigned') ||
    d.zoneLabelRu.toLowerCase().includes('не назначено') ||
    d.compoundTagRu.toLowerCase().includes('unassigned')
).length;

assertTest(
  unassignedCount === 0,
  'No "Floor / Unassigned" exists anywhere in consolidated defects',
  `unassignedCount = ${unassignedCount}`
);

const defect14 = allConsolidated.find((d) => d.checkpointId === '1.4');
assertTest(
  Boolean(defect14 && defect14.compoundTagRu.startsWith('WABTEC | 1.4 •')),
  'Checkpoint tag contains canonical zone "WABTEC | 1.4 • ..."',
  `compoundTagRu = "${defect14?.compoundTagRu}"`
);

// -------------------------------------------------------------
// ASSERTION 2: Deduplication works: checkpoint 1.4 appears once with occurrencesCount == 2
// -------------------------------------------------------------
const occurrences14 = allConsolidated.filter((d) => d.checkpointId === '1.4');
assertTest(
  occurrences14.length === 1,
  'Checkpoint 1.4 at Wabtec deduplicated to exactly 1 entry in register',
  `Found ${occurrences14.length} entries for 1.4::WABTEC`
);

assertTest(
  defect14?.occurrencesCount === 2,
  'Checkpoint 1.4 occurrencesCount == 2 (Mon and Wed)',
  `occurrencesCount = ${defect14?.occurrencesCount}, dates = [${defect14?.dates.join(', ')}]`
);

// -------------------------------------------------------------
// ASSERTION 3: Recurrence flag is RECURRING with verdict
// -------------------------------------------------------------
assertTest(
  defect14?.recurrenceType === 'RECURRING',
  'Checkpoint 1.4 recurrenceType is "RECURRING"',
  `recurrenceType = "${defect14?.recurrenceType}"`
);

assertTest(
  defect14?.recurrenceVerdictRu === 'Требует реорганизации процесса / изменения функционала',
  'Checkpoint 1.4 recurrenceVerdictRu matches "Требует реорганизации процесса / изменения функционала"',
  `recurrenceVerdictRu = "${defect14?.recurrenceVerdictRu}"`
);

// Isolated check: 3.2 in Warehouse should be ISOLATED
const defect32 = allConsolidated.find((d) => d.checkpointId === '3.2');
assertTest(
  defect32?.recurrenceType === 'ISOLATED' && defect32?.occurrencesCount === 1,
  'Warehouse checkpoint 3.2 is ISOLATED with occurrencesCount == 1',
  `recurrenceType = "${defect32?.recurrenceType}", occurrencesCount = ${defect32?.occurrencesCount}`
);

assertTest(
  defect32?.recurrenceVerdictRu === 'Операционное устранение в смене',
  'Warehouse checkpoint 3.2 recurrenceVerdictRu is "Операционное устранение в смене"',
  `recurrenceVerdictRu = "${defect32?.recurrenceVerdictRu}"`
);

// -------------------------------------------------------------
// ASSERTION 4: Audit reference string includes report numbers and dates
// -------------------------------------------------------------
assertTest(
  Boolean(defect14?.reportReferencesFormattedRu && defect14.reportReferencesFormattedRu.includes('№ WALK-0831') && defect14.reportReferencesFormattedRu.includes('№ WALK-0902')),
  'Audit reference string includes dynamic report numbers and dates',
  `reportReferencesFormattedRu = "${defect14?.reportReferencesFormattedRu}"`
);

assertTest(
  Boolean(defect14?.consolidatedCommentsRu && defect14.consolidatedCommentsRu.includes('• [31.08 Пн • № WALK-0831 • Смирнов]:') && defect14.consolidatedCommentsRu.includes('• [02.09 Ср • № WALK-0902 • Смирнов]:')),
  'Consolidated observations include chronological timestamps and inspector names',
  `\n${defect14?.consolidatedCommentsRu}`
);

// -------------------------------------------------------------
// ASSERTION 5: 3 tiers (Critical, Bottleneck, Culture) are populated correctly
// -------------------------------------------------------------
const critCount = report.defectRegister.criticalTierDefects.length;
const botCount = report.defectRegister.bottleneckTierDefects.length;
const cultCount = report.defectRegister.cultureTierDefects.length;

assertTest(
  critCount > 0 && report.defectRegister.criticalTierDefects.some((d) => d.checkpointId === '1.4'),
  'Critical tier populated with Life Safety 1.4 (P1 Wabtec)',
  `criticalTierDefects count = ${critCount}, items = [${report.defectRegister.criticalTierDefects.map((d) => d.checkpointId).join(', ')}]`
);

assertTest(
  botCount > 0 && report.defectRegister.bottleneckTierDefects.some((d) => d.checkpointId === '2.3' || d.checkpointId === '3.2'),
  'Bottleneck tier populated with 5S / Warehouse items (2.3 Tool Cage, 3.2 Warehouse)',
  `bottleneckTierDefects count = ${botCount}, items = [${report.defectRegister.bottleneckTierDefects.map((d) => d.checkpointId).join(', ')}]`
);

assertTest(
  cultCount > 0 && report.defectRegister.cultureTierDefects.some((d) => d.checkpointId === '4.4'),
  'Culture tier populated with PPE item 4.4 (Workshop safety glasses)',
  `cultureTierDefects count = ${cultCount}, items = [${report.defectRegister.cultureTierDefects.map((d) => d.checkpointId).join(', ')}]`
);

assertTest(
  report.defectRegister.totalUniqueDefects === 4,
  'Total unique defects across tiers == 4 (1.4, 2.3, 3.2, 4.4)',
  `totalUniqueDefects = ${report.defectRegister.totalUniqueDefects}, totalRawDefectInstances = ${report.defectRegister.totalRawDefectInstances}`
);

assertTest(
  report.defectRegister.recurringDefectsCount === 1 && report.defectRegister.isolatedDefectsCount === 3,
  'Recurring defects count == 1, isolated defects count == 3',
  `recurring = ${report.defectRegister.recurringDefectsCount}, isolated = ${report.defectRegister.isolatedDefectsCount}`
);

// Actionable matrix validation
assertTest(
  report.actionableMatrix.length === 3,
  'Actionable Executive Matrix has exactly 3 rows (CRITICAL, BOTTLENECK, CULTURE)',
  `Tiers present: ${report.actionableMatrix.map((r) => r.tier).join(', ')}`
);

console.log('\n======================================================================');
if (allPassed) {
  console.log('ALL TASK 2 VERIFICATIONS PASSED SUCCESSFULLY (11/11)');
} else {
  console.error('TASK 2 VERIFICATIONS FAILED');
  process.exit(1);
}
console.log('======================================================================\n');

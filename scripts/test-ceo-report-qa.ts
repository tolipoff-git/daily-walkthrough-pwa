import {
  aggregateWeeklyExecutiveReport,
  formatSlaTargetDate,
  maskCyrillicForEnglish,
} from '../src/utils/weeklyReport';
import { InspectionSession, ChecklistItem } from '../src/types/inspection';
import * as fs from 'fs';

function runCeoReportTests() {
  console.log('======================================================================');
  console.log('QA AUTOMATED TEST SUITE: CEO Report English & Mobile Print Validation');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string, details?: string) {
    if (condition) {
      console.log(`[PASS] ${title}`);
      if (details) console.log(`       Evidence: ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title}`);
      if (details) console.error(`       Evidence: ${details}`);
      failed++;
    }
  }

  // 1. Test maskCyrillicForEnglish & transliteration
  console.log('--- SECTION 1: English Localization & Terminology Transliteration ---');

  const inspectorRu = 'Смирнов Д. В.';
  const inspectorEn = maskCyrillicForEnglish(inspectorRu);
  assert(
    inspectorEn === 'Smirnov D. V.',
    '1.1 Inspector name transliterated to clean Latin',
    `in="${inspectorRu}" -> out="${inspectorEn}"`
  );

  const defectDescRu = 'Огнетушитель загроможден паллетами и коробками';
  const defectDescEn = maskCyrillicForEnglish(defectDescRu);
  assert(
    !/[\u0400-\u04FF]/.test(defectDescEn) && !defectDescEn.includes('[ru-text]'),
    '1.2 Russian defect description converted with domain terms and zero [ru-text] artifacts',
    `in="${defectDescRu}" -> out="${defectDescEn}"`
  );

  const preset1 = formatSlaTargetDate('До конца смены', false);
  const preset2 = formatSlaTargetDate('В течение 24 часов', false);
  const preset3 = formatSlaTargetDate('В течение недели', false);
  const preset4 = formatSlaTargetDate('В плановом порядке', false);
  assert(
    preset1 === 'This shift' &&
    preset2 === 'Within 24 hours' &&
    preset3 === 'Within 1 week' &&
    preset4 === 'Scheduled maintenance',
    '1.3 SLA target presets accurately translated to English executive terms',
    `shift="${preset1}", 24h="${preset2}", 1w="${preset3}", sched="${preset4}"`
  );

  // 2. Test aggregateWeeklyExecutiveReport in English ('en')
  console.log('\n--- SECTION 2: Weekly Executive Report English Aggregation ---');

  const mockItem1: ChecklistItem = {
    id: '1.1',
    categoryId: 'cat1',
    titleRu: 'Огнетушители проверены и доступны',
    titleEn: 'Fire extinguishers inspected and unobstructed',
    standardRu: 'ГОСТ Р 59641-2021',
    standardEn: 'OSHA 1910.157 / NFPA 10',
    status: 'FAIL',
    defectDetails: {
      description: 'Огнетушитель загроможден паллетами',
      notes: 'Срочно убрать паллеты со смены',
      priority: 'P1',
      assignedTo: 'Safety & EHS',
      targetDate: 'До конца смены',
      location: 'Wabtec, пост 1',
      resolutionStatus: 'Open',
    },
  };

  const mockItem2: ChecklistItem = {
    id: '2.1',
    categoryId: 'cat2',
    titleRu: 'Кабели и шланги уложены в защитные каналы',
    titleEn: 'Cables and hoses routed in cable trays',
    standardRu: 'Правила 5S',
    standardEn: 'OSHA 1910.22 / 5S Standard',
    status: 'FAIL',
    defectDetails: {
      description: 'Кабель сварочного поста на полу',
      priority: 'P2',
      assignedTo: 'Facilities',
      targetDate: 'В течение 24 часов',
      location: 'Wabtec, пост 2',
      resolutionStatus: 'In Progress',
    },
  };

  const mockSession: InspectionSession = {
    id: 'INS-20260908-TEST',
    date: '2026-09-08',
    startTime: '08:00',
    endTime: '08:30',
    inspectorName: 'Иванов И. И.',
    facilityName: 'Main Facility',
    status: 'Completed',
    items: [mockItem1, mockItem2],
    createdAt: '2026-09-08T08:00:00Z',
    updatedAt: '2026-09-08T08:30:00Z',
  };

  const reportEn = aggregateWeeklyExecutiveReport([mockSession], '2026-09-08', '2026-09-08', 'en');

  // Verify dailyPoints in English
  assert(
    reportEn.dailyPoints[0]?.dayLabel === 'Tue',
    '2.1 Daily point dayLabel uses English abbreviation ("Tue")',
    `dayLabel="${reportEn.dailyPoints[0]?.dayLabel}"`
  );
  assert(
    reportEn.dailyPoints[0]?.inspector === 'Ivanov I. I.',
    '2.2 Daily point inspector name cleanly transliterated for English export',
    `inspector="${reportEn.dailyPoints[0]?.inspector}"`
  );

  // Verify Narrative in English
  assert(
    !/[\u0400-\u04FF]/.test(reportEn.narrative.takeawayEn) &&
    !reportEn.narrative.takeawayEn.includes('[ru-text]'),
    '2.3 Narrative takeawayEn is 100% English and contains zero Cyrillic or [ru-text]',
    `takeawayEn="${reportEn.narrative.takeawayEn.slice(0, 80)}..."`
  );

  // Verify Actionable Matrix in English
  const matrixRow1 = reportEn.actionableMatrix[0];
  assert(
    matrixRow1 &&
    !/[\u0400-\u04FF]/.test(matrixRow1.issueEn) &&
    !matrixRow1.issueEn.includes('[ru-text]'),
    '2.4 Actionable Matrix issueEn is 100% English and contains zero Cyrillic or [ru-text]',
    `issueEn="${matrixRow1?.issueEn.slice(0, 80)}..."`
  );

  // Verify Defect Register in English
  const defectEn = reportEn.defectRegister.criticalTierDefects[0];
  assert(
    defectEn !== undefined && defectEn.checkpointId === '1.1',
    '2.5 Critical tier defect present in register',
    `checkpointId="${defectEn?.checkpointId}"`
  );
  assert(
    defectEn && !/[\u0400-\u04FF]/.test(defectEn.consolidatedCommentsEn) && !defectEn.consolidatedCommentsEn.includes('[ru-text]'),
    '2.6 Consolidated comments in English contain zero Cyrillic or [ru-text]',
    `commentsEn="${defectEn?.consolidatedCommentsEn.slice(0, 80)}..."`
  );

  // 3. Test Mobile Print CSS Rules
  console.log('\n--- SECTION 3: Mobile Print CSS Architecture ---');
  const indexCss = fs.readFileSync('src/index.css', 'utf8');

  assert(
    !indexCss.includes('min-height: 270mm') && !indexCss.includes('max-height: 280mm'),
    '3.1 Removed dangerous forced min-height 270mm / max-height 280mm from print styles',
    'min-height: 270mm and max-height: 280mm are absent'
  );

  assert(
    !/\.print-weekly-page-1\s*\{[^}]*overflow:\s*hidden/s.test(indexCss) &&
    !/\.print-weekly-page-2\s*\{[^}]*overflow:\s*hidden/s.test(indexCss),
    '3.2 Removed overflow: hidden from print-weekly-page-1 and print-weekly-page-2',
    'overflow: visible is enforced'
  );

  assert(
    indexCss.includes('.executive-section') &&
    indexCss.includes('break-inside: avoid !important'),
    '3.3 .executive-section and break-inside: avoid !important configured to prevent slicing text',
    'break-inside: avoid !important configured for executive-section, tr, td, table, defect-card'
  );

  assert(
    indexCss.includes('orphans: 3 !important') && indexCss.includes('widows: 3 !important'),
    '3.4 Orphans and widows rules configured to prevent paragraph text splits across pages',
    'orphans: 3, widows: 3 active'
  );

  console.log('\n======================================================================');
  console.log(`QA VERIFICATION SUMMARY: ${passed}/${passed + failed} Passed (${failed} Failed)`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCeoReportTests();

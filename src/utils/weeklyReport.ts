import { InspectionSession, ChecklistItem, Priority, Assignee } from '../types/inspection';
import { calculateMetrics } from './metrics';

export interface DailyPoint {
  date: string;
  dayLabel: string;
  score: number;
  totalItems: number;
  defectsCount: number;
  p1Count: number;
  inspector: string;
}

export interface ZoneAntiRating {
  zone: string;
  zoneLabelEn: string;
  zoneLabelRu: string;
  totalDefects: number;
  p1Count: number;
  p2Count: number;
  p3Count: number;
  severityScore: number;
  percentage: number;
  sampleIssues: string[];
}

export interface DomainBreakdown {
  id: string;
  titleEn: string;
  titleRu: string;
  iconName: string;
  defectCount: number;
  percentage: number;
  p1Count: number;
}

export interface ActionableMatrixRow {
  tier: 'CRITICAL' | 'BOTTLENECK' | 'CULTURE';
  badgeColor: 'red' | 'amber' | 'blue';
  signalTitleEn: string;
  signalTitleRu: string;
  issueEn: string;
  issueRu: string;
  riskAreaEn: string;
  riskAreaRu: string;
  actionEn: string;
  actionRu: string;
  actionTypeEn: 'Administrative' | 'Process' | 'Leadership';
  actionTypeRu: 'Административное' | 'Процессное' | 'Управленческое';
  owner: string;
  sla: string;
}

/**
 * Single daily observation instance recorded by an inspector
 */
export interface DefectDailyObservation {
  date: string;              // YYYY-MM-DD
  dayLabel: string;          // e.g. "Mon" | "Пн"
  inspectorName: string;     // e.g. "Смирнов Д. В."
  description: string;       // Observation description
  notes?: string;            // Additional notes if any
  priority: Priority;        // 'P1' | 'P2' | 'P3'
  sessionId: string;        // e.g. "INS-20260901-X7K9"
  sessionDate: string;      // e.g. "2026-09-01"
  status: 'Open' | 'In Progress' | 'Resolved';
  rawLocation?: string;      // e.g. "Wabtec, пост 3"
  photosCount: number;
}

/**
 * Report reference link for dynamic audit history tracing
 */
export interface ReportSessionReference {
  sessionId: string;         // e.g. "INS-20260831-7K9"
  shortSessionId: string;    // e.g. "№ WALK-0831"
  date: string;              // "2026-08-31"
  formattedDate: string;     // "31.08"
  dayLabelRu: string;        // "Пн"
  dayLabelEn: string;        // "Mon"
  inspector: string;         // "Смирнов Д. В."
}

/**
 * Consolidated Defect across multiple days in a weekly period
 */
export interface ConsolidatedWeeklyDefect {
  id: string;                     // Dedup key: `${checkpointId}::${canonicalZoneKey}`
  checkpointId: string;           // e.g. "1.4"
  categoryId: string;             // e.g. "cat1"
  categoryTitleRu: string;
  categoryTitleEn: string;
  checkpointTitleRu: string;      // e.g. "1.4. Электрощиты и оборудование"
  checkpointTitleEn: string;      // e.g. "1.4. Electrical Panels & Switchgear"
  standardRu: string;
  standardEn: string;

  // Canonical Location & Compound Identification
  zoneKey: string;                // Canonical uppercase ID: "WABTEC" | "USS" | "WAREHOUSE" etc.
  zoneLabelRu: string;            // e.g. "WABTEC" | "СКЛАД"
  zoneLabelEn: string;            // e.g. "WABTEC" | "WAREHOUSE"
  compoundTagRu: string;          // e.g. "WABTEC | 1.4 • Электрощиты и распределительные панели"
  compoundTagEn: string;          // e.g. "WABTEC | 1.4 • Electrical Panels & Switchgear"
  rawLocation: string;            // Original inspector-entered location

  // Tier matching Executive Matrix
  tier: 'CRITICAL' | 'BOTTLENECK' | 'CULTURE';
  tierTitleRu: string;            // "Критично / Регуляторные риски" | "Операционное узкое место" | "Культура безопасности"
  tierTitleEn: string;            // "Critical / Regulatory" | "Process Bottleneck" | "Safety Culture Gap"
  tierColor: 'red' | 'amber' | 'blue';

  // Recurrence Classification (Isolated vs Systemic Process Defect)
  recurrenceType: 'RECURRING' | 'ISOLATED';
  recurrenceVerdictRu: string;    // "Требует реорганизации процесса / изменения функционала" vs "Операционное устранение в смене"
  recurrenceVerdictEn: string;    // "Requires process reorganization / functional adaptation" vs "Shift-level operational correction"

  // 5-Day Recurrence & Audit Traceability
  occurrencesCount: number;       // e.g. 1, 3, 5
  dates: string[];                // ['2026-09-01', '2026-09-03', '2026-09-05']
  dayLabelsRu: string[];          // ['Пн', 'Ср', 'Пт']
  dayLabelsEn: string[];          // ['Mon', 'Wed', 'Fri']
  firstSeenDate: string;          // '2026-09-01'
  lastSeenDate: string;           // '2026-09-05'
  isPersistent: boolean;          // occurrencesCount > 1
  reportReferences: ReportSessionReference[]; // Audit trail tracing exact reports & dates
  reportReferencesFormattedRu: string; // "№ WALK-0831 (31.08 Пн), № WALK-0902 (02.09 Ср)"
  reportReferencesFormattedEn: string; // "№ WALK-0831 (08/31 Mon), № WALK-0902 (09/02 Wed)"

  // Severity & Resolution Status
  highestPriority: Priority;      // 'P1' > 'P2' > 'P3'
  latestPriority: Priority;       // Most recent priority
  latestStatus: 'Open' | 'In Progress' | 'Resolved';
  assignedTo: Assignee;           // e.g. "Maintenance" | "Safety & EHS"
  targetDatePreset?: string;      // e.g. "Today" | "End of Week"
  customTargetDate?: string;

  // Chronological Consolidated Comments
  observations: DefectDailyObservation[];
  consolidatedCommentsRu: string; // Formatted bulleted text with dates and inspectors
  consolidatedCommentsEn: string;

  // Evidence
  totalPhotosCount: number;
  samplePhotoUrls: string[];
}

/**
 * Consolidated Defect Register for Page 2 Annex
 */
export interface ConsolidatedDefectRegister {
  totalUniqueDefects: number;
  totalRawDefectInstances: number;
  recurringDefectsCount: number;
  isolatedDefectsCount: number;
  criticalTierDefects: ConsolidatedWeeklyDefect[];
  bottleneckTierDefects: ConsolidatedWeeklyDefect[];
  cultureTierDefects: ConsolidatedWeeklyDefect[];
}

export interface WeeklyExecutiveReportData {
  period: {
    startDate: string;
    endDate: string;
    labelEn: string;
    labelRu: string;
  };
  facilityName: string;
  auditedDaysCount: number;
  overallScore: number;
  ragStatus: 'GREEN' | 'AMBER' | 'RED';
  trendDelta: number;
  trendDirection: 'UP' | 'DOWN' | 'STABLE';
  criticalRegulatoryCount: number;
  totalDefectsCount: number;
  totalCheckpointsAudited: number;
  openCount: number;
  resolvedCount: number;
  inProgressCount: number;
  dailyPoints: DailyPoint[];
  zonesAntiRating: ZoneAntiRating[];
  domainBreakdown: DomainBreakdown[];
  actionableMatrix: ActionableMatrixRow[];
  narrative: {
    takeawayEn: string;
    takeawayRu: string;
    regulatoryEn: string;
    regulatoryRu: string;
    bottlenecksEn: string;
    bottlenecksRu: string;
    actionsEn: string;
    actionsRu: string;
  };
  auditorsList: string[];
  summaryNoteEn: string;
  summaryNoteRu: string;
  llmPrompt: string;
  defectRegister: ConsolidatedDefectRegister;
}

// Helpers for dates
export function getWeekdayName(dateStr: string, lang: 'en' | 'ru' = 'en'): string {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    if (isNaN(d.getTime())) return dateStr;
    const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysRu = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return lang === 'ru' ? daysRu[d.getDay()] : daysEn[d.getDay()];
  } catch {
    return dateStr;
  }
}

export function getWeekDateRange(offsetWeeks = 0): { startDate: string; endDate: string } {
  const now = new Date();
  const day = now.getDay();
  // Monday as first day of week
  const diffToMon = (day === 0 ? -6 : 1) - day - offsetWeeks * 7;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);

  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  return {
    startDate: fmt(mon),
    endDate: fmt(fri),
  };
}

export function getLastNDaysRange(days = 7): { startDate: string; endDate: string } {
  const now = new Date();
  const past = new Date(now);
  past.setDate(now.getDate() - (days - 1));

  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  return {
    startDate: fmt(past),
    endDate: fmt(now),
  };
}

export interface CanonicalZoneConfig {
  key: string;
  regex: RegExp;
  labelRu: string;
  labelEn: string;
}

export const CANONICAL_ZONES: CanonicalZoneConfig[] = [
  { key: 'WABTEC', regex: /wabtec|вабтек/i, labelRu: 'WABTEC', labelEn: 'WABTEC' },
  { key: 'USS', regex: /uss|юсс/i, labelRu: 'USS', labelEn: 'USS' },
  { key: 'BAC', regex: /bac|бак/i, labelRu: 'BAC', labelEn: 'BAC' },
  { key: 'WAREHOUSE', regex: /warehouse|склад/i, labelRu: 'СКЛАД', labelEn: 'WAREHOUSE' },
  { key: 'TOOL CAGE', regex: /tool\s*cage|инструментал/i, labelRu: 'ИНСТРУМЕНТАЛКА', labelEn: 'TOOL CAGE' },
  { key: 'WORKSHOP', regex: /workshop|мастерск|цех\s*ремонт/i, labelRu: 'МАСТЕРСКАЯ', labelEn: 'WORKSHOP' },
  { key: 'OFFICE', regex: /office|офис|абк/i, labelRu: 'ОФИС / АБК', labelEn: 'OFFICE' },
  { key: 'QA', regex: /\bqa\b|отк|качество/i, labelRu: 'ОТК / QA', labelEn: 'QA' },
  { key: 'ESS', regex: /\bess\b|эсс/i, labelRu: 'ESS', labelEn: 'ESS' },
  { key: 'KNORR', regex: /knorr|кнор/i, labelRu: 'KNORR', labelEn: 'KNORR' },
  { key: 'KALMAR', regex: /kalmar|кальмар/i, labelRu: 'KALMAR', labelEn: 'KALMAR' },
  { key: 'DOCKS', regex: /dock|рамп|погруз|трак/i, labelRu: 'ДОКИ / РАМПЫ', labelEn: 'LOADING DOCKS' },
  { key: 'BATTERY', regex: /battery|акб|зарядн/i, labelRu: 'ЗАРЯДНАЯ АКБ', labelEn: 'BATTERY STATION' },
  { key: 'PERIMETER', regex: /perimeter|кпп|периметр|вход/i, labelRu: 'ПЕРИМЕТР / КПП', labelEn: 'PERIMETER' },
];

/**
 * Resolve canonical facility zone, eliminating "Floor / Unassigned" permanently.
 */
export function resolveCanonicalZone(
  item: ChecklistItem,
  session: InspectionSession
): {
  zoneKey: string;
  zoneLabelRu: string;
  zoneLabelEn: string;
  rawLocation: string;
} {
  const details = item.defectDetails;
  const rawLoc = (details?.location || '').trim();
  const rawPreset = (details?.zonePreset || '').trim();
  const rawDesc = (details?.description || '').trim();
  const rawNotes = (details?.notes || '').trim();

  // Combined text corpus for regex detection
  const searchCorpus = `${rawPreset} ${rawLoc} ${rawDesc} ${rawNotes}`;

  // Step 1: Scan for canonical zone keyword in preset, location, description, or notes
  for (const zone of CANONICAL_ZONES) {
    if (zone.regex.test(searchCorpus)) {
      return {
        zoneKey: zone.key,
        zoneLabelRu: zone.labelRu,
        zoneLabelEn: zone.labelEn,
        rawLocation: rawLoc || rawPreset || zone.labelRu,
      };
    }
  }

  // Step 2: Fallback to session facilityArea (if not the default generic "All Zones" string)
  const sessionArea = (session.facilityArea || '').trim();
  const isGenericAllZones = /(все зоны|all zones)/i.test(sessionArea);

  if (sessionArea && !isGenericAllZones) {
    for (const zone of CANONICAL_ZONES) {
      if (zone.regex.test(sessionArea)) {
        return {
          zoneKey: zone.key,
          zoneLabelRu: zone.labelRu,
          zoneLabelEn: zone.labelEn,
          rawLocation: rawLoc || sessionArea,
        };
      }
    }
    // Custom specific zone entered at session level
    const cleanCustom = sessionArea.toUpperCase();
    return {
      zoneKey: cleanCustom,
      zoneLabelRu: sessionArea,
      zoneLabelEn: sessionArea,
      rawLocation: rawLoc || sessionArea,
    };
  }

  // Step 3: Domain-contextual fallback
  if (item.categoryId === 'cat3') {
    return {
      zoneKey: 'WAREHOUSE',
      zoneLabelRu: 'СКЛАД',
      zoneLabelEn: 'WAREHOUSE',
      rawLocation: rawLoc || 'Склад готовой продукции и сырья',
    };
  }
  if (item.id === '4.3') {
    return {
      zoneKey: 'PERIMETER',
      zoneLabelRu: 'ПЕРИМЕТР / КПП',
      zoneLabelEn: 'PERIMETER',
      rawLocation: rawLoc || 'Наружный периметр',
    };
  }

  // Step 4: Graceful facility floor fallback (NEVER "Floor / Unassigned")
  return {
    zoneKey: 'MAIN FLOOR',
    zoneLabelRu: 'ОСНОВНОЙ ЦЕХ',
    zoneLabelEn: 'MAIN SHOP FLOOR',
    rawLocation: rawLoc || 'Основной производственный цех',
  };
}

/**
 * Classify defect into one of the 3 Executive Matrix Tiers
 */
export function classifyDefectTier(
  item: ChecklistItem,
  highestPriority: Priority
): 'CRITICAL' | 'BOTTLENECK' | 'CULTURE' {
  const desc = ((item.defectDetails?.description || '') + ' ' + (item.defectDetails?.notes || '')).toLowerCase();
  const standard = ((item.standardEn || '') + ' ' + (item.standardRu || '')).toLowerCase();
  const title = ((item.titleEn || '') + ' ' + (item.titleRu || '')).toLowerCase();

  // Tier 3: Safety Culture Gap (PPE item 4.4 or PPE keywords unless escalated to P1 stop-work)
  const isPpeItem = item.id === '4.4';
  const isCultureMatch = /(ppe|glasses|goggles|boots|vest|ear|culture|hearing|helmet|очки|сиз|обувь|жилет|наушник|каск|дисциплин|курен)/i.test(
    desc + ' ' + title
  );

  if ((isPpeItem || isCultureMatch) && highestPriority !== 'P1') {
    return 'CULTURE';
  }

  // Tier 1: Critical / Regulatory
  // - Priority P1
  // - Category 1 (Life Safety, Exits, Fire Extinguishers, Electrical Panels, Egress)
  // - Keywords relating to fire, electrical hazard, high voltage, emergency clearance
  const isCat1 = item.categoryId === 'cat1' || ['1.1', '1.2', '1.3', '1.4', '1.5'].includes(item.id);
  const isP1 = highestPriority === 'P1';
  const isRegulatoryMatch = /(fire|extinguisher|exit|egress|clearance|electrical|panel|voltage|hazard|огнетушител|выход|эвакуац|(?<!за)щит|напряжен|блокировк)/i.test(
    desc + ' ' + standard + ' ' + title
  );

  if (isP1 || isCat1 || isRegulatoryMatch) {
    return 'CRITICAL';
  }

  if (isPpeItem || isCultureMatch) {
    return 'CULTURE';
  }

  // Tier 2: Process Bottlenecks (5S, cables, racks, tooling)
  return 'BOTTLENECK';
}

/**
 * Priority comparison helper (P1 > P2 > P3)
 */
export function getWorstPriority(p1: Priority, p2: Priority): Priority {
  const rank: Record<Priority, number> = { P1: 3, P2: 2, P3: 1 };
  return rank[p1] >= rank[p2] ? p1 : p2;
}

/**
 * Format human-readable short audit reference (e.g. "№ WALK-0831")
 */
export function formatShortSessionId(sessionId: string, date: string): string {
  const parts = date ? date.split('-') : [];
  const mmdd = parts.length === 3 ? `${parts[1]}${parts[2]}` : '';
  if (mmdd) {
    return `№ WALK-${mmdd}`;
  }
  const clean = sessionId.replace(/^(INS|WALK)-/i, '').slice(0, 6).toUpperCase();
  return `№ WALK-${clean}`;
}

/**
 * Filter sessions by date range and deduplicate/sort chronologically
 */
export function filterSessionsByRange(
  sessions: InspectionSession[],
  startDate: string,
  endDate: string
): InspectionSession[] {
  return sessions
    .filter((s) => s.date >= startDate && s.date <= endDate)
    .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)));
}

/**
 * Aggregate weekly metrics and build executive report data structure
 */
export function aggregateWeeklyExecutiveReport(
  sessions: InspectionSession[],
  startDate: string,
  endDate: string,
  language: 'ru' | 'en' = 'ru'
): WeeklyExecutiveReportData {
  const filtered = filterSessionsByRange(sessions, startDate, endDate);

  // Default facility name
  const facilityName = filtered[0]?.facilityName || 'Main Facility & Logistics Center';

  // Group by date to generate daily points
  const dateMap = new Map<string, InspectionSession[]>();
  filtered.forEach((s) => {
    const list = dateMap.get(s.date) || [];
    list.push(s);
    dateMap.set(s.date, list);
  });

  const dailyPoints: DailyPoint[] = [];
  let totalScoreSum = 0;
  let totalCheckpointsAudited = 0;
  let totalDefectsCount = 0;
  let criticalRegulatoryCount = 0;
  let openCount = 0;
  let inProgressCount = 0;
  let resolvedCount = 0;

  // Domain counters
  const domainDefects: Record<string, { count: number; p1: number }> = {
    cat1: { count: 0, p1: 0 },
    cat2: { count: 0, p1: 0 },
    cat3: { count: 0, p1: 0 },
    cat4: { count: 0, p1: 0 },
  };

  // Zone map. We key on the canonical UPPERCASE Latin id (e.g. "WABTEC",
  // "WAREHOUSE", "DOCKS") so that report language switching never inlines
  // Cyrillic into an English narrative. The per-language label is stored
  // alongside so the report can switch language safely.
  const zoneMap = new Map<string, { p1: number; p2: number; p3: number; samples: string[]; labelEn: string; labelRu: string }>();

  // Regulatory risks tracker
  const criticalRegulatoryItems: Array<{
    date: string;
    item: ChecklistItem;
    zone: string;
  }> = [];

  // 5S / Housekeeping / Bottlenecks tracker
  const bottleneckIssues: Array<{
    zone: string;
    desc: string;
    assignee: string;
  }> = [];

  // Safety culture / PPE issues tracker
  const cultureIssues: Array<{
    desc: string;
    zone: string;
  }> = [];

  // Map key: `${checkpointId}::${canonicalZoneKey}`
  const dedupMap = new Map<string, {
    item: ChecklistItem;
    zoneInfo: ReturnType<typeof resolveCanonicalZone>;
    occurrencesCount: number;
    dates: string[];
    dayLabelsRu: string[];
    dayLabelsEn: string[];
    firstSeenDate: string;
    lastSeenDate: string;
    highestPriority: Priority;
    latestPriority: Priority;
    latestStatus: 'Open' | 'In Progress' | 'Resolved';
    assignedTo: Assignee;
    targetDatePreset?: string;
    customTargetDate?: string;
    observations: DefectDailyObservation[];
    allPhotos: string[];
  }>();

  // Iterate chronologically through dates
  const sortedDates = Array.from(dateMap.keys()).sort();

  sortedDates.forEach((date) => {
    const daySessions = dateMap.get(date)!;
    // Combine items for this day metrics
    const allDayItems: ChecklistItem[] = [];
    daySessions.forEach((s) => allDayItems.push(...s.items));

    const dayMetrics = calculateMetrics(allDayItems);
    totalScoreSum += dayMetrics.scorePercentage;
    totalCheckpointsAudited += dayMetrics.total;

    dailyPoints.push({
      date,
      dayLabel: getWeekdayName(date, 'en'),
      score: dayMetrics.scorePercentage,
      totalItems: dayMetrics.total,
      defectsCount: dayMetrics.failed,
      p1Count: dayMetrics.criticalP1Count,
      inspector: daySessions[0]?.inspectorName || 'Inspector',
    });

    const dayLabelRu = getWeekdayName(date, 'ru');
    const dayLabelEn = getWeekdayName(date, 'en');

    // Process all sessions and items on this day
    daySessions.forEach((session) => {
      session.items.forEach((item) => {
        if (item.status === 'FAIL') {
          totalDefectsCount++;
          const p = item.defectDetails?.priority || 'P2';
          const zoneInfo = resolveCanonicalZone(item, session);
          const zone = zoneInfo.zoneKey;
          const desc = item.defectDetails?.description || item.titleRu;
          const resStatus = item.defectDetails?.resolutionStatus || 'Open';
          const currentInspector = session.inspectorName || 'Inspector';

          if (resStatus === 'Resolved') resolvedCount++;
          else if (resStatus === 'In Progress') inProgressCount++;
          else openCount++;

          // Domain tracking
          const catId = item.categoryId || 'cat2';
          if (domainDefects[catId]) {
            domainDefects[catId].count++;
            if (p === 'P1') domainDefects[catId].p1++;
          }

          // Zone tracking using canonical zone key (Latin). Both localized
          // labels are stored so the report can switch language safely.
          const zData = zoneMap.get(zone) || { p1: 0, p2: 0, p3: 0, samples: [], labelEn: zoneInfo.zoneLabelEn, labelRu: zoneInfo.zoneLabelRu };
          if (p === 'P1') zData.p1++;
          else if (p === 'P2') zData.p2++;
          else zData.p3++;
          if (zData.samples.length < 3 && desc) zData.samples.push(desc);
          zoneMap.set(zone, zData);

          // Regulatory & Life safety detection
          const isCat1 = catId === 'cat1' || ['1.1', '1.2', '1.3', '1.4', '1.5'].includes(item.id);
          const isP1 = p === 'P1';
          const isRegulatoryKeyword = /(fire|extinguisher|exit|egress|clearance|electrical|panel|hazard|high voltage|огнетушител|выход|эвакуац|щит)/i.test(
            desc + ' ' + item.titleEn + ' ' + item.standardEn
          );

          if (isCat1 || isP1 || isRegulatoryKeyword) {
            criticalRegulatoryCount++;
            criticalRegulatoryItems.push({ date, item, zone });
          }

          // Bottlenecks detection (repetitive 5S, cabling, clutter)
          if (catId === 'cat2' || catId === 'cat3') {
            bottleneckIssues.push({
              zone,
              desc,
              assignee: item.defectDetails?.assignedTo || 'Facilities',
            });
          }

          // Culture & PPE detection
          if (
            item.id === '4.4' ||
            /(ppe|glasses|goggles|boots|vest|ear|culture|очки|сиз|обувь|жилет)/i.test(desc + ' ' + item.titleEn)
          ) {
            cultureIssues.push({ desc, zone });
          }

          // Smart Chronological Deduplication tracking
          const dedupKey = `${item.id}::${zoneInfo.zoneKey}`;
          const obs: DefectDailyObservation = {
            date,
            dayLabel: dayLabelRu,
            sessionId: session.id,
            sessionDate: date,
            inspectorName: currentInspector,
            description: item.defectDetails?.description || item.titleRu,
            notes: item.defectDetails?.notes,
            priority: p,
            status: resStatus,
            rawLocation: zoneInfo.rawLocation,
            photosCount: item.defectDetails?.photos?.length || 0,
          };

          const photos = (item.defectDetails?.photos || []).map((photo) => photo.url).filter(Boolean);

          if (!dedupMap.has(dedupKey)) {
            dedupMap.set(dedupKey, {
              item,
              zoneInfo,
              occurrencesCount: 1,
              dates: [date],
              dayLabelsRu: [dayLabelRu],
              dayLabelsEn: [dayLabelEn],
              firstSeenDate: date,
              lastSeenDate: date,
              highestPriority: p,
              latestPriority: p,
              latestStatus: resStatus,
              assignedTo: item.defectDetails?.assignedTo || 'Facilities',
              targetDatePreset: item.defectDetails?.targetDate,
              customTargetDate: item.defectDetails?.customTargetDate,
              observations: [obs],
              allPhotos: [...photos],
            });
          } else {
            const entry = dedupMap.get(dedupKey)!;
            entry.occurrencesCount++;
            if (!entry.dates.includes(date)) {
              entry.dates.push(date);
              entry.dayLabelsRu.push(dayLabelRu);
              entry.dayLabelsEn.push(dayLabelEn);
            }
            entry.lastSeenDate = date;
            entry.highestPriority = getWorstPriority(entry.highestPriority, p);
            entry.latestPriority = p;
            entry.latestStatus = resStatus;
            if (item.defectDetails?.assignedTo) {
              entry.assignedTo = item.defectDetails.assignedTo;
            }
            entry.observations.push(obs);
            photos.forEach((url) => {
              if (!entry.allPhotos.includes(url)) entry.allPhotos.push(url);
            });
          }
        }
      });
    });
  });

  const auditedDaysCount = dailyPoints.length;
  const overallScore = auditedDaysCount > 0 ? Math.round(totalScoreSum / auditedDaysCount) : 100;

  // RAG status
  let ragStatus: 'GREEN' | 'AMBER' | 'RED' = 'GREEN';
  if (overallScore < 70) ragStatus = 'RED';
  else if (overallScore < 85) ragStatus = 'AMBER';

  // Trend vector calculation
  let trendDelta = 0;
  let trendDirection: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
  if (dailyPoints.length >= 2) {
    const firstScore = dailyPoints[0].score;
    const lastScore = dailyPoints[dailyPoints.length - 1].score;
    trendDelta = lastScore - firstScore;
    if (trendDelta > 1) trendDirection = 'UP';
    else if (trendDelta < -1) trendDirection = 'DOWN';
  }

  // Zone anti-rating ranking
  const zonesAntiRating: ZoneAntiRating[] = Array.from(zoneMap.entries())
    .map(([zone, data]) => {
      const totalDefects = data.p1 + data.p2 + data.p3;
      const severityScore = data.p1 * 4 + data.p2 * 2 + data.p3 * 1;
      const percentage = totalDefectsCount > 0 ? Math.round((totalDefects / totalDefectsCount) * 100) : 0;
      return {
        zone,
        zoneLabelEn: data.labelEn,
        zoneLabelRu: data.labelRu,
        totalDefects,
        p1Count: data.p1,
        p2Count: data.p2,
        p3Count: data.p3,
        severityScore,
        percentage,
        sampleIssues: data.samples,
      };
    })
    .sort((a, b) => b.severityScore - a.severityScore || b.totalDefects - a.totalDefects);

  // Operational domains
  const domainTitles: Record<string, { en: string; ru: string; icon: string }> = {
    cat1: { en: 'Life Safety & Egress', ru: 'Пожарная безопасность и эвакуация', icon: 'Flame' },
    cat2: { en: 'Shop Floor & 5S Order', ru: '5S, кабели и порядок на постах', icon: 'Factory' },
    cat3: { en: 'Warehouse, Racking & Docks', ru: 'Склад, стеллажи и рампы', icon: 'Warehouse' },
    cat4: { en: 'Facility, Waste & PPE', ru: 'Инфраструктура, отходы и СИЗ', icon: 'Building2' },
  };

  const domainBreakdown: DomainBreakdown[] = Object.keys(domainTitles).map((id) => {
    const count = domainDefects[id]?.count || 0;
    const p1 = domainDefects[id]?.p1 || 0;
    const percentage = totalDefectsCount > 0 ? Math.round((count / totalDefectsCount) * 100) : 0;
    return {
      id,
      titleEn: domainTitles[id].en,
      titleRu: domainTitles[id].ru,
      iconName: domainTitles[id].icon,
      defectCount: count,
      percentage,
      p1Count: p1,
    };
  });

  // Actionable Executive Matrix (3 tiers strictly matching the architecture)
  // topZoneEntry is the raw antiRating row; the human-readable label is
  // resolved per language so narrative never carries the wrong alphabet.
  const topZoneEntry = zonesAntiRating[0];
  const topTroubleZoneLabel = topZoneEntry
    ? (language === 'en' ? topZoneEntry.zoneLabelEn : topZoneEntry.zoneLabelRu)
    : (language === 'en' ? 'Facility Floor' : 'Основной цех');
  const actionableMatrix: ActionableMatrixRow[] = [];

  // Tier 1: Critical Regulatory
  if (criticalRegulatoryItems.length > 0) {
    const topReg = criticalRegulatoryItems[0];
    const regDesc = topReg.item.defectDetails?.description || topReg.item.titleEn;
    actionableMatrix.push({
      tier: 'CRITICAL',
      badgeColor: 'red',
      signalTitleEn: 'CRITICAL / REGULATORY',
      signalTitleRu: 'КРИТИЧНО / РЕГУЛЯТОР',
      issueEn: `Regulatory Exposure: ${regDesc} (${topReg.item.titleEn}). Non-compliance with OSHA 1910 / NFPA 101 standards.`,
      issueRu: `Риск штрафов регулятора: ${regDesc}. Нарушение стандартов OSHA 1910 / NFPA 101.`,
      riskAreaEn: topReg.zone,
      riskAreaRu: topReg.zone,
      actionEn: 'Administrative: Immediate executive sign-off for contractor inspection / clear egress corridor within 24h.',
      actionRu: 'Административное: Срочное заключение договора на аудит / освобождение проходов в течение 24 ч.',
      actionTypeEn: 'Administrative',
      actionTypeRu: 'Административное',
      owner: topReg.item.defectDetails?.assignedTo || 'Safety & EHS',
      sla: 'Immediate (<24h)',
    });
  } else {
    actionableMatrix.push({
      tier: 'CRITICAL',
      badgeColor: 'red',
      signalTitleEn: 'REGULATORY COMPLIANCE',
      signalTitleRu: 'РЕГУЛЯТОРНЫЙ СТАТУС',
      issueEn: 'Zero active OSHA/NFPA stop-factors detected. All fire stations, exits and electrical clearances conform to code.',
      issueRu: 'Критических нарушений OSHA/NFPA не зафиксировано. Огнетушители, выходы и щиты в норме.',
      riskAreaEn: 'Facility Wide',
      riskAreaRu: 'Все участки',
      actionEn: 'Preventative: Maintain routine monthly inspection schedule and vendor verification.',
      actionRu: 'Профилактическое: Поддержание регулярного графика ежемесячных ревизий.',
      actionTypeEn: 'Administrative',
      actionTypeRu: 'Административное',
      owner: 'Safety & EHS',
      sla: 'Standard',
    });
  }

  // Tier 2: Operational Bottlenecks
  if (zonesAntiRating.length > 0 && zonesAntiRating[0].totalDefects > 0) {
    const topZoneInfo = zonesAntiRating[0];
    const topIssue = topZoneInfo.sampleIssues[0] || 'Workstation clutter and unrouted tooling/cables';
    actionableMatrix.push({
      tier: 'BOTTLENECK',
      badgeColor: 'amber',
      signalTitleEn: 'PROCESS BOTTLENECK',
      signalTitleRu: 'ОПЕРАЦИОННОЕ УЗКОЕ МЕСТО',
      issueEn: `Repetitive failures in ${topZoneInfo.zone}: ${topIssue} (${topZoneInfo.totalDefects} defects, ${topZoneInfo.percentage}% of plant total).`,
      issueRu: `Системные дефекты на участке ${topZoneInfo.zone}: ${topIssue} (${topZoneInfo.totalDefects} замечаний, ${topZoneInfo.percentage}% от завода).`,
      riskAreaEn: topZoneInfo.zone,
      riskAreaRu: topZoneInfo.zone,
      actionEn: 'Process: Mandatory 5S audit with Area Lead, install cable routing channels & re-demarcate floor buffers.',
      actionRu: 'Процессное: Аудит начальника участка, внедрение кабель-каналов и переразметка буферных зон.',
      actionTypeEn: 'Process',
      actionTypeRu: 'Процессное',
      owner: 'Production / Facilities',
      sla: '3 Business Days',
    });
  } else {
    actionableMatrix.push({
      tier: 'BOTTLENECK',
      badgeColor: 'amber',
      signalTitleEn: '5S CONTINUOUS FLOW',
      signalTitleRu: 'ПОТОК 5S',
      issueEn: 'Shop floor organization and tooling storage operate without structural bottlenecks.',
      issueRu: 'Организация рабочих мест и хранение инструмента функционируют стабильно.',
      riskAreaEn: 'Production Lines',
      riskAreaRu: 'Производство',
      actionEn: 'Process: Continue weekly 5S audits and Kaizen micro-improvements.',
      actionRu: 'Процессное: Продолжать еженедельные аудиты 5S и микровнедрения кайдзен.',
      actionTypeEn: 'Process',
      actionTypeRu: 'Процессное',
      owner: 'Production Leads',
      sla: 'Ongoing',
    });
  }

  // Tier 3: Safety Culture / PPE Enforcement
  if (cultureIssues.length > 0) {
    const cIssue = cultureIssues[0];
    actionableMatrix.push({
      tier: 'CULTURE',
      badgeColor: 'blue',
      signalTitleEn: 'SAFETY CULTURE GAP',
      signalTitleRu: 'КУЛЬТУРА БЕЗОПАСНОСТИ',
      issueEn: `Discipline non-compliance: ${cIssue.desc} in ${cIssue.zone}. Risk of eye/foot injury and liability claims.`,
      issueRu: `Нарушение трудовой дисциплины: ${cIssue.desc} на участке ${cIssue.zone}. Риск травматизма и претензий.`,
      riskAreaEn: cIssue.zone,
      riskAreaRu: cIssue.zone,
      actionEn: 'Leadership: Briefing at management stand-up; mandate team leads enforce 100% PPE compliance under personal accountability.',
      actionRu: 'Управленческое: Разбор на планерке с лид-инженерами о персональной ответственности за ношение СИЗ.',
      actionTypeEn: 'Leadership',
      actionTypeRu: 'Управленческое',
      owner: 'Operations / Shift Leads',
      sla: 'Next Shift Standup',
    });
  } else {
    actionableMatrix.push({
      tier: 'CULTURE',
      badgeColor: 'blue',
      signalTitleEn: 'CULTURE & COMPLIANCE',
      signalTitleRu: 'КУЛЬТУРА И ДИСЦИПЛИНА',
      issueEn: 'Mandatory PPE (eye protection, safety footwear) respected across production and maintenance staff.',
      issueRu: 'Соблюдение СИЗ (защитные очки, спецобувь) выполняется производственным персоналом.',
      riskAreaEn: 'All Operating Zones',
      riskAreaRu: 'Все рабочие зоны',
      actionEn: 'Leadership: Reinforce positive safety behavior during weekly all-hands review.',
      actionRu: 'Управленческое: Поощрение соблюдения регламентов на общем собрании.',
      actionTypeEn: 'Leadership',
      actionTypeRu: 'Управленческое',
      owner: 'Shift Supervisors',
      sla: 'Weekly',
    });
  }

  // Narrative briefings
  const trendWordEn = trendDirection === 'UP' ? 'improving' : trendDirection === 'DOWN' ? 'declining' : 'holding steady';
  const trendWordRu = trendDirection === 'UP' ? 'позитивная' : trendDirection === 'DOWN' ? 'негативная' : 'стабильная';

  const narrative = {
    takeawayEn: `Plant safety compliance is at ${overallScore}% (${ragStatus === 'GREEN' ? 'Normal Operating' : ragStatus === 'AMBER' ? 'Attention Required' : 'Executive Intervention Needed'}) with a ${trendWordEn} trend (${trendDelta >= 0 ? '+' : ''}${trendDelta}%). Primary operational exposure centers on ${topTroubleZoneLabel}, representing ${zonesAntiRating[0]?.percentage || 0}% of all recorded defects.`,
    takeawayRu: `Индекс безопасности завода составляет ${overallScore}% (${ragStatus === 'GREEN' ? 'Нормальный режим' : ragStatus === 'AMBER' ? 'Требует внимания' : 'Требуется вмешательство руководства'}) с динамикой: ${trendWordRu} (${trendDelta >= 0 ? '+' : ''}${trendDelta}%). Основная концентрация рисков сосредоточена на участке ${topTroubleZoneLabel} (${zonesAntiRating[0]?.percentage || 0}% от всех дефектов).`,
    regulatoryEn:
      criticalRegulatoryCount > 0
        ? `Identified ${criticalRegulatoryCount} OSHA/NFPA regulatory stop-factors (clearances, fire protection, or egress lanes). Direct exposure to statutory citations and plant liability; executive sign-off required for immediate remediation.`
        : 'Zero statutory OSHA/NFPA stop-factors recorded this period. Emergency egress routes, fire extinguishing assets, and electrical panels meet full clearance standards.',
    regulatoryRu:
      criticalRegulatoryCount > 0
        ? `Зафиксировано ${criticalRegulatoryCount} регуляторных стоп-факторов OSHA/NFPA (эвакуация, пожарные посты или электрощиты). Прямой риск предписаний регулятора; требуется распоряжение руководства на устранение.`
        : 'Критических несоответствий OSHA/NFPA не выявлено. Пути эвакуации, пожарные посты и электрощиты соответствуют нормам.',
    bottlenecksEn: `Systemic 5S and physical layout bottlenecks persist in ${topTroubleZoneLabel}. Repetitive findings relate to unorganized cable drops, pallet buffer overflow, and tooling return delays.`,
    bottlenecksRu: `Системные узкие места 5S и планировки сохраняются на участке ${topTroubleZoneLabel}. Повторяющиеся замечания: незакрепленные кабели, переполнение буферных зон и задержки возврата инструмента.`,
    actionsEn: `Instruct Operations and Facility Leads to execute the 3-row Actionable Matrix: prioritize 24-hour clearance of critical items, execute 5S re-audit at ${topTroubleZoneLabel}, and hold Shift Leads accountable for PPE adherence.`,
    actionsRu: `Поручить руководителям производства и службы эксплуатации исполнение матрицы решений: устранить критические замечания за 24 ч, провести аудит 5S на участке ${topTroubleZoneLabel} и закрепить персональную ответственность за СИЗ.`,
  };

  // Structured LLM prompt for external Gemini / Workers AI call
  const rawExportPayload = {
    period: { startDate, endDate },
    facilityName,
    overallScore,
    auditedDaysCount,
    criticalRegulatoryCount,
    totalDefectsCount,
    openCount,
    resolvedCount,
    dailyScores: dailyPoints.map((d) => ({ date: d.date, day: d.dayLabel, score: d.score, defects: d.defectsCount })),
    topFailingZones: zonesAntiRating.slice(0, 5).map((z) => ({
      zone: language === 'en' ? z.zoneLabelEn : z.zoneLabelRu,
      totalDefects: z.totalDefects,
      p1: z.p1Count,
      percentage: z.percentage,
      // Sample issue text is whatever the inspector typed. In the EN
      // executive export we mask Cyrillic characters so the LLM prompt
      // and any downstream English text never contain mixed alphabets.
      samples: z.sampleIssues.map((s) => language === 'en' ? maskCyrillicForEnglish(s) : s),
    })),
    domainBreakdown: domainBreakdown.map((d) => ({
      domain: d.titleEn,
      defects: d.defectCount,
      percentage: d.percentage,
    })),
  };

  const llmPrompt = `You are a Senior Plant Operations & EHS Director briefing the CEO.
Analyze this weekly aggregated safety & facility data:
${JSON.stringify(rawExportPayload, null, 2)}

Generate an Executive Summary strictly matching this structure:
1. Executive Takeaway (2 sentences: overall trend and primary risk exposure).
2. Regulatory & Compliance Exposure (Highlight OSHA/NFPA violations: blocked electrical panels, uninspected fire extinguishers, egress blockage). Translate these into legal/operational liability terms.
3. Operational Bottlenecks (Identify repetitive failing zones like Wabtec or recurrent 5S/PPE failures).
4. Leadership Action Required (Direct recommendations for executive intervention with Department Leads).

Tone: Professional, direct, focused on risk management and accountability. Avoid operational trivialities.`;

  // Unique auditors extraction and automated report summary notes
  const uniqueAuditors: string[] = Array.from(
    new Set(
      filtered
        .map((s) => s.inspectorName?.trim())
        .filter((name): name is string => Boolean(name && name.length > 0))
    )
  );
  // In the English export we mask any Cyrillic inspector names so the
  // English CEO narrative stays single-alphabet; the user can identify
  // staff by session ids in the annex anyway.
  const auditorsForEnglish = uniqueAuditors.map((n) => maskCyrillicForEnglish(n));
  const auditorsFormatted = uniqueAuditors.length > 0
    ? (language === 'en' ? auditorsForEnglish.join(', ') : uniqueAuditors.join(', '))
    : (language === 'en' ? 'EHS Inspection Team' : 'EHS Inspection Team');
  const auditorsFormattedRu = uniqueAuditors.length > 0 ? uniqueAuditors.join(', ') : 'Инспекционная группа EHS';

  const daysCount = auditedDaysCount > 0 ? auditedDaysCount : 5;
  const daysWordEn = daysCount === 1 ? '1 operational day' : `${daysCount} operational working days`;
  const daysWordRu = daysCount === 1 ? '1 рабочий день' : `${daysCount} рабочих дней`;

  const summaryNoteEn = `Automated executive synthesis for the past ${daysWordEn} based on daily walkthrough audits conducted by: ${auditorsFormatted}.`;
  const summaryNoteRu = `Сводный автоматический отчет за последние ${daysWordRu} на основании ежедневных аудитов, подготовленных: ${auditorsFormattedRu}.`;

  // Consolidate defects for Annex Page 2 Register
  const allConsolidated: ConsolidatedWeeklyDefect[] = Array.from(dedupMap.values()).map((entry) => {
    const item = entry.item;
    const tier = classifyDefectTier(item, entry.highestPriority);

    const tierMeta = {
      CRITICAL: {
        ru: 'Критично / Регуляторные риски (OSHA / NFPA)',
        en: 'Critical / Regulatory Exposure',
        color: 'red' as const,
      },
      BOTTLENECK: {
        ru: 'Операционное узкое место (5S / Склад / Линии)',
        en: 'Process Bottleneck (5S / Layout / Storage)',
        color: 'amber' as const,
      },
      CULTURE: {
        ru: 'Культура безопасности и СИЗ (Дисциплина)',
        en: 'Safety Culture Gap (PPE & Human Factor)',
        color: 'blue' as const,
      },
    }[tier];

    // Compound tags: WABTEC | 1.4 • Title
    const cleanRu = item.titleRu.replace(/^\d+\.\d+\.?\s*/, '');
    const cleanEn = item.titleEn.replace(/^\d+\.\d+\.?\s*/, '');
    const compoundTagRu = `${entry.zoneInfo.zoneLabelRu} | ${item.id} • ${cleanRu}`;
    const compoundTagEn = `${entry.zoneInfo.zoneLabelEn} | ${item.id} • ${cleanEn}`;

    // Chronological consolidated comments with audit references
    const commentsRu = entry.observations
      .map((o) => {
        const parts = o.date.split('-');
        const dateFormatted = parts.length === 3 ? `${parts[2]}.${parts[1]}` : o.date;
        const shortId = formatShortSessionId(o.sessionId, o.date);
        const inspLastName = o.inspectorName ? o.inspectorName.split(' ')[0] : 'Инспектор';
        let text = `• [${dateFormatted} ${o.dayLabel} • ${shortId} • ${inspLastName}]: ${o.description}`;
        if (o.notes) text += ` (${o.notes})`;
        return text;
      })
      .join('\n');

    const commentsEn = entry.observations
      .map((o) => {
        const parts = o.date.split('-');
        const dateFormatted = parts.length === 3 ? `${parts[1]}/${parts[2]}` : o.date;
        const shortId = formatShortSessionId(o.sessionId, o.date);
        const inspLastName = o.inspectorName ? o.inspectorName.split(' ')[0] : 'Inspector';
        let text = `• [${dateFormatted} ${o.dayLabel} • ${shortId} • ${inspLastName}]: ${o.description}`;
        if (o.notes) text += ` (${o.notes})`;
        return text;
      })
      .join('\n');

    // Report references
    const reportReferences: ReportSessionReference[] = entry.observations.map((o) => {
      const parts = o.date.split('-');
      const formattedDateRu = parts.length === 3 ? `${parts[2]}.${parts[1]}` : o.date;
      const shortSessionId = formatShortSessionId(o.sessionId, o.date);
      return {
        sessionId: o.sessionId,
        shortSessionId,
        date: o.date,
        formattedDate: formattedDateRu,
        dayLabelRu: o.dayLabel,
        dayLabelEn: getWeekdayName(o.date, 'en'),
        inspector: o.inspectorName,
      };
    });

    const reportReferencesFormattedRu = Array.from(
      new Set(
        entry.observations.map((o) => {
          const parts = o.date.split('-');
          const formattedDateRu = parts.length === 3 ? `${parts[2]}.${parts[1]}` : o.date;
          const shortSessionId = formatShortSessionId(o.sessionId, o.date);
          return `${shortSessionId} (${formattedDateRu} ${o.dayLabel})`;
        })
      )
    ).join(', ');

    const reportReferencesFormattedEn = Array.from(
      new Set(
        entry.observations.map((o) => {
          const parts = o.date.split('-');
          const formattedDateEn = parts.length === 3 ? `${parts[1]}/${parts[2]}` : o.date;
          const shortSessionId = formatShortSessionId(o.sessionId, o.date);
          const enDay = getWeekdayName(o.date, 'en');
          return `${shortSessionId} (${formattedDateEn} ${enDay})`;
        })
      )
    ).join(', ');

    return {
      id: `${item.id}::${entry.zoneInfo.zoneKey}`,
      checkpointId: item.id,
      categoryId: item.categoryId,
      categoryTitleRu: item.categoryTitleRu,
      categoryTitleEn: item.categoryTitleEn,
      checkpointTitleRu: item.titleRu,
      checkpointTitleEn: item.titleEn,
      standardRu: item.standardRu,
      standardEn: item.standardEn,

      zoneKey: entry.zoneInfo.zoneKey,
      zoneLabelRu: entry.zoneInfo.zoneLabelRu,
      zoneLabelEn: entry.zoneInfo.zoneLabelEn,
      compoundTagRu,
      compoundTagEn,
      rawLocation: entry.zoneInfo.rawLocation,

      tier,
      tierTitleRu: tierMeta.ru,
      tierTitleEn: tierMeta.en,
      tierColor: tierMeta.color,

      recurrenceType: entry.occurrencesCount > 1 ? ('RECURRING' as const) : ('ISOLATED' as const),
      recurrenceVerdictRu:
        entry.occurrencesCount > 1
          ? 'Требует реорганизации процесса / изменения функционала'
          : 'Операционное устранение в смене',
      recurrenceVerdictEn:
        entry.occurrencesCount > 1
          ? 'Requires process reorganization / functional adaptation'
          : 'Shift-level operational correction',

      occurrencesCount: entry.occurrencesCount,
      dates: entry.dates,
      dayLabelsRu: entry.dayLabelsRu,
      dayLabelsEn: entry.dayLabelsEn,
      firstSeenDate: entry.firstSeenDate,
      lastSeenDate: entry.lastSeenDate,
      isPersistent: entry.occurrencesCount > 1,

      reportReferences,
      reportReferencesFormattedRu,
      reportReferencesFormattedEn,

      highestPriority: entry.highestPriority,
      latestPriority: entry.latestPriority,
      latestStatus: entry.latestStatus,
      assignedTo: entry.assignedTo,
      targetDatePreset: entry.targetDatePreset,
      customTargetDate: entry.customTargetDate,

      observations: entry.observations,
      consolidatedCommentsRu: commentsRu,
      consolidatedCommentsEn: commentsEn,

      totalPhotosCount: entry.allPhotos.length,
      samplePhotoUrls: entry.allPhotos.slice(0, 3),
    };
  });

  // Sort helper: Priority (P1 first) -> occurrences (descending) -> checkpointId (ascending)
  const sortDefects = (list: ConsolidatedWeeklyDefect[]) =>
    [...list].sort((a, b) => {
      const pRank: Record<Priority, number> = { P1: 3, P2: 2, P3: 1 };
      if (pRank[b.highestPriority] !== pRank[a.highestPriority]) {
        return pRank[b.highestPriority] - pRank[a.highestPriority];
      }
      if (b.occurrencesCount !== a.occurrencesCount) {
        return b.occurrencesCount - a.occurrencesCount;
      }
      return a.checkpointId.localeCompare(b.checkpointId);
    });

  const criticalTierDefects = sortDefects(allConsolidated.filter((d) => d.tier === 'CRITICAL'));
  const bottleneckTierDefects = sortDefects(allConsolidated.filter((d) => d.tier === 'BOTTLENECK'));
  const cultureTierDefects = sortDefects(allConsolidated.filter((d) => d.tier === 'CULTURE'));

  const defectRegister: ConsolidatedDefectRegister = {
    totalUniqueDefects: allConsolidated.length,
    totalRawDefectInstances: totalDefectsCount,
    recurringDefectsCount: allConsolidated.filter((d) => d.isPersistent).length,
    isolatedDefectsCount: allConsolidated.filter((d) => !d.isPersistent).length,
    criticalTierDefects,
    bottleneckTierDefects,
    cultureTierDefects,
  };

  return {
    period: {
      startDate,
      endDate,
      labelEn: `${startDate} to ${endDate}`,
      labelRu: `${startDate} — ${endDate}`,
    },
    facilityName,
    auditedDaysCount,
    overallScore,
    ragStatus,
    trendDelta,
    trendDirection,
    criticalRegulatoryCount,
    totalDefectsCount,
    totalCheckpointsAudited,
    openCount,
    resolvedCount,
    inProgressCount,
    dailyPoints,
    zonesAntiRating,
    domainBreakdown,
    actionableMatrix,
    narrative,
    auditorsList: uniqueAuditors,
    summaryNoteEn,
    summaryNoteRu,
    llmPrompt,
    defectRegister,
  };
}

/**
 * Replaces Cyrillic characters in a string with a stable Roman placeholder
 * so that English-language exports (CEO narrative, LLM prompt, Gemini copy)
 * never carry mixed alphabets. We keep the original length hint and ASCII
 * fallback instead of trying to transliterate (transliteration is lossy and
 * a future i18n improvement can swap this for a proper translation pass).
 */
export function maskCyrillicForEnglish(input: string | null | undefined): string {
  if (!input) return '';
  // Detect any Cyrillic character
  if (!/[\u0400-\u04FF]/.test(input)) return input;
  // Mask: collapse runs of Cyrillic into a bracketed placeholder
  return input.replace(/[\u0400-\u04FF]+/g, (match) => {
    if (match.length <= 2) return '[ru]';
    return '[ru-text]';
  });
}


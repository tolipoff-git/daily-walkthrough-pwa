import { InspectionSession, ChecklistItem } from '../types/inspection';
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
  endDate: string
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

  // Zone map
  const zoneMap = new Map<string, { p1: number; p2: number; p3: number; samples: string[] }>();

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

  // Iterate chronologically through dates
  const sortedDates = Array.from(dateMap.keys()).sort();

  sortedDates.forEach((date) => {
    const daySessions = dateMap.get(date)!;
    // Combine items for this day
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

    // Process all day items
    allDayItems.forEach((item) => {
      if (item.status === 'FAIL') {
        totalDefectsCount++;
        const p = item.defectDetails?.priority || 'P2';
        const rawZone = item.defectDetails?.zonePreset || item.defectDetails?.location || 'Floor / Unassigned';
        const zone = rawZone.trim() || 'Floor / Unassigned';
        const desc = item.defectDetails?.description || item.titleEn;
        const resStatus = item.defectDetails?.resolutionStatus || 'Open';

        if (resStatus === 'Resolved') resolvedCount++;
        else if (resStatus === 'In Progress') inProgressCount++;
        else openCount++;

        // Domain tracking
        const catId = item.categoryId || 'cat2';
        if (domainDefects[catId]) {
          domainDefects[catId].count++;
          if (p === 'P1') domainDefects[catId].p1++;
        }

        // Zone tracking
        const zData = zoneMap.get(zone) || { p1: 0, p2: 0, p3: 0, samples: [] };
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
      }
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
  const topTroubleZone = zonesAntiRating[0]?.zone || 'Facility Floor';
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
    takeawayEn: `Plant safety compliance is at ${overallScore}% (${ragStatus === 'GREEN' ? 'Normal Operating' : ragStatus === 'AMBER' ? 'Attention Required' : 'Executive Intervention Needed'}) with a ${trendWordEn} trend (${trendDelta >= 0 ? '+' : ''}${trendDelta}%). Primary operational exposure centers on ${topTroubleZone}, representing ${zonesAntiRating[0]?.percentage || 0}% of all recorded defects.`,
    takeawayRu: `Индекс безопасности завода составляет ${overallScore}% (${ragStatus === 'GREEN' ? 'Нормальный режим' : ragStatus === 'AMBER' ? 'Требует внимания' : 'Требуется вмешательство руководства'}) с динамикой: ${trendWordRu} (${trendDelta >= 0 ? '+' : ''}${trendDelta}%). Основная концентрация рисков сосредоточена на участке ${topTroubleZone} (${zonesAntiRating[0]?.percentage || 0}% от всех дефектов).`,
    regulatoryEn:
      criticalRegulatoryCount > 0
        ? `Identified ${criticalRegulatoryCount} OSHA/NFPA regulatory stop-factors (clearances, fire protection, or egress lanes). Direct exposure to statutory citations and plant liability; executive sign-off required for immediate remediation.`
        : 'Zero statutory OSHA/NFPA stop-factors recorded this period. Emergency egress routes, fire extinguishing assets, and electrical panels meet full clearance standards.',
    regulatoryRu:
      criticalRegulatoryCount > 0
        ? `Зафиксировано ${criticalRegulatoryCount} регуляторных стоп-факторов OSHA/NFPA (эвакуация, пожарные посты или электрощиты). Прямой риск предписаний регулятора; требуется распоряжение руководства на устранение.`
        : 'Критических несоответствий OSHA/NFPA не выявлено. Пути эвакуации, пожарные посты и электрощиты соответствуют нормам.',
    bottlenecksEn: `Systemic 5S and physical layout bottlenecks persist in ${topTroubleZone}. Repetitive findings relate to unorganized cable drops, pallet buffer overflow, and tooling return delays.`,
    bottlenecksRu: `Системные узкие места 5S и планировки сохраняются на участке ${topTroubleZone}. Повторяющиеся замечания: незакрепленные кабели, переполнение буферных зон и задержки возврата инструмента.`,
    actionsEn: `Instruct Operations and Facility Leads to execute the 3-row Actionable Matrix: prioritize 24-hour clearance of critical items, execute 5S re-audit at ${topTroubleZone}, and hold Shift Leads accountable for PPE adherence.`,
    actionsRu: `Поручить руководителям производства и службы эксплуатации исполнение матрицы решений: устранить критические замечания за 24 ч, провести аудит 5S на участке ${topTroubleZone} и закрепить персональную ответственность за СИЗ.`,
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
      zone: z.zone,
      totalDefects: z.totalDefects,
      p1: z.p1Count,
      percentage: z.percentage,
      samples: z.sampleIssues,
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
  const auditorsFormatted = uniqueAuditors.length > 0 ? uniqueAuditors.join(', ') : 'EHS Inspection Team';
  const auditorsFormattedRu = uniqueAuditors.length > 0 ? uniqueAuditors.join(', ') : 'Инспекционная группа EHS';

  const daysCount = auditedDaysCount > 0 ? auditedDaysCount : 5;
  const daysWordEn = daysCount === 1 ? '1 operational day' : `${daysCount} operational working days`;
  const daysWordRu = daysCount === 1 ? '1 рабочий день' : `${daysCount} рабочих дней`;

  const summaryNoteEn = `Automated executive synthesis for the past ${daysWordEn} based on daily walkthrough audits conducted by: ${auditorsFormatted}.`;
  const summaryNoteRu = `Сводный автоматический отчет за последние ${daysWordRu} на основании ежедневных аудитов, подготовленных: ${auditorsFormattedRu}.`;

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
  };
}

/**
 * Generates 5 realistic sample walkthrough sessions for Monday-Friday of the current week
 * Useful for demoing and previewing the executive dashboard when real history is sparse.
 */
export function generateDemoSessions(): InspectionSession[] {
  const range = getWeekDateRange(0);
  const mon = new Date(range.startDate + 'T00:00:00');

  const inspectors = [
    { name: 'Igor Tolipov', role: 'Facility & EHS Lead' },
    { name: 'Rich Fitzgerald', role: 'Operations Manager' },
    { name: 'Igor Tolipov', role: 'Facility & EHS Lead' },
    { name: 'Igor Tolipov', role: 'Facility & EHS Lead' },
    { name: 'Rich Fitzgerald', role: 'Operations Manager' },
  ];

  // Daily scenarios matching real plant context
  const dayConfigs = [
    // Monday: 88% score, 2 minor defects
    {
      scoreRate: 0.88,
      defects: [
        {
          id: '2.1',
          zone: 'Wabtec',
          desc: 'Loose cables across secondary assembly aisle, trip hazard',
          p: 'P2' as const,
          assignee: 'Production' as const,
          status: 'Resolved' as const,
        },
        {
          id: '3.1',
          zone: 'Warehouse',
          desc: 'Missing safety locking pin on rack bay D-04',
          p: 'P2' as const,
          assignee: 'Maintenance' as const,
          status: 'Resolved' as const,
        },
      ],
    },
    // Tuesday: 82% score, 3 defects including regulatory fire extinguisher
    {
      scoreRate: 0.82,
      defects: [
        {
          id: '1.3',
          zone: 'Build 2',
          desc: 'Fire extinguisher inspection tag overdue (last monthly sign-off missing), gauge near yellow',
          p: 'P1' as const,
          assignee: 'Safety & EHS' as const,
          status: 'In Progress' as const,
        },
        {
          id: '2.4',
          zone: 'Wabtec',
          desc: 'Workbench #3 cluttered with unreturned pneumatic wrenches and scrap metal',
          p: 'P3' as const,
          assignee: 'Production' as const,
          status: 'Resolved' as const,
        },
        {
          id: '4.4',
          zone: 'Workshop',
          desc: 'Assembly contractor observed without approved ANSI Z87.1 safety glasses',
          p: 'P2' as const,
          assignee: 'Safety & EHS' as const,
          status: 'Resolved' as const,
        },
      ],
    },
    // Wednesday: 80% score, 3 defects including electrical clearance
    {
      scoreRate: 0.80,
      defects: [
        {
          id: '1.4',
          zone: 'Wabtec',
          desc: 'Electrical distribution panel LP-02 blocked by 2 wooden pallets (< 36" clearance)',
          p: 'P1' as const,
          assignee: 'Facilities' as const,
          status: 'Resolved' as const,
        },
        {
          id: '2.1',
          zone: 'Tool Cage',
          desc: 'Extension cord daisy-chained across main doorway',
          p: 'P2' as const,
          assignee: 'Maintenance' as const,
          status: 'Resolved' as const,
        },
        {
          id: '4.1',
          zone: 'Warehouse',
          desc: 'Scrap metal dumpster overflowing into forklift transit lane',
          p: 'P2' as const,
          assignee: 'Logistics' as const,
          status: 'In Progress' as const,
        },
      ],
    },
    // Thursday: 76% score, drop in discipline
    {
      scoreRate: 0.76,
      defects: [
        {
          id: '1.1',
          zone: 'Loading Docks / Ramps 1-4',
          desc: 'Emergency exit door North-2 latch binding, required excessive force to open',
          p: 'P1' as const,
          assignee: 'Facilities' as const,
          status: 'In Progress' as const,
        },
        {
          id: '2.4',
          zone: 'Wabtec',
          desc: 'Recurring: tooling carts blocking pedestrian walkway near cell 4',
          p: 'P2' as const,
          assignee: 'Production' as const,
          status: 'Open' as const,
        },
        {
          id: '3.3',
          zone: 'Warehouse',
          desc: 'Pallet stack leaning on top shelf level 3 (instability hazard)',
          p: 'P1' as const,
          assignee: 'Logistics' as const,
          status: 'Resolved' as const,
        },
        {
          id: '4.4',
          zone: 'Wabtec',
          desc: 'Machining technicians without eye protection during grinding operation',
          p: 'P2' as const,
          assignee: 'Production' as const,
          status: 'Open' as const,
        },
      ],
    },
    // Friday: 78% score
    {
      scoreRate: 0.78,
      defects: [
        {
          id: '1.2',
          zone: 'Build 2',
          desc: 'Cardboard baler staging cartons obstructing exit travel aisle by 40%',
          p: 'P1' as const,
          assignee: 'Logistics' as const,
          status: 'Open' as const,
        },
        {
          id: '2.1',
          zone: 'Wabtec',
          desc: 'Oil puddle near CNC-01 coolant reservoir without spill kit deployed',
          p: 'P2' as const,
          assignee: 'Cleaning' as const,
          status: 'In Progress' as const,
        },
        {
          id: '3.2',
          zone: 'Warehouse',
          desc: 'Dock leveler lip sensor alarm buzzing intermittently, needs recalibration',
          p: 'P3' as const,
          assignee: 'Maintenance' as const,
          status: 'Open' as const,
        },
      ],
    },
  ];

  const sessions: InspectionSession[] = [];

  for (let i = 0; i < 5; i++) {
    const curDate = new Date(mon);
    curDate.setDate(mon.getDate() + i);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${curDate.getFullYear()}-${pad(curDate.getMonth() + 1)}-${pad(curDate.getDate())}`;
    const inspector = inspectors[i];
    const cfg = dayConfigs[i];

    // Standard 17 items template simulation
    const itemIds = [
      '1.1', '1.2', '1.3', '1.4', '1.5',
      '2.1', '2.2', '2.3', '2.4', '2.5', '2.6',
      '3.1', '3.2', '3.3',
      '4.1', '4.2', '4.3', '4.4'
    ];

    const sessionItems: ChecklistItem[] = itemIds.map((id) => {
      const catId = id.startsWith('1.') ? 'cat1' : id.startsWith('2.') ? 'cat2' : id.startsWith('3.') ? 'cat3' : 'cat4';
      const def = cfg.defects.find((d) => d.id === id);

      if (def) {
        return {
          id,
          categoryId: catId,
          categoryTitleRu: '',
          categoryTitleEn: '',
          titleRu: `Пункт ${id}`,
          titleEn: `Checkpoint ${id}`,
          standardRu: '',
          standardEn: '',
          status: 'FAIL' as const,
          defectDetails: {
            location: def.zone,
            zonePreset: def.zone,
            description: def.desc,
            priority: def.p,
            assignedTo: def.assignee,
            targetDate: dateStr,
            photos: [],
            resolutionStatus: def.status,
          },
        };
      }

      return {
        id,
        categoryId: catId,
        categoryTitleRu: '',
        categoryTitleEn: '',
        titleRu: `Пункт ${id}`,
        titleEn: `Checkpoint ${id}`,
        standardRu: '',
        standardEn: '',
        status: 'PASS' as const,
      };
    });

    sessions.push({
      id: `WALK-${dateStr.replace(/-/g, '')}-D0${i + 1}`,
      date: dateStr,
      startTime: '07:15',
      endTime: '08:45',
      facilityName: 'Main Facility & Logistics Center',
      facilityArea: 'All Plant Areas (Walkthrough)',
      shift: 'Day Shift (06:00 - 14:40)',
      inspectorName: inspector.name,
      inspectorRole: inspector.role,
      items: sessionItems,
      generalNotes: `Daily plant EHS audit completed. Walkthrough covering production, warehousing, and facilities.`,
      status: 'Signed Off',
      signatures: {
        inspector: inspector.name,
        inspectorTitle: inspector.role,
        timestamp: `${dateStr}T09:00:00.000Z`,
        reviewedBy: 'Rich Fitzgerald (Operations Manager)',
        reviewTimestamp: `${dateStr}T10:15:00.000Z`,
      },
      createdAt: `${dateStr}T07:15:00.000Z`,
      updatedAt: `${dateStr}T09:00:00.000Z`,
    });
  }

  return sessions;
}


import * as XLSX from 'xlsx';
import { WeeklyExecutiveReportData } from './weeklyReport';
import { Language } from '../i18n/types';

export function exportWeeklyReportToExcel(
  data: WeeklyExecutiveReportData,
  lang: Language = 'en'
): void {
  const isRu = lang === 'ru';
  const wb = XLSX.utils.book_new();

  // Sheet 1: Executive KPI Summary
  const summaryRows = [
    [isRu ? 'ЕЖЕНЕДЕЛЬНЫЙ ИСПОЛНИТЕЛЬНЫЙ ДАШБОРД ДЛЯ РУКОВОДСТВА (CEO)' : 'EXECUTIVE EHS & FACILITY WEEKLY DASHBOARD'],
    [''],
    [isRu ? 'Предприятие' : 'Facility', data.facilityName],
    [isRu ? 'Период' : 'Period', `${data.period.startDate} - ${data.period.endDate}`],
    [isRu ? 'Индекс безопасности недели (Score)' : 'Weekly Compliance Score', `${data.overallScore}%`],
    [isRu ? 'Статус RAG' : 'RAG Status', data.ragStatus],
    [isRu ? 'Динамика (Trend Delta)' : 'Trend Delta', `${data.trendDelta >= 0 ? '+' : ''}${data.trendDelta}% (${data.trendDirection})`],
    [isRu ? 'Регуляторные риски (OSHA/NFPA)' : 'Regulatory Exposure Count', data.criticalRegulatoryCount],
    [isRu ? 'Всего проверено пунктов' : 'Total Checkpoints Audited', data.totalCheckpointsAudited],
    [isRu ? 'Всего выявлено замечаний' : 'Total Defects Count', data.totalDefectsCount],
    [isRu ? 'Открыто' : 'Open', data.openCount],
    [isRu ? 'В работе' : 'In Progress', data.inProgressCount],
    [isRu ? 'Устранено' : 'Resolved', data.resolvedCount],
    [''],
    [isRu ? 'СТРУКТУРА ДЕФЕКТОВ ПО НАПРАВЛЕНИЯМ' : 'DEFECT STRUCTURE BY DOMAIN'],
    [isRu ? 'Направление' : 'Domain', isRu ? 'Количество замечаний' : 'Defects Count', isRu ? 'Доля %' : 'Share %', isRu ? 'Критических (P1)' : 'Critical (P1)'],
    ...data.domainBreakdown.map((d) => [
      isRu ? d.titleRu : d.titleEn,
      d.defectCount,
      `${d.percentage}%`,
      d.p1Count,
    ]),
    [''],
    [isRu ? 'МАТРИЦА УПРАВЛЕНЧЕСКИХ РЕШЕНИЙ (ACTIONABLE MATRIX)' : 'ACTIONABLE EXECUTIVE MATRIX'],
    [
      isRu ? 'Сигнал' : 'Signal',
      isRu ? 'Проблема / Наблюдение' : 'Issue & Observation',
      isRu ? 'Зона риска' : 'Risk Zone',
      isRu ? 'Требуемое решение' : 'Required Action',
      isRu ? 'Ответственный' : 'Owner',
      isRu ? 'Срок (SLA)' : 'SLA',
    ],
    ...data.actionableMatrix.map((m) => [
      isRu ? m.signalTitleRu : m.signalTitleEn,
      isRu ? m.issueRu : m.issueEn,
      isRu ? m.riskAreaRu : m.riskAreaEn,
      isRu ? m.actionRu : m.actionEn,
      m.owner,
      m.sla,
    ]),
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, isRu ? 'Сводка CEO' : 'Executive Summary');

  // Sheet 2: Daily Pulse Log
  const dailyRows = [
    [
      isRu ? 'Дата' : 'Date',
      isRu ? 'День' : 'Day',
      isRu ? 'Балл безопасности %' : 'Compliance Score %',
      isRu ? 'Проверено пунктов' : 'Checkpoints Audited',
      isRu ? 'Замечаний' : 'Defects',
      isRu ? 'Критических P1' : 'Critical P1',
      isRu ? 'Инспектор' : 'Inspector',
    ],
    ...data.dailyPoints.map((d) => [
      d.date,
      d.dayLabel,
      `${d.score}%`,
      d.totalItems,
      d.defectsCount,
      d.p1Count,
      d.inspector,
    ]),
  ];

  const wsDaily = XLSX.utils.aoa_to_sheet(dailyRows);
  XLSX.utils.book_append_sheet(wb, wsDaily, isRu ? 'Пульс недели' : 'Daily Pulse');

  // Sheet 3: Zone Anti-Rating
  const zoneRows = [
    [
      isRu ? 'Участок / Зона' : 'Facility Zone',
      isRu ? 'Всего замечаний' : 'Total Defects',
      isRu ? 'Доля от завода %' : 'Share of Total %',
      isRu ? 'P1 Критичные' : 'P1 Critical',
      isRu ? 'P2 Сменные' : 'P2 Shift',
      isRu ? 'P3 Плановые' : 'P3 Scheduled',
      isRu ? 'Индекс критичности' : 'Severity Score',
      isRu ? 'Примеры проблем' : 'Sample Issues',
    ],
    ...data.zonesAntiRating.map((z) => [
      isRu ? z.zoneLabelRu : z.zoneLabelEn,
      z.totalDefects,
      `${z.percentage}%`,
      z.p1Count,
      z.p2Count,
      z.p3Count,
      z.severityScore,
      z.sampleIssues.join('; '),
    ]),
  ];

  const wsZones = XLSX.utils.aoa_to_sheet(zoneRows);
  XLSX.utils.book_append_sheet(wb, wsZones, isRu ? 'Антирейтинг зон' : 'Zone Anti-Rating');

  // Sheet 4: Deduplicated Defect Register (Annex)
  const allDefectsSorted = [
    ...data.defectRegister.criticalTierDefects,
    ...data.defectRegister.bottleneckTierDefects,
    ...data.defectRegister.cultureTierDefects,
  ];

  const defectRegisterRows = [
    [isRu ? 'ПРИЛОЖЕНИЕ: РЕЕСТР ВЫЯВЛЕННЫХ НАРУШЕНИЙ И НЕСООТВЕТСТВИЙ (5 ДНЕЙ)' : 'ANNEX: CONSOLIDATED DEFECT & RISK REGISTER (5-DAY DEDUPLICATED)'],
    [''],
    [
      isRu ? 'Зона' : 'Zone',
      isRu ? 'Пункт чек-листа' : 'Checkpoint ID & Title',
      isRu ? 'Уровень (Tier)' : 'Tier',
      isRu ? 'Тип проблемы' : 'Recurrence Type',
      isRu ? 'Оценка влияния' : 'Systemic Impact Verdict',
      isRu ? 'Худший приоритет' : 'Highest Priority',
      isRu ? 'Частота' : 'Occurrences',
      isRu ? 'Даты фиксации' : 'Dates',
      isRu ? 'Отчеты аудитов в истории' : 'Audit Session References',
      isRu ? 'Статус' : 'Latest Status',
      isRu ? 'Ответственный' : 'Assignee',
      isRu ? 'Срок (SLA)' : 'Target SLA',
      isRu ? 'Хроника замечаний инспекторов' : 'Inspector Comments',
    ],
    ...allDefectsSorted.map((d) => [
      isRu ? d.zoneLabelRu : d.zoneLabelEn,
      `${d.checkpointId} • ${isRu ? d.checkpointTitleRu : d.checkpointTitleEn}`,
      isRu ? d.tierTitleRu : d.tierTitleEn,
      isRu ? (d.recurrenceType === 'RECURRING' ? 'Повторная' : 'Разовая') : d.recurrenceType,
      isRu ? d.recurrenceVerdictRu : d.recurrenceVerdictEn,
      d.highestPriority,
      d.isPersistent ? `${d.occurrencesCount}x` : '1x',
      isRu ? d.dayLabelsRu.join(', ') : d.dayLabelsEn.join(', '),
      isRu ? d.reportReferencesFormattedRu : d.reportReferencesFormattedEn,
      isRu ? (d.latestStatus === 'Resolved' ? 'Устранено' : d.latestStatus === 'In Progress' ? 'В работе' : 'Открыто') : d.latestStatus,
      d.assignedTo,
      d.targetDatePreset || (isRu ? 'До конца смены' : 'This shift'),
      isRu ? d.consolidatedCommentsRu : d.consolidatedCommentsEn,
    ]),
  ];

  const wsDefects = XLSX.utils.aoa_to_sheet(defectRegisterRows);
  XLSX.utils.book_append_sheet(wb, wsDefects, isRu ? 'Реестр нарушений' : 'Defect Register');

  // Save workbook
  const fileName = `EHS_Weekly_Executive_Report_${data.period.startDate}_${data.period.endDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

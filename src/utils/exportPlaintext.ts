import { InspectionSession } from '../types/inspection';
import { calculateMetrics } from './metrics';
import { Language } from '../i18n/types';
import { ru } from '../i18n/ru';
import { en } from '../i18n/en';
import { APP_VERSION, COMMIT_HASH } from '../version';

import { formatShift, formatArea, formatRole } from './formatters';

export function generatePlaintextReport(
  session: InspectionSession,
  lang: Language = 'ru'
): string {
  const t = lang === 'ru' ? ru : en;
  const isRu = lang === 'ru';
  const metrics = calculateMetrics(session.items);
  const defects = session.items.filter((item) => item.status === 'FAIL');

  const width = 76;
  const divider = '='.repeat(width);
  const thinDivider = '-'.repeat(width);

  let out = '';
  out += `${divider}\n`;
  out += isRu
    ? `ИТОГОВЫЙ ОТЧЕТ: ЕЖЕДНЕВНЫЙ ОБХОД ПРЕДПРИЯТИЯ (EHS & 5S WALKTHROUGH)\n`
    : `DAILY FACILITY & EHS WALKTHROUGH INSPECTION REPORT\n`;
  out += `${divider}\n\n`;

  out += isRu
    ? `ОБЩАЯ ИНФОРМАЦИЯ\n`
    : `GENERAL AUDIT INFORMATION\n`;
  out += `${thinDivider}\n`;
  out += `${(isRu ? 'ID Обхода:' : 'Audit ID:').padEnd(20, ' ')}${session.id}\n`;
  out += `${(isRu ? 'Дата:' : 'Date:').padEnd(20, ' ')}${session.date}\n`;
  out += `${(isRu ? 'Время обхода:' : 'Walkthrough Time:').padEnd(20, ' ')}${session.startTime} - ${session.endTime || (isRu ? 'В процессе' : 'In Progress')}\n`;
  out += `${(isRu ? 'Объект / Площадка:' : 'Facility / Campus:').padEnd(20, ' ')}${session.facilityName}\n`;
  out += `${(isRu ? 'Зона инспекции:' : 'Inspection Area:').padEnd(20, ' ')}${formatArea(session.facilityArea, lang)}\n`;
  out += `${(isRu ? 'Смена:' : 'Work Shift:').padEnd(20, ' ')}${formatShift(session.shift, lang)}\n`;
  out += `${(isRu ? 'Инспектор (EHS):' : 'Auditor (EHS):').padEnd(20, ' ')}${session.inspectorName} (${formatRole(session.inspectorRole, lang)})\n`;
  out += `${(isRu ? 'Статус аудита:' : 'Audit Status:').padEnd(20, ' ')}${session.status === 'Completed' ? (isRu ? 'ЗАВЕРШЕН' : 'COMPLETED') : (isRu ? 'В ПРОЦЕССЕ' : 'IN PROGRESS')}\n\n`;

  out += isRu
    ? `СВОДНЫЕ МЕТРИКИ И ПОКАЗАТЕЛИ (KPI)\n`
    : `EXECUTIVE SUMMARY & COMPLIANCE METRICS (KPIs)\n`;
  out += `${thinDivider}\n`;
  out += `${(isRu ? 'Всего пунктов:' : 'Total Checklist Items:').padEnd(30, ' ')}${metrics.total}\n`;
  out += `${(isRu ? 'Соответствует (PASS):' : 'Compliant (PASS):').padEnd(30, ' ')}${metrics.passed} (${Math.round((metrics.passed / metrics.total) * 100)}%)\n`;
  out += `${(isRu ? 'Замечания (FAIL):' : 'Defects (FAIL):').padEnd(30, ' ')}${metrics.failed}\n`;
  out += `${(isRu ? 'Не применимо (N/A):' : 'Not Applicable (N/A):').padEnd(30, ' ')}${metrics.na}\n`;
  out += `${(isRu ? 'В ожидании (Pending):' : 'Pending Review:').padEnd(30, ' ')}${metrics.pending}\n`;
  out += `${(isRu ? 'ИНДЕКС СООТВЕТСТВИЯ:' : 'COMPLIANCE SCORE:').padEnd(30, ' ')}${metrics.scorePercentage}%\n`;
  out += `${(isRu ? 'Приоритеты дефектов:' : 'Defect Priorities:').padEnd(30, ' ')}P1: ${metrics.criticalP1Count} | P2: ${metrics.shiftP2Count} | P3: ${metrics.scheduledP3Count}\n\n`;

  if (defects.length > 0) {
    out += isRu
      ? `ЖУРНАЛ КОРРЕКТИРУЮЩИХ ДЕЙСТВИЙ (ACTION LOG / CAPA)\n`
      : `CORRECTIVE ACTION PLAN & DEFECT LOG (CAPA)\n`;
    out += `${thinDivider}\n`;
    defects.forEach((d, idx) => {
      const details = d.defectDetails;
      const title = isRu ? d.titleRu : d.titleEn;
      const category = isRu ? d.categoryTitleRu : d.categoryTitleEn;
      const priorityInfo = t.priorities[details?.priority || 'P2'];
      const assigneeLabel = details?.assignedTo ? (t.assignees[details.assignedTo] || details.assignedTo) : (isRu ? 'Не назначен' : 'Unassigned');
      const targetDateLabel = details?.targetDate ? (t.targetDates[details.targetDate] || details.targetDate) : (isRu ? 'Сегодня' : 'Today');
      const customDateStr = details?.targetDate === 'Custom' && details.customTargetDate ? ` (${details.customTargetDate})` : '';

      out += `[${idx + 1}] ${isRu ? 'ПУНКТ' : 'ITEM'} ${d.id}: ${title}\n`;
      out += `    ${(isRu ? 'Категория:' : 'Category:').padEnd(16, ' ')}${category}\n`;
      out += `    ${(isRu ? 'Локация/Зона:' : 'Location:').padEnd(16, ' ')}${details?.location || (isRu ? 'Не указана' : 'Not specified')}\n`;
      out += `    ${(isRu ? 'Приоритет:' : 'Priority:').padEnd(16, ' ')}[${details?.priority || 'P2'}] ${priorityInfo.short}\n`;
      out += `    ${(isRu ? 'Ответственный:' : 'Assignee:').padEnd(16, ' ')}${assigneeLabel}\n`;
      out += `    ${(isRu ? 'Срок (Target):' : 'Due Date:').padEnd(16, ' ')}${targetDateLabel}${customDateStr}\n`;
      out += `    ${(isRu ? 'Описание:' : 'Description:').padEnd(16, ' ')}${details?.description || (isRu ? 'Нет описания' : 'No description')}\n`;
      if (details?.notes) {
        out += `    ${(isRu ? 'Комментарий:' : 'Notes:').padEnd(16, ' ')}${details.notes}\n`;
      }
      if (details?.photos && details.photos.length > 0) {
        out += `    ${(isRu ? 'Фотофиксация:' : 'Photo Evidence:').padEnd(16, ' ')}${details.photos.length} ${isRu ? 'прикреплено' : 'attached'}\n`;
      }
      out += `\n`;
    });
  } else {
    out += isRu
      ? `ЗАМЕЧАНИЙ НЕ ВЫЯВЛЕНО. Все проверенные участки соответствуют стандартам EHS & 5S.\n\n`
      : `ZERO DEFECTS IDENTIFIED. All inspected areas meet safety & 5S standards.\n\n`;
  }

  out += isRu
    ? `ПОЛНЫЙ ЧЕК-ЛИСТ ПРОВЕРКИ (${session.items.length} ПУНКТОВ)\n`
    : `FULL WALKTHROUGH CHECKLIST (${session.items.length} ITEMS)\n`;
  out += `${thinDivider}\n`;
  out += isRu
    ? `| ID  | Статус | Наименование пункта проверки                      | Примечание / Локация\n`
    : `| ID  | Status | Inspection Point Name                             | Notes / Location\n`;
  out += `${thinDivider}\n`;

  session.items.forEach((item) => {
    const statusText = item.status === 'PASS' ? '[ OK ]' : item.status === 'FAIL' ? '[FAIL]' : item.status === 'NA' ? '[N/A ]' : '[ -- ]';
    const rawTitle = isRu ? item.titleRu : item.titleEn;
    const cleanTitle = rawTitle.length > 46 ? rawTitle.substring(0, 43) + '...' : rawTitle.padEnd(46, ' ');
    const note = item.status === 'FAIL'
      ? `(P:${item.defectDetails?.priority || 'P2'}) ${item.defectDetails?.location || item.defectDetails?.description || ''}`
      : (item.itemNotes || '');

    out += `| ${item.id.padEnd(3, ' ')} | ${statusText} | ${cleanTitle} | ${note.substring(0, 26)}\n`;
  });
  out += `${thinDivider}\n\n`;

  if (session.generalNotes) {
    out += isRu
      ? `ОБЩИЕ НАБЛЮДЕНИЯ И 5S КОММЕНТАРИИ:\n`
      : `GENERAL OBSERVATIONS & 5S CULTURE NOTES:\n`;
    out += `${session.generalNotes}\n\n`;
  }

  out += isRu
    ? `ПОДПИСИ И СОГЛАСОВАНИЕ:\n`
    : `SIGNATURES & APPROVAL SIGN-OFF:\n`;
  const signTimeStr = session.signatures?.timestamp ? new Date(session.signatures.timestamp).toLocaleString(isRu ? 'ru-RU' : 'en-US') : '';
  out += `${(isRu ? 'Инспектор:' : 'Inspector:').padEnd(14, ' ')}${session.inspectorName} ____________ / ${isRu ? 'Дата:' : 'Date:'} ${signTimeStr}\n`;
  if (session.signatures?.reviewedBy) {
    out += `${(isRu ? 'Руководитель:' : 'Reviewed By:').padEnd(14, ' ')}${session.signatures.reviewedBy} ____________\n`;
  } else {
    out += `${(isRu ? 'Руководитель:' : 'Reviewed By:').padEnd(14, ' ')}__________________________ / ${isRu ? 'Дата:' : 'Date:'} _____________\n`;
  }
  out += `${thinDivider}\n`;
  out += `Daily Facility & EHS Walkthrough PWA ${APP_VERSION} (Commit: ${COMMIT_HASH})\n`;
  out += `${divider}\n`;

  return out;
}

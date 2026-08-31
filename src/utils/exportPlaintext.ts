import { InspectionSession } from '../types/inspection';
import { calculateMetrics } from './metrics';

export function generatePlaintextReport(session: InspectionSession): string {
  const metrics = calculateMetrics(session.items);
  const defects = session.items.filter((item) => item.status === 'FAIL');

  const divider = '='.repeat(76);
  const thinDivider = '-'.repeat(76);

  let out = '';
  out += `${divider}\n`;
  out += `ИТОГОВЫЙ ОТЧЕТ: ЕЖЕДНЕВНЫЙ ОБХОД ПРЕДПРИЯТИЯ (EHS & FACILITY WALKTHROUGH)\n`;
  out += `${divider}\n\n`;

  out += `ОБЩАЯ ИНФОРМАЦИЯ / GENERAL INFO\n`;
  out += `${thinDivider}\n`;
  out += `ID Обхода:       ${session.id}\n`;
  out += `Дата:            ${session.date}\n`;
  out += `Время обхода:    ${session.startTime} - ${session.endTime || 'В процессе'}\n`;
  out += `Объект / Локация:${session.facilityName}\n`;
  out += `Зона инспекции:  ${session.facilityArea}\n`;
  out += `Смена:           ${session.shift}\n`;
  out += `Инспектор (EHS): ${session.inspectorName} (${session.inspectorRole})\n`;
  out += `Статус аудита:   ${session.status === 'Completed' ? 'ЗАВЕРШЕН / COMPLETED' : session.status}\n\n`;

  out += `СВОДНЫЕ МЕТРИКИ И ПОКАЗАТЕЛИ / EXECUTIVE METRICS\n`;
  out += `${thinDivider}\n`;
  out += `Всего пунктов проверки:   ${metrics.total}\n`;
  out += `Пройдено (PASS):          ${metrics.passed}  (${Math.round((metrics.passed / metrics.total) * 100)}%)\n`;
  out += `Выявлено замечаний (FAIL):${metrics.failed}\n`;
  out += `Не применимо (N/A):       ${metrics.na}\n`;
  out += `В ожидании (Pending):     ${metrics.pending}\n`;
  out += `ИНДЕКС СООТВЕТСТВИЯ (SCORE): ${metrics.scorePercentage}%\n`;
  out += `Приоритет дефектов:       P1 (Критично): ${metrics.criticalP1Count} | P2 (В смену): ${metrics.shiftP2Count} | P3 (Планово): ${metrics.scheduledP3Count}\n\n`;

  if (defects.length > 0) {
    out += `ЖУРНАЛ КОРРЕКТИРУЮЩИХ ДЕЙСТВИЙ (ACTION LOG / DEFECTS)\n`;
    out += `${thinDivider}\n`;
    defects.forEach((d, idx) => {
      const details = d.defectDetails;
      out += `[${idx + 1}] ПУНКТ ${d.id}: ${d.titleRu}\n`;
      out += `    Категория:    ${d.categoryTitleRu}\n`;
      out += `    Локация/Зона: ${details?.location || 'Не указана'}\n`;
      out += `    Приоритет:    [${details?.priority || 'P2'}] ${details?.priority === 'P1' ? 'КРИТИЧНО (Срочно!)' : details?.priority === 'P2' ? 'В течение смены' : 'Плановое устранение'}\n`;
      out += `    Ответственный:${details?.assignedTo || 'Не назначен'}\n`;
      out += `    Срок (Target):${details?.targetDate || 'Сегодня'}${details?.customTargetDate ? ' (' + details.customTargetDate + ')' : ''}\n`;
      out += `    Описание:     ${details?.description || 'Нет описания'}\n`;
      if (details?.notes) {
        out += `    Комментарий:  ${details.notes}\n`;
      }
      if (details?.photos && details.photos.length > 0) {
        out += `    Фотофиксация: ${details.photos.length} прикреплено\n`;
      }
      out += `\n`;
    });
  } else {
    out += `ЗАМЕЧАНИЙ НЕ ВЫЯВЛЕНО. Все проверенные участки соответствуют стандартам EHS & 5S.\n\n`;
  }

  out += `ПОЛНЫЙ ЧЕК-ЛИСТ ПРОВЕРКИ (17 ПУНКТОВ)\n`;
  out += `${thinDivider}\n`;
  out += `| ID  | Статус | Наименование пункта проверки                      | Примечание\n`;
  out += `${thinDivider}\n`;

  session.items.forEach((item) => {
    const statusText = item.status === 'PASS' ? '[ OK ]' : item.status === 'FAIL' ? '[FAIL]' : item.status === 'NA' ? '[N/A ]' : '[ -- ]';
    const cleanTitle = item.titleRu.length > 44 ? item.titleRu.substring(0, 41) + '...' : item.titleRu.padEnd(44, ' ');
    const note = item.status === 'FAIL' 
      ? `(P:${item.defectDetails?.priority || 'P2'}) ${item.defectDetails?.location || item.defectDetails?.description || ''}`
      : (item.itemNotes || '');
    
    out += `| ${item.id.padEnd(3, ' ')} | ${statusText} | ${cleanTitle} | ${note.substring(0, 30)}\n`;
  });
  out += `${thinDivider}\n\n`;

  if (session.generalNotes) {
    out += `ОБЩИЕ НАБЛЮДЕНИЯ И 5S КОММЕНТАРИИ:\n`;
    out += `${session.generalNotes}\n\n`;
  }

  out += `ПОДПИСИ И СОГЛАСОВАНИЕ:\n`;
  out += `${thinDivider}\n`;
  out += `Инспектор:   ${session.inspectorName} ____________ / Дата: ${new Date(session.signatures.timestamp).toLocaleString('ru-RU')}\n`;
  if (session.signatures.reviewedBy) {
    out += `Руководитель:${session.signatures.reviewedBy} ____________\n`;
  } else {
    out += `Руководитель: __________________________ / Дата: _____________\n`;
  }
  out += `${divider}\n`;

  return out;
}

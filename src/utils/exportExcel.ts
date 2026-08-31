import * as XLSX from 'xlsx';
import { InspectionSession } from '../types/inspection';
import { calculateMetrics } from './metrics';

export function exportInspectionToExcel(session: InspectionSession): void {
  const metrics = calculateMetrics(session.items);
  const defects = session.items.filter((item) => item.status === 'FAIL');

  const workbook = XLSX.utils.book_new();

  // --- SHEET 1: SUMMARY & KPIS ---
  const summaryData: (string | number)[][] = [
    ['ИТОГОВЫЙ ОТЧЕТ ЕЖЕДНЕВНОГО ОБХОДА (EHS & FACILITY WALKTHROUGH)'],
    [''],
    ['ПАРАМЕТР ИНСПЕКЦИИ', 'ЗНАЧЕНИЕ'],
    ['ID Проверки', session.id],
    ['Дата проведения', session.date],
    ['Время начала / окончания', `${session.startTime} - ${session.endTime || 'В процессе'}`],
    ['Предприятие / Объект', session.facilityName],
    ['Зона / Участок', session.facilityArea],
    ['Смена', session.shift],
    ['Инспектор (EHS)', `${session.inspectorName} (${session.inspectorRole})`],
    ['Статус аудита', session.status],
    [''],
    ['ПОКАЗАТЕЛИ ИНСПЕКЦИИ (KPI)', 'КОЛИЧЕСТВО', 'ДОЛЯ (%)'],
    ['Всего контрольных пунктов', metrics.total, '100%'],
    ['Соответствует (PASS)', metrics.passed, `${Math.round((metrics.passed / metrics.total) * 100)}%`],
    ['Несоответствия (FAIL)', metrics.failed, `${Math.round((metrics.failed / metrics.total) * 100)}%`],
    ['Не применимо (N/A)', metrics.na, `${Math.round((metrics.na / metrics.total) * 100)}%`],
    ['В процессе (Pending)', metrics.pending, `${Math.round((metrics.pending / metrics.total) * 100)}%`],
    ['ИНДЕКС СООТВЕТСТВИЯ (SCORE)', `${metrics.scorePercentage}%`, ''],
    [''],
    ['СТАТИСТИКА ЗАМЕЧАНИЙ ПО ПРИОРИТЕТАМ', 'КОЛИЧЕСТВО'],
    ['P1 - Критический (Immediate / Stop)', metrics.criticalP1Count],
    ['P2 - В течение смены (This shift)', metrics.shiftP2Count],
    ['P3 - Плановое устранение (Scheduled)', metrics.scheduledP3Count],
    [''],
    ['ОБЩИЕ ЗАМЕЧАНИЯ И 5S КОММЕНТАРИИ:'],
    [session.generalNotes || 'Без дополнительных примечаний'],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 35 }, { wch: 40 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Сводка (Summary)');

  // --- SHEET 2: ACTION LOG & DEFECTS ---
  const actionHeader = [
    '№',
    'ID Пункта',
    'Категория',
    'Контрольный пункт',
    'Приоритет',
    'Локация / Зона',
    'Описание дефекта / замечания',
    'Ответственный',
    'Срок устранения',
    'Статус дефекта',
    'Фото',
    'Комментарии',
  ];

  const actionRows = defects.map((d, index) => {
    const details = d.defectDetails;
    return [
      index + 1,
      d.id,
      d.categoryTitleRu,
      d.titleRu,
      details?.priority || 'P2',
      details?.location || '',
      details?.description || '',
      details?.assignedTo || '',
      details?.targetDate === 'Custom' ? details.customTargetDate || 'Custom' : details?.targetDate || 'Today',
      details?.resolutionStatus || 'Open',
      details?.photos?.length ? `${details.photos.length} фото` : 'Нет',
      details?.notes || '',
    ];
  });

  const actionSheetData = [actionHeader, ...actionRows];
  const actionSheet = XLSX.utils.aoa_to_sheet(actionSheetData);
  actionSheet['!cols'] = [
    { wch: 5 },
    { wch: 10 },
    { wch: 32 },
    { wch: 35 },
    { wch: 12 },
    { wch: 30 },
    { wch: 45 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 10 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(workbook, actionSheet, 'Журнал дефектов (CAPA)');

  // --- SHEET 3: FULL 17 CHECKLIST ITEMS ---
  const fullAuditHeader = [
    'ID',
    'Категория',
    'Наименование пункта проверки',
    'Стандарт безопасности / Описание требования',
    'Результат',
    'Локация / Описание замечания',
    'Ответственный',
    'Срок',
    'Примечания инспектора',
  ];

  const fullAuditRows = session.items.map((item) => {
    const statusMap = {
      PASS: 'PASS (OK)',
      FAIL: 'FAIL (Несоответствие)',
      NA: 'N/A (Не применимо)',
      PENDING: 'В ожидании',
    };

    return [
      item.id,
      item.categoryTitleRu,
      item.titleRu,
      item.standardRu,
      statusMap[item.status] || item.status,
      item.status === 'FAIL' ? item.defectDetails?.location || item.defectDetails?.description || '' : '',
      item.status === 'FAIL' ? item.defectDetails?.assignedTo || '' : '',
      item.status === 'FAIL' ? item.defectDetails?.targetDate || '' : '',
      item.status === 'FAIL' ? item.defectDetails?.notes || '' : item.itemNotes || '',
    ];
  });

  const fullAuditData = [fullAuditHeader, ...fullAuditRows];
  const fullAuditSheet = XLSX.utils.aoa_to_sheet(fullAuditData);
  fullAuditSheet['!cols'] = [
    { wch: 8 },
    { wch: 32 },
    { wch: 35 },
    { wch: 55 },
    { wch: 22 },
    { wch: 35 },
    { wch: 18 },
    { wch: 15 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(workbook, fullAuditSheet, 'Полный чек-лист (17)');

  // Generate binary XLSX file and trigger download
  const filename = `EHS_Walkthrough_${session.date}_${session.id}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

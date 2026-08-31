import * as XLSX from 'xlsx';
import { InspectionSession } from '../types/inspection';
import { calculateMetrics } from './metrics';
import { Language } from '../i18n/types';
import { ru } from '../i18n/ru';
import { en } from '../i18n/en';

export function exportInspectionToExcel(session: InspectionSession, lang: Language = 'ru'): void {
  const t = lang === 'ru' ? ru : en;
  const isRu = lang === 'ru';
  const metrics = calculateMetrics(session.items);
  const defects = session.items.filter((item) => item.status === 'FAIL');

  const workbook = XLSX.utils.book_new();

  // --- SHEET 1: SUMMARY & KPIS ---
  const summaryTitle = isRu
    ? 'ИТОГОВЫЙ ОТЧЕТ ЕЖЕДНЕВНОГО ОБХОДА (EHS & FACILITY WALKTHROUGH)'
    : 'DAILY FACILITY & EHS WALKTHROUGH INSPECTION REPORT';

  const summaryData: (string | number)[][] = [
    [summaryTitle],
    [''],
    [isRu ? 'ПАРАМЕТР ИНСПЕКЦИИ' : 'AUDIT PARAMETER', isRu ? 'ЗНАЧЕНИЕ' : 'VALUE'],
    [isRu ? 'ID Проверки' : 'Inspection ID', session.id],
    [isRu ? 'Дата проведения' : 'Audit Date', session.date],
    [isRu ? 'Время начала / окончания' : 'Inspection Time', `${session.startTime} - ${session.endTime || (isRu ? 'В процессе' : 'In Progress')}`],
    [isRu ? 'Предприятие / Объект' : 'Facility / Campus', session.facilityName],
    [isRu ? 'Зона / Участок' : 'Scope / Area', session.facilityArea],
    [isRu ? 'Смена' : 'Work Shift', session.shift],
    [isRu ? 'Инспектор (EHS)' : 'Auditor (EHS)', `${session.inspectorName} (${session.inspectorRole})`],
    [isRu ? 'Статус аудита' : 'Audit Status', session.status],
    [''],
    [isRu ? 'ПОКАЗАТЕЛИ ИНСПЕКЦИИ (KPI)' : 'EXECUTIVE METRICS (KPIs)', isRu ? 'КОЛИЧЕСТВО' : 'COUNT', isRu ? 'ДОЛЯ (%)' : 'SHARE (%)'],
    [isRu ? 'Всего контрольных пунктов' : 'Total Audit Points', metrics.total, '100%'],
    [isRu ? 'Соответствует (PASS)' : 'Compliant (PASS)', metrics.passed, `${Math.round((metrics.passed / metrics.total) * 100)}%`],
    [isRu ? 'Несоответствия (FAIL)' : 'Defects (FAIL)', metrics.failed, `${Math.round((metrics.failed / metrics.total) * 100)}%`],
    [isRu ? 'Не применимо (N/A)' : 'Not Applicable (N/A)', metrics.na, `${Math.round((metrics.na / metrics.total) * 100)}%`],
    [isRu ? 'В процессе (Pending)' : 'Pending Review', metrics.pending, `${Math.round((metrics.pending / metrics.total) * 100)}%`],
    [isRu ? 'ИНДЕКС СООТВЕТСТВИЯ (SCORE)' : 'COMPLIANCE SCORE (SCORE)', `${metrics.scorePercentage}%`, ''],
    [''],
    [isRu ? 'СТАТИСТИКА ЗАМЕЧАНИЙ ПО ПРИОРИТЕТАМ' : 'DEFECT PRIORITY BREAKDOWN', isRu ? 'КОЛИЧЕСТВО' : 'COUNT'],
    [isRu ? 'P1 - Критический (Immediate / Stop)' : 'P1 - Critical (Immediate / Stop-Work)', metrics.criticalP1Count],
    [isRu ? 'P2 - В течение смены (This shift)' : 'P2 - This Shift (Before End of Shift)', metrics.shiftP2Count],
    [isRu ? 'P3 - Плановое устранение (Scheduled)' : 'P3 - Scheduled (Planned Maintenance)', metrics.scheduledP3Count],
    [''],
    [isRu ? 'ОБЩИЕ ЗАМЕЧАНИЯ И 5S КОММЕНТАРИИ:' : 'GENERAL OBSERVATIONS & 5S COMMENTS:'],
    [session.generalNotes || (isRu ? 'Без дополнительных примечаний' : 'No additional observations recorded')],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 38 }, { wch: 45 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(
    workbook,
    summarySheet,
    isRu ? 'Сводка (Summary)' : 'Summary & KPIs'
  );

  // --- SHEET 2: ACTION LOG & DEFECTS ---
  const actionHeader = isRu
    ? [
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
      ]
    : [
        '#',
        'Item ID',
        'Category',
        'Inspection Point',
        'Priority',
        'Location / Area',
        'Defect Description / Hazard',
        'Responsible Department',
        'Target Date',
        'Resolution Status',
        'Photos',
        'Auditor Notes',
      ];

  const actionRows = defects.map((d, index) => {
    const details = d.defectDetails;
    const category = isRu ? d.categoryTitleRu : d.categoryTitleEn;
    const title = isRu ? d.titleRu : d.titleEn;
    const priorityLabel = details?.priority ? t.priorities[details.priority].short : 'P2';
    const assigneeLabel = details?.assignedTo ? (t.assignees[details.assignedTo] || details.assignedTo) : '';
    const targetDateLabel = details?.targetDate === 'Custom'
      ? (details.customTargetDate || 'Custom')
      : details?.targetDate
      ? (t.targetDates[details.targetDate] || details.targetDate)
      : (isRu ? 'Сегодня' : 'Today');

    const resStatusLabel = details?.resolutionStatus === 'Resolved'
      ? (isRu ? 'Устранено (Resolved)' : 'Resolved')
      : details?.resolutionStatus === 'In Progress'
      ? (isRu ? 'В работе (In Progress)' : 'In Progress')
      : (isRu ? 'Открыто (Open)' : 'Open');

    const photosLabel = details?.photos?.length
      ? `${details.photos.length} ${isRu ? 'фото' : 'photo(s)'}`
      : (isRu ? 'Нет' : 'None');

    return [
      index + 1,
      d.id,
      category,
      title,
      priorityLabel,
      details?.location || '',
      details?.description || '',
      assigneeLabel,
      targetDateLabel,
      resStatusLabel,
      photosLabel,
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
    { wch: 16 },
    { wch: 30 },
    { wch: 45 },
    { wch: 25 },
    { wch: 25 },
    { wch: 18 },
    { wch: 12 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(
    workbook,
    actionSheet,
    isRu ? 'Журнал дефектов (CAPA)' : 'Defects & CAPA Log'
  );

  // --- SHEET 3: FULL 17 CHECKLIST ITEMS ---
  const fullAuditHeader = isRu
    ? [
        'ID',
        'Категория',
        'Наименование пункта проверки',
        'Стандарт безопасности / Описание требования',
        'Результат',
        'Локация / Описание замечания',
        'Ответственный',
        'Срок',
        'Примечания инспектора',
      ]
    : [
        'ID',
        'Category',
        'Inspection Point Title',
        'Safety Standard / Requirement',
        'Inspection Result',
        'Finding Description / Location',
        'Assignee',
        'Due Date',
        'Inspector Notes',
      ];

  const fullAuditRows = session.items.map((item) => {
    const statusMap = isRu
      ? {
          PASS: 'PASS (Соответствует)',
          FAIL: 'FAIL (Замечание)',
          NA: 'N/A (Не применимо)',
          PENDING: 'В ожидании',
        }
      : {
          PASS: 'PASS (Compliant)',
          FAIL: 'FAIL (Defect)',
          NA: 'N/A (Not Applicable)',
          PENDING: 'Pending',
        };

    const category = isRu ? item.categoryTitleRu : item.categoryTitleEn;
    const title = isRu ? item.titleRu : item.titleEn;
    const standard = isRu ? item.standardRu : item.standardEn;
    const assigneeLabel = item.defectDetails?.assignedTo
      ? (t.assignees[item.defectDetails.assignedTo] || item.defectDetails.assignedTo)
      : '';
    const targetDateLabel = item.defectDetails?.targetDate
      ? (t.targetDates[item.defectDetails.targetDate] || item.defectDetails.targetDate)
      : '';

    return [
      item.id,
      category,
      title,
      standard,
      statusMap[item.status] || item.status,
      item.status === 'FAIL' ? item.defectDetails?.location || item.defectDetails?.description || '' : '',
      item.status === 'FAIL' ? assigneeLabel : '',
      item.status === 'FAIL' ? targetDateLabel : '',
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
    { wch: 24 },
    { wch: 35 },
    { wch: 25 },
    { wch: 20 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(
    workbook,
    fullAuditSheet,
    isRu ? `Полный чек-лист (${session.items.length})` : `Full Audit (${session.items.length} Items)`
  );

  // Generate binary XLSX file and trigger download
  const filename = `EHS_Walkthrough_${session.date}_${session.id}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

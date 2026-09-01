import * as XLSX from 'xlsx';
import { InspectionSession } from '../types/inspection';
import { calculateMetrics } from './metrics';
import { Language } from '../i18n/types';
import { ru } from '../i18n/ru';
import { en } from '../i18n/en';
import { APP_VERSION, COMMIT_HASH } from '../version';
import { formatShift, formatArea, formatRole } from './formatters';

// Helper to apply wrapText, vertical alignment and font styling across worksheet cells
function styleWorksheet(
  ws: XLSX.WorkSheet,
  headerRowIdx: number = 0,
  wrapColIndices: number[] = []
) {
  if (!ws || !ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddress];
      if (!cell) continue;

      const isHeader = R === headerRowIdx;
      const shouldWrap = wrapColIndices.includes(C);

      cell.s = {
        font: {
          name: 'Calibri',
          sz: isHeader ? 11 : 10,
          bold: isHeader,
          color: isHeader ? { rgb: 'FFFFFF' } : { rgb: '0F172A' },
        },
        fill: isHeader
          ? { fgColor: { rgb: '1E293B' } } // Dark slate header
          : R % 2 === 1
          ? { fgColor: { rgb: 'F8FAFC' } } // Subtle zebra row
          : { fgColor: { rgb: 'FFFFFF' } },
        alignment: {
          vertical: 'top',
          horizontal: isHeader ? (C === 0 || C === 1 ? 'center' : 'left') : C === 0 ? 'center' : 'left',
          wrapText: isHeader ? true : shouldWrap,
        },
        border: {
          top: { style: 'thin', color: { rgb: 'CBD5E1' } },
          bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } },
        },
      };
    }
  }
}

export function exportInspectionToExcel(session: InspectionSession, lang: Language = 'ru'): void {
  const t = lang === 'ru' ? ru : en;
  const isRu = lang === 'ru';
  const metrics = calculateMetrics(session.items);
  const defects = session.items.filter((item) => item.status === 'FAIL');

  const workbook = XLSX.utils.book_new();

  // =========================================================================
  // 1. SHEET 1: EXECUTIVE SUMMARY & OVERVIEW
  // =========================================================================
  const summaryTitle = isRu
    ? 'ИТОГОВЫЙ ОТЧЕТ ОБХОДА ПРЕДПРИЯТИЯ (EHS & 5S AUDIT)'
    : 'DAILY FACILITY & EHS WALKTHROUGH INSPECTION REPORT';

  const summaryData: (string | number)[][] = [
    [summaryTitle],
    [''],
    [isRu ? 'ПАРАМЕТР ИНСПЕКЦИИ' : 'AUDIT PARAMETER', isRu ? 'ЗНАЧЕНИЕ' : 'VALUE', isRu ? 'ПРИМЕЧАНИЕ' : 'NOTES'],
    [isRu ? 'ID Проверки' : 'Inspection ID', session.id, ''],
    [isRu ? 'Дата проведения' : 'Audit Date', session.date, ''],
    [isRu ? 'Время начала / окончания' : 'Inspection Time', `${session.startTime} - ${session.endTime || (isRu ? 'В процессе' : 'In Progress')}`, ''],
    [isRu ? 'Предприятие / Площадка' : 'Facility / Campus', session.facilityName, ''],
    [isRu ? 'Зона / Участок' : 'Scope / Area', formatArea(session.facilityArea, lang), ''],
    [isRu ? 'Смена' : 'Work Shift', formatShift(session.shift, lang), ''],
    [isRu ? 'Инспектор (EHS)' : 'Auditor (EHS)', `${session.inspectorName} (${formatRole(session.inspectorRole, lang)})`, ''],
    [isRu ? 'Утверждающий руководитель' : 'Operations Reviewer', session.signatures?.reviewedBy || (isRu ? 'Ожидает подписи' : 'Awaiting Review'), ''],
    [isRu ? 'Статус аудита' : 'Audit Status', session.status === 'Completed' ? (isRu ? 'Завершен (Completed)' : 'Completed') : (isRu ? 'В процессе (In Progress)' : 'In Progress'), ''],
    [''],
    [isRu ? 'ПОКАЗАТЕЛИ ИНСПЕКЦИИ (KPI)' : 'EXECUTIVE METRICS (KPIs)', isRu ? 'КОЛИЧЕСТВО' : 'COUNT', isRu ? 'ДОЛЯ (%)' : 'SHARE (%)'],
    [isRu ? 'Всего контрольных пунктов' : 'Total Audit Points', metrics.total, '100%'],
    [isRu ? 'Соответствует (PASS)' : 'Compliant (PASS)', metrics.passed, `${Math.round((metrics.passed / metrics.total) * 100)}%`],
    [isRu ? 'Несоответствия (FAIL)' : 'Defects (FAIL)', metrics.failed, `${Math.round((metrics.failed / metrics.total) * 100)}%`],
    [isRu ? 'Не применимо (N/A)' : 'Not Applicable (N/A)', metrics.na, `${Math.round((metrics.na / metrics.total) * 100)}%`],
    [isRu ? 'В процессе (Pending)' : 'Pending Review', metrics.pending, `${Math.round((metrics.pending / metrics.total) * 100)}%`],
    [isRu ? 'ИНДЕКС СООТВЕТСТВИЯ (SCORE)' : 'COMPLIANCE SCORE (SCORE)', `${metrics.scorePercentage}%`, metrics.scorePercentage >= 85 ? (isRu ? 'Хорошо (Good)' : 'Good') : (isRu ? 'Требует внимания' : 'Action Required')],
    [''],
    [isRu ? 'СТАТИСТИКА ЗАМЕЧАНИЙ ПО ПРИОРИТЕТАМ' : 'DEFECT PRIORITY BREAKDOWN', isRu ? 'КОЛИЧЕСТВО' : 'COUNT', isRu ? 'СРОК РЕАГИРОВАНИЯ' : 'SLA / TARGET'],
    [isRu ? 'P1 - Критический (Immediate / Stop)' : 'P1 - Critical (Immediate / Stop-Work)', metrics.criticalP1Count, isRu ? 'Немедленно / В смену' : 'Immediate / This Shift'],
    [isRu ? 'P2 - В течение смены (This shift)' : 'P2 - This Shift (Before End of Shift)', metrics.shiftP2Count, isRu ? 'До конца смены' : 'Before Shift End'],
    [isRu ? 'P3 - Плановое устранение (Scheduled)' : 'P3 - Scheduled (Planned Maintenance)', metrics.scheduledP3Count, isRu ? '3-5 рабочих дней' : '3-5 Business Days'],
    [''],
    [isRu ? 'ОБЩИЕ ЗАМЕЧАНИЯ И 5S КОММЕНТАРИИ:' : 'GENERAL OBSERVATIONS & 5S COMMENTS:'],
    [session.generalNotes || (isRu ? 'Без дополнительных примечаний' : 'No additional observations recorded')],
    [''],
    [isRu ? 'ВЕРСИЯ ПРИЛОЖЕНИЯ' : 'APP VERSION', `PWA ${APP_VERSION} (Commit: ${COMMIT_HASH})`],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 38 }, { wch: 48 }, { wch: 25 }];
  summarySheet['!rows'] = [{ hpt: 26 }, { hpt: 12 }, { hpt: 22 }];
  styleWorksheet(summarySheet, 2, [0, 1, 2]);

  XLSX.utils.book_append_sheet(
    workbook,
    summarySheet,
    isRu ? 'Сводка (Summary)' : 'Summary & KPIs'
  );

  // =========================================================================
  // 2. SHEET 2: ACTION LOG & DEFECT TRACKING (CAPA)
  // =========================================================================
  const actionHeader = isRu
    ? [
        '№',
        'ID Пункта',
        'Категория',
        'Контрольный пункт',
        'Приоритет',
        'Локация / Зона',
        'Описание дефекта / замечания (Defect Description)',
        'Ответственный',
        'Срок устранения',
        'Статус',
        'Фото',
        'Примечания аудитора / Предпринятые меры',
      ]
    : [
        '#',
        'Item ID',
        'Category',
        'Inspection Point',
        'Priority',
        'Location / Area',
        'Defect Description / Hazard Details',
        'Responsible Department',
        'Target Date',
        'Resolution Status',
        'Photos',
        'Auditor Notes / Action Taken',
      ];

  const actionRows = defects.map((d, index) => {
    const details = d.defectDetails;
    const category = isRu ? d.categoryTitleRu : d.categoryTitleEn;
    const title = isRu ? d.titleRu : d.titleEn;
    const priorityLabel = details?.priority ? (t.priorities[details.priority]?.short || details.priority) : 'P2';
    const assigneeLabel = details?.assignedTo ? (t.assignees[details.assignedTo] || details.assignedTo) : (isRu ? 'Не назначен' : 'Unassigned');
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
      details?.location || (isRu ? 'Вся зона' : 'General Area'),
      details?.description || (isRu ? 'Замечание не описано' : 'No description provided'),
      assigneeLabel,
      targetDateLabel,
      resStatusLabel,
      photosLabel,
      details?.notes || '',
    ];
  });

  // If no defects found, add an informative positive row
  const finalActionRows = actionRows.length > 0 
    ? actionRows 
    : [[
        1, 
        '—', 
        isRu ? 'Все категории' : 'All Categories', 
        isRu ? 'Замечаний не выявлено' : 'No non-conformances found', 
        '—', 
        isRu ? 'Все участки' : 'All Zones', 
        isRu ? 'Обход завершен на 100% без открытых замечаний.' : 'Walkthrough completed with 100% compliance. Zero open defects.', 
        isRu ? 'Все службы' : 'All Teams', 
        isRu ? 'Норма' : 'N/A', 
        isRu ? 'Устранено' : 'Compliant', 
        '0', 
        isRu ? 'Отличный результат' : 'Optimal plant condition'
      ]];

  const actionSheetData = [actionHeader, ...finalActionRows];
  const actionSheet = XLSX.utils.aoa_to_sheet(actionSheetData);

  // Generous column widths optimized for readability without horizontal squeezing
  actionSheet['!cols'] = [
    { wch: 6 },  // A: #
    { wch: 11 }, // B: Item ID
    { wch: 28 }, // C: Category
    { wch: 32 }, // D: Inspection Point
    { wch: 18 }, // E: Priority
    { wch: 28 }, // F: Location / Area
    { wch: 65 }, // G: Defect Description (WIDE & WRAPPED!)
    { wch: 24 }, // H: Assignee
    { wch: 22 }, // I: Target Date
    { wch: 16 }, // J: Status
    { wch: 12 }, // K: Photos
    { wch: 38 }, // L: Auditor Notes
  ];

  // Dynamic row heights: Header is tall, data rows have breathing room
  actionSheet['!rows'] = [
    { hpt: 28 }, // Header
    ...finalActionRows.map((row) => {
      const descLen = String(row[6] || '').length;
      // If description is long, allocate 45-65pt row height for multiple lines
      if (descLen > 100) return { hpt: 65 };
      if (descLen > 50) return { hpt: 45 };
      return { hpt: 28 };
    }),
  ];

  // Freeze top header row so it stays pinned during scrolling
  actionSheet['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

  // Auto-filter on header columns
  actionSheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: actionSheetData.length - 1, c: actionHeader.length - 1 },
    }),
  };

  // Apply cell borders, wrapText on text columns (C, D, F, G, H, I, L)
  styleWorksheet(actionSheet, 0, [2, 3, 5, 6, 7, 8, 11]);

  XLSX.utils.book_append_sheet(
    workbook,
    actionSheet,
    isRu ? 'Журнал дефектов (CAPA)' : 'Defects & CAPA Log'
  );

  // =========================================================================
  // 3. SHEET 3: FULL CHECKLIST AUDIT PROTOCOL (16 ITEMS)
  // =========================================================================
  const fullAuditHeader = isRu
    ? [
        'ID',
        'Категория',
        'Контрольный пункт проверки',
        'Стандарт безопасности / Нормативное требование (Safety Standard)',
        'Результат проверки',
        'Локация / Выявленное замечание',
        'Ответственная служба',
        'Срок устранения',
        'Примечания инспектора',
      ]
    : [
        'ID',
        'Category',
        'Inspection Point Title',
        'Safety Standard / Regulatory Requirement',
        'Inspection Result',
        'Finding Description / Specific Location',
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

    const findingText = item.status === 'FAIL'
      ? `${item.defectDetails?.location ? item.defectDetails.location + ': ' : ''}${item.defectDetails?.description || (isRu ? 'Замечание зафиксировано' : 'Defect logged')}`
      : (isRu ? 'Соответствует норме' : 'Standard met');

    return [
      item.id,
      category,
      title,
      standard,
      statusMap[item.status] || item.status,
      findingText,
      item.status === 'FAIL' ? assigneeLabel : '',
      item.status === 'FAIL' ? targetDateLabel : '',
      item.status === 'FAIL' ? item.defectDetails?.notes || '' : item.itemNotes || '',
    ];
  });

  const fullAuditData = [fullAuditHeader, ...fullAuditRows];
  const fullAuditSheet = XLSX.utils.aoa_to_sheet(fullAuditData);

  fullAuditSheet['!cols'] = [
    { wch: 8 },  // A: ID
    { wch: 28 }, // B: Category
    { wch: 32 }, // C: Title
    { wch: 65 }, // D: Safety Standard (WRAPPED!)
    { wch: 22 }, // E: Result
    { wch: 45 }, // F: Finding / Location (WRAPPED!)
    { wch: 22 }, // G: Assignee
    { wch: 18 }, // H: Due Date
    { wch: 35 }, // I: Notes (WRAPPED!)
  ];

  fullAuditSheet['!rows'] = [
    { hpt: 28 },
    ...fullAuditRows.map(() => ({ hpt: 35 })),
  ];

  fullAuditSheet['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  fullAuditSheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: fullAuditData.length - 1, c: fullAuditHeader.length - 1 },
    }),
  };

  styleWorksheet(fullAuditSheet, 0, [1, 2, 3, 5, 8]);

  XLSX.utils.book_append_sheet(
    workbook,
    fullAuditSheet,
    isRu ? `Полный чек-лист (${session.items.length})` : `Full Audit (${session.items.length} Items)`
  );

  // =========================================================================
  // 4. WRITE & DOWNLOAD WORKBOOK
  // =========================================================================
  const cleanDate = (session.date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const filename = `EHS_Walkthrough_Report_${cleanDate}_${session.id}.xlsx`;
  XLSX.writeFile(workbook, filename);
}


import { Language } from '../i18n/types';

export function formatShift(shift: string | undefined, lang: Language): string {
  if (!shift) {
    return lang === 'ru' ? 'Дневная смена (06:00 - 14:40)' : 'Day Shift (06:00 - 14:40)';
  }

  const s = shift.toLowerCase();

  // Overtime / Extended
  if (s.includes('сверхуроч') || s.includes('overtime') || s.includes('16:30') || s.includes('extended')) {
    return lang === 'ru' ? 'Сверхурочная / Продленная (06:00 - 16:30)' : 'Overtime / Extended (06:00 - 16:30)';
  }

  // Standard Day Shift (06:00 - 14:40)
  if (s.includes('06:00') || s.includes('14:40') || s.includes('дневн') || s.includes('day') || s.includes('1') || s.includes('смена')) {
    return lang === 'ru' ? 'Дневная смена (06:00 - 14:40)' : 'Day Shift (06:00 - 14:40)';
  }

  return shift;
}

export function formatArea(area: string | undefined, lang: Language): string {
  if (!area) {
    return lang === 'ru'
      ? 'Все зоны (USS, Wabtec, BAC, Warehouse, Tool Cage, Workshop, Office, QA, ESS, Knorr, Kalmar, доки, периметр)'
      : 'All Zones (USS, Wabtec, BAC, Warehouse, Tool Cage, Workshop, Office, QA, ESS, Knorr, Kalmar, Docks, Perimeter)';
  }

  const a = area.toLowerCase();
  if (a.includes('все зоны') || a.includes('all zones')) {
    return lang === 'ru'
      ? 'Все зоны (USS, Wabtec, BAC, Warehouse, Tool Cage, Workshop, Office, QA, ESS, Knorr, Kalmar, доки, периметр)'
      : 'All Zones (USS, Wabtec, BAC, Warehouse, Tool Cage, Workshop, Office, QA, ESS, Knorr, Kalmar, Docks, Perimeter)';
  }

  return area;
}

export function formatRole(role: string | undefined, lang: Language): string {
  if (!role) {
    return lang === 'ru' ? 'Ведущий инженер по ОТ и ТБ / Аудитор 5S' : 'Lead EHS Specialist & 5S Auditor';
  }

  const r = role.toLowerCase();
  if (r.includes('инженер по от') || r.includes('аудитор') || r.includes('ehs') || r.includes('5s')) {
    return lang === 'ru' ? 'Ведущий инженер по ОТ и ТБ / Аудитор 5S' : 'Lead EHS Specialist & 5S Auditor';
  }

  if (r.includes('мастер') || r.includes('supervisor') || r.includes('foreman') || r.includes('начальник смены')) {
    return lang === 'ru' ? 'Мастер участка / Начальник смены' : 'Area Supervisor / Shift Lead';
  }

  return role;
}

/**
 * Unified report file name: "EHS Daily Walkthrough_<Inspector>_<dd.mm.yyyy>.<ext>"
 * (slashes are illegal in file names, so the date uses dots).
 * With extension omitted returns just the base (used for document.title so
 * Print → Save as PDF suggests the same name).
 */
export function getReportFileName(
  session: { inspectorName?: string; date?: string },
  extension?: string
): string {
  let datePart: string;
  if (session.date && /^\d{4}-\d{2}-\d{2}$/.test(session.date)) {
    const [y, m, d] = session.date.split('-');
    datePart = `${d}.${m}.${y}`;
  } else {
    const now = new Date();
    datePart = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
  }

  const inspector =
    (session.inspectorName || '').replace(/[\\/:*?"<>|]/g, '').trim() || 'Inspector';

  const base = `EHS Daily Walkthrough_${inspector}_${datePart}`;
  return extension ? `${base}.${extension}` : base;
}

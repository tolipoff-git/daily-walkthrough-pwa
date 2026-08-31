import { Language } from '../i18n/types';

export function formatShift(shift: string | undefined, lang: Language): string {
  if (!shift) {
    return lang === 'ru' ? 'Смена 1 (Дневная / 08:00 - 20:00)' : 'Shift 1 (Day / 08:00 - 20:00)';
  }

  const s = shift.toLowerCase();

  // Shift 1 / Day
  if (s.includes('смена 1') || s.includes('shift 1') || s.includes('дневн') || s.includes('day shift') || s.includes('day /')) {
    return lang === 'ru' ? 'Смена 1 (Дневная / 08:00 - 20:00)' : 'Shift 1 (Day / 08:00 - 20:00)';
  }

  // Shift 2 / Night
  if (s.includes('смена 2') || s.includes('shift 2') || s.includes('ночн') || s.includes('night')) {
    return lang === 'ru' ? 'Смена 2 (Ночная / 20:00 - 08:00)' : 'Shift 2 (Night / 20:00 - 08:00)';
  }

  // Shift A / Morning
  if (s.includes('смена а') || s.includes('shift a') || s.includes('утренн') || s.includes('morning')) {
    return lang === 'ru' ? 'Смена А (Утренняя / 07:00 - 15:30)' : 'Shift A (Morning / 07:00 - 15:30)';
  }

  // Shift B / Evening
  if (s.includes('смена б') || s.includes('shift b') || s.includes('вечерн') || s.includes('evening')) {
    return lang === 'ru' ? 'Смена Б (Вечерняя / 15:30 - 00:00)' : 'Shift B (Evening / 15:30 - 00:00)';
  }

  // Admin shift
  if (s.includes('администр') || s.includes('admin')) {
    return lang === 'ru' ? 'Административная / Дневная смена' : 'Administrative / Day Shift';
  }

  return shift;
}

export function formatArea(area: string | undefined, lang: Language): string {
  if (!area) {
    return lang === 'ru'
      ? 'Все зоны (Цех 1, Цех 2, Склад ГП, Рампа, Территория)'
      : 'All Zones (Shop Floor 1 & 2, FG Warehouse, Loading Docks, Grounds)';
  }

  const a = area.toLowerCase();
  if (a.includes('все зоны') || a.includes('all zones')) {
    return lang === 'ru'
      ? 'Все зоны (Цех 1, Цех 2, Склад ГП, Рампа, Территория)'
      : 'All Zones (Shop Floor 1 & 2, FG Warehouse, Loading Docks, Grounds)';
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

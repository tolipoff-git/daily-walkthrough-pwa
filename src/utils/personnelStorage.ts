import { Person } from '../types/personnel';
import { Language } from '../i18n/types';

export const PERSONNEL_STORAGE_KEY = 'ehs_saved_personnel';

export const DEFAULT_PERSONNEL_RU: Person[] = [
  {
    id: 'pers-ru-rich',
    name: 'Rich Fitzgerald',
    role: 'Operations Manager',
    department: 'Production',
    isDefault: false,
  },
  {
    id: 'pers-ru-1',
    name: 'Смирнов Д. В.',
    role: 'Инженер по охране труда и ТБ',
    department: 'Safety & EHS',
    isDefault: true,
  },
  {
    id: 'pers-ru-2',
    name: 'Иванов А. С.',
    role: 'Мастер производственного участка',
    department: 'Production',
    isDefault: false,
  },
  {
    id: 'pers-ru-3',
    name: 'Петров В. И.',
    role: 'Главный механик',
    department: 'Maintenance',
    isDefault: false,
  },
  {
    id: 'pers-ru-4',
    name: 'Ковалев С. Н.',
    role: 'Руководитель складского комплекса',
    department: 'Warehouse',
    isDefault: false,
  },
];

export const DEFAULT_PERSONNEL_EN: Person[] = [
  {
    id: 'pers-en-rich',
    name: 'Rich Fitzgerald',
    role: 'Operations Manager',
    department: 'Production',
    isDefault: false,
  },
  {
    id: 'pers-en-1',
    name: 'J. Smith',
    role: 'Lead EHS Specialist & Auditor',
    department: 'Safety & EHS',
    isDefault: true,
  },
  {
    id: 'pers-en-2',
    name: 'D. Miller',
    role: 'Maintenance Lead Engineer',
    department: 'Maintenance',
    isDefault: false,
  },
  {
    id: 'pers-en-3',
    name: 'A. Davis',
    role: 'Shop Floor Supervisor',
    department: 'Production',
    isDefault: false,
  },
  {
    id: 'pers-en-4',
    name: 'R. Wilson',
    role: 'Warehouse & Logistics Manager',
    department: 'Warehouse',
    isDefault: false,
  },
];

export const DEFAULT_PERSONNEL: Person[] = [
  ...DEFAULT_PERSONNEL_RU,
  ...DEFAULT_PERSONNEL_EN,
];

export function getDefaultPersonnelForLang(lang: Language = 'ru'): Person[] {
  return lang === 'en' ? DEFAULT_PERSONNEL_EN : DEFAULT_PERSONNEL_RU;
}

export function getSavedPersonnel(lang?: Language): Person[] {
  if (typeof window === 'undefined') {
    return lang === 'en' ? DEFAULT_PERSONNEL_EN : DEFAULT_PERSONNEL_RU;
  }
  try {
    const raw = localStorage.getItem(PERSONNEL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load personnel from localStorage:', err);
  }
  // Initialize default list based on language if not existing
  const currentLang = lang || ((localStorage.getItem('ehs_walkthrough_lang') === 'en') ? 'en' : 'ru');
  const defaults = getDefaultPersonnelForLang(currentLang);
  savePersonnel(defaults);
  return defaults;
}

export function savePersonnel(list: Person[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PERSONNEL_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('ehs_personnel_updated'));
  } catch (err) {
    console.error('Failed to save personnel to localStorage:', err);
  }
}

export function getDefaultPerson(lang?: Language): Person | undefined {
  const list = getSavedPersonnel(lang);
  return list.find((p) => p.isDefault) || list[0];
}

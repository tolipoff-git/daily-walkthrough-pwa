import { Person } from '../types/personnel';

export const PERSONNEL_STORAGE_KEY = 'ehs_saved_personnel';

export const DEFAULT_PERSONNEL: Person[] = [
  {
    id: 'pers-1',
    name: 'Смирнов Д. В.',
    role: 'Инженер по охране труда и ТБ',
    department: 'Safety & EHS',
    isDefault: true,
  },
  {
    id: 'pers-2',
    name: 'Иванов А. С.',
    role: 'Мастер производственного участка',
    department: 'Production',
    isDefault: false,
  },
  {
    id: 'pers-3',
    name: 'Петров В. И.',
    role: 'Главный механик',
    department: 'Maintenance',
    isDefault: false,
  },
  {
    id: 'pers-4',
    name: 'Ковалев С. Н.',
    role: 'Руководитель складского комплекса',
    department: 'Warehouse',
    isDefault: false,
  },
  {
    id: 'pers-5',
    name: 'J. Smith',
    role: 'Lead EHS Specialist & Auditor',
    department: 'Safety & EHS',
    isDefault: false,
  },
  {
    id: 'pers-6',
    name: 'D. Miller',
    role: 'Maintenance Lead Engineer',
    department: 'Maintenance',
    isDefault: false,
  },
  {
    id: 'pers-7',
    name: 'A. Davis',
    role: 'Shop Floor Supervisor',
    department: 'Production',
    isDefault: false,
  },
];

export function getSavedPersonnel(): Person[] {
  if (typeof window === 'undefined') {
    return DEFAULT_PERSONNEL;
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
  // Initialize default list if not existing or empty
  savePersonnel(DEFAULT_PERSONNEL);
  return DEFAULT_PERSONNEL;
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

export function getDefaultPerson(): Person | undefined {
  const list = getSavedPersonnel();
  return list.find((p) => p.isDefault) || list[0];
}

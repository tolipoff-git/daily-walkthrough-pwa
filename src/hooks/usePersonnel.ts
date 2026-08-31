import { useState, useEffect, useCallback } from 'react';
import { Person } from '../types/personnel';
import {
  getSavedPersonnel,
  savePersonnel,
  getDefaultPersonnelForLang,
} from '../utils/personnelStorage';
import { Language } from '../i18n/types';

export function usePersonnel() {
  const [personnel, setPersonnel] = useState<Person[]>(() => getSavedPersonnel());

  // Listen to storage events and custom in-window updates
  useEffect(() => {
    const handleUpdate = () => {
      setPersonnel(getSavedPersonnel());
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('ehs_personnel_updated', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('ehs_personnel_updated', handleUpdate);
    };
  }, []);

  const addPerson = useCallback((newPerson: Omit<Person, 'id'>) => {
    setPersonnel((prev) => {
      const created: Person = {
        ...newPerson,
        id: `pers-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      };
      let updated = prev;
      if (created.isDefault) {
        updated = prev.map((p) => ({ ...p, isDefault: false }));
      }
      const nextList = [created, ...updated];
      savePersonnel(nextList);
      return nextList;
    });
  }, []);

  const updatePerson = useCallback((id: string, updates: Partial<Person>) => {
    setPersonnel((prev) => {
      const nextList = prev.map((p) => {
        if (p.id === id) {
          return { ...p, ...updates };
        }
        if (updates.isDefault) {
          return { ...p, isDefault: false };
        }
        return p;
      });
      savePersonnel(nextList);
      return nextList;
    });
  }, []);

  const deletePerson = useCallback((id: string) => {
    setPersonnel((prev) => {
      const nextList = prev.filter((p) => p.id !== id);
      // If deleted was default, make the first one default
      if (nextList.length > 0 && !nextList.some((p) => p.isDefault)) {
        nextList[0].isDefault = true;
      }
      savePersonnel(nextList);
      return nextList;
    });
  }, []);

  const setDefaultPerson = useCallback((id: string) => {
    setPersonnel((prev) => {
      const nextList = prev.map((p) => ({
        ...p,
        isDefault: p.id === id,
      }));
      savePersonnel(nextList);
      return nextList;
    });
  }, []);

  const resetToDefaultPersonnel = useCallback((lang: Language = 'ru') => {
    const defaults = getDefaultPersonnelForLang(lang);
    savePersonnel(defaults);
    setPersonnel(defaults);
  }, []);

  const saveOrUpdateCurrent = useCallback((name: string, role: string, department?: string) => {
    if (!name.trim()) return;
    setPersonnel((prev) => {
      const trimmedName = name.trim();
      const trimmedRole = role.trim() || 'Inspector';
      const existingIdx = prev.findIndex(
        (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );
      let nextList: Person[];
      if (existingIdx >= 0) {
        nextList = prev.map((p, idx) =>
          idx === existingIdx
            ? { ...p, role: trimmedRole, department: department || p.department }
            : p
        );
      } else {
        const newPerson: Person = {
          id: `pers-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: trimmedName,
          role: trimmedRole,
          department: department || 'Safety & EHS',
          isDefault: prev.length === 0,
        };
        nextList = [newPerson, ...prev];
      }
      savePersonnel(nextList);
      return nextList;
    });
  }, []);

  const defaultPerson = personnel.find((p) => p.isDefault) || personnel[0];

  return {
    personnel,
    defaultPerson,
    addPerson,
    updatePerson,
    deletePerson,
    setDefaultPerson,
    resetToDefaultPersonnel,
    saveOrUpdateCurrent,
  };
}

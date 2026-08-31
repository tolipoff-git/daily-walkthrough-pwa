import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Language, Translations } from './types';
import { ru } from './ru';
import { en } from './en';
import { Assignee, Priority } from '../types/inspection';
import { triggerHaptic } from '../utils/haptics';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
  getItemTitle: (item: { titleRu: string; titleEn: string }) => string;
  getItemStandard: (item: { standardRu: string; standardEn: string }) => string;
  getCategoryTitle: (cat: { titleRu: string; titleEn: string }) => string;
  getCategoryDesc: (cat: { descriptionRu: string; descriptionEn?: string }) => string;
  getItemGuidelines: (item: { guidelinesRu?: string[]; guidelinesEn?: string[]; guidelines?: string[] }) => string[];
  getPriorityInfo: (priority: Priority) => { label: string; short: string; badge: string; description: string };
  getAssigneeLabel: (assignee: Assignee) => string;
  getTargetDateLabel: (presetKey: string) => string;
  getZonePresets: () => string[];
  getAssignees: () => { value: Assignee; label: string }[];
  getTargetDateOptions: () => { value: string; label: string }[];
  getShifts: () => { value: string; label: string }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'ehs_walkthrough_lang';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'ru' || saved === 'en') {
        return saved;
      }
    } catch {
      // fallback
    }
    return 'ru';
  });

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    } catch {
      // ignore
    }
  };

  const toggleLanguage = () => {
    triggerHaptic();
    setLanguage(language === 'ru' ? 'en' : 'ru');
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useMemo(() => (language === 'ru' ? ru : en), [language]);

  const getItemTitle = (item: { titleRu: string; titleEn: string }) => {
    return language === 'ru' ? item.titleRu : item.titleEn;
  };

  const getItemStandard = (item: { standardRu: string; standardEn: string }) => {
    return language === 'ru' ? item.standardRu : item.standardEn;
  };

  const getCategoryTitle = (cat: { titleRu: string; titleEn: string }) => {
    return language === 'ru' ? cat.titleRu : cat.titleEn;
  };

  const getCategoryDesc = (cat: { descriptionRu: string; descriptionEn?: string }) => {
    if (language === 'ru') return cat.descriptionRu;
    return cat.descriptionEn || cat.descriptionRu;
  };

  const getItemGuidelines = (item: { guidelinesRu?: string[]; guidelinesEn?: string[]; guidelines?: string[] }) => {
    if (language === 'ru') {
      return item.guidelinesRu || item.guidelines || [];
    }
    return item.guidelinesEn || item.guidelines || item.guidelinesRu || [];
  };

  const getPriorityInfo = (priority: Priority) => {
    return t.priorities[priority] || t.priorities.P2;
  };

  const getAssigneeLabel = (assignee: Assignee) => {
    return t.assignees[assignee] || assignee;
  };

  const getTargetDateLabel = (presetKey: string) => {
    return t.targetDates[presetKey] || presetKey;
  };

  const getZonePresets = () => {
    return t.zonePresets;
  };

  const getAssignees = () => {
    const keys: Assignee[] = [
      'Maintenance',
      'Logistics',
      'Facilities',
      'Safety & EHS',
      'Production',
      'Warehouse',
      'Quality',
      'Cleaning',
    ];
    return keys.map((key) => ({
      value: key,
      label: t.assignees[key] || key,
    }));
  };

  const getTargetDateOptions = () => {
    return [
      { value: 'Today', label: t.targetDates['Today'] || 'Today' },
      { value: 'Tomorrow AM', label: t.targetDates['Tomorrow AM'] || 'Tomorrow AM' },
      { value: 'Next Shift', label: t.targetDates['Next Shift'] || 'Next Shift' },
      { value: 'End of Week', label: t.targetDates['End of Week'] || 'End of Week' },
      { value: 'Custom', label: t.targetDates['Custom'] || 'Custom' },
    ];
  };

  const getShifts = () => {
    return t.shifts;
  };

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t,
    getItemTitle,
    getItemStandard,
    getCategoryTitle,
    getCategoryDesc,
    getItemGuidelines,
    getPriorityInfo,
    getAssigneeLabel,
    getTargetDateLabel,
    getZonePresets,
    getAssignees,
    getTargetDateOptions,
    getShifts,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

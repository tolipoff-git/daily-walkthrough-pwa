import { useState, useEffect, useCallback, useRef } from 'react';
import { ChecklistItem, InspectionSession, InspectionStatus, DefectDetails, DefectPhoto } from '../types/inspection';
import { createNewInspectionSession, CHECKLIST_ITEMS_TEMPLATE } from '../data/checklistData';
import { saveActiveSessionDb, getActiveSessionDb } from '../utils/indexedDb';
import { Language } from '../i18n/types';

function hydrateSession(s: InspectionSession): InspectionSession {
  if (!s || !Array.isArray(s.items)) return s;
  const updatedItems = s.items.map((item) => {
    const t = CHECKLIST_ITEMS_TEMPLATE.find((temp) => temp.id === item.id);
    if (!t) return item;
    return {
      ...item,
      titleRu: t.titleRu,
      titleEn: t.titleEn,
      standardRu: t.standardRu,
      standardEn: t.standardEn,
      guidelinesRu: t.guidelinesRu,
      guidelinesEn: t.guidelinesEn,
      categoryTitleRu: t.categoryTitleRu,
      categoryTitleEn: t.categoryTitleEn,
      categoryId: t.categoryId,
    };
  });
  return {
    ...s,
    items: updatedItems,
  };
}

export function useInspection() {
  const [session, setSession] = useState<InspectionSession>(() => {
    try {
      const saved = localStorage.getItem('ehs_active_session_v1');
      if (saved) {
        return hydrateSession(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading initial session from localStorage:', e);
    }
    const currentLang: Language = (typeof window !== 'undefined' && localStorage.getItem('ehs_walkthrough_lang') === 'en') ? 'en' : 'ru';
    return createNewInspectionSession(currentLang);
  });

  const isInitialMount = useRef(true);

  // Load from IndexedDB on mount if available (contains rich photos)
  useEffect(() => {
    getActiveSessionDb().then((dbSession) => {
      if (dbSession && isInitialMount.current) {
        setSession(hydrateSession(dbSession));
      }
      isInitialMount.current = false;
    }).catch(() => {
      isInitialMount.current = false;
    });
  }, []);

  // Auto-save to both IndexedDB and localStorage (lightweight metadata)
  useEffect(() => {
    if (isInitialMount.current) return;

    // Save full data including photos to IndexedDB
    saveActiveSessionDb(session).catch((err) => console.warn('Failed to save to IndexedDB', err));

    // Save lightweight copy to localStorage
    try {
      localStorage.setItem('ehs_active_session_v1', JSON.stringify(session));
      if (session.inspectorName) {
        localStorage.setItem('ehs_last_inspector', session.inspectorName);
      }
      if (session.inspectorRole) {
        localStorage.setItem('ehs_last_role', session.inspectorRole);
      }
      if (session.facilityName) {
        localStorage.setItem('ehs_last_facility', session.facilityName);
      }
    } catch {
      // localStorage quota exceeded fallback handled safely by IndexedDB
    }
  }, [session]);

  const updateSessionHeader = useCallback(
    <K extends keyof InspectionSession>(field: K, value: InspectionSession[K]) => {
      setSession((prev) => ({
        ...prev,
        [field]: value,
        updatedAt: new Date().toISOString(),
      }));
    },
    []
  );

  const setItemStatus = useCallback((itemId: string, status: InspectionStatus) => {
    setSession((prev) => {
      const newItems = prev.items.map((item) => {
        if (item.id === itemId) {
          const updated: ChecklistItem = {
            ...item,
            status,
          };
          if (status === 'FAIL' && !updated.defectDetails) {
            updated.defectDetails = {
              location: '',
              zonePreset: '',
              description: '',
              priority: 'P2',
              assignedTo: 'Maintenance',
              targetDate: 'Today',
              photos: [],
              isRepeatIssue: false,
              resolutionStatus: 'Open',
            };
          }
          return updated;
        }
        return item;
      });

      return {
        ...prev,
        items: newItems,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const updateDefectDetails = useCallback((itemId: string, updates: Partial<DefectDetails>) => {
    setSession((prev) => {
      const newItems = prev.items.map((item) => {
        if (item.id === itemId) {
          const currentDetails: DefectDetails = item.defectDetails || {
            location: '',
            zonePreset: '',
            description: '',
            priority: 'P2',
            assignedTo: 'Maintenance',
            targetDate: 'Today',
            photos: [],
            isRepeatIssue: false,
            resolutionStatus: 'Open',
          };
          return {
            ...item,
            defectDetails: {
              ...currentDetails,
              ...updates,
            },
          };
        }
        return item;
      });

      return {
        ...prev,
        items: newItems,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const updateItemNotes = useCallback((itemId: string, itemNotes: string) => {
    setSession((prev) => {
      const newItems = prev.items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            itemNotes,
          };
        }
        return item;
      });

      return {
        ...prev,
        items: newItems,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const addDefectPhoto = useCallback((itemId: string, photo: DefectPhoto) => {
    setSession((prev) => {
      const newItems = prev.items.map((item) => {
        if (item.id === itemId) {
          const currentPhotos = item.defectDetails?.photos || [];
          const defectDetails = item.defectDetails || {
            location: '',
            zonePreset: '',
            description: '',
            priority: 'P2' as const,
            assignedTo: 'Maintenance' as const,
            targetDate: 'Today',
            photos: [],
            isRepeatIssue: false,
            resolutionStatus: 'Open' as const,
          };
          return {
            ...item,
            defectDetails: {
              ...defectDetails,
              photos: [...currentPhotos, photo],
            },
          };
        }
        return item;
      });

      return {
        ...prev,
        items: newItems,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const removeDefectPhoto = useCallback((itemId: string, photoId: string) => {
    setSession((prev) => {
      const newItems = prev.items.map((item) => {
        if (item.id === itemId && item.defectDetails) {
          return {
            ...item,
            defectDetails: {
              ...item.defectDetails,
              photos: item.defectDetails.photos.filter((p) => p.id !== photoId),
            },
          };
        }
        return item;
      });

      return {
        ...prev,
        items: newItems,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const markAllUncheckedAsPass = useCallback(() => {
    setSession((prev) => {
      const newItems = prev.items.map((item) => {
        if (item.status === 'PENDING') {
          return {
            ...item,
            status: 'PASS' as InspectionStatus,
          };
        }
        return item;
      });

      return {
        ...prev,
        items: newItems,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const markCategoryAsPass = useCallback((categoryId: string) => {
    setSession((prev) => {
      const newItems = prev.items.map((item) => {
        if (item.categoryId === categoryId && item.status === 'PENDING') {
          return {
            ...item,
            status: 'PASS' as InspectionStatus,
          };
        }
        return item;
      });

      return {
        ...prev,
        items: newItems,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const resetWalkthrough = useCallback((lang: Language = 'ru') => {
    const newSession = createNewInspectionSession(lang);
    setSession(newSession);
  }, []);

  const loadSession = useCallback((loaded: InspectionSession) => {
    setSession(loaded);
  }, []);

  const finishWalkthrough = useCallback(() => {
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);
    setSession((prev) => ({
      ...prev,
      endTime: prev.endTime || timeStr,
      status: 'Completed',
      signatures: {
        ...prev.signatures,
        timestamp: now.toISOString(),
      },
      updatedAt: now.toISOString(),
    }));
  }, []);

  return {
    session,
    updateSessionHeader,
    setItemStatus,
    updateDefectDetails,
    updateItemNotes,
    addDefectPhoto,
    removeDefectPhoto,
    markAllUncheckedAsPass,
    markCategoryAsPass,
    resetWalkthrough,
    loadSession,
    finishWalkthrough,
  };
}

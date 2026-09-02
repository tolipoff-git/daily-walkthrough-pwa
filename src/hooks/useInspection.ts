import { useState, useEffect, useCallback, useRef } from 'react';
import { ChecklistItem, InspectionSession, InspectionStatus, DefectDetails, DefectPhoto } from '../types/inspection';
import { createNewInspectionSession, CHECKLIST_ITEMS_TEMPLATE } from '../data/checklistData';
import { saveActiveSessionDb, getActiveSessionDb } from '../utils/indexedDb';
import { Language } from '../i18n/types';

function hydrateSession(s: any, fallbackLang: Language = 'ru'): InspectionSession {
  const defaultSession = createNewInspectionSession(fallbackLang);
  if (!s || typeof s !== 'object') {
    return defaultSession;
  }

  // Ensure all template items exist in the hydrated session
  const incomingItems: ChecklistItem[] = Array.isArray(s.items) ? s.items : [];
  const updatedItems: ChecklistItem[] = CHECKLIST_ITEMS_TEMPLATE.map((t) => {
    const existing = incomingItems.find((item) => item && item.id === t.id);
    if (existing) {
      const defectDetails: DefectDetails | undefined = existing.defectDetails ? {
        location: existing.defectDetails.location || '',
        zonePreset: existing.defectDetails.zonePreset || '',
        description: existing.defectDetails.description || '',
        priority: existing.defectDetails.priority || 'P2',
        assignedTo: existing.defectDetails.assignedTo || 'Maintenance',
        targetDate: existing.defectDetails.targetDate || 'Today',
        photos: Array.isArray(existing.defectDetails.photos) ? existing.defectDetails.photos : [],
        isRepeatIssue: Boolean(existing.defectDetails.isRepeatIssue),
        resolutionStatus: existing.defectDetails.resolutionStatus || 'Open',
      } : (existing.status === 'FAIL' ? {
        location: '',
        zonePreset: '',
        description: '',
        priority: 'P2',
        assignedTo: 'Maintenance',
        targetDate: 'Today',
        photos: [],
        isRepeatIssue: false,
        resolutionStatus: 'Open',
      } : undefined);

      return {
        ...t,
        ...existing,
        titleRu: t.titleRu,
        titleEn: t.titleEn,
        standardRu: t.standardRu,
        standardEn: t.standardEn,
        guidelinesRu: t.guidelinesRu,
        guidelinesEn: t.guidelinesEn,
        categoryTitleRu: t.categoryTitleRu,
        categoryTitleEn: t.categoryTitleEn,
        categoryId: t.categoryId,
        status: existing.status || 'PENDING',
        itemNotes: existing.itemNotes || '',
        defectDetails,
      };
    }
    return { ...t };
  });

  const validSignatures = {
    inspector: s.signatures?.inspector || s.inspectorName || defaultSession.signatures.inspector,
    inspectorTitle: s.signatures?.inspectorTitle || s.inspectorRole || defaultSession.signatures.inspectorTitle,
    timestamp: s.signatures?.timestamp || s.createdAt || new Date().toISOString(),
    reviewedBy: s.signatures?.reviewedBy || defaultSession.signatures.reviewedBy,
    reviewTimestamp: s.signatures?.reviewTimestamp,
  };

  return {
    id: s.id || defaultSession.id,
    date: s.date || defaultSession.date,
    startTime: s.startTime || defaultSession.startTime,
    endTime: s.endTime || '',
    facilityName: s.facilityName || defaultSession.facilityName,
    facilityArea: s.facilityArea || defaultSession.facilityArea,
    shift: s.shift || defaultSession.shift,
    inspectorName: s.inspectorName || defaultSession.inspectorName,
    inspectorRole: s.inspectorRole || defaultSession.inspectorRole,
    items: updatedItems,
    generalNotes: s.generalNotes || '',
    status: s.status || defaultSession.status,
    signatures: validSignatures,
    createdAt: s.createdAt || defaultSession.createdAt,
    updatedAt: s.updatedAt || defaultSession.updatedAt,
  };
}

export function useInspection() {
  const [session, setSession] = useState<InspectionSession>(() => {
    const currentLang: Language = (typeof window !== 'undefined' && localStorage.getItem('ehs_walkthrough_lang') === 'en') ? 'en' : 'ru';
    try {
      const saved = localStorage.getItem('ehs_active_session_v1');
      if (saved) {
        return hydrateSession(JSON.parse(saved), currentLang);
      }
    } catch (e) {
      console.error('Error loading initial session from localStorage:', e);
    }
    return createNewInspectionSession(currentLang);
  });

  const isInitialMount = useRef(true);

  // Load from IndexedDB on mount if available (contains rich photos)
  useEffect(() => {
    const currentLang: Language = (typeof window !== 'undefined' && localStorage.getItem('ehs_walkthrough_lang') === 'en') ? 'en' : 'ru';
    getActiveSessionDb().then((dbSession) => {
      if (dbSession && isInitialMount.current) {
        setSession(hydrateSession(dbSession, currentLang));
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

    // Save lightweight copy to localStorage (photos stripped — they live in
    // IndexedDB only; stringifying multi-MB base64 on every keystroke freezes
    // low-end phones)
    try {
      const lightweight: InspectionSession = {
        ...session,
        items: session.items.map((i) =>
          i.defectDetails?.photos?.length
            ? { ...i, defectDetails: { ...i.defectDetails, photos: [] } }
            : i
        ),
      };
      localStorage.setItem('ehs_active_session_v1', JSON.stringify(lightweight));
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
    const currentLang: Language = (typeof window !== 'undefined' && localStorage.getItem('ehs_walkthrough_lang') === 'en') ? 'en' : 'ru';
    setSession(hydrateSession(loaded, currentLang));
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

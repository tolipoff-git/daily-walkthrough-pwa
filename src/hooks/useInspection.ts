import { useState, useEffect, useCallback, useRef } from 'react';
import { ChecklistItem, InspectionSession, InspectionStatus, DefectDetails, DefectPhoto } from '../types/inspection';
import { createNewInspectionSession, CHECKLIST_ITEMS_TEMPLATE, getLocalTodayDate, getLocalCurrentTime } from '../data/checklistData';
import { saveActiveSessionDb, getActiveSessionDb, saveHistorySessionDb } from '../utils/indexedDb';
import { Language } from '../i18n/types';

function hydrateSession(
  s: any,
  fallbackLang: Language = 'ru',
  baseSession?: InspectionSession
): InspectionSession {
  const defaultSession = createNewInspectionSession(fallbackLang);
  if (!s || typeof s !== 'object') {
    return defaultSession;
  }

  // Ensure all template items exist in the hydrated session
  const incomingItems: ChecklistItem[] = Array.isArray(s.items) ? s.items : [];
  const updatedItems: ChecklistItem[] = CHECKLIST_ITEMS_TEMPLATE.map((t) => {
    const existing = incomingItems.find((item) => item && item.id === t.id);
    if (existing) {
      const incomingPhotos: any[] = Array.isArray(existing.defectDetails?.photos)
        ? existing.defectDetails.photos
        : [];

      let validatedPhotos: DefectPhoto[] = [];

      if (baseSession) {
        const baseItem = baseSession.items?.find((i) => i && i.id === t.id);
        const basePhotos = (baseItem?.defectDetails?.photos || []).filter(
          (p) => Boolean(p && typeof p.url === 'string' && p.url.trim().length > 0)
        );
        const basePhotoMap = new Map(basePhotos.map((p) => [p.id, p]));

        if (incomingPhotos.length > 0) {
          validatedPhotos = incomingPhotos
            .map((p: any) => {
              if (p && typeof p.url === 'string' && p.url.trim().length > 0) {
                return {
                  id: String(p.id || `photo-${Date.now()}-${Math.random()}`),
                  url: String(p.url).trim(),
                  caption: p.caption ? String(p.caption) : undefined,
                  timestamp: p.timestamp ? String(p.timestamp) : new Date().toISOString(),
                };
              }
              // Empty or missing url: restore from base photo with matching id if available
              if (p?.id && basePhotoMap.has(p.id)) {
                return basePhotoMap.get(p.id)!;
              }
              return null;
            })
            .filter((p): p is DefectPhoto => Boolean(p));

          // If incoming photos all had empty URLs and none matched by ID, fallback to basePhotos
          if (validatedPhotos.length === 0 && basePhotos.length > 0) {
            validatedPhotos = basePhotos;
          }
        } else if (basePhotos.length > 0 && existing.status === 'FAIL') {
          validatedPhotos = basePhotos;
        }
      } else {
        validatedPhotos = incomingPhotos
          .filter((p: any) => Boolean(p && typeof p.url === 'string' && p.url.trim().length > 0))
          .map((p: any) => ({
            id: String(p.id || `photo-${Date.now()}-${Math.random()}`),
            url: String(p.url).trim(),
            caption: p.caption ? String(p.caption) : undefined,
            timestamp: p.timestamp ? String(p.timestamp) : new Date().toISOString(),
          }));
      }

      const defectDetails: DefectDetails | undefined = existing.defectDetails ? {
        location: existing.defectDetails.location || '',
        zonePreset: existing.defectDetails.zonePreset || '',
        description: existing.defectDetails.description || '',
        priority: existing.defectDetails.priority || 'P2',
        assignedTo: existing.defectDetails.assignedTo || 'Maintenance',
        targetDate: existing.defectDetails.targetDate || 'Today',
        photos: validatedPhotos,
        isRepeatIssue: Boolean(existing.defectDetails.isRepeatIssue),
        resolutionStatus: existing.defectDetails.resolutionStatus || 'Open',
      } : (existing.status === 'FAIL' ? {
        location: '',
        zonePreset: '',
        description: '',
        priority: 'P2',
        assignedTo: 'Maintenance',
        targetDate: 'Today',
        photos: validatedPhotos,
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
        const parsed = JSON.parse(saved);
        if (parsed.date && parsed.date < getLocalTodayDate()) {
          saveHistorySessionDb(parsed).catch(() => {});
          return createNewInspectionSession(currentLang);
        }
        return hydrateSession(parsed, currentLang);
      }
    } catch (e) {
      console.error('Error loading initial session from localStorage:', e);
    }
    return createNewInspectionSession(currentLang);
  });

  const isInitialMount = useRef(true);
  const sessionRef = useRef<InspectionSession>(session);
  sessionRef.current = session;

  // Load from IndexedDB on mount if available (contains rich photos)
  useEffect(() => {
    const currentLang: Language = (typeof window !== 'undefined' && localStorage.getItem('ehs_walkthrough_lang') === 'en') ? 'en' : 'ru';
    getActiveSessionDb().then((dbSession) => {
      if (dbSession && isInitialMount.current) {
        if (dbSession.date && dbSession.date < getLocalTodayDate()) {
          saveHistorySessionDb(dbSession).catch(() => {});
          const freshSession = createNewInspectionSession(currentLang);
          setSession(freshSession);
          saveActiveSessionDb(freshSession).catch(() => {});
        } else {
          setSession((prev) => hydrateSession(dbSession, currentLang, prev));
        }
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
    const timer = setTimeout(() => {
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
    }, 600);

    return () => clearTimeout(timer);
  }, [session]);

  // Day-rollover listener: check if active session belongs to a previous calendar day
  useEffect(() => {
    const checkDayRollover = () => {
      const today = getLocalTodayDate();
      setSession((prev) => {
        if (prev.date && prev.date < today) {
          const currentLang: Language = (typeof window !== 'undefined' && localStorage.getItem('ehs_walkthrough_lang') === 'en') ? 'en' : 'ru';
          saveHistorySessionDb(prev).catch(() => {});
          const fresh = createNewInspectionSession(currentLang);
          saveActiveSessionDb(fresh).catch(() => {});
          try {
            const lightweight: InspectionSession = {
              ...fresh,
              items: fresh.items.map((i) =>
                i.defectDetails?.photos?.length
                  ? { ...i, defectDetails: { ...i.defectDetails, photos: [] } }
                  : i
              ),
            };
            localStorage.setItem('ehs_active_session_v1', JSON.stringify(lightweight));
          } catch {}
          return fresh;
        }
        return prev;
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkDayRollover();
      }
    };
    const handleFocus = () => {
      checkDayRollover();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    const intervalId = setInterval(checkDayRollover, 60000);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, []);

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
    if (!photo || !photo.url || typeof photo.url !== 'string' || photo.url.trim().length === 0) {
      return;
    }
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

  const resetWalkthrough = useCallback((lang: Language = 'ru'): InspectionSession => {
    // 1. Archive current session if it has any user activity or was completed
    const current = sessionRef.current;
    if (current && (current.status === 'Completed' || current.items.some((i) => i.status !== 'PENDING') || current.generalNotes)) {
      saveHistorySessionDb(current).catch(() => {});
    }

    // 2. Generate a fresh session with today's date and current start time
    const fresh = createNewInspectionSession(lang);

    // 3. Immediately persist to localStorage & IndexedDB synchronously / atomically
    try {
      const lightweight: InspectionSession = {
        ...fresh,
        items: fresh.items.map((i) =>
          i.defectDetails?.photos?.length
            ? { ...i, defectDetails: { ...i.defectDetails, photos: [] } }
            : i
        ),
      };
      localStorage.setItem('ehs_active_session_v1', JSON.stringify(lightweight));
    } catch {
      // localStorage quota exceeded fallback handled safely by IndexedDB
    }
    saveActiveSessionDb(fresh).catch((err) => console.warn('Failed to save fresh session to IndexedDB', err));

    // 4. Update React state, sessionRef, and return fresh
    sessionRef.current = fresh;
    setSession(fresh);
    return fresh;
  }, []);

  const loadSession = useCallback((loaded: InspectionSession) => {
    const currentLang: Language = (typeof window !== 'undefined' && localStorage.getItem('ehs_walkthrough_lang') === 'en') ? 'en' : 'ru';
    setSession((prev) => {
      const next = hydrateSession(loaded, currentLang, prev);
      sessionRef.current = next;
      return next;
    });
  }, []);

  const finishWalkthrough = useCallback((): InspectionSession => {
    const now = new Date();
    const currentTime = getLocalCurrentTime();
    const prev = sessionRef.current;
    const completedSession: InspectionSession = {
      ...prev,
      status: 'Completed',
      endTime: prev.endTime || currentTime,
      signatures: {
        ...prev.signatures,
        timestamp: now.toISOString(),
      },
      updatedAt: now.toISOString(),
    };
    saveHistorySessionDb(completedSession).catch(() => {});
    saveActiveSessionDb(completedSession).catch(() => {});
    try {
      const lightweight: InspectionSession = {
        ...completedSession,
        items: completedSession.items.map((i) =>
          i.defectDetails?.photos?.length
            ? { ...i, defectDetails: { ...i.defectDetails, photos: [] } }
            : i
        ),
      };
      localStorage.setItem('ehs_active_session_v1', JSON.stringify(lightweight));
    } catch {}
    sessionRef.current = completedSession;
    setSession(completedSession);
    return completedSession;
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

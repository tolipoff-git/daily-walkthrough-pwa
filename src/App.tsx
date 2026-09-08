import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useInspection } from './hooks/useInspection';
import { useHistory } from './hooks/useHistory';
import { calculateMetrics } from './utils/metrics';
import { INITIAL_CHECKLIST_DATA } from './data/checklistData';
import { DefectPhoto, InspectionSession } from './types/inspection';
import { triggerHaptic } from './utils/haptics';
import { useLanguage } from './i18n/LanguageContext';
import { getReportFileName } from './utils/formatters';
import { APP_VERSION, COMMIT_HASH, COMMIT_URL } from './version';

// Components
import { Header } from './components/Header';
import { InspectorBar } from './components/InspectorBar';
import { MetricsBar } from './components/MetricsBar';
import { ChecklistFilterBar } from './components/ChecklistFilterBar';
import { ChecklistItemCard } from './components/ChecklistItemCard';
import { GeneralNotes } from './components/GeneralNotes';
import { PhotoModal } from './components/PhotoModal';
import { ExportModal } from './components/ExportModal';
import { ActionPlanView } from './components/ActionPlanView';
import { HistoryModal } from './components/HistoryModal';
import { PrintReportView } from './components/PrintReportView';
import { PrintWeeklyReportView } from './components/PrintWeeklyReportView';
import { WeeklyReportModal } from './components/WeeklyReportModal';
import { WeeklyExecutiveReportData } from './utils/weeklyReport';
import { PersonnelModal } from './components/PersonnelModal';
import { SafetyReferenceModal } from './components/SafetyReferenceModal';
import { SyncModal } from './components/SyncModal';
import { QrScannerModal } from './components/QrScannerModal';
import { useCloudSync } from './hooks/useCloudSync';

// Icons
import { 
  Flame, 
  Factory, 
  Warehouse, 
  Building2, 
  CheckCheck, 
  ArrowUp, 
  CornerDownRight, 
  Sparkles,
  FileSpreadsheet,
  Printer,
  X,
  GitCommit
} from 'lucide-react';

export const App: React.FC = () => {
  const { language, t, getCategoryTitle, getCategoryDesc } = useLanguage();

  const {
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
  } = useInspection();

  const {
    history,
    saveInspectionToHistory,
    deleteFromHistory,
    clearHistory,
  } = useHistory();

  const handleRemoteUpdate = useCallback((remoteSession: InspectionSession) => {
    if (remoteSession.updatedAt && remoteSession.updatedAt === session.updatedAt) return;

    // Remote payloads don't carry photos (stripped before push) — preserve
    // local photos per item instead of wiping them
    const localPhotosById = new Map<string, DefectPhoto>();
    const localItemPhotos = new Map<string, DefectPhoto[]>();

    session.items.forEach((item) => {
      const validPhotos = (item.defectDetails?.photos || []).filter(
        (p) => Boolean(p && typeof p.url === 'string' && p.url.trim().length > 0)
      );
      if (validPhotos.length > 0) {
        localItemPhotos.set(item.id, validPhotos);
        validPhotos.forEach((p) => {
          if (p.id) {
            localPhotosById.set(p.id, p);
          }
        });
      }
    });

    const merged: InspectionSession = {
      ...remoteSession,
      items: remoteSession.items.map((ri) => {
        const localPhotos = localItemPhotos.get(ri.id) || [];
        if (!ri.defectDetails) {
          if (localPhotos.length > 0 && ri.status === 'FAIL') {
            return {
              ...ri,
              defectDetails: {
                location: '',
                zonePreset: '',
                description: '',
                priority: 'P2',
                assignedTo: 'Maintenance',
                targetDate: 'Today',
                photos: localPhotos,
                isRepeatIssue: false,
                resolutionStatus: 'Open',
              },
            };
          }
          return ri;
        }

        const remotePhotos = ri.defectDetails.photos || [];
        let restoredPhotos = remotePhotos.map((rp) => {
          if (!rp.url || typeof rp.url !== 'string' || rp.url.trim().length === 0) {
            const matchedLocal = localPhotosById.get(rp.id);
            if (matchedLocal?.url) {
              return { ...rp, url: matchedLocal.url };
            }
          }
          return rp;
        });

        const hasValidPhoto = restoredPhotos.some(
          (p) => Boolean(p && typeof p.url === 'string' && p.url.trim().length > 0)
        );

        if (!hasValidPhoto && localPhotos.length > 0) {
          restoredPhotos = localPhotos;
        }

        return {
          ...ri,
          defectDetails: {
            ...ri.defectDetails,
            photos: restoredPhotos,
          },
        };
      }),
    };
    loadSession(merged);
    // A walkthrough finished on another device belongs in local history too
    if (merged.status === 'Completed') {
      saveInspectionToHistory(merged);
    }
  }, [session, loadSession, saveInspectionToHistory]);

  // Cloud Live Synchronization Hook
  const {
    syncRoom,
    setSyncRoom,
    syncStatus,
    lastSyncedAt,
    isOnline,
    deviceId,
    forcePush,
    forcePull,
  } = useCloudSync({
    session,
    onRemoteUpdate: handleRemoteUpdate,
  });

  // Navigation & Filtering State
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showActionPlanModal, setShowActionPlanModal] = useState<boolean>(false);
  const [showPersonnelModal, setShowPersonnelModal] = useState<boolean>(false);
  const [showSafetyRefModal, setShowSafetyRefModal] = useState<boolean>(false);
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [showDirectQrScanner, setShowDirectQrScanner] = useState<boolean>(false);
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);
  const [showWeeklyReportModal, setShowWeeklyReportModal] = useState<boolean>(false);
  const [activePrintMode, setActivePrintMode] = useState<'daily' | 'weekly'>('daily');
  const [weeklyPrintData, setWeeklyPrintData] = useState<WeeklyExecutiveReportData | null>(null);
  const printTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const qrPullTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScannerOpenRef = useRef(false);
  isScannerOpenRef.current = showDirectQrScanner;

  useEffect(() => {
    return () => {
      if (printTimeoutRef.current) clearTimeout(printTimeoutRef.current);
      if (qrPullTimeoutRef.current) clearTimeout(qrPullTimeoutRef.current);
    };
  }, []);

  // Photo Zoom Modal state
  const [previewPhotoData, setPreviewPhotoData] = useState<{
    photo: DefectPhoto | null;
    location?: string;
    itemTitle?: string;
  }>({ photo: null });

  // Metrics computation
  const metrics = useMemo(() => calculateMetrics(session.items), [session.items]);

  // Keep document.title in sync so Print → Save as PDF suggests the report
  // file name ("EHS Daily Walkthrough_<Inspector>_<dd.mm.yyyy>")
  useEffect(() => {
    if (activePrintMode === 'daily') {
      document.title = getReportFileName(session);
    }
  }, [session.date, session.inspectorName, activePrintMode]);

  // After print event listener to restore default daily mode & title
  useEffect(() => {
    const handleAfterPrint = () => {
      setActivePrintMode('daily');
      document.title = getReportFileName(session);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, [session]);

  // Filtered items logic
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return session.items.filter((item) => {
      // Category filter
      if (activeCategory !== 'ALL' && item.categoryId !== activeCategory) {
        return false;
      }

      // Status filter
      if (statusFilter === 'FAIL' && item.status !== 'FAIL') return false;
      if (statusFilter === 'PENDING' && item.status !== 'PENDING') return false;
      if (statusFilter === 'PASS' && item.status !== 'PASS') return false;

      // Fast path: if !searchQuery.trim(), filter by category and status without checking strings
      if (!q) return true;

      // Search Query filter (searches across both RU and EN fields)
      const matches =
        item.id.toLowerCase().includes(q) ||
        item.titleRu?.toLowerCase().includes(q) ||
        item.titleEn?.toLowerCase().includes(q) ||
        item.defectDetails?.description?.toLowerCase().includes(q) ||
        item.defectDetails?.location?.toLowerCase().includes(q) ||
        item.itemNotes?.toLowerCase().includes(q) ||
        item.standardRu?.toLowerCase().includes(q) ||
        item.standardEn?.toLowerCase().includes(q);
      if (!matches) return false;

      return true;
    });
  }, [session.items, activeCategory, statusFilter, searchQuery]);

  // Group filtered items by category
  const categoriesWithItems = useMemo(() => {
    return INITIAL_CHECKLIST_DATA.map((cat) => {
      const itemsInCat = filteredItems.filter((i) => i.categoryId === cat.id);
      return {
        ...cat,
        items: itemsInCat,
      };
    }).filter((cat) => cat.items.length > 0);
  }, [filteredItems]);

  const handlePreviewPhoto = useCallback((photo: DefectPhoto, location?: string, itemTitle?: string) => {
    triggerHaptic();
    setPreviewPhotoData({ photo, location, itemTitle });
  }, []);

  const handleFinish = useCallback(() => {
    finishWalkthrough();
    saveInspectionToHistory(session);
    setShowExportModal(true);
  }, [finishWalkthrough, session, saveInspectionToHistory]);

  const handleScrollToItem = useCallback((itemId: string) => {
    setActiveCategory('ALL');
    setStatusFilter('ALL');
    setSearchQuery('');
    requestAnimationFrame(() => {
      const el = document.getElementById(`item-${itemId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }, []);

  const handleJumpToNextPending = () => {
    triggerHaptic();
    const nextPending = session.items.find((i) => i.status === 'PENDING');
    if (nextPending) {
      handleScrollToItem(nextPending.id);
    }
  };

  const handleDirectPrint = async () => {
    triggerHaptic();
    setActivePrintMode('daily');
    saveInspectionToHistory(session);
    const timeoutIds = new Set<NodeJS.Timeout>();
    try {
      const container = document.querySelector('.print-report-container');
      const imgs = container ? Array.from(container.querySelectorAll<HTMLImageElement>('img')) : [];
      if (imgs.length > 0) {
        imgs.forEach((img) => {
          img.loading = 'eager';
        });
        await Promise.all(
          imgs.map(async (img) => {
            if (!img.complete) {
              await new Promise<void>((resolve) => {
                let timeoutId: NodeJS.Timeout;
                const cleanup = () => {
                  clearTimeout(timeoutId);
                  timeoutIds.delete(timeoutId);
                  img.onload = null;
                  img.onerror = null;
                  resolve();
                };
                timeoutId = setTimeout(cleanup, 2000);
                timeoutIds.add(timeoutId);
                img.onload = cleanup;
                img.onerror = cleanup;
              });
            }
            if (typeof img.decode === 'function') {
              await img.decode().catch(() => {});
            }
          })
        );
      }
    } catch {
      // Fallback if image decode fails
    } finally {
      timeoutIds.forEach(clearTimeout);
      timeoutIds.clear();
    }
    if (printTimeoutRef.current) clearTimeout(printTimeoutRef.current);
    printTimeoutRef.current = setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleTriggerWeeklyPrint = (data: WeeklyExecutiveReportData) => {
    setActivePrintMode('weekly');
    setWeeklyPrintData(data);
    setShowWeeklyReportModal(false);
    document.title = `EHS_Weekly_Executive_Report_${data.period.startDate}_${data.period.endDate}`;
    if (printTimeoutRef.current) clearTimeout(printTimeoutRef.current);
    printTimeoutRef.current = setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleScanRoom = useCallback((room: string) => {
    setSyncRoom(room);
    forcePush();
    if (qrPullTimeoutRef.current) clearTimeout(qrPullTimeoutRef.current);
    qrPullTimeoutRef.current = setTimeout(() => {
      if (isScannerOpenRef.current) {
        forcePull();
      }
    }, 500);
  }, [setSyncRoom, forcePush, forcePull]);

  const getCategoryIcon = useCallback((iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-5 h-5 text-red-400" />;
      case 'Factory':
        return <Factory className="w-5 h-5 text-amber-400" />;
      case 'Warehouse':
        return <Warehouse className="w-5 h-5 text-blue-400" />;
      case 'Building2':
      default:
        return <Building2 className="w-5 h-5 text-emerald-400" />;
    }
  }, []);

  return (
    <>
      {/* Screen App Shell (Hidden when printing) */}
      <div className="print:hidden min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
        {/* Navigation Bar */}
        <Header
          metrics={metrics}
          onOpenExport={() => setShowExportModal(true)}
          onOpenHistory={() => setShowHistoryModal(true)}
          onOpenWeeklyReport={() => setShowWeeklyReportModal(true)}
          onOpenActionPlan={() => setShowActionPlanModal(true)}
          onOpenPersonnel={() => setShowPersonnelModal(true)}
          onOpenSafetyRef={() => setShowSafetyRefModal(true)}
          onOpenSync={() => setShowSyncModal(true)}
          onOpenQrScanner={() => setShowDirectQrScanner(true)}
          syncStatus={syncStatus}
          syncRoom={syncRoom}
          onReset={() => resetWalkthrough(language)}
          onFinish={handleFinish}
          isFinished={session.status === 'Completed'}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
          {/* Top Session Details Bar */}
          <InspectorBar 
            session={session} 
            onUpdateHeader={updateSessionHeader}
            onOpenPersonnel={() => setShowPersonnelModal(true)} 
          />

          {/* Real-time KPI & Metrics Overview */}
          <MetricsBar
            metrics={metrics}
            activeStatusFilter={statusFilter}
            onFilterStatus={(status) => setStatusFilter(status)}
          />

          {/* Filtering & Search Bar */}
          <ChecklistFilterBar
            activeCategory={activeCategory}
            onSelectCategory={(catId) => setActiveCategory(catId)}
            statusFilter={statusFilter}
            onSelectStatusFilter={(status) => setStatusFilter(status)}
            searchQuery={searchQuery}
            onSearchChange={(q) => setSearchQuery(q)}
            onMarkAllPass={markAllUncheckedAsPass}
            pendingCount={metrics.pending}
          />

          {/* Checklist Sections by Category */}
          {categoriesWithItems.length === 0 ? (
            <div className="text-center py-16 bg-slate-850/60 border border-slate-800 rounded-2xl p-6">
              <Sparkles className="w-10 h-10 text-slate-500 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-200">{t.notFound.title}</h3>
              <p className="text-xs text-slate-400 mt-1">
                {t.notFound.subtitle}
              </p>
              <button
                onClick={() => {
                  setActiveCategory('ALL');
                  setStatusFilter('ALL');
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
              >
                {t.notFound.resetFilters}
              </button>
            </div>
          ) : (
            categoriesWithItems.map((catGroup) => {
              const pendingInCat = catGroup.items.filter((i) => i.status === 'PENDING').length;
              const catTitle = getCategoryTitle(catGroup);

              return (
                <section key={catGroup.id} className="mb-6">
                  {/* Category Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2.5 mb-3 bg-slate-800/80 border border-slate-700/80 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-700">
                        {getCategoryIcon(catGroup.iconName)}
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                          {catGroup.number}. {catTitle}
                        </h2>
                        <span className="text-[11px] text-slate-400">
                          {getCategoryDesc(catGroup)}
                        </span>
                      </div>
                    </div>

                    {/* Quick Pass Category Button */}
                    {pendingInCat > 0 && (
                      <button
                        onClick={() => {
                          triggerHaptic([30, 30]);
                          markCategoryAsPass(catGroup.id);
                        }}
                        className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-slate-900/90 hover:bg-slate-900 px-2.5 py-1 rounded-lg border border-emerald-800/60 flex items-center gap-1 transition-colors"
                        title={t.categories.quickPassTitle}
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>{t.categories.quickPassBtn.replace('{count}', String(pendingInCat))}</span>
                      </button>
                    )}
                  </div>

                  {/* Item Cards in this Category */}
                  <div className="space-y-3.5">
                    {catGroup.items.map((item) => (
                      <ChecklistItemCard
                        key={item.id}
                        item={item}
                        onSetStatus={setItemStatus}
                        onUpdateDefect={updateDefectDetails}
                        onUpdateNotes={updateItemNotes}
                        onAddPhoto={addDefectPhoto}
                        onRemovePhoto={removeDefectPhoto}
                        onPreviewPhoto={handlePreviewPhoto}
                      />
                    ))}
                  </div>
                </section>
              );
            })
          )}

          {/* General Notes & Sign-Off Section */}
          <GeneralNotes
            session={session}
            onUpdateNotes={(notes) => updateSessionHeader('generalNotes', notes)}
            onUpdateSignatures={(sigs) => updateSessionHeader('signatures', sigs)}
            onOpenPersonnel={() => setShowPersonnelModal(true)}
          />

          {/* Bottom Fast Action Footer Card */}
          <div className="p-4 bg-gradient-to-r from-slate-850 to-slate-800 border border-slate-700 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
            <div>
              <h4 className="text-sm font-bold text-white">
                {t.bottomFooter.heading}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {t.bottomFooter.progressText
                  .replace('{completed}', String(metrics.completed))
                  .replace('{total}', String(metrics.total))
                  .replace('{score}', String(metrics.scorePercentage))}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  triggerHaptic();
                  setShowExportModal(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{t.bottomFooter.exportBtn}</span>
              </button>
            </div>
          </div>
        </main>

        {/* Floating Quick Action Widget on Mobile */}
        <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-2">
          {metrics.pending > 0 && (
            <button
              onClick={handleJumpToNextPending}
              className="p-3 bg-amber-600 hover:bg-amber-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-all animate-bounce"
              title={t.bottomFooter.jumpToPending}
            >
              <CornerDownRight className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => {
              triggerHaptic();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="p-3 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-full shadow-2xl flex items-center justify-center transition-all backdrop-blur-md"
            title={t.bottomFooter.backToTop}
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>

        {/* Footer with App Version and Commit Hash */}
        <footer className="border-t border-slate-800/80 py-4 px-4 text-center text-xs text-slate-400 bg-slate-950/60">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>
              {t.bottomFooter.credits}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span>{APP_VERSION}</span>
              <span>•</span>
              <a
                href={COMMIT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-indigo-400 transition-colors underline underline-offset-2 font-mono"
              >
                <GitCommit className="w-3 h-3" />
                <span>commit {COMMIT_HASH}</span>
              </a>
            </div>
          </div>
        </footer>

      {/* On-Screen Print Preview Modal / Overlay */}
      {showPrintPreview && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 backdrop-blur-md p-3 sm:p-6 flex flex-col print:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-4xl w-full mx-auto flex flex-col flex-1">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-750 rounded-2xl mb-4 shadow-xl">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-bold text-white">
                  {language === 'ru' ? 'Предпросмотр печатного отчета (US Letter 8.5" × 11")' : 'Print Preview (US Letter 8.5" × 11")'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDirectPrint}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t.exportModal.printBtn}</span>
                </button>
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                  title={t.common.close}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Paper Container */}
            <div className="bg-slate-800/40 p-4 sm:p-6 rounded-2xl border border-slate-750 shadow-2xl flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto bg-white text-black rounded-lg shadow-2xl overflow-hidden">
                <PrintReportView
                  session={session}
                  isScreenPreview={true}
                  onPreviewPhoto={handlePreviewPhoto}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Fullscreen Zoom Modal */}
      <PhotoModal
        photo={previewPhotoData.photo}
        location={previewPhotoData.location}
        itemTitle={previewPhotoData.itemTitle}
        onClose={() => setPreviewPhotoData({ photo: null })}
      />

      {/* Export and Reports Center Modal */}
      {showExportModal && (
        <ExportModal
          session={session}
          onClose={() => setShowExportModal(false)}
          onSaveToHistory={saveInspectionToHistory}
          onOpenPrintPreview={() => setShowPrintPreview(true)}
          onOpenWeeklyReport={() => setShowWeeklyReportModal(true)}
        />
      )}

      {/* CAPA Action Plan Modal */}
      {showActionPlanModal && (
        <ActionPlanView
          items={session.items}
          onClose={() => setShowActionPlanModal(false)}
          onUpdateDefectStatus={(itemId, resStatus) => {
            updateDefectDetails(itemId, { resolutionStatus: resStatus });
          }}
          onScrollToItem={handleScrollToItem}
          onPreviewPhoto={handlePreviewPhoto}
        />
      )}

      {/* History Log Modal */}
      {showHistoryModal && (
        <HistoryModal
          history={history}
          onClose={() => setShowHistoryModal(false)}
          onLoadSession={loadSession}
          onDeleteSession={deleteFromHistory}
          onClearHistory={clearHistory}
          onOpenWeeklyReport={() => setShowWeeklyReportModal(true)}
        />
      )}

      {/* Personnel Directory Modal */}
      {showPersonnelModal && (
        <PersonnelModal
          onClose={() => setShowPersonnelModal(false)}
          onSelectInspector={(person) => {
            updateSessionHeader('inspectorName', person.name);
            updateSessionHeader('inspectorRole', person.role);
            updateSessionHeader('signatures', {
              ...session.signatures,
              inspector: person.name,
              inspectorTitle: person.role,
            });
          }}
        />
      )}

      {/* FSE Safety & HazCom Standards Reference Modal */}
      {showSafetyRefModal && (
        <SafetyReferenceModal
          onClose={() => setShowSafetyRefModal(false)}
        />
      )}

      {/* Cloud Live Synchronization Modal */}
      {showSyncModal && (
        <SyncModal
          onClose={() => setShowSyncModal(false)}
          syncStatus={syncStatus}
          lastSyncedAt={lastSyncedAt}
          syncRoom={syncRoom}
          onSetSyncRoom={setSyncRoom}
          onForcePush={forcePush}
          onForcePull={forcePull}
          isOnline={isOnline}
          deviceId={deviceId}
        />
      )}

      {/* Direct In-App QR Scanner */}
      {showDirectQrScanner && (
        <QrScannerModal
          onClose={() => {
            if (qrPullTimeoutRef.current) clearTimeout(qrPullTimeoutRef.current);
            setShowDirectQrScanner(false);
          }}
          onScanRoom={handleScanRoom}
        />
      )}

      {/* Weekly Executive Report Modal (CEO One-Pager) */}
      {showWeeklyReportModal && (
        <WeeklyReportModal
          history={history}
          currentSession={session}
          onClose={() => {
            setShowWeeklyReportModal(false);
            setActivePrintMode('daily');
          }}
          onTriggerPrint={handleTriggerWeeklyPrint}
          onReportDataChange={(data) => {
            setWeeklyPrintData(data);
            setActivePrintMode('weekly');
            document.title = `EHS_Weekly_Executive_Report_${data.period.startDate}_${data.period.endDate}`;
          }}
        />
      )}
      </div>

      {/* Print PDF View (Direct sibling, visible during window.print()) */}
      {activePrintMode === 'weekly' && weeklyPrintData ? (
        <PrintWeeklyReportView data={weeklyPrintData} />
      ) : (
        <PrintReportView session={session} />
      )}
    </>
  );
};

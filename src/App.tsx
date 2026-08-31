import React, { useState, useMemo } from 'react';
import { useInspection } from './hooks/useInspection';
import { useHistory } from './hooks/useHistory';
import { calculateMetrics } from './utils/metrics';
import { INITIAL_CHECKLIST_DATA } from './data/checklistData';
import { DefectPhoto } from './types/inspection';
import { triggerHaptic } from './utils/haptics';
import { useLanguage } from './i18n/LanguageContext';

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
  FileSpreadsheet
} from 'lucide-react';

export const App: React.FC = () => {
  const { language, t, getCategoryTitle } = useLanguage();

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
    loadDemoData,
    loadSession,
    finishWalkthrough,
  } = useInspection();

  const {
    history,
    saveInspectionToHistory,
    deleteFromHistory,
    clearHistory,
  } = useHistory();

  // Navigation & Filtering State
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showActionPlanModal, setShowActionPlanModal] = useState<boolean>(false);

  // Photo Zoom Modal state
  const [previewPhotoData, setPreviewPhotoData] = useState<{
    photo: DefectPhoto | null;
    location?: string;
    itemTitle?: string;
  }>({ photo: null });

  // Metrics computation
  const metrics = useMemo(() => calculateMetrics(session.items), [session.items]);

  // Filtered items logic
  const filteredItems = useMemo(() => {
    return session.items.filter((item) => {
      // Category filter
      if (activeCategory !== 'ALL' && item.categoryId !== activeCategory) {
        return false;
      }

      // Status filter
      if (statusFilter === 'FAIL' && item.status !== 'FAIL') return false;
      if (statusFilter === 'PENDING' && item.status !== 'PENDING') return false;
      if (statusFilter === 'PASS' && item.status !== 'PASS') return false;

      // Search Query filter (searches across both RU and EN fields)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = item.id.toLowerCase().includes(query);
        const matchesTitleRu = item.titleRu?.toLowerCase().includes(query);
        const matchesTitleEn = item.titleEn?.toLowerCase().includes(query);
        const matchesStandardRu = item.standardRu?.toLowerCase().includes(query);
        const matchesStandardEn = item.standardEn?.toLowerCase().includes(query);
        const matchesLocation = item.defectDetails?.location?.toLowerCase().includes(query);
        const matchesDefect = item.defectDetails?.description?.toLowerCase().includes(query);
        const matchesNotes = item.itemNotes?.toLowerCase().includes(query);

        if (
          !matchesId &&
          !matchesTitleRu &&
          !matchesTitleEn &&
          !matchesStandardRu &&
          !matchesStandardEn &&
          !matchesLocation &&
          !matchesDefect &&
          !matchesNotes
        ) {
          return false;
        }
      }

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

  const handlePreviewPhoto = (photo: DefectPhoto, location?: string, itemTitle?: string) => {
    triggerHaptic();
    setPreviewPhotoData({ photo, location, itemTitle });
  };

  const handleFinish = () => {
    finishWalkthrough();
    saveInspectionToHistory(session);
    setShowExportModal(true);
  };

  const handleScrollToItem = (itemId: string) => {
    setActiveCategory('ALL');
    setStatusFilter('ALL');
    setSearchQuery('');
    setTimeout(() => {
      const el = document.getElementById(`item-${itemId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  const handleJumpToNextPending = () => {
    triggerHaptic();
    const nextPending = session.items.find((i) => i.status === 'PENDING');
    if (nextPending) {
      handleScrollToItem(nextPending.id);
    }
  };

  const getCategoryIcon = (iconName: string) => {
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
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Screen App Shell (Hidden when printing) */}
      <div className="print:hidden flex-1 flex flex-col">
        {/* Navigation Bar */}
        <Header
          metrics={metrics}
          onOpenExport={() => setShowExportModal(true)}
          onOpenHistory={() => setShowHistoryModal(true)}
          onOpenActionPlan={() => setShowActionPlanModal(true)}
          onLoadDemo={() => loadDemoData(language)}
          onReset={() => resetWalkthrough(language)}
          onFinish={handleFinish}
          isFinished={session.status === 'Completed'}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
          {/* Top Session Details Bar */}
          <InspectorBar session={session} onUpdateHeader={updateSessionHeader} />

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
              const catSub = language === 'ru' ? catGroup.titleEn : (catGroup.descriptionEn || catGroup.descriptionRu);

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
                          {catSub}
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

        {/* Footer */}
        <footer className="border-t border-slate-800/80 py-4 px-4 text-center text-xs text-slate-400 bg-slate-950/60">
          <p>
            {t.bottomFooter.credits}
          </p>
        </footer>
      </div>

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
          onRestoreSession={loadSession}
          onSaveToHistory={saveInspectionToHistory}
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
        />
      )}

      {/* Print PDF View (Visible only during window.print()) */}
      <PrintReportView session={session} />
    </div>
  );
};

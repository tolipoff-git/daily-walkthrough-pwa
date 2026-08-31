import React, { useState } from 'react';
import { 
  Flame, 
  Factory, 
  Warehouse, 
  Building2, 
  Search, 
  CheckCheck, 
  ListFilter, 
  X
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../i18n/LanguageContext';

interface ChecklistFilterBarProps {
  activeCategory: string;
  onSelectCategory: (catId: string) => void;
  statusFilter: string;
  onSelectStatusFilter: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onMarkAllPass: () => void;
  pendingCount: number;
}

export const ChecklistFilterBar: React.FC<ChecklistFilterBarProps> = ({
  activeCategory,
  onSelectCategory,
  statusFilter,
  onSelectStatusFilter,
  searchQuery,
  onSearchChange,
  onMarkAllPass,
  pendingCount,
}) => {
  const { t } = useLanguage();
  const [showConfirmPassModal, setShowConfirmPassModal] = useState(false);

  const categories = [
    { id: 'ALL', label: t.filterBar.allCategories, icon: ListFilter, count: 16 },
    { id: 'cat1', label: t.filterBar.cat1, icon: Flame, count: 5 },
    { id: 'cat2', label: t.filterBar.cat2, icon: Factory, count: 4 },
    { id: 'cat3', label: t.filterBar.cat3, icon: Warehouse, count: 3 },
    { id: 'cat4', label: t.filterBar.cat4, icon: Building2, count: 4 },
  ];

  const handleConfirmPass = () => {
    triggerHaptic([50, 50, 50]);
    onMarkAllPass();
    setShowConfirmPassModal(false);
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700/90 rounded-2xl p-3.5 sm:p-4 mb-4 shadow-lg backdrop-blur-sm">
      {/* Category Pills Slider */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                triggerHaptic();
                onSelectCategory(cat.id);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'bg-slate-900/70 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Controls */}
      <div className="mt-3 pt-3 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.filterBar.searchPlaceholder}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-8 py-1.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Toggle Pills */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700 shrink-0 text-xs font-medium">
          <button
            onClick={() => {
              triggerHaptic();
              onSelectStatusFilter('ALL');
            }}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              statusFilter === 'ALL' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.filterBar.filterAll}
          </button>
          <button
            onClick={() => {
              triggerHaptic();
              onSelectStatusFilter('FAIL');
            }}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              statusFilter === 'FAIL' ? 'bg-red-600 text-white font-bold' : 'text-red-400 hover:text-red-300'
            }`}
          >
            {t.filterBar.filterFail}
          </button>
          <button
            onClick={() => {
              triggerHaptic();
              onSelectStatusFilter('PENDING');
            }}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              statusFilter === 'PENDING' ? 'bg-amber-600 text-white font-bold' : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            {t.filterBar.filterPending}
          </button>
        </div>

        {/* Quick Bulk Pass Button */}
        {pendingCount > 0 && (
          <button
            onClick={() => {
              triggerHaptic();
              setShowConfirmPassModal(true);
            }}
            className="px-3 py-1.5 bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-700/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shrink-0"
            title={t.filterBar.markAllPassTitle}
          >
            <CheckCheck className="w-4 h-4 text-emerald-400" />
            <span>{t.filterBar.markAllPass.replace('{count}', String(pendingCount))}</span>
          </button>
        )}
      </div>

      {/* Confirmation Modal for Bulk Pass */}
      {showConfirmPassModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in print:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-400 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center">
                <CheckCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t.filterBar.bulkPassModalTitle}</h3>
                <p className="text-xs text-slate-400">{t.filterBar.bulkPassModalSubtitle}</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mb-5 leading-relaxed">
              {t.filterBar.bulkPassModalPrompt.replace('{count}', String(pendingCount))}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmPassModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleConfirmPass}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-1.5"
              >
                <CheckCheck className="w-4 h-4" />
                <span>{t.filterBar.bulkPassConfirmBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

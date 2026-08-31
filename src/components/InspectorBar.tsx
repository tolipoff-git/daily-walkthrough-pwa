import React, { useState } from 'react';
import { 
  User, 
  Building, 
  Calendar, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Users,
  BookmarkPlus,
  Check
} from 'lucide-react';
import { InspectionSession } from '../types/inspection';
import { usePersonnel } from '../hooks/usePersonnel';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../i18n/LanguageContext';
import { formatShift, formatArea, formatRole } from '../utils/formatters';

interface InspectorBarProps {
  session: InspectionSession;
  onUpdateHeader: <K extends keyof InspectionSession>(field: K, value: InspectionSession[K]) => void;
  onOpenPersonnel: () => void;
}

export const InspectorBar: React.FC<InspectorBarProps> = ({ 
  session, 
  onUpdateHeader,
  onOpenPersonnel 
}) => {
  const { language, t, getShifts } = useLanguage();
  const { personnel, saveOrUpdateCurrent } = usePersonnel();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [savedToast, setSavedToast] = useState<boolean>(false);

  const setEndTimeNow = () => {
    triggerHaptic();
    const nowStr = new Date().toTimeString().slice(0, 5);
    onUpdateHeader('endTime', nowStr);
  };

  const setStartTimeNow = () => {
    triggerHaptic();
    const nowStr = new Date().toTimeString().slice(0, 5);
    onUpdateHeader('startTime', nowStr);
  };

  const handleSelectPerson = (personId: string) => {
    const p = personnel.find((x) => x.id === personId);
    if (!p) return;
    triggerHaptic();
    onUpdateHeader('inspectorName', p.name);
    onUpdateHeader('inspectorRole', p.role);
    onUpdateHeader('signatures', {
      ...session.signatures,
      inspector: p.name,
      inspectorTitle: p.role,
    });
  };

  const handleSaveCurrentInspector = () => {
    if (!session.inspectorName.trim()) return;
    triggerHaptic(30);
    saveOrUpdateCurrent(session.inspectorName, session.inspectorRole);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const shiftOptions = getShifts();

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 sm:p-4 mb-4 shadow-lg backdrop-blur-sm">
      {/* Primary compact summary row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          {/* Inspector Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 border border-slate-700 rounded-xl text-slate-200">
            <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{session.inspectorName || t.inspectorBar.noInspector}</span>
            <span className="text-slate-400 text-xs hidden md:inline">({formatRole(session.inspectorRole, language)})</span>
          </div>

          {/* Quick Inspector Selector Dropdown */}
          <div className="flex items-center gap-1">
            <select
              aria-label={t.inspectorBar.selectInspectorPlaceholder}
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  handleSelectPerson(e.target.value);
                }
              }}
              className="bg-slate-900/90 border border-slate-700 text-slate-300 text-xs rounded-xl px-2.5 py-1 focus:outline-none focus:border-indigo-500 max-w-[150px] sm:max-w-[190px] truncate"
            >
              <option value="" disabled>
                {t.inspectorBar.selectInspector}
              </option>
              {personnel.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.role})
                </option>
              ))}
            </select>

            {/* Manage Personnel Directory button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                onOpenPersonnel();
              }}
              className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 rounded-xl transition-all"
              title={t.inspectorBar.managePersonnel}
            >
              <Users className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Date & Shift */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 border border-slate-700 rounded-xl text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>{session.date}</span>
            <span className="text-slate-500">•</span>
            <span className="text-xs font-medium text-slate-300">{formatShift(session.shift, language)}</span>
          </div>

          {/* Time tracker badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 border border-slate-700 rounded-xl text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-mono text-xs">
              {session.startTime || '--:--'} — {session.endTime || t.inspectorBar.inProgressTime}
            </span>
          </div>

          {/* Facility area */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 border border-slate-700 rounded-xl text-slate-400 text-xs">
            <Building className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate max-w-xs">{formatArea(session.facilityArea, language)}</span>
          </div>
        </div>

        {/* Toggle Details Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            setIsExpanded(!isExpanded);
          }}
          className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-700/50 transition-colors ml-auto"
        >
          <span>{isExpanded ? t.inspectorBar.hideParams : t.inspectorBar.editParams}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expandable Editable Parameters Form */}
      {isExpanded && (
        <div className="mt-4 pt-3.5 border-t border-slate-700/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs animate-fade-in">
          {/* Inspector Name with Save Button */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-medium">{t.inspectorBar.inspectorName}</label>
              <button
                type="button"
                onClick={handleSaveCurrentInspector}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                title={t.inspectorBar.saveCurrentInspector}
              >
                {savedToast ? (
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> {t.common.saved}
                  </span>
                ) : (
                  <>
                    <BookmarkPlus className="w-3 h-3" />
                    <span>{t.inspectorBar.saveCurrentInspector}</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={session.inspectorName}
                onChange={(e) => {
                  onUpdateHeader('inspectorName', e.target.value);
                  onUpdateHeader('signatures', {
                    ...session.signatures,
                    inspector: e.target.value,
                  });
                }}
                placeholder={t.inspectorBar.inspectorNamePlaceholder}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Inspector Role */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">{t.inspectorBar.inspectorRole}</label>
            <input
              type="text"
              value={session.inspectorRole}
              onChange={(e) => {
                onUpdateHeader('inspectorRole', e.target.value);
                onUpdateHeader('signatures', {
                  ...session.signatures,
                  inspectorTitle: e.target.value,
                });
              }}
              placeholder={t.inspectorBar.inspectorRolePlaceholder}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Shift Select */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">{t.inspectorBar.shift}</label>
            <select
              value={session.shift}
              onChange={(e) => onUpdateHeader('shift', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              {shiftOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
              {!shiftOptions.some((opt) => opt.value === session.shift) && (
                <option value={session.shift}>{session.shift}</option>
              )}
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">{t.inspectorBar.date}</label>
            <input
              type="date"
              value={session.date}
              onChange={(e) => onUpdateHeader('date', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Time Tracking (Start / End) */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">{t.inspectorBar.time}</label>
            <div className="flex items-center gap-1.5">
              <input
                type="time"
                value={session.startTime}
                onChange={(e) => onUpdateHeader('startTime', e.target.value)}
                className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1.5 text-slate-100 focus:outline-none focus:border-emerald-500 text-center"
              />
              <button
                type="button"
                onClick={setStartTimeNow}
                className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                title={t.inspectorBar.startNow}
              >
                {t.inspectorBar.startNow}
              </button>
              <span className="text-slate-500">—</span>
              <input
                type="time"
                value={session.endTime}
                onChange={(e) => onUpdateHeader('endTime', e.target.value)}
                placeholder="--:--"
                className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1.5 text-slate-100 focus:outline-none focus:border-emerald-500 text-center"
              />
              <button
                type="button"
                onClick={setEndTimeNow}
                className="px-1.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[10px]"
                title={t.inspectorBar.stopNow}
              >
                {t.inspectorBar.stopNow}
              </button>
            </div>
          </div>

          {/* Facility Campus Name */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">{t.inspectorBar.facilityName}</label>
            <input
              type="text"
              value={session.facilityName}
              onChange={(e) => onUpdateHeader('facilityName', e.target.value)}
              placeholder={t.inspectorBar.facilityNamePlaceholder}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Facility Area / Scope */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-slate-400 font-medium mb-1">{t.inspectorBar.facilityArea}</label>
            <input
              type="text"
              value={session.facilityArea}
              onChange={(e) => onUpdateHeader('facilityArea', e.target.value)}
              placeholder={t.inspectorBar.facilityAreaPlaceholder}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

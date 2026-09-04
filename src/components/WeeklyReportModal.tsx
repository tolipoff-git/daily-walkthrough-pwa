import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  Copy,
  Sparkles,
  TrendingUp,
  Calendar,
  AlertOctagon,
  Flame,
  Factory,
  Warehouse,
  Building2,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Eye,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { InspectionSession } from '../types/inspection';
import {
  aggregateWeeklyExecutiveReport,
  getWeekDateRange,
  getLastNDaysRange,
  WeeklyExecutiveReportData,
} from '../utils/weeklyReport';
import { exportWeeklyReportToExcel } from '../utils/exportWeeklyExcel';
import { PrintWeeklyReportView } from './PrintWeeklyReportView';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../i18n/LanguageContext';

interface WeeklyReportModalProps {
  history: InspectionSession[];
  currentSession: InspectionSession;
  onClose: () => void;
  onTriggerPrint: (data: WeeklyExecutiveReportData) => void;
  onReportDataChange?: (data: WeeklyExecutiveReportData) => void;
}

export const WeeklyReportModal: React.FC<WeeklyReportModalProps> = ({
  history,
  currentSession,
  onClose,
  onTriggerPrint,
  onReportDataChange,
}) => {
  const { language, t } = useLanguage();
  const isRu = language === 'ru';

  // Period state
  const [periodPreset, setPeriodPreset] = useState<'current' | 'last' | '7days' | 'all' | 'custom'>('current');
  const defaultCurrentRange = useMemo(() => getWeekDateRange(0), []);
  const [startDate, setStartDate] = useState<string>(defaultCurrentRange.startDate);
  const [endDate, setEndDate] = useState<string>(defaultCurrentRange.endDate);

  const [includeActive, setIncludeActive] = useState<boolean>(true);

  // View Mode: 'dashboard' vs 'printPreview'
  const [viewMode, setViewMode] = useState<'dashboard' | 'printPreview'>('dashboard');

  // Dashboard Tab: 'overview' vs 'annex'
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'annex'>('overview');
  const [annexFilter, setAnnexFilter] = useState<'ALL' | 'CRITICAL' | 'BOTTLENECK' | 'CULTURE' | 'RECURRING'>('ALL');

  // Copy feedback states
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [copiedBriefing, setCopiedBriefing] = useState<boolean>(false);

  // Preset switch handler
  const handleSelectPreset = (preset: 'current' | 'last' | '7days' | 'all' | 'custom') => {
    triggerHaptic();
    setPeriodPreset(preset);
    if (preset === 'current') {
      const r = getWeekDateRange(0);
      setStartDate(r.startDate);
      setEndDate(r.endDate);
    } else if (preset === 'last') {
      const r = getWeekDateRange(1);
      setStartDate(r.startDate);
      setEndDate(r.endDate);
    } else if (preset === '7days') {
      const r = getLastNDaysRange(7);
      setStartDate(r.startDate);
      setEndDate(r.endDate);
    } else if (preset === 'all') {
      setStartDate('2020-01-01');
      setEndDate('2030-12-31');
    }
  };

  // Compile combined session pool strictly from real inspection history
  const sessionsPool = useMemo(() => {
    const list: InspectionSession[] = [...history];
    if (includeActive && currentSession && !list.some((s) => s.id === currentSession.id)) {
      list.push(currentSession);
    }
    return list;
  }, [history, currentSession, includeActive]);

  // Aggregate report data
  const reportData: WeeklyExecutiveReportData = useMemo(() => {
    return aggregateWeeklyExecutiveReport(sessionsPool, startDate, endDate);
  }, [sessionsPool, startDate, endDate]);

  // Notify parent of reportData for synchronized print/PDF readiness
  useEffect(() => {
    onReportDataChange?.(reportData);
  }, [reportData, onReportDataChange]);

  // Handle actions
  const handlePrint = () => {
    triggerHaptic();
    onTriggerPrint(reportData);
  };

  const handleExportXlsx = () => {
    triggerHaptic();
    exportWeeklyReportToExcel(reportData, language);
  };

  const handleCopyPrompt = async () => {
    triggerHaptic();
    try {
      await navigator.clipboard.writeText(reportData.llmPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 3000);
    } catch (e) {
      console.error('Failed to copy prompt', e);
    }
  };

  const handleCopyBriefing = async () => {
    triggerHaptic();
    try {
      const text = `${t.weeklyReport.modalTitle} (${reportData.period.startDate} - ${reportData.period.endDate})
Score: ${reportData.overallScore}% [${reportData.ragStatus}] | Trend: ${reportData.trendDelta}%
Regulatory Violations (OSHA/NFPA): ${reportData.criticalRegulatoryCount}

1. ${t.weeklyReport.briefingTakeaway}:
${isRu ? reportData.narrative.takeawayRu : reportData.narrative.takeawayEn}

2. ${t.weeklyReport.briefingRegulatory}:
${isRu ? reportData.narrative.regulatoryRu : reportData.narrative.regulatoryEn}

3. ${t.weeklyReport.briefingBottlenecks}:
${isRu ? reportData.narrative.bottlenecksRu : reportData.narrative.bottlenecksEn}

4. ${t.weeklyReport.briefingActions}:
${isRu ? reportData.narrative.actionsRu : reportData.narrative.actionsEn}`;

      await navigator.clipboard.writeText(text);
      setCopiedBriefing(true);
      setTimeout(() => setCopiedBriefing(false), 3000);
    } catch (e) {
      console.error('Failed to copy briefing', e);
    }
  };

  const allDefects = useMemo(() => {
    return [
      ...reportData.defectRegister.criticalTierDefects,
      ...reportData.defectRegister.bottleneckTierDefects,
      ...reportData.defectRegister.cultureTierDefects,
    ];
  }, [reportData.defectRegister]);

  const displayedDefects = useMemo(() => {
    if (annexFilter === 'CRITICAL') return reportData.defectRegister.criticalTierDefects;
    if (annexFilter === 'BOTTLENECK') return reportData.defectRegister.bottleneckTierDefects;
    if (annexFilter === 'CULTURE') return reportData.defectRegister.cultureTierDefects;
    if (annexFilter === 'RECURRING') return allDefects.filter((d) => d.isPersistent);
    return allDefects;
  }, [allDefects, annexFilter, reportData.defectRegister]);

  // Domain icon resolver
  const renderDomainIcon = (name: string) => {
    switch (name) {
      case 'Flame':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'Factory':
        return <Factory className="w-4 h-4 text-blue-400" />;
      case 'Warehouse':
        return <Warehouse className="w-4 h-4 text-amber-400" />;
      default:
        return <Building2 className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-fade-in print:hidden"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-w-6xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-850 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 border border-blue-400/40 flex items-center justify-center text-white shadow-lg shadow-blue-950/40">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
                  {t.weeklyReport.modalTitle}
                </h2>
                <span className="bg-indigo-950 border border-indigo-700 text-indigo-300 font-mono text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                  CEO One-Pager
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                {isRu ? reportData.summaryNoteRu : reportData.summaryNoteEn}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'dashboard' ? 'printPreview' : 'dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border ${
                viewMode === 'printPreview'
                  ? 'bg-blue-600 border-blue-400 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">
                {viewMode === 'printPreview' ? 'Dashboard' : 'A4 Print Preview'}
              </span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-750 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Period Filter & Primary Actions */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              {t.weeklyReport.periodLabel}:
            </span>
            <button
              onClick={() => handleSelectPreset('current')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                periodPreset === 'current'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              {t.weeklyReport.presetCurrentWeek}
            </button>
            <button
              onClick={() => handleSelectPreset('last')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                periodPreset === 'last'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              {t.weeklyReport.presetLastWeek}
            </button>
            <button
              onClick={() => handleSelectPreset('7days')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                periodPreset === '7days'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              {t.weeklyReport.presetLast7Days}
            </button>
            <button
              onClick={() => handleSelectPreset('all')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                periodPreset === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              {t.weeklyReport.presetAll}
            </button>
            <label className="ml-2 flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeActive}
                onChange={(e) => {
                  triggerHaptic();
                  setIncludeActive(e.target.checked);
                }}
                className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
              <span>{t.weeklyReport.includeCurrentSession}</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t.weeklyReport.btnPrintOnePager}</span>
            </button>

            <button
              onClick={handleExportXlsx}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.weeklyReport.btnExportXlsx}</span>
            </button>

            <button
              onClick={handleCopyPrompt}
              className="px-3 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-600/70 font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              title={t.weeklyReport.btnCopyPromptDesc}
            >
              {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5 text-purple-300" />}
              <span className="hidden md:inline">
                {copiedPrompt ? t.weeklyReport.promptCopied : t.weeklyReport.btnCopyPrompt}
              </span>
            </button>

            <button
              onClick={handleCopyBriefing}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 font-semibold flex items-center gap-1.5 transition-colors"
            >
              {copiedBriefing ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden lg:inline">{t.weeklyReport.btnCopyBriefing}</span>
            </button>
          </div>
        </div>

        {/* Info Banner if 0 sessions */}
        {reportData.auditedDaysCount === 0 && (
          <div className="px-6 py-3 bg-amber-950/60 border-b border-amber-800/80 flex items-center gap-2 text-xs text-amber-300">
            <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <b>{t.weeklyReport.noSessionsFound}</b> {t.weeklyReport.noSessionsTip}
            </span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-950/60">
          {viewMode === 'printPreview' ? (
            /* Print Preview Mode */
            <div className="flex justify-center">
              <PrintWeeklyReportView data={reportData} isScreenPreview={true} />
            </div>
          ) : (
            /* Interactive Dashboard Mode */
            <>
              {/* Tab Switcher: Overview vs Annex */}
              <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl mb-4">
                <button
                  onClick={() => {
                    triggerHaptic();
                    setDashboardTab('overview');
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    dashboardTab === 'overview'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{t.weeklyReport.tabOverview}</span>
                </button>
                <button
                  onClick={() => {
                    triggerHaptic();
                    setDashboardTab('annex');
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    dashboardTab === 'annex'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.weeklyReport.tabAnnexRegister}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      dashboardTab === 'annex' ? 'bg-blue-800 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {reportData.defectRegister.totalUniqueDefects}
                  </span>
                </button>
              </div>

              {dashboardTab === 'overview' ? (
                <>
                  {/* 1. Executive 5-Second Status Bar */}
                  <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t.weeklyReport.kpiSectionTitle}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {reportData.auditedDaysCount} {t.weeklyReport.sessionsCount} ({reportData.period.startDate} — {reportData.period.endDate})
                  </span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Overall Compliance Score Card */}
                  <div
                    className={`p-4 rounded-xl border flex flex-col justify-between shadow-lg relative overflow-hidden ${
                      reportData.ragStatus === 'GREEN'
                        ? 'bg-emerald-950/40 border-emerald-700/80'
                        : reportData.ragStatus === 'AMBER'
                        ? 'bg-amber-950/40 border-amber-700/80'
                        : 'bg-red-950/40 border-red-700/80'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        {t.weeklyReport.complianceScore}
                      </div>
                      <div
                        className={`text-3xl sm:text-4xl font-black mt-1 ${
                          reportData.ragStatus === 'GREEN'
                            ? 'text-emerald-400'
                            : reportData.ragStatus === 'AMBER'
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {reportData.overallScore}%
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                          reportData.ragStatus === 'GREEN'
                            ? 'bg-emerald-400'
                            : reportData.ragStatus === 'AMBER'
                            ? 'bg-amber-400'
                            : 'bg-red-400'
                        }`}
                      />
                      <span className="text-xs font-bold text-slate-300">
                        {reportData.ragStatus === 'GREEN'
                          ? t.weeklyReport.statusNormal
                          : reportData.ragStatus === 'AMBER'
                          ? t.weeklyReport.statusAttention
                          : t.weeklyReport.statusIntervention}
                      </span>
                    </div>
                  </div>

                  {/* Trend Vector Card */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 flex flex-col justify-between shadow-lg">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        {t.weeklyReport.trendVector}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-3xl sm:text-4xl font-black ${
                            reportData.trendDirection === 'UP'
                              ? 'text-emerald-400'
                              : reportData.trendDirection === 'DOWN'
                              ? 'text-red-400'
                              : 'text-slate-300'
                          }`}
                        >
                          {reportData.trendDelta >= 0 ? '+' : ''}
                          {reportData.trendDelta}%
                        </span>
                        {reportData.trendDirection === 'UP' ? (
                          <ArrowUpRight className="w-7 h-7 text-emerald-400" />
                        ) : reportData.trendDirection === 'DOWN' ? (
                          <ArrowDownRight className="w-7 h-7 text-red-400" />
                        ) : (
                          <Minus className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 mt-3">
                      {isRu ? 'Динамика внутри недели (Пн → Пт)' : 'Week trajectory (Mon → Fri)'}
                    </div>
                  </div>

                  {/* Regulatory Stop-Factor Counter */}
                  <div
                    className={`p-4 rounded-xl border flex flex-col justify-between shadow-lg ${
                      reportData.criticalRegulatoryCount > 0
                        ? 'bg-red-950/30 border-red-800/80'
                        : 'bg-slate-900/90 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400 flex items-center justify-between">
                        <span>{t.weeklyReport.regulatoryFlag}</span>
                        {reportData.criticalRegulatoryCount > 0 && (
                          <AlertOctagon className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div
                        className={`text-3xl sm:text-4xl font-black mt-1 ${
                          reportData.criticalRegulatoryCount > 0 ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {reportData.criticalRegulatoryCount}
                      </div>
                    </div>
                    <div className="text-xs font-semibold mt-3">
                      {reportData.criticalRegulatoryCount > 0 ? (
                        <span className="text-red-400 font-bold">
                          {isRu ? 'Прямой риск штрафов OSHA / NFPA' : 'Direct OSHA/NFPA citation risk'}
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {isRu ? 'Нарушений не выявлено' : 'Zero citations active'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Defect Tally & Resolution */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 flex flex-col justify-between shadow-lg">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        {t.weeklyReport.totalDefects}
                      </div>
                      <div className="text-3xl sm:text-4xl font-black text-white mt-1">
                        {reportData.totalDefectsCount}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 mt-3 flex items-center justify-between">
                      <span>
                        {t.weeklyReport.open}: <b className="text-red-400">{reportData.openCount}</b>
                      </span>
                      <span>
                        {t.weeklyReport.inProgress}: <b className="text-amber-400">{reportData.inProgressCount}</b>
                      </span>
                      <span>
                        {t.weeklyReport.resolved}: <b className="text-emerald-400">{reportData.resolvedCount}</b>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Visual Trend & Anti-Rating Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Daily Pulse Line Chart */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 shadow-md">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                        {t.weeklyReport.chartPulseTitle}
                      </h4>
                      <p className="text-xs text-slate-400">{t.weeklyReport.chartPulseSubtitle}</p>
                    </div>
                    <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold">
                      {t.weeklyReport.normZone}
                    </span>
                  </div>

                  <div className="h-44 w-full flex items-center justify-center">
                    {reportData.dailyPoints.length === 0 ? (
                      <div className="text-slate-500 text-xs italic py-10">
                        {t.weeklyReport.noSessionsFound}
                      </div>
                    ) : (
                      <svg viewBox="0 0 450 140" className="w-full h-full overflow-visible">
                        {/* Norm corridor >85% */}
                        <rect x="35" y="15" width="380" height="42" fill="#064e3b" opacity="0.3" rx="4" />
                        <line
                          x1="35"
                          y1="57"
                          x2="415"
                          y2="57"
                          stroke="#10b981"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <text x="418" y="60" fontSize="9" fill="#10b981" fontWeight="bold">
                          85%
                        </text>

                        {/* Baseline 50% */}
                        <line x1="35" y1="120" x2="415" y2="120" stroke="#334155" strokeWidth="1" />
                        <text x="25" y="123" fontSize="9" fill="#64748b" textAnchor="end">
                          50%
                        </text>

                        {/* Data line */}
                        {(() => {
                          const pts = reportData.dailyPoints.map((p, idx) => {
                            const x =
                              reportData.dailyPoints.length > 1
                                ? 45 + (idx / (reportData.dailyPoints.length - 1)) * 360
                                : 225;
                            const clamped = Math.max(50, Math.min(100, p.score));
                            const y = 120 - ((clamped - 50) / 50) * 105;
                            return { x, y, ...p };
                          });

                          const lineStr = pts.map((pt) => `${pt.x},${pt.y}`).join(' ');

                          return (
                            <>
                              {pts.length > 1 && (
                                <polyline
                                  fill="none"
                                  stroke="#3b82f6"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  points={lineStr}
                                />
                              )}
                              {pts.map((pt, i) => (
                                <g key={i}>
                                  <circle
                                    cx={pt.x}
                                    cy={pt.y}
                                    r="5"
                                    fill={pt.score >= 85 ? '#10b981' : pt.score >= 70 ? '#f59e0b' : '#ef4444'}
                                    stroke="#0f172a"
                                    strokeWidth="2"
                                  />
                                  <text
                                    x={pt.x}
                                    y={pt.y - 9}
                                    textAnchor="middle"
                                    fontSize="10"
                                    fontWeight="bold"
                                    fill="#f8fafc"
                                  >
                                    {pt.score}%
                                  </text>
                                  <text
                                    x={pt.x}
                                    y="135"
                                    textAnchor="middle"
                                    fontSize="10"
                                    fontWeight="600"
                                    fill="#94a3b8"
                                  >
                                    {pt.dayLabel}
                                  </text>
                                </g>
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                    )}
                  </div>
                </div>

                {/* Zone Anti-Rating Heatmap */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4 text-amber-400" />
                        {t.weeklyReport.chartHeatmapTitle}
                      </h4>
                      <span className="text-xs text-slate-400">
                        {isRu ? 'Ранжирование по дефектам' : 'Defect density'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">{t.weeklyReport.chartHeatmapSubtitle}</p>
                  </div>

                  <div className="space-y-2.5">
                    {reportData.zonesAntiRating.slice(0, 5).map((z, idx) => {
                      const maxCount = Math.max(1, reportData.zonesAntiRating[0]?.totalDefects || 1);
                      const barPercent = Math.max(15, Math.round((z.totalDefects / maxCount) * 100));
                      const isTopProblem = idx === 0;

                      return (
                        <div key={z.zone} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                                  isTopProblem
                                    ? 'bg-red-950 border border-red-700 text-red-400'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <span className="font-bold text-white">{z.zone}</span>
                              {isTopProblem && (
                                <span className="bg-red-950 text-red-400 border border-red-800 text-[9px] px-1.5 py-0.2 rounded font-black uppercase">
                                  Top Risk
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-slate-300">
                              <b>{z.totalDefects}</b> {isRu ? 'замечаний' : 'defects'} ({z.percentage}%)
                              {z.p1Count > 0 && (
                                <span className="ml-1.5 text-red-400 font-bold bg-red-950 px-1 py-0.2 rounded">
                                  P1: {z.p1Count}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isTopProblem
                                  ? 'bg-gradient-to-r from-red-600 to-rose-500'
                                  : idx === 1
                                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500'
                                  : 'bg-gradient-to-r from-blue-600 to-cyan-500'
                              }`}
                              style={{ width: `${barPercent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Operational Domains Breakdown */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 shadow-md">
                <h4 className="text-sm font-bold text-white mb-3">
                  {t.weeklyReport.chartDomainsTitle}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {reportData.domainBreakdown.map((domain) => (
                    <div
                      key={domain.id}
                      className="p-3 rounded-lg border border-slate-700/80 bg-slate-800/60 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 border border-slate-700">
                          {renderDomainIcon(domain.iconName)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white leading-snug">
                            {isRu ? domain.titleRu : domain.titleEn}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {domain.percentage}% {isRu ? 'от всех замечаний' : 'of plant total'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-black text-white">{domain.defectCount}</div>
                        {domain.p1Count > 0 && (
                          <div className="text-[10px] font-bold text-red-400">P1: {domain.p1Count}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Actionable Executive Matrix */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 shadow-md">
                <div className="mb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    {t.weeklyReport.matrixTitle}
                  </h4>
                  <p className="text-xs text-slate-400">{t.weeklyReport.matrixSubtitle}</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse border border-slate-700">
                    <thead>
                      <tr className="bg-slate-800 text-slate-200 uppercase tracking-wider text-[10px] font-bold">
                        <th className="p-2.5 border border-slate-700 w-[22%]">{t.weeklyReport.thSignal}</th>
                        <th className="p-2.5 border border-slate-700 w-[32%]">{t.weeklyReport.thIssue}</th>
                        <th className="p-2.5 border border-slate-700 w-[13%]">{t.weeklyReport.thRiskArea}</th>
                        <th className="p-2.5 border border-slate-700 w-[21%]">{t.weeklyReport.thAction}</th>
                        <th className="p-2.5 border border-slate-700 w-[12%]">{t.weeklyReport.thOwner}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {reportData.actionableMatrix.map((row, idx) => (
                        <tr
                          key={idx}
                          className={
                            row.tier === 'CRITICAL'
                              ? 'bg-red-950/20'
                              : row.tier === 'BOTTLENECK'
                              ? 'bg-amber-950/20'
                              : 'bg-slate-900/40'
                          }
                        >
                          <td className="p-2.5 border border-slate-700 font-bold">
                            <span
                              className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wide inline-block whitespace-nowrap shadow-sm ${
                                row.tier === 'CRITICAL'
                                  ? 'bg-red-600 text-white'
                                  : row.tier === 'BOTTLENECK'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-blue-600 text-white'
                              }`}
                            >
                              {isRu ? row.signalTitleRu : row.signalTitleEn}
                            </span>
                          </td>
                          <td className="p-2.5 border border-slate-700 text-slate-200">
                            {isRu ? row.issueRu : row.issueEn}
                          </td>
                          <td className="p-2.5 border border-slate-700 font-bold text-slate-300">
                            {isRu ? row.riskAreaRu : row.riskAreaEn}
                          </td>
                          <td className="p-2.5 border border-slate-700 text-white font-medium">
                            <span className="text-blue-400 font-bold">
                              [{isRu ? row.actionTypeRu : row.actionTypeEn}]
                            </span>{' '}
                            {isRu ? row.actionRu : row.actionEn}
                          </td>
                          <td className="p-2.5 border border-slate-700 font-medium text-slate-300">
                            <div>{row.owner}</div>
                            <div className="text-[10px] text-amber-400 font-mono font-bold mt-0.5">{row.sla}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. Strategic Executive Briefing & Narrative */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    {t.weeklyReport.briefingTitle}
                  </h4>
                  <button
                    onClick={handleCopyBriefing}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                  >
                    {copiedBriefing ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedBriefing ? t.weeklyReport.briefingCopied : t.weeklyReport.btnCopyBriefing}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-slate-800/70 border border-slate-700">
                      <div className="font-bold text-white mb-1">
                        1. {t.weeklyReport.briefingTakeaway}
                      </div>
                      <p className="leading-relaxed">
                        {isRu ? reportData.narrative.takeawayRu : reportData.narrative.takeawayEn}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-800/70 border border-slate-700">
                      <div className="font-bold text-red-400 mb-1">
                        2. {t.weeklyReport.briefingRegulatory}
                      </div>
                      <p className="leading-relaxed">
                        {isRu ? reportData.narrative.regulatoryRu : reportData.narrative.regulatoryEn}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-slate-800/70 border border-slate-700">
                      <div className="font-bold text-amber-400 mb-1">
                        3. {t.weeklyReport.briefingBottlenecks}
                      </div>
                      <p className="leading-relaxed">
                        {isRu ? reportData.narrative.bottlenecksRu : reportData.narrative.bottlenecksEn}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-800/70 border border-slate-700">
                      <div className="font-bold text-emerald-400 mb-1">
                        4. {t.weeklyReport.briefingActions}
                      </div>
                      <p className="leading-relaxed">
                        {isRu ? reportData.narrative.actionsRu : reportData.narrative.actionsEn}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. Annex Quick-Link Banner */}
                <div className="p-4 rounded-xl border border-indigo-800/60 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 flex items-center justify-between gap-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white uppercase tracking-wide">
                        {t.weeklyReport.annexTitle}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {reportData.defectRegister.totalUniqueDefects} {t.weeklyReport.annexTotalUnique.toLowerCase()} ({reportData.defectRegister.totalRawDefectInstances} {t.weeklyReport.annexTotalInstances.toLowerCase()}) • {reportData.defectRegister.recurringDefectsCount} {t.weeklyReport.annexRecurringCount.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      triggerHaptic();
                      setDashboardTab('annex');
                    }}
                    className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-md"
                  >
                    <span>{isRu ? 'Открыть реестр замечаний' : 'Open Defect Register'}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              /* Annex Register Interactive Tab */
              <div className="space-y-4 animate-fade-in">
                {/* Annex Top Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/90 shadow-md">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {t.weeklyReport.annexTotalUnique}
                    </div>
                    <div className="text-2xl font-black text-white mt-1">
                      {reportData.defectRegister.totalUniqueDefects}
                    </div>
                    <div className="text-[10.5px] text-slate-500 mt-0.5">
                      {reportData.defectRegister.totalRawDefectInstances} {t.weeklyReport.annexTotalInstances.toLowerCase()}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-amber-800/60 bg-amber-950/30 shadow-md">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      {t.weeklyReport.annexRecurringCount}
                    </div>
                    <div className="text-2xl font-black text-amber-400 mt-1">
                      {reportData.defectRegister.recurringDefectsCount}
                    </div>
                    <div className="text-[10.5px] text-amber-400/80 mt-0.5">
                      {isRu ? 'Повторяются ≥ 2 дней' : 'Observed ≥ 2 days'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-red-800/60 bg-red-950/30 shadow-md">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-red-400">
                      {isRu ? 'Критичные (Tier 1)' : 'Critical (Tier 1)'}
                    </div>
                    <div className="text-2xl font-black text-red-400 mt-1">
                      {reportData.defectRegister.criticalTierDefects.length}
                    </div>
                    <div className="text-[10.5px] text-red-400/80 mt-0.5">
                      OSHA / NFPA / P1
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/90 shadow-md">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {t.weeklyReport.annexIsolatedCount}
                    </div>
                    <div className="text-2xl font-black text-slate-300 mt-1">
                      {reportData.defectRegister.isolatedDefectsCount}
                    </div>
                    <div className="text-[10.5px] text-slate-500 mt-0.5">
                      {isRu ? 'Разовое устранение' : 'Shift operational'}
                    </div>
                  </div>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-slate-400 font-semibold mr-1">
                      {isRu ? 'Фильтр уровня:' : 'Filter Tier:'}
                    </span>
                    <button
                      onClick={() => {
                        triggerHaptic();
                        setAnnexFilter('ALL');
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        annexFilter === 'ALL'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      {isRu ? 'Все' : 'All'} ({allDefects.length})
                    </button>
                    <button
                      onClick={() => {
                        triggerHaptic();
                        setAnnexFilter('CRITICAL');
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        annexFilter === 'CRITICAL'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'bg-slate-800 text-red-400 hover:bg-slate-750'
                      }`}
                    >
                      {isRu ? 'Tier 1 • Критичные' : 'Tier 1 • Critical'} ({reportData.defectRegister.criticalTierDefects.length})
                    </button>
                    <button
                      onClick={() => {
                        triggerHaptic();
                        setAnnexFilter('BOTTLENECK');
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        annexFilter === 'BOTTLENECK'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-slate-800 text-amber-400 hover:bg-slate-750'
                      }`}
                    >
                      {isRu ? 'Tier 2 • Узкие места' : 'Tier 2 • Bottlenecks'} ({reportData.defectRegister.bottleneckTierDefects.length})
                    </button>
                    <button
                      onClick={() => {
                        triggerHaptic();
                        setAnnexFilter('CULTURE');
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        annexFilter === 'CULTURE'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-800 text-blue-400 hover:bg-slate-750'
                      }`}
                    >
                      {isRu ? 'Tier 3 • Культура СИЗ' : 'Tier 3 • PPE'} ({reportData.defectRegister.cultureTierDefects.length})
                    </button>
                    <button
                      onClick={() => {
                        triggerHaptic();
                        setAnnexFilter('RECURRING');
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        annexFilter === 'RECURRING'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-amber-300 hover:bg-slate-750'
                      }`}
                    >
                      ⚠️ {isRu ? 'Только повторные' : 'Recurring Only'} ({reportData.defectRegister.recurringDefectsCount})
                    </button>
                  </div>

                  <span className="text-slate-500 text-[11px] font-mono">
                    {t.weeklyReport.annexDedupBadge}
                  </span>
                </div>

                {/* Defect Cards Grid */}
                {displayedDefects.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-sm">
                    {t.weeklyReport.annexNoDefectsInTier}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayedDefects.map((defect) => {
                      const isRecurring = defect.recurrenceType === 'RECURRING';
                      return (
                        <div
                          key={defect.id}
                          className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 shadow-md space-y-3"
                        >
                          {/* Header row */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-slate-800 text-white px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wider uppercase border border-slate-700">
                                {isRu ? defect.zoneLabelRu : defect.zoneLabelEn}
                              </span>
                              <span className="text-sm font-bold text-white">
                                {defect.checkpointId} • {isRu ? defect.checkpointTitleRu : defect.checkpointTitleEn}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-extrabold ${
                                  defect.highestPriority === 'P1'
                                    ? 'bg-red-950 text-red-300 border border-red-800'
                                    : defect.highestPriority === 'P2'
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                    : 'bg-blue-950 text-blue-300 border border-blue-800'
                                }`}
                              >
                                {defect.highestPriority} {defect.highestPriority === 'P1' ? (isRu ? 'КРИТИЧНО' : 'CRITICAL') : ''}
                              </span>

                              {isRecurring ? (
                                <span className="bg-amber-950/80 text-amber-300 border border-amber-700/80 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                                  <span>⚠️</span>
                                  <span>
                                    {isRu
                                      ? `Повтор ${defect.occurrencesCount}х (${defect.dayLabelsRu.join(', ')})`
                                      : `${defect.occurrencesCount}x Repeat (${defect.dayLabelsEn.join(', ')})`}
                                  </span>
                                </span>
                              ) : (
                                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs font-semibold border border-slate-700">
                                  {isRu ? `Разовое (${defect.dayLabelsRu[0]})` : `Isolated (${defect.dayLabelsEn[0]})`}
                                </span>
                              )}

                              <span
                                className={`px-2 py-0.5 rounded text-xs font-bold border ${
                                  defect.latestStatus === 'Resolved'
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                    : defect.latestStatus === 'In Progress'
                                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                                    : 'bg-red-950 text-red-300 border-red-800'
                                }`}
                              >
                                {isRu
                                  ? defect.latestStatus === 'Resolved'
                                    ? 'Устранено'
                                    : defect.latestStatus === 'In Progress'
                                    ? 'В работе'
                                    : 'Открыто'
                                  : defect.latestStatus}
                              </span>
                            </div>
                          </div>

                          {/* Recurrence & Systemic Impact Verdict Banner */}
                          <div
                            className={`p-2.5 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-2 ${
                              isRecurring
                                ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                                : 'bg-slate-800/60 border-slate-700 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 font-bold">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase text-white ${
                                  isRecurring ? 'bg-amber-600' : 'bg-slate-600'
                                }`}
                              >
                                {isRecurring
                                  ? t.weeklyReport.annexRecurrenceRecurring
                                  : t.weeklyReport.annexRecurrenceIsolated}
                              </span>
                              <span>{isRu ? defect.recurrenceVerdictRu : defect.recurrenceVerdictEn}</span>
                            </div>

                            <div className="text-[11px] font-mono font-semibold text-slate-400">
                              {t.weeklyReport.annexAuditTrail}{' '}
                              {isRu ? defect.reportReferencesFormattedRu : defect.reportReferencesFormattedEn}
                            </div>
                          </div>

                          {/* Standard Violated */}
                          <div className="text-xs text-slate-400">
                            <strong className="text-slate-300">{t.weeklyReport.annexStandardLabel}</strong>{' '}
                            {isRu ? defect.standardRu : defect.standardEn}
                          </div>

                          {/* Observation chronology log */}
                          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 space-y-1.5">
                            {defect.observations.map((obs, oIdx) => {
                              const parts = obs.date.split('-');
                              const formattedDate = parts.length === 3 ? (isRu ? `${parts[2]}.${parts[1]}` : `${parts[1]}/${parts[2]}`) : obs.date;
                              const shortId = `№ WALK-${parts.length === 3 ? `${parts[1]}${parts[2]}` : ''}`;
                              const inspLastName = obs.inspectorName ? obs.inspectorName.split(' ')[0] : (isRu ? 'Инспектор' : 'Inspector');
                              return (
                                <div key={oIdx} className="flex items-start gap-1.5">
                                  <span className="font-bold text-slate-400 shrink-0">
                                    [{formattedDate} {obs.dayLabel} • {shortId} • {inspLastName}]:
                                  </span>
                                  <span className="text-slate-200 font-sans">
                                    {obs.description} {obs.notes ? <em className="text-slate-400 font-sans">({obs.notes})</em> : null}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Footer */}
                          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
                            <div>
                              <strong className="text-slate-300">{t.weeklyReport.annexOwnerLabel}</strong> {defect.assignedTo}
                            </div>
                            <div>
                              <strong className="text-slate-300">{t.weeklyReport.annexSlaLabel}</strong>{' '}
                              {defect.targetDatePreset ? defect.targetDatePreset : isRu ? 'До конца смены' : 'This shift'}
                              {defect.customTargetDate ? ` (${defect.customTargetDate})` : ''}
                            </div>
                            {defect.totalPhotosCount > 0 && (
                              <div className="font-bold text-indigo-400">
                                📷 {defect.totalPhotosCount} {t.weeklyReport.annexPhotos}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
};

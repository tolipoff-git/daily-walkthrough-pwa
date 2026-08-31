import React from 'react';
import { CheckCircle2, XCircle, MinusCircle, Clock, AlertOctagon, AlertCircle, AlertTriangle } from 'lucide-react';
import { InspectionMetrics } from '../types/inspection';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../i18n/LanguageContext';

interface MetricsBarProps {
  metrics: InspectionMetrics;
  onFilterStatus?: (status: 'ALL' | 'FAIL' | 'PENDING' | 'PASS') => void;
  activeStatusFilter?: string;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  metrics,
  onFilterStatus,
  activeStatusFilter = 'ALL',
}) => {
  const { t } = useLanguage();

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40';
    if (score >= 75) return 'text-amber-400 border-amber-500/40 bg-amber-950/40';
    return 'text-red-400 border-red-500/40 bg-red-950/40';
  };

  const passWidth = (metrics.passed / metrics.total) * 100;
  const failWidth = (metrics.failed / metrics.total) * 100;
  const naWidth = (metrics.na / metrics.total) * 100;
  const pendingWidth = (metrics.pending / metrics.total) * 100;

  return (
    <div className="bg-slate-800/90 border border-slate-700/90 rounded-2xl p-3.5 sm:p-4 mb-4 shadow-lg backdrop-blur-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side: Score & Completion Rate */}
        <div className="flex items-center gap-4 shrink-0">
          <div
            className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl border-2 ${getScoreColor(
              metrics.scorePercentage
            )} shadow-inner`}
          >
            <span className="text-2xl font-black font-mono tracking-tight leading-none">
              {metrics.scorePercentage}%
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider mt-1 text-slate-300">
              {t.metrics.scoreLabel}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-white">
                {t.metrics.progress}: {metrics.completed} / {metrics.total}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                {Math.round((metrics.completed / metrics.total) * 100)}%
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {metrics.pending === 0
                ? t.metrics.allCompleted
                : t.metrics.remainingPending.replace('{count}', String(metrics.pending))}
            </p>

            {/* P1 / P2 / P3 Pill Badges */}
            {metrics.failed > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                {metrics.criticalP1Count > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-600/90 text-white animate-pulse shadow-sm">
                    <AlertOctagon className="w-3 h-3" />
                    {t.metrics.p1Critical}: {metrics.criticalP1Count}
                  </span>
                )}
                {metrics.shiftP2Count > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-600/80 text-white shadow-sm">
                    <AlertCircle className="w-3 h-3" />
                    {t.metrics.p2Shift}: {metrics.shiftP2Count}
                  </span>
                )}
                {metrics.scheduledP3Count > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-600/80 text-white shadow-sm">
                    <AlertTriangle className="w-3 h-3" />
                    {t.metrics.p3Plan}: {metrics.scheduledP3Count}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Interactive Quick Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Passed */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              onFilterStatus?.(activeStatusFilter === 'PASS' ? 'ALL' : 'PASS');
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
              activeStatusFilter === 'PASS'
                ? 'bg-emerald-950/80 border-emerald-500 shadow-md shadow-emerald-950/40'
                : 'bg-slate-900/60 border-slate-700/60 hover:bg-slate-900 hover:border-emerald-700'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-left">
              <div className="text-base font-bold text-white leading-tight font-mono">{metrics.passed}</div>
              <div className="text-[10px] uppercase font-semibold text-emerald-400">{t.metrics.statusPass}</div>
            </div>
          </button>

          {/* Failed */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              onFilterStatus?.(activeStatusFilter === 'FAIL' ? 'ALL' : 'FAIL');
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
              activeStatusFilter === 'FAIL'
                ? 'bg-red-950/80 border-red-500 shadow-md shadow-red-950/40 ring-1 ring-red-500'
                : metrics.failed > 0
                ? 'bg-red-950/30 border-red-900/80 hover:bg-red-950/60'
                : 'bg-slate-900/60 border-slate-700/60 hover:bg-slate-900 hover:border-red-700'
            }`}
          >
            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
            <div className="text-left">
              <div className="text-base font-bold text-white leading-tight font-mono">{metrics.failed}</div>
              <div className="text-[10px] uppercase font-semibold text-red-400">{t.metrics.statusFail}</div>
            </div>
          </button>

          {/* NA */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              onFilterStatus?.('ALL');
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-slate-900/60 border-slate-700/60 hover:bg-slate-900 transition-all text-left"
          >
            <MinusCircle className="w-5 h-5 text-slate-400 shrink-0" />
            <div>
              <div className="text-base font-bold text-white leading-tight font-mono">{metrics.na}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">{t.metrics.statusNa}</div>
            </div>
          </button>

          {/* Pending */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              onFilterStatus?.(activeStatusFilter === 'PENDING' ? 'ALL' : 'PENDING');
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
              activeStatusFilter === 'PENDING'
                ? 'bg-amber-950/80 border-amber-500 shadow-md shadow-amber-950/40'
                : 'bg-slate-900/60 border-slate-700/60 hover:bg-slate-900 hover:border-amber-700'
            }`}
          >
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-left">
              <div className="text-base font-bold text-white leading-tight font-mono">{metrics.pending}</div>
              <div className="text-[10px] uppercase font-semibold text-amber-400">{t.metrics.statusPending}</div>
            </div>
          </button>
        </div>
      </div>

      {/* Segmented Real-Time Progress Bar */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-700/60">
        <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex shadow-inner">
          <div
            className="bg-emerald-500 transition-all duration-300"
            style={{ width: `${passWidth}%` }}
            title={`${t.metrics.statusPass}: ${metrics.passed}`}
          />
          <div
            className="bg-red-500 transition-all duration-300"
            style={{ width: `${failWidth}%` }}
            title={`${t.metrics.statusFail}: ${metrics.failed}`}
          />
          <div
            className="bg-slate-600 transition-all duration-300"
            style={{ width: `${naWidth}%` }}
            title={`${t.metrics.statusNa}: ${metrics.na}`}
          />
          <div
            className="bg-slate-800 transition-all duration-300"
            style={{ width: `${pendingWidth}%` }}
            title={`${t.metrics.statusPending}: ${metrics.pending}`}
          />
        </div>
      </div>
    </div>
  );
};

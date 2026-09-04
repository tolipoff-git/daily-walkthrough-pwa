import React from 'react';
import { WeeklyExecutiveReportData, ConsolidatedWeeklyDefect } from '../utils/weeklyReport';
import { useLanguage } from '../i18n/LanguageContext';
import { APP_VERSION, COMMIT_HASH } from '../version';

interface PrintWeeklyReportViewProps {
  data: WeeklyExecutiveReportData;
  isScreenPreview?: boolean;
}

export const PrintWeeklyReportView: React.FC<PrintWeeklyReportViewProps> = ({
  data,
  isScreenPreview = false,
}) => {
  const { language, t } = useLanguage();
  const isRu = language === 'ru';

  const ragColor =
    data.ragStatus === 'GREEN' ? '#15803d' : data.ragStatus === 'AMBER' ? '#b45309' : '#b91c1c';
  const ragBg =
    data.ragStatus === 'GREEN' ? '#dcfce7' : data.ragStatus === 'AMBER' ? '#fef3c7' : '#fee2e2';
  const ragLabel =
    data.ragStatus === 'GREEN'
      ? t.weeklyReport.statusNormal
      : data.ragStatus === 'AMBER'
      ? t.weeklyReport.statusAttention
      : t.weeklyReport.statusIntervention;

  // SVG Line Chart coordinates for Weekly Pulse
  const svgWidth = 280;
  const svgHeight = 75;
  const paddingX = 22;
  const paddingY = 10;
  const plotWidth = svgWidth - paddingX * 2;
  const plotHeight = svgHeight - paddingY * 2;

  const points = data.dailyPoints;
  const pointsCoords = points.map((p, idx) => {
    const x = points.length > 1 ? paddingX + (idx / (points.length - 1)) * plotWidth : svgWidth / 2;
    // Map 50% - 100% score to Y axis (clamped)
    const normalizedScore = Math.max(50, Math.min(100, p.score));
    const y = paddingY + plotHeight - ((normalizedScore - 50) / 50) * plotHeight;
    return { x, y, score: p.score, label: p.dayLabel };
  });

  const polylineStr = pointsCoords.map((pt) => `${pt.x},${pt.y}`).join(' ');
  const normY = paddingY + plotHeight - ((85 - 50) / 50) * plotHeight;

  // Horizontal Heatmap data (top 4 zones)
  const topZones = data.zonesAntiRating.slice(0, 4);
  const maxDefects = Math.max(1, ...topZones.map((z) => z.totalDefects));

  // Defect card renderer for Page 2 Annex
  const renderDefectCard = (defect: ConsolidatedWeeklyDefect) => {
    return (
      <div
        key={defect.id}
        className="border border-slate-300 rounded p-1.5 mb-1 bg-slate-50/80 break-inside-avoid text-[8px]"
      >
        {/* Card Header */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Canonical Zone Badge */}
            <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase">
              {isRu ? defect.zoneLabelRu : defect.zoneLabelEn}
            </span>
            {/* Checkpoint ID & Title */}
            <span className="font-extrabold text-[8.5px] text-slate-900">
              {defect.checkpointId} • {isRu ? defect.checkpointTitleRu : defect.checkpointTitleEn}
            </span>
          </div>

          {/* Metadata Pills */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Priority Badge */}
            <span
              className={`px-1.5 py-0.5 rounded text-[7.5px] font-black text-white ${
                defect.highestPriority === 'P1'
                  ? 'bg-red-700'
                  : defect.highestPriority === 'P2'
                  ? 'bg-amber-600'
                  : 'bg-blue-600'
              }`}
            >
              {defect.highestPriority} {defect.highestPriority === 'P1' ? (isRu ? 'КРИТИЧНО' : 'CRITICAL') : ''}
            </span>

            {/* Recurrence Frequency Pill */}
            {defect.isPersistent ? (
              <span className="bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded text-[7.5px] font-bold">
                {isRu
                  ? `⚠️ Повтор ${defect.occurrencesCount}х (${defect.dayLabelsRu.join(', ')})`
                  : `⚠️ ${defect.occurrencesCount}x Repeat (${defect.dayLabelsEn.join(', ')})`}
              </span>
            ) : (
              <span className="bg-slate-200 text-slate-700 px-1 py-0.5 rounded text-[7.5px] font-semibold">
                {isRu ? `Разовое (${defect.dayLabelsRu[0]})` : `Isolated (${defect.dayLabelsEn[0]})`}
              </span>
            )}

            {/* Status Pill */}
            <span
              className={`px-1.5 py-0.5 rounded text-[7.5px] font-bold border ${
                defect.latestStatus === 'Resolved'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : defect.latestStatus === 'In Progress'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-red-50 text-red-800 border-red-300'
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

        {/* Recurrence & Systemic Impact Classification Banner */}
        <div
          className="flex items-center justify-between text-[7.5px] mb-1 px-1.5 py-0.5 rounded border leading-tight"
          style={{
            backgroundColor: defect.recurrenceType === 'RECURRING' ? '#fef3c7' : '#f1f5f9',
            borderColor: defect.recurrenceType === 'RECURRING' ? '#f59e0b' : '#cbd5e1',
            color: defect.recurrenceType === 'RECURRING' ? '#92400e' : '#475569',
          }}
        >
          <div className="flex items-center gap-1 font-extrabold">
            <span
              className={`px-1 py-0.2 rounded text-[7px] uppercase text-white font-black ${
                defect.recurrenceType === 'RECURRING' ? 'bg-amber-600' : 'bg-slate-500'
              }`}
            >
              {defect.recurrenceType === 'RECURRING'
                ? t.weeklyReport.annexRecurrenceRecurring
                : t.weeklyReport.annexRecurrenceIsolated}
            </span>
            <span>{isRu ? defect.recurrenceVerdictRu : defect.recurrenceVerdictEn}</span>
          </div>

          {/* Audit Report Session Traceability */}
          <div className="font-mono text-[7.5px] text-slate-600 font-bold truncate max-w-[50%]">
            {t.weeklyReport.annexAuditTrail}{' '}
            {isRu ? defect.reportReferencesFormattedRu : defect.reportReferencesFormattedEn}
          </div>
        </div>

        {/* Standard Violated */}
        <div className="text-[7.5px] text-slate-500 mb-1 leading-tight">
          <strong className="text-slate-700">{t.weeklyReport.annexStandardLabel}</strong>{' '}
          {isRu ? defect.standardRu : defect.standardEn}
        </div>

        {/* Consolidated Comments Chronology */}
        <div className="bg-white border border-slate-200 rounded p-1 text-[7.5px] leading-snug font-mono text-slate-800 space-y-0.5">
          {defect.observations.map((obs, oIdx) => {
            const parts = obs.date.split('-');
            const formattedDate = parts.length === 3 ? (isRu ? `${parts[2]}.${parts[1]}` : `${parts[1]}/${parts[2]}`) : obs.date;
            const shortId = `№ WALK-${parts.length === 3 ? `${parts[1]}${parts[2]}` : ''}`;
            const inspLastName = obs.inspectorName ? obs.inspectorName.split(' ')[0] : (isRu ? 'Инспектор' : 'Inspector');
            return (
              <div key={oIdx} className="flex items-start gap-1">
                <span className="font-bold text-slate-600 shrink-0">
                  [{formattedDate} {obs.dayLabel} • {shortId} • {inspLastName}]:
                </span>
                <span className="text-slate-900 font-sans">
                  {obs.description} {obs.notes ? <em className="text-slate-500 font-sans">({obs.notes})</em> : null}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer: Assignee & Target Date */}
        <div className="flex items-center justify-between text-[7.5px] text-slate-600 mt-1 pt-0.5 border-t border-slate-200">
          <div>
            <strong>{t.weeklyReport.annexOwnerLabel}</strong> {defect.assignedTo}
          </div>
          <div>
            <strong>{t.weeklyReport.annexSlaLabel}</strong>{' '}
            {defect.targetDatePreset ? defect.targetDatePreset : isRu ? 'До конца смены' : 'This shift'}
            {defect.customTargetDate ? ` (${defect.customTargetDate})` : ''}
          </div>
          {defect.totalPhotosCount > 0 && (
            <div className="font-bold text-slate-700">
              📷 {defect.totalPhotosCount} {t.weeklyReport.annexPhotos}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`print-weekly-container ${
        isScreenPreview ? 'block my-6 space-y-6' : 'hidden print:block'
      } font-sans text-xs leading-tight mx-auto`}
      style={{
        width: '100%',
        maxWidth: isScreenPreview ? '210mm' : '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* ========================================================================= */}
      {/* PAGE 1: EXECUTIVE DASHBOARD (EXECUTIVE ONE-PAGER)                         */}
      {/* ========================================================================= */}
      <section
        className={`print-weekly-page-1 ${
          isScreenPreview ? 'bg-white shadow-2xl p-4 border border-slate-300 rounded-sm' : 'bg-white p-3.5'
        } text-slate-900`}
      >
        {/* 1. Header Bar */}
        <div className="border-b-2 border-slate-900 pb-1.5 mb-2">
        <div className="flex items-start justify-between">
          <div className="max-w-[76%]">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="bg-slate-900 text-white font-black px-1.5 py-0.5 rounded text-[9px] tracking-wider uppercase">
                {isRu ? 'АВТОМАТИЧЕСКИЙ СВОДНЫЙ ONE-PAGER' : 'AUTOMATED EXECUTIVE SYNTHESIS'}
              </span>
              <span className="text-[9px] font-mono text-slate-500">
                CF-PWA • {APP_VERSION} ({COMMIT_HASH})
              </span>
            </div>
            <h1 className="text-base font-black tracking-tight text-slate-900 uppercase mt-0.5 leading-snug">
              {isRu ? 'Еженедельный сводный отчет EHS и 5S для CEO' : 'Weekly EHS & Facility Executive Report'}
            </h1>
            <p className="text-[10px] font-bold text-slate-800 mt-0.5">
              {data.facilityName} • {isRu ? data.period.labelRu : data.period.labelEn}
            </p>
            <p className="text-[9px] font-medium text-slate-600 mt-0.5 leading-snug">
              {isRu ? data.summaryNoteRu : data.summaryNoteEn}
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs font-black font-mono text-slate-900">
              {isRu ? 'ОБХОДОВ ЗА ПЕРИОД:' : 'AUDITED SESSIONS:'} {data.auditedDaysCount}
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">
              {isRu ? 'Сформирован:' : 'Generated:'} {new Date().toLocaleDateString(isRu ? 'ru-RU' : 'en-US')}
            </div>
            <div className="text-[8px] font-mono font-bold text-slate-500 mt-0.5">
              {t.weeklyReport.pageOf} 1 / 2 • A4 ONE-PAGER
            </div>
          </div>
        </div>
      </div>

      {/* 2. Executive 5-Second Status Bar */}
      <div
        className="grid grid-cols-4 gap-2 mb-2 p-1.5 rounded-lg border border-slate-300"
        style={{ backgroundColor: '#f8fafc' }}
      >
        {/* Compliance Score Gauge */}
        <div
          className="border rounded p-1.5 text-center flex flex-col justify-center"
          style={{ backgroundColor: ragBg, borderColor: ragColor }}
        >
          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-700">
            {t.weeklyReport.complianceScore}
          </div>
          <div className="text-xl font-black my-0.5" style={{ color: ragColor }}>
            {data.overallScore}%
          </div>
          <div className="text-[8.5px] font-bold" style={{ color: ragColor }}>
            {ragLabel}
          </div>
        </div>

        {/* Trend Vector */}
        <div className="border border-slate-200 rounded p-1.5 text-center bg-white flex flex-col justify-center">
          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
            {t.weeklyReport.trendVector}
          </div>
          <div
            className={`text-lg font-black my-0.5 ${
              data.trendDirection === 'UP'
                ? 'text-emerald-700'
                : data.trendDirection === 'DOWN'
                ? 'text-red-700'
                : 'text-slate-700'
            }`}
          >
            {data.trendDirection === 'UP' ? '↗ +' : data.trendDirection === 'DOWN' ? '↘ ' : '→ '}
            {data.trendDelta}%
          </div>
          <div className="text-[8.5px] text-slate-500">
            {isRu ? 'Динамика к Пн' : 'W-o-W trajectory'}
          </div>
        </div>

        {/* Regulatory Exposure Counter */}
        <div
          className={`border rounded p-1.5 text-center flex flex-col justify-center ${
            data.criticalRegulatoryCount > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
            {t.weeklyReport.regulatoryFlag}
          </div>
          <div
            className={`text-lg font-black my-0.5 ${
              data.criticalRegulatoryCount > 0 ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            {data.criticalRegulatoryCount}
          </div>
          <div
            className={`text-[8.5px] font-bold ${
              data.criticalRegulatoryCount > 0 ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {data.criticalRegulatoryCount > 0
              ? isRu
                ? 'OSHA / NFPA риски'
                : 'OSHA / NFPA violations'
              : isRu
              ? 'Стандарты соблюдены'
              : 'Zero Citations'}
          </div>
        </div>

        {/* Total Defect & Resolution Ratio */}
        <div className="border border-slate-200 rounded p-1.5 text-center bg-white flex flex-col justify-center">
          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
            {isRu ? 'Дефекты / Устранение' : 'Defects / Resolution'}
          </div>
          <div className="text-lg font-black my-0.5 text-slate-800">
            {data.totalDefectsCount}
          </div>
          <div className="text-[8.5px] text-slate-600 font-medium">
            {isRu ? 'Решено:' : 'Done:'} <b className="text-emerald-700">{data.resolvedCount}</b> |{' '}
            {isRu ? 'Открыто:' : 'Open:'} <b className="text-red-700">{data.openCount}</b>
          </div>
        </div>
      </div>

      {/* 3. Visual Trends & Anti-Rating Grid (Side-by-Side Charts) */}
      <div className="grid grid-cols-2 gap-2.5 mb-2">
        {/* Chart 1: Pulse of the Week */}
        <div className="border border-slate-200 rounded-lg p-2 bg-slate-50">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[10px] font-bold uppercase text-slate-800">
              {t.weeklyReport.chartPulseTitle}
            </h3>
            <span className="text-[8.5px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
              {isRu ? 'Норма ≥85%' : 'Norm ≥85%'}
            </span>
          </div>

          <div className="flex items-center justify-center">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-[66px] overflow-visible">
              {/* Norm corridor background (>85%) */}
              <rect
                x={paddingX}
                y={paddingY}
                width={plotWidth}
                height={normY - paddingY}
                fill="#ecfdf5"
                opacity="0.9"
              />
              {/* Threshold line 85% */}
              <line
                x1={paddingX}
                y1={normY}
                x2={svgWidth - paddingX}
                y2={normY}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {/* Floor line 50% */}
              <line
                x1={paddingX}
                y1={svgHeight - paddingY}
                x2={svgWidth - paddingX}
                y2={svgHeight - paddingY}
                stroke="#cbd5e1"
                strokeWidth="0.8"
              />

              {/* Data line */}
              {pointsCoords.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={polylineStr}
                />
              )}

              {/* Data points */}
              {pointsCoords.map((pt, i) => (
                <g key={i}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="3.5"
                    fill={pt.score >= 85 ? '#16a34a' : pt.score >= 70 ? '#d97706' : '#dc2626'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <text
                    x={pt.x}
                    y={pt.y - 5}
                    textAnchor="middle"
                    fontSize="7.5"
                    fontWeight="bold"
                    fill="#1e293b"
                  >
                    {pt.score}%
                  </text>
                  <text
                    x={pt.x}
                    y={svgHeight - 2}
                    textAnchor="middle"
                    fontSize="7.5"
                    fontWeight="600"
                    fill="#64748b"
                  >
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Chart 2: Zone Anti-Rating Heatmap */}
        <div className="border border-slate-200 rounded-lg p-2 bg-slate-50">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[10px] font-bold uppercase text-slate-800">
              {t.weeklyReport.chartHeatmapTitle}
            </h3>
            <span className="text-[8.5px] text-slate-500">
              {isRu ? 'Топ участков по рискам' : 'Highest risk concentration'}
            </span>
          </div>

          <div className="space-y-1.5">
            {topZones.length === 0 ? (
              <p className="text-[9px] text-slate-400 italic py-2 text-center">
                {isRu ? 'Дефекты отсутствуют' : 'No recorded defects'}
              </p>
            ) : (
              topZones.map((z, idx) => {
                const barWidth = Math.max(12, Math.round((z.totalDefects / maxDefects) * 100));
                const barColor =
                  idx === 0
                    ? '#ef4444' // Highest trouble zone (e.g. Wabtec)
                    : idx === 1
                    ? '#f59e0b'
                    : '#3b82f6';
                return (
                  <div key={z.zone}>
                    <div className="flex items-center justify-between text-[9px] mb-0.5">
                      <span className="font-bold text-slate-800 truncate max-w-[130px]">
                        {idx + 1}. {z.zone}
                      </span>
                      <span className="text-slate-600 font-mono text-[8.5px]">
                        <b>{z.totalDefects}</b> ({z.percentage}%)
                        {z.p1Count > 0 && (
                          <span className="ml-1 text-red-600 font-bold">P1:{z.p1Count}</span>
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${barWidth}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 4. Operational Domains Breakdown Row */}
      <div className="mb-2 border border-slate-200 rounded-lg p-1.5 bg-slate-50">
        <div className="text-[9.5px] font-bold uppercase text-slate-700 mb-1">
          {t.weeklyReport.chartDomainsTitle}
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center text-[9px]">
          {data.domainBreakdown.map((d) => (
            <div key={d.id} className="bg-white border border-slate-200 rounded p-1">
              <div className="font-bold text-slate-800 text-[9px] truncate">
                {isRu ? d.titleRu : d.titleEn}
              </div>
              <div className="text-xs font-black text-slate-900 mt-0.5">
                {d.defectCount}{' '}
                <span className="text-[8px] font-normal text-slate-500">({d.percentage}%)</span>
              </div>
              {d.p1Count > 0 && (
                <span className="inline-block bg-red-100 text-red-700 text-[7.5px] font-bold px-1 rounded border border-red-300">
                  {d.p1Count} P1 Critical
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 5. Actionable Executive Matrix (The 3-Row Decision Table) */}
      <div className="mb-2">
        <h3 className="text-[10px] font-black uppercase tracking-wide text-slate-900 mb-1 border-b border-slate-300 pb-0.5">
          {t.weeklyReport.matrixTitle}
        </h3>
        <table className="w-full text-[9px] text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-200 text-slate-900 font-bold">
              <th className="border border-slate-300 p-1 w-[22%]">{t.weeklyReport.thSignal}</th>
              <th className="border border-slate-300 p-1 w-[34%]">{t.weeklyReport.thIssue}</th>
              <th className="border border-slate-300 p-1 w-[12%]">{t.weeklyReport.thRiskArea}</th>
              <th className="border border-slate-300 p-1 w-[22%]">{t.weeklyReport.thAction}</th>
              <th className="border border-slate-300 p-1 w-[10%]">{t.weeklyReport.thOwner}</th>
            </tr>
          </thead>
          <tbody>
            {data.actionableMatrix.map((row, idx) => {
              const bgRow =
                row.tier === 'CRITICAL'
                  ? '#fef2f2'
                  : row.tier === 'BOTTLENECK'
                  ? '#fffbeb'
                  : '#f8fafc';
              const badgeBg =
                row.tier === 'CRITICAL'
                  ? '#dc2626'
                  : row.tier === 'BOTTLENECK'
                  ? '#d97706'
                  : '#2563eb';
              return (
                <tr key={idx} style={{ backgroundColor: bgRow }}>
                  <td className="border border-slate-300 p-1 font-bold">
                    <span
                      style={{
                        backgroundColor: badgeBg,
                        color: '#ffffff',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact',
                      }}
                      className="inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wide uppercase text-white shadow-xs whitespace-nowrap"
                    >
                      {isRu ? row.signalTitleRu : row.signalTitleEn}
                    </span>
                  </td>
                  <td className="border border-slate-300 p-1 text-slate-800 leading-snug">
                    {isRu ? row.issueRu : row.issueEn}
                  </td>
                  <td className="border border-slate-300 p-1 font-bold text-slate-700">
                    {isRu ? row.riskAreaRu : row.riskAreaEn}
                  </td>
                  <td className="border border-slate-300 p-1 text-slate-900 leading-snug">
                    <span className="font-semibold text-slate-800">
                      [{isRu ? row.actionTypeRu : row.actionTypeEn}]
                    </span>{' '}
                    {isRu ? row.actionRu : row.actionEn}
                  </td>
                  <td className="border border-slate-300 p-1 font-medium text-slate-600">
                    <div>{row.owner}</div>
                    <div className="text-[7.5px] font-mono text-slate-500 font-bold">{row.sla}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 6. Strategic Executive Narrative Briefing */}
      <div className="mb-2 border border-slate-300 rounded p-1.5 bg-slate-50 text-[9px]">
        <div className="font-bold uppercase tracking-wider text-slate-800 text-[9.5px] mb-1">
          {t.weeklyReport.briefingTitle}
        </div>
        <div className="grid grid-cols-2 gap-2 text-slate-800">
          <div>
            <p className="mb-1 leading-snug">
              <strong className="text-slate-900">• {t.weeklyReport.briefingTakeaway}:</strong>{' '}
              {isRu ? data.narrative.takeawayRu : data.narrative.takeawayEn}
            </p>
            <p className="leading-snug">
              <strong className="text-slate-900">• {t.weeklyReport.briefingRegulatory}:</strong>{' '}
              {isRu ? data.narrative.regulatoryRu : data.narrative.regulatoryEn}
            </p>
          </div>
          <div>
            <p className="mb-1 leading-snug">
              <strong className="text-slate-900">• {t.weeklyReport.briefingBottlenecks}:</strong>{' '}
              {isRu ? data.narrative.bottlenecksRu : data.narrative.bottlenecksEn}
            </p>
            <p className="leading-snug">
              <strong className="text-slate-900">• {t.weeklyReport.briefingActions}:</strong>{' '}
              {isRu ? data.narrative.actionsRu : data.narrative.actionsEn}
            </p>
          </div>
        </div>
      </div>

      {/* 7. Executive Sign-Off Block */}
      <div className="border-t-2 border-slate-900 pt-1.5 flex items-center justify-between text-[9px]">
        <div>
          <span className="font-bold text-slate-800">{t.weeklyReport.signOffExecutive}</span>
          <span className="ml-2 font-mono">____________________________</span>
          <span className="ml-2 text-[8px] text-slate-500 italic">
            ({isRu ? 'Приложение: Реестр замечаний на стр. 2' : 'Annex: Defect Register on Page 2'})
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <span className="font-bold text-slate-800">{t.weeklyReport.signOffSignature}</span>
            <span className="ml-1 font-mono">___________</span>
          </div>
          <div>
            <span className="font-bold text-slate-800">{t.weeklyReport.signOffDate}</span>
            <span className="ml-1 font-mono">___________</span>
          </div>
        </div>
      </div>
      </section>

      {/* Screen Preview Page Break Separator */}
      {isScreenPreview && (
        <div className="flex items-center justify-center gap-3 text-slate-400 text-xs my-4 print:hidden">
          <div className="h-px bg-slate-700 flex-1 max-w-xs" />
          <span className="font-mono uppercase tracking-wider text-[10px] font-bold text-slate-300">
            --- {t.weeklyReport.pageOf} 2: {t.weeklyReport.annexPageTitle} ---
          </span>
          <div className="h-px bg-slate-700 flex-1 max-w-xs" />
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 2: ANNEX DEFECT REGISTER (ПРИЛОЖЕНИЕ: РЕЕСТР НАРУШЕНИЙ)             */}
      {/* ========================================================================= */}
      <section
        className={`print-weekly-page-2 ${
          isScreenPreview ? 'bg-white shadow-2xl p-4 border border-slate-300 rounded-sm' : 'bg-white p-3.5'
        } text-slate-900`}
      >
        <div>
          {/* Annex Header Bar */}
          <div className="border-b-2 border-slate-900 pb-1.5 mb-2">
            <div className="flex items-start justify-between">
              <div className="max-w-[76%]">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="bg-slate-900 text-white font-black px-1.5 py-0.5 rounded text-[8.5px] tracking-wider uppercase">
                    {t.weeklyReport.annexPageTitle}
                  </span>
                  <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.5 rounded text-[8px]">
                    {t.weeklyReport.annexDedupBadge}
                  </span>
                </div>
                <h2 className="text-sm font-black tracking-tight text-slate-900 uppercase mt-0.5 leading-snug">
                  {t.weeklyReport.annexTitle}
                </h2>
                <p className="text-[9.5px] font-bold text-slate-800 mt-0.5">
                  {data.facilityName} • {isRu ? data.period.labelRu : data.period.labelEn}
                </p>
                <p className="text-[8.5px] font-medium text-slate-600 mt-0.5 leading-snug">
                  {t.weeklyReport.annexSubtitle}
                </p>
              </div>

              <div className="text-right shrink-0">
                <div className="text-[8px] font-mono font-bold text-slate-500 mt-0.5">
                  {t.weeklyReport.pageOf} 2 / 2 • EXECUTIVE ANNEX
                </div>
                <div className="text-[8px] font-mono text-slate-700 mt-0.5">
                  <b>{data.defectRegister.totalUniqueDefects}</b> {t.weeklyReport.annexTotalUnique.toLowerCase()} ({data.defectRegister.totalRawDefectInstances} {t.weeklyReport.annexTotalInstances.toLowerCase()})
                </div>
                <div className="text-[8px] font-bold text-amber-700 mt-0.5">
                  {data.defectRegister.recurringDefectsCount} {t.weeklyReport.annexRecurringCount.toLowerCase()} • {data.defectRegister.isolatedDefectsCount} {t.weeklyReport.annexIsolatedCount.toLowerCase()}
                </div>
              </div>
            </div>
          </div>

          {/* 3-Tier Grouping Sections */}
          <div className="space-y-2">
            {/* TIER 1: CRITICAL / REGULATORY */}
            <div>
              <div className="bg-red-700 text-white font-black px-2 py-0.5 rounded text-[8.5px] uppercase tracking-wide flex items-center justify-between mb-1">
                <span>{t.weeklyReport.annexTierCritical}</span>
                <span className="font-mono text-[8px]">{data.defectRegister.criticalTierDefects.length}</span>
              </div>
              {data.defectRegister.criticalTierDefects.length === 0 ? (
                <div className="text-[8px] text-slate-400 italic p-1.5 border border-dashed border-slate-200 rounded text-center bg-slate-50">
                  {t.weeklyReport.annexNoDefectsInTier}
                </div>
              ) : (
                data.defectRegister.criticalTierDefects.map((defect) => renderDefectCard(defect))
              )}
            </div>

            {/* TIER 2: BOTTLENECKS / 5S / WAREHOUSE */}
            <div>
              <div className="bg-amber-600 text-white font-black px-2 py-0.5 rounded text-[8.5px] uppercase tracking-wide flex items-center justify-between mb-1">
                <span>{t.weeklyReport.annexTierBottlenecks}</span>
                <span className="font-mono text-[8px]">{data.defectRegister.bottleneckTierDefects.length}</span>
              </div>
              {data.defectRegister.bottleneckTierDefects.length === 0 ? (
                <div className="text-[8px] text-slate-400 italic p-1.5 border border-dashed border-slate-200 rounded text-center bg-slate-50">
                  {t.weeklyReport.annexNoDefectsInTier}
                </div>
              ) : (
                data.defectRegister.bottleneckTierDefects.map((defect) => renderDefectCard(defect))
              )}
            </div>

            {/* TIER 3: SAFETY CULTURE / PPE */}
            <div>
              <div className="bg-blue-600 text-white font-black px-2 py-0.5 rounded text-[8.5px] uppercase tracking-wide flex items-center justify-between mb-1">
                <span>{t.weeklyReport.annexTierCulture}</span>
                <span className="font-mono text-[8px]">{data.defectRegister.cultureTierDefects.length}</span>
              </div>
              {data.defectRegister.cultureTierDefects.length === 0 ? (
                <div className="text-[8px] text-slate-400 italic p-1.5 border border-dashed border-slate-200 rounded text-center bg-slate-50">
                  {t.weeklyReport.annexNoDefectsInTier}
                </div>
              ) : (
                data.defectRegister.cultureTierDefects.map((defect) => renderDefectCard(defect))
              )}
            </div>
          </div>
        </div>

        {/* Annex Footer */}
        <div className="border-t border-slate-300 pt-1 mt-2 flex items-center justify-between text-[8px] text-slate-500">
          <div>
            {t.weeklyReport.annexConfidentialNotice}
          </div>
          <div className="font-mono font-bold text-slate-700">
            {t.weeklyReport.pageOf} 2 / 2
          </div>
        </div>
      </section>
    </div>
  );
};

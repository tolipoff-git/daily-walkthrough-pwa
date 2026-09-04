import React from 'react';
import { WeeklyExecutiveReportData } from '../utils/weeklyReport';
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
  const svgHeight = 90;
  const paddingX = 25;
  const paddingY = 15;
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

  return (
    <div
      className={`print-weekly-container ${
        isScreenPreview ? 'block shadow-2xl my-6 border border-slate-300' : 'hidden print:block'
      } bg-white text-slate-900 p-5 font-sans text-xs leading-tight mx-auto`}
      style={{
        width: '100%',
        maxWidth: '210mm',
        minHeight: isScreenPreview ? 'auto' : '296mm',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Header Bar */}
      <div className="border-b-2 border-slate-900 pb-2 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-slate-900 text-white font-black px-1.5 py-0.5 rounded text-[10px] tracking-wider uppercase">
                EXECUTIVE ONE-PAGER
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                CF-PWA • {APP_VERSION} ({COMMIT_HASH})
              </span>
            </div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase mt-0.5">
              {isRu ? 'Еженедельный отчет EHS и 5S для CEO' : 'Weekly EHS & Facility Executive Report'}
            </h1>
            <p className="text-[11px] font-medium text-slate-600">
              {data.facilityName} • {isRu ? data.period.labelRu : data.period.labelEn}
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs font-bold font-mono text-slate-900">
              {isRu ? 'ОБХОДОВ ЗА НЕДЕЛЮ:' : 'SESSIONS AUDITED:'} {data.auditedDaysCount}
            </div>
            <div className="text-[10px] text-slate-500">
              {isRu ? 'Сформирован:' : 'Generated:'} {new Date().toLocaleDateString(isRu ? 'ru-RU' : 'en-US')}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Executive 5-Second Status Bar */}
      <div
        className="grid grid-cols-4 gap-2 mb-3 p-2.5 rounded-lg border border-slate-300"
        style={{ backgroundColor: '#f8fafc' }}
      >
        {/* Compliance Score Gauge */}
        <div
          className="border rounded p-2 text-center flex flex-col justify-center"
          style={{ backgroundColor: ragBg, borderColor: ragColor }}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
            {t.weeklyReport.complianceScore}
          </div>
          <div className="text-2xl font-black my-0.5" style={{ color: ragColor }}>
            {data.overallScore}%
          </div>
          <div className="text-[9px] font-bold" style={{ color: ragColor }}>
            {ragLabel}
          </div>
        </div>

        {/* Trend Vector */}
        <div className="border border-slate-200 rounded p-2 text-center bg-white flex flex-col justify-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {t.weeklyReport.trendVector}
          </div>
          <div
            className={`text-xl font-black my-0.5 ${
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
          <div className="text-[9px] text-slate-500">
            {isRu ? 'Динамика к Пн' : 'W-o-W trajectory'}
          </div>
        </div>

        {/* Regulatory Exposure Counter */}
        <div
          className={`border rounded p-2 text-center flex flex-col justify-center ${
            data.criticalRegulatoryCount > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {t.weeklyReport.regulatoryFlag}
          </div>
          <div
            className={`text-xl font-black my-0.5 ${
              data.criticalRegulatoryCount > 0 ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            {data.criticalRegulatoryCount}
          </div>
          <div
            className={`text-[9px] font-bold ${
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
        <div className="border border-slate-200 rounded p-2 text-center bg-white flex flex-col justify-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {isRu ? 'Дефекты / Устранение' : 'Defects / Resolution'}
          </div>
          <div className="text-xl font-black my-0.5 text-slate-800">
            {data.totalDefectsCount}
          </div>
          <div className="text-[9px] text-slate-600 font-medium">
            {isRu ? 'Решено:' : 'Done:'} <b className="text-emerald-700">{data.resolvedCount}</b> |{' '}
            {isRu ? 'Открыто:' : 'Open:'} <b className="text-red-700">{data.openCount}</b>
          </div>
        </div>
      </div>

      {/* 3. Visual Trends & Anti-Rating Grid (Side-by-Side Charts) */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Chart 1: Pulse of the Week */}
        <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold uppercase text-slate-800">
              {t.weeklyReport.chartPulseTitle}
            </h3>
            <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
              {isRu ? 'Норма ≥85%' : 'Norm ≥85%'}
            </span>
          </div>

          <div className="flex items-center justify-center">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-20 overflow-visible">
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
                    y={pt.y - 6}
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="bold"
                    fill="#1e293b"
                  >
                    {pt.score}%
                  </text>
                  <text
                    x={pt.x}
                    y={svgHeight - 3}
                    textAnchor="middle"
                    fontSize="8"
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
        <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-bold uppercase text-slate-800">
              {t.weeklyReport.chartHeatmapTitle}
            </h3>
            <span className="text-[9px] text-slate-500">
              {isRu ? 'Топ участков по рискам' : 'Highest risk concentration'}
            </span>
          </div>

          <div className="space-y-1.5">
            {topZones.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic py-3 text-center">
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
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <span className="font-bold text-slate-800 truncate max-w-[130px]">
                        {idx + 1}. {z.zone}
                      </span>
                      <span className="text-slate-600 font-mono">
                        <b>{z.totalDefects}</b> ({z.percentage}%)
                        {z.p1Count > 0 && (
                          <span className="ml-1 text-red-600 font-bold">P1:{z.p1Count}</span>
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
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
      <div className="mb-3 border border-slate-200 rounded-lg p-2 bg-slate-50">
        <div className="text-[10px] font-bold uppercase text-slate-700 mb-1.5">
          {t.weeklyReport.chartDomainsTitle}
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
          {data.domainBreakdown.map((d) => (
            <div key={d.id} className="bg-white border border-slate-200 rounded p-1.5">
              <div className="font-bold text-slate-800 text-[10px] truncate">
                {isRu ? d.titleRu : d.titleEn}
              </div>
              <div className="text-sm font-black text-slate-900 mt-0.5">
                {d.defectCount}{' '}
                <span className="text-[9px] font-normal text-slate-500">({d.percentage}%)</span>
              </div>
              {d.p1Count > 0 && (
                <span className="inline-block bg-red-100 text-red-700 text-[8px] font-bold px-1 rounded border border-red-300">
                  {d.p1Count} P1 Critical
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 5. Actionable Executive Matrix (The 3-Row Decision Table) */}
      <div className="mb-3">
        <h3 className="text-[11px] font-black uppercase tracking-wide text-slate-900 mb-1 border-b border-slate-300 pb-0.5">
          {t.weeklyReport.matrixTitle}
        </h3>
        <table className="w-full text-[10px] text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-200 text-slate-900 font-bold">
              <th className="border border-slate-300 p-1 w-[16%]">{t.weeklyReport.thSignal}</th>
              <th className="border border-slate-300 p-1 w-[38%]">{t.weeklyReport.thIssue}</th>
              <th className="border border-slate-300 p-1 w-[14%]">{t.weeklyReport.thRiskArea}</th>
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
              const badgeClass =
                row.tier === 'CRITICAL'
                  ? 'bg-red-700 text-white'
                  : row.tier === 'BOTTLENECK'
                  ? 'bg-amber-600 text-white'
                  : 'bg-blue-700 text-white';
              return (
                <tr key={idx} style={{ backgroundColor: bgRow }}>
                  <td className="border border-slate-300 p-1 font-bold">
                    <span className={`px-1 py-0.5 rounded text-[8px] font-black tracking-wider ${badgeClass}`}>
                      {isRu ? row.signalTitleRu : row.signalTitleEn}
                    </span>
                  </td>
                  <td className="border border-slate-300 p-1 text-slate-800">
                    {isRu ? row.issueRu : row.issueEn}
                  </td>
                  <td className="border border-slate-300 p-1 font-bold text-slate-700">
                    {isRu ? row.riskAreaRu : row.riskAreaEn}
                  </td>
                  <td className="border border-slate-300 p-1 text-slate-900">
                    <span className="font-semibold text-slate-800">
                      [{isRu ? row.actionTypeRu : row.actionTypeEn}]
                    </span>{' '}
                    {isRu ? row.actionRu : row.actionEn}
                  </td>
                  <td className="border border-slate-300 p-1 font-medium text-slate-600">
                    <div>{row.owner}</div>
                    <div className="text-[8px] font-mono text-slate-500 font-bold">{row.sla}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 6. Strategic Executive Narrative Briefing */}
      <div className="mb-3 border border-slate-300 rounded p-2 bg-slate-50 text-[10px]">
        <div className="font-bold uppercase tracking-wider text-slate-800 text-[10px] mb-1">
          {t.weeklyReport.briefingTitle}
        </div>
        <div className="grid grid-cols-2 gap-2 text-slate-800">
          <div>
            <p className="mb-1">
              <strong className="text-slate-900">• {t.weeklyReport.briefingTakeaway}:</strong>{' '}
              {isRu ? data.narrative.takeawayRu : data.narrative.takeawayEn}
            </p>
            <p>
              <strong className="text-slate-900">• {t.weeklyReport.briefingRegulatory}:</strong>{' '}
              {isRu ? data.narrative.regulatoryRu : data.narrative.regulatoryEn}
            </p>
          </div>
          <div>
            <p className="mb-1">
              <strong className="text-slate-900">• {t.weeklyReport.briefingBottlenecks}:</strong>{' '}
              {isRu ? data.narrative.bottlenecksRu : data.narrative.bottlenecksEn}
            </p>
            <p>
              <strong className="text-slate-900">• {t.weeklyReport.briefingActions}:</strong>{' '}
              {isRu ? data.narrative.actionsRu : data.narrative.actionsEn}
            </p>
          </div>
        </div>
      </div>

      {/* 7. Executive Sign-Off Block */}
      <div className="border-t-2 border-slate-900 pt-2 flex items-center justify-between text-[10px]">
        <div>
          <span className="font-bold text-slate-800">{t.weeklyReport.signOffExecutive}</span>
          <span className="ml-2 font-mono">___________________________________</span>
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
    </div>
  );
};

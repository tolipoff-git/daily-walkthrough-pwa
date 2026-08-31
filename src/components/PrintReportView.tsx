import React from 'react';
import { InspectionSession } from '../types/inspection';
import { calculateMetrics } from '../utils/metrics';
import { useLanguage } from '../i18n/LanguageContext';

interface PrintReportViewProps {
  session: InspectionSession;
}

export const PrintReportView: React.FC<PrintReportViewProps> = ({ session }) => {
  const { language, t, getItemTitle, getItemStandard, getPriorityInfo, getAssigneeLabel, getTargetDateLabel } = useLanguage();
  const metrics = calculateMetrics(session.items);
  const defects = session.items.filter((item) => item.status === 'FAIL');
  const isRu = language === 'ru';

  return (
    <div className="print-report-container hidden print:block bg-white text-black p-8 font-sans leading-normal">
      {/* Document Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
              {t.printView.documentTitle}
            </h1>
            <p className="text-sm font-semibold text-slate-600">
              {t.printView.documentSubtitle}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold font-mono text-slate-900">
              {t.printView.reportId} {session.id}
            </div>
            <div className="text-xs text-slate-600">
              {t.printView.generatedDate} {new Date().toLocaleDateString(isRu ? 'ru-RU' : 'en-US')}
            </div>
          </div>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-2 gap-4 text-xs mb-6 border border-slate-300 p-4 rounded-lg bg-slate-50">
        <div>
          <p className="mb-1"><strong className="text-slate-800">{t.printView.facilityLabel}</strong> {session.facilityName}</p>
          <p className="mb-1"><strong className="text-slate-800">{t.printView.areaLabel}</strong> {session.facilityArea}</p>
          <p><strong className="text-slate-800">{t.printView.shiftLabel}</strong> {session.shift}</p>
        </div>
        <div>
          <p className="mb-1"><strong className="text-slate-800">{t.printView.dateLabel}</strong> {session.date}</p>
          <p className="mb-1"><strong className="text-slate-800">{t.printView.timeLabel}</strong> {session.startTime} — {session.endTime || t.printView.completedTime}</p>
          <p><strong className="text-slate-800">{t.printView.inspectorLabel}</strong> {session.inspectorName} ({session.inspectorRole})</p>
        </div>
      </div>

      {/* Metrics & KPIs Table */}
      <div className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900 mb-2 border-b border-slate-300 pb-1">
          {t.printView.kpiSectionTitle}
        </h2>
        <table className="w-full text-xs text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-200 text-slate-900 font-bold">
              <th className="border border-slate-300 p-2">{t.printView.thTotal}</th>
              <th className="border border-slate-300 p-2 text-emerald-800">{t.printView.thPassed}</th>
              <th className="border border-slate-300 p-2 text-red-800">{t.printView.thFailed}</th>
              <th className="border border-slate-300 p-2">{t.printView.thNa}</th>
              <th className="border border-slate-300 p-2">{t.printView.thScore}</th>
              <th className="border border-slate-300 p-2">{t.printView.thPriorities}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-300 p-2 font-bold">{metrics.total}</td>
              <td className="border border-slate-300 p-2 text-emerald-700 font-bold">{metrics.passed}</td>
              <td className="border border-slate-300 p-2 text-red-700 font-bold">{metrics.failed}</td>
              <td className="border border-slate-300 p-2">{metrics.na}</td>
              <td className="border border-slate-300 p-2 font-black text-sm">{metrics.scorePercentage}%</td>
              <td className="border border-slate-300 p-2 font-mono">
                P1: {metrics.criticalP1Count} | P2: {metrics.shiftP2Count} | P3: {metrics.scheduledP3Count}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Corrective Action Log (CAPA) */}
      <div className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900 mb-2 border-b border-slate-300 pb-1">
          {t.printView.capaSectionTitle}
        </h2>
        {defects.length === 0 ? (
          <p className="text-xs text-emerald-700 font-semibold p-3 border border-emerald-300 rounded bg-emerald-50">
            {t.printView.noDefectsFound}
          </p>
        ) : (
          <div className="space-y-4">
            {defects.map((d, index) => {
              const details = d.defectDetails;
              const itemTitle = getItemTitle(d);
              const priorityInfo = getPriorityInfo(details?.priority || 'P2');
              const assigneeLabel = details?.assignedTo ? getAssigneeLabel(details.assignedTo) : (isRu ? 'Не назначен' : 'Unassigned');
              const targetDateLabel = details?.targetDate ? getTargetDateLabel(details.targetDate) : (isRu ? 'Сегодня' : 'Today');

              return (
                <div key={d.id} className="border border-slate-300 rounded-lg p-3 text-xs bg-slate-50 break-inside-avoid">
                  <div className="flex items-center justify-between mb-1.5 font-bold">
                    <span className="text-slate-900 font-mono">
                      {t.printView.findingNumber}{index + 1} | {t.printView.itemWord} {d.id}: {itemTitle}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                        details?.priority === 'P1'
                          ? 'bg-red-700'
                          : details?.priority === 'P2'
                          ? 'bg-amber-600'
                          : 'bg-blue-600'
                      }`}
                    >
                      {t.printView.priorityWord} {priorityInfo.short}
                    </span>
                  </div>

                  <p className="text-slate-800 font-medium mb-2">
                    <strong>{t.printView.descWord}</strong> {details?.description || (isRu ? 'Нет описания' : 'No description')}
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 mb-2">
                    <div><strong>{t.printView.locWord}</strong> {details?.location || (isRu ? 'Не указана' : 'Not specified')}</div>
                    <div><strong>{t.printView.respWord}</strong> {assigneeLabel}</div>
                    <div><strong>{t.printView.dueWord}</strong> {targetDateLabel}{details?.targetDate === 'Custom' && details.customTargetDate ? ` (${details.customTargetDate})` : ''}</div>
                  </div>

                  {details?.notes && (
                    <p className="text-[11px] text-slate-600 italic mb-2">
                      <strong>{t.printView.notesWord}</strong> {details.notes}
                    </p>
                  )}

                  {/* Defect Photos Thumbnails in Print */}
                  {details?.photos && details.photos.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-500">{t.printView.photoEvidenceWord}</span>
                      <div className="flex items-center gap-2">
                        {details.photos.map((photo, pIdx) => (
                          <div key={photo.id} className="border border-slate-400 rounded overflow-hidden">
                            <img
                              src={photo.url}
                              alt={`Defect ${pIdx + 1}`}
                              className="h-16 w-24 object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full 17 Checklist Table */}
      <div className="mb-6 break-before-auto">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900 mb-2 border-b border-slate-300 pb-1">
          {t.printView.auditSectionTitle}
        </h2>
        <table className="w-full text-[10px] border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-200 text-slate-900 font-bold">
              <th className="border border-slate-300 p-1.5 text-center w-10">{t.printView.thId}</th>
              <th className="border border-slate-300 p-1.5 w-24 text-center">{t.printView.thStatus}</th>
              <th className="border border-slate-300 p-1.5">{t.printView.thItemName}</th>
              <th className="border border-slate-300 p-1.5">{t.printView.thStandard}</th>
              <th className="border border-slate-300 p-1.5 w-44">{t.printView.thNotesLoc}</th>
            </tr>
          </thead>
          <tbody>
            {session.items.map((item) => (
              <tr key={item.id} className="border-b border-slate-200">
                <td className="border border-slate-300 p-1.5 text-center font-mono font-bold">{item.id}</td>
                <td className="border border-slate-300 p-1.5 text-center font-bold">
                  {item.status === 'PASS' && <span className="text-emerald-700 font-bold">[ OK ]</span>}
                  {item.status === 'FAIL' && <span className="text-red-700 font-bold">[ FAIL ]</span>}
                  {item.status === 'NA' && <span className="text-slate-500">[ N/A ]</span>}
                  {item.status === 'PENDING' && <span className="text-amber-600">[ PEND ]</span>}
                </td>
                <td className="border border-slate-300 p-1.5 font-semibold text-slate-900">{getItemTitle(item)}</td>
                <td className="border border-slate-300 p-1.5 text-slate-700">{getItemStandard(item)}</td>
                <td className="border border-slate-300 p-1.5 text-slate-600">
                  {item.status === 'FAIL'
                    ? `${item.defectDetails?.location ? item.defectDetails.location + ': ' : ''}${item.defectDetails?.description || ''}`
                    : item.itemNotes || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* General 5S Notes */}
      {session.generalNotes && (
        <div className="mb-6 p-3 border border-slate-300 rounded-lg bg-slate-50 text-xs break-inside-avoid">
          <strong className="block text-slate-900 mb-1">{t.printView.generalObservationsTitle}</strong>
          <p className="text-slate-700 leading-relaxed">{session.generalNotes}</p>
        </div>
      )}

      {/* Signatures and Sign-off */}
      <div className="mt-8 pt-4 border-t-2 border-slate-400 grid grid-cols-2 gap-8 text-xs break-inside-avoid">
        <div>
          <p className="font-bold text-slate-900 mb-1">{t.printView.inspectorSignHeading}</p>
          <div className="mt-6 border-b border-slate-900 pb-1 flex justify-between items-end">
            <span className="font-medium text-slate-800">{session.inspectorName}</span>
            <span className="text-[10px] text-slate-500 font-mono">{t.printView.signatureLine}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {t.printView.datePrefix} {new Date(session.signatures.timestamp).toLocaleString(isRu ? 'ru-RU' : 'en-US')}
          </p>
        </div>

        <div>
          <p className="font-bold text-slate-900 mb-1">{t.printView.approverSignHeading}</p>
          <div className="mt-6 border-b border-slate-900 pb-1 flex justify-between items-end">
            <span className="font-medium text-slate-800">
              {session.signatures.reviewedBy || '__________________________'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">{t.printView.signatureLine}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {t.printView.datePrefix} {session.signatures.reviewTimestamp ? new Date(session.signatures.reviewTimestamp).toLocaleString(isRu ? 'ru-RU' : 'en-US') : '________________'}
          </p>
        </div>
      </div>
    </div>
  );
};

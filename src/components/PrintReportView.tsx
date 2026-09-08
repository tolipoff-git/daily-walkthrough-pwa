import React from 'react';
import { Camera, ZoomIn } from 'lucide-react';
import { DefectPhoto, InspectionSession } from '../types/inspection';
import { calculateMetrics } from '../utils/metrics';
import { useLanguage } from '../i18n/LanguageContext';
import { formatShift, formatArea, formatRole } from '../utils/formatters';
import { APP_VERSION, COMMIT_HASH } from '../version';
import { getActiveSyncRoom } from '../utils/syncApi';

interface PrintReportViewProps {
  session: InspectionSession;
  isScreenPreview?: boolean;
  onPreviewPhoto?: (photo: DefectPhoto, location?: string, itemTitle?: string) => void;
}

export const PrintReportView: React.FC<PrintReportViewProps> = ({
  session,
  isScreenPreview = false,
  onPreviewPhoto,
}) => {
  const { language, t, getItemTitle, getItemStandard, getPriorityInfo, getAssigneeLabel, getTargetDateLabel } = useLanguage();
  const metrics = calculateMetrics(session.items);
  const defects = session.items.filter((item) => item.status === 'FAIL');
  const getValidPhotos = (photos?: DefectPhoto[]): DefectPhoto[] =>
    (photos || []).filter((p) => Boolean(p && typeof p.url === 'string' && p.url.trim().length > 0));
  const defectsWithPhotos = defects.filter(
    (d) => getValidPhotos(d.defectDetails?.photos).length > 0
  );
  const totalPhotosCount = defectsWithPhotos.reduce(
    (acc, d) => acc + getValidPhotos(d.defectDetails?.photos).length,
    0
  );
  const isRu = language === 'ru';

  // Construct 4K Cloud Evidence URLs
  const origin =
    typeof window !== 'undefined' && window.location.origin.includes('http')
      ? window.location.origin
      : 'https://daily-walkthrough-pwa.tolipoff.workers.dev';
  const cleanRoom = (getActiveSyncRoom() || session.facilityArea || 'FSE-MAIN').trim().toUpperCase();
  const getPhotoCloudUrl = (photoId: string) =>
    `${origin}/photo/${encodeURIComponent(cleanRoom)}/${encodeURIComponent(photoId)}`;

  return (
    <div className={`print-report-container ${isScreenPreview ? 'block' : 'hidden print:block'} bg-white text-black p-6 font-sans leading-normal`}>
      {/* Document Header */}
      <div className="border-b-2 border-slate-900 pb-3 mb-5 break-inside-avoid">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
              {t.printView.documentTitle}
            </h1>
            <p className="text-xs font-semibold text-slate-600">
              {t.printView.documentSubtitle}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold font-mono text-slate-900">
              {t.printView.reportId} {session.id}
            </div>
            <div className="text-[11px] text-slate-600">
              {t.printView.generatedDate} {new Date().toLocaleDateString(isRu ? 'ru-RU' : 'en-US')}
            </div>
          </div>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs mb-5 border border-slate-300 p-3 rounded-lg bg-slate-50 break-inside-avoid">
        <div>
          <p className="mb-1"><strong className="text-slate-800">{t.printView.facilityLabel}</strong> {session.facilityName}</p>
          <p className="mb-1"><strong className="text-slate-800">{t.printView.areaLabel}</strong> {formatArea(session.facilityArea, language)}</p>
          <p><strong className="text-slate-800">{t.printView.shiftLabel}</strong> {formatShift(session.shift, language)}</p>
        </div>
        <div>
          <p className="mb-1"><strong className="text-slate-800">{t.printView.dateLabel}</strong> {session.date}</p>
          <p className="mb-1"><strong className="text-slate-800">{t.printView.timeLabel}</strong> {session.startTime} — {session.endTime || t.printView.completedTime}</p>
          <p><strong className="text-slate-800">{t.printView.inspectorLabel}</strong> {session.inspectorName} ({formatRole(session.inspectorRole, language)})</p>
        </div>
      </div>

      {/* Metrics & KPIs Table */}
      <div className="mb-5 break-inside-avoid">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-900 mb-2 border-b border-slate-300 pb-1">
          {t.printView.kpiSectionTitle}
        </h2>
        <table className="w-full text-xs text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-200 text-slate-900 font-bold">
              <th className="border border-slate-300 p-1.5">{t.printView.thTotal}</th>
              <th className="border border-slate-300 p-1.5 text-emerald-800">{t.printView.thPassed}</th>
              <th className="border border-slate-300 p-1.5 text-red-800">{t.printView.thFailed}</th>
              <th className="border border-slate-300 p-1.5">{t.printView.thNa}</th>
              <th className="border border-slate-300 p-1.5">{t.printView.thScore}</th>
              <th className="border border-slate-300 p-1.5">{t.printView.thPriorities}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-300 p-1.5 font-bold">{metrics.total}</td>
              <td className="border border-slate-300 p-1.5 text-emerald-700 font-bold">{metrics.passed}</td>
              <td className="border border-slate-300 p-1.5 text-red-700 font-bold">{metrics.failed}</td>
              <td className="border border-slate-300 p-1.5">{metrics.na}</td>
              <td className="border border-slate-300 p-1.5 font-black text-sm">{metrics.scorePercentage}%</td>
              <td className="border border-slate-300 p-1.5 font-mono text-[11px]">
                P1: {metrics.criticalP1Count} | P2: {metrics.shiftP2Count} | P3: {metrics.scheduledP3Count}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Corrective Action Log (CAPA) */}
      <div className="mb-5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-900 mb-2 border-b border-slate-300 pb-1">
          {t.printView.capaSectionTitle}
        </h2>
        {defects.length === 0 ? (
          <p className="text-xs text-emerald-700 font-semibold p-3 border border-emerald-300 rounded bg-emerald-50 break-inside-avoid">
            {t.printView.noDefectsFound}
          </p>
        ) : (
          <div className="space-y-3">
            {defects.map((d, index) => {
              const details = d.defectDetails;
              const itemTitle = getItemTitle(d);
              const priorityInfo = getPriorityInfo(details?.priority || 'P2');
              const assigneeLabel = details?.assignedTo ? getAssigneeLabel(details.assignedTo) : (isRu ? 'Не назначен' : 'Unassigned');
              const targetDateLabel = details?.targetDate ? getTargetDateLabel(details.targetDate) : (isRu ? 'Сегодня' : 'Today');

              return (
                <div
                  key={d.id}
                  id={`finding-${d.id}`}
                  className="defect-card border border-slate-300 rounded-lg p-3 text-xs bg-slate-50 break-inside-avoid"
                >
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

                  <p className="text-slate-800 font-medium mb-1.5">
                    <strong>{t.printView.descWord}</strong> {details?.description || (isRu ? 'Нет описания' : 'No description')}
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 mb-1.5">
                    <div><strong>{t.printView.locWord}</strong> {details?.location || (isRu ? 'Не указана' : 'Not specified')}</div>
                    <div><strong>{t.printView.respWord}</strong> {assigneeLabel}</div>
                    <div><strong>{t.printView.dueWord}</strong> {targetDateLabel}{details?.targetDate === 'Custom' && details.customTargetDate ? ` (${details.customTargetDate})` : ''}</div>
                  </div>

                  {details?.notes && (
                    <p className="text-[11px] text-slate-600 italic mb-1.5">
                      <strong>{t.printView.notesWord}</strong> {details.notes}
                    </p>
                  )}

                  {/* Defect Photos Thumbnails in Print with Interactive Jump Anchor */}
                  {(() => {
                    const validPhotos = getValidPhotos(details?.photos);
                    if (validPhotos.length === 0) return null;

                    return (
                      <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                            <Camera className="w-3 h-3 text-slate-500" />
                            {t.printView.photoEvidenceWord}
                          </span>
                          <div className="flex items-center gap-2">
                            {validPhotos.map((photo, pIdx) => {
                              const photoCloudUrl = getPhotoCloudUrl(photo.id);
                              return (
                                <a
                                  key={photo.id || pIdx}
                                  href={photoCloudUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    if (isScreenPreview && onPreviewPhoto) {
                                      e.preventDefault();
                                      onPreviewPhoto(photo, details?.location, itemTitle);
                                    }
                                  }}
                                  className="group relative border border-slate-400 rounded overflow-hidden hover:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all bg-slate-100 block shrink-0 cursor-pointer"
                                  title={`${t.printView.openCloudPhoto} / ${t.printView.clickToEnlarge}`}
                                >
                                  <img
                                    src={photo.url}
                                    alt={`Defect ${d.id} photo ${pIdx + 1}`}
                                    loading="eager"
                                    decoding="sync"
                                    className="h-14 w-20 object-contain bg-slate-200/60"
                                  />
                                  <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-white text-[9px] font-bold text-center py-0.5 group-hover:bg-blue-600 transition-colors flex items-center justify-center gap-0.5">
                                    <span>{t.printView.photoWord} {pIdx + 1}</span>
                                    <span className="text-[8px]">↗</span>
                                  </span>
                                </a>
                              );
                            })}
                          </div>
                        </div>

                        {/* Direct anchor link to this defect's photos in Appendix */}
                        <a
                          href={`#defect-photos-${d.id}`}
                          className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 underline flex items-center gap-1 print:text-blue-800"
                          title={t.printView.jumpToPhotosAppendix}
                        >
                          <span>{t.printView.jumpToPhotosAppendix}</span>
                          <span>↓</span>
                        </a>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Checklist Table */}
      <div className="mb-5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-900 mb-2 border-b border-slate-300 pb-1">
          {t.printView.auditSectionTitle.replace(/1[67]/, String(session.items.length))}
        </h2>
        <table className="w-full text-[10px] border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-200 text-slate-900 font-bold">
              <th className="border border-slate-300 p-1.5 text-center w-10">{t.printView.thId}</th>
              <th className="border border-slate-300 p-1.5 w-20 text-center">{t.printView.thStatus}</th>
              <th className="border border-slate-300 p-1.5">{t.printView.thItemName}</th>
              <th className="border border-slate-300 p-1.5">{t.printView.thStandard}</th>
              <th className="border border-slate-300 p-1.5 w-40">{t.printView.thNotesLoc}</th>
            </tr>
          </thead>
          <tbody>
            {session.items.map((item) => (
              <tr key={item.id} className="border-b border-slate-200 break-inside-avoid">
                <td className="border border-slate-300 p-1 text-center font-mono font-bold">{item.id}</td>
                <td className="border border-slate-300 p-1 text-center font-bold">
                  {item.status === 'PASS' && <span className="text-emerald-700 font-bold">[ OK ]</span>}
                  {item.status === 'FAIL' && <span className="text-red-700 font-bold">[ FAIL ]</span>}
                  {item.status === 'NA' && <span className="text-slate-500">[ N/A ]</span>}
                  {item.status === 'PENDING' && <span className="text-amber-600">[ PEND ]</span>}
                </td>
                <td className="border border-slate-300 p-1 font-semibold text-slate-900">{getItemTitle(item)}</td>
                <td className="border border-slate-300 p-1 text-slate-700">{getItemStandard(item)}</td>
                <td className="border border-slate-300 p-1 text-slate-600">
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
        <div className="mb-5 p-3 border border-slate-300 rounded-lg bg-slate-50 text-xs break-inside-avoid">
          <strong className="block text-slate-900 mb-1">{t.printView.generalObservationsTitle}</strong>
          <p className="text-slate-700 leading-relaxed">{session.generalNotes}</p>
        </div>
      )}

      {/* Signatures and Sign-off */}
      <div className="signature-block mt-6 pt-3 border-t-2 border-slate-400 grid grid-cols-2 gap-8 text-xs break-inside-avoid">
        <div>
          <p className="font-bold text-slate-900 mb-1">{t.printView.inspectorSignHeading}</p>
          <div className="mt-5 border-b border-slate-900 pb-1 flex justify-between items-end">
            <span className="font-medium text-slate-800">{session.inspectorName}</span>
            <span className="text-[10px] text-slate-500 font-mono">{t.printView.signatureLine}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {t.printView.datePrefix} {session.signatures?.timestamp ? new Date(session.signatures.timestamp).toLocaleString(isRu ? 'ru-RU' : 'en-US') : '________________'}
          </p>
        </div>

        <div>
          <p className="font-bold text-slate-900 mb-1">{t.printView.approverSignHeading}</p>
          <div className="mt-5 border-b border-slate-900 pb-1 flex justify-between items-end">
            <span className="font-medium text-slate-800">
              {session.signatures?.reviewedBy || '__________________________'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">{t.printView.signatureLine}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {t.printView.datePrefix} {session.signatures?.reviewTimestamp ? new Date(session.signatures.reviewTimestamp).toLocaleString(isRu ? 'ru-RU' : 'en-US') : '________________'}
          </p>
        </div>
      </div>

      {/* 4. Photo Evidence Appendix (Приложение: Фотоматериалы нарушений) */}
      {totalPhotosCount > 0 && (
        <div 
          className="photo-evidence-appendix mt-8 pt-6 border-t-2 border-slate-900 break-before-page"
          style={{ pageBreakBefore: 'always', breakBefore: 'page' }}
        >
          {/* Appendix Header */}
          <div className="border-b-2 border-slate-800 pb-2 mb-4 break-inside-avoid">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-slate-700" />
                  <span>{t.printView.appendixSectionTitle}</span>
                </h2>
                <p className="text-[11px] text-slate-600">
                  {t.printView.appendixSubtitle}
                </p>
              </div>
              <div className="text-right text-[11px] text-slate-600">
                <span className="font-bold text-slate-900">{session.facilityName}</span>
                <div>{t.printView.reportId} {session.id}</div>
              </div>
            </div>
          </div>

          {/* Defect Photo Blocks */}
          <div className="space-y-6">
            {defectsWithPhotos.map((d, dIdx) => {
              const details = d.defectDetails!;
              const itemTitle = getItemTitle(d);
              const priorityInfo = getPriorityInfo(details.priority || 'P2');
              const assigneeLabel = details.assignedTo ? getAssigneeLabel(details.assignedTo) : (isRu ? 'Не назначен' : 'Unassigned');
              const targetDateLabel = details.targetDate ? getTargetDateLabel(details.targetDate) : (isRu ? 'Сегодня' : 'Today');
              const findingIndex = defects.findIndex((item) => item.id === d.id);
              const findingNum = findingIndex >= 0 ? findingIndex + 1 : dIdx + 1;
              const photos = getValidPhotos(details.photos);
              if (photos.length === 0) return null;

              return (
                <div
                  key={d.id}
                  id={`defect-photos-${d.id}`}
                  className="defect-photo-block border border-slate-300 rounded-lg p-3 bg-slate-50 break-inside-avoid shadow-sm"
                >
                  {/* Block Header */}
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold font-mono text-xs text-slate-900">
                        {t.printView.findingNumber}{findingNum} | {t.printView.itemWord} {d.id}: {itemTitle}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                          details.priority === 'P1'
                            ? 'bg-red-700'
                            : details.priority === 'P2'
                            ? 'bg-amber-600'
                            : 'bg-blue-600'
                        }`}
                      >
                        {t.printView.priorityWord} {priorityInfo.short}
                      </span>
                    </div>
                    <a
                      href={`#finding-${d.id}`}
                      className="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline flex items-center gap-1 print:text-blue-800"
                      title={t.printView.backToFinding}
                    >
                      <span>↑</span>
                      <span>{t.printView.backToFinding} #{findingNum}</span>
                    </a>
                  </div>

                  {/* Defect Metadata */}
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 mb-2 bg-white p-2 rounded border border-slate-200">
                    <div><strong>{t.printView.locWord}</strong> {details.location || (isRu ? 'Не указана' : 'Not specified')}</div>
                    <div><strong>{t.printView.respWord}</strong> {assigneeLabel}</div>
                    <div><strong>{t.printView.dueWord}</strong> {targetDateLabel}{details.targetDate === 'Custom' && details.customTargetDate ? ` (${details.customTargetDate})` : ''}</div>
                    <div className="col-span-3 text-slate-800 font-medium">
                      <strong>{t.printView.descWord}</strong> {details.description || (isRu ? 'Нет описания' : 'No description')}
                    </div>
                    {details.notes && (
                      <div className="col-span-3 text-slate-600 italic">
                        <strong>{t.printView.notesWord}</strong> {details.notes}
                      </div>
                    )}
                  </div>

                  {/* Photos Layout */}
                  {photos.length === 1 ? (
                    // Single Photo: Large display
                    (() => {
                      const photo = photos[0];
                      const photoCloudUrl = getPhotoCloudUrl(photo.id);
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(photoCloudUrl)}&bgcolor=ffffff&color=0f172a&margin=2`;

                      return (
                        <div
                          id={`defect-photo-${photo.id || `${d.id}-0`}`}
                          className="photo-card border border-slate-300 rounded-lg p-3 bg-white flex flex-col items-center break-inside-avoid shadow-sm"
                        >
                          <div
                            className={`relative group w-full flex items-center justify-center ${isScreenPreview ? 'cursor-pointer' : ''}`}
                            onClick={() => {
                              if (isScreenPreview && onPreviewPhoto) {
                                onPreviewPhoto(photo, details.location, itemTitle);
                              }
                            }}
                          >
                            <img
                              src={photo.url}
                              alt={photo.caption || `${itemTitle} photo`}
                              loading="eager"
                              decoding="sync"
                              className="max-h-[340px] w-auto max-w-full object-contain rounded border border-slate-200 shadow-sm mx-auto bg-slate-50"
                            />
                            {isScreenPreview && (
                              <div className="absolute top-2 right-2 px-2 py-1 bg-black/75 hover:bg-black/90 text-white text-[11px] font-semibold rounded-lg opacity-90 group-hover:opacity-100 transition-opacity flex items-center gap-1 shadow">
                                <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{t.printView.zoomInScreen}</span>
                              </div>
                            )}
                          </div>

                          <div className="w-full mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between gap-3 text-[11px] text-slate-600">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-lg shrink-0">
                                <img
                                  src={qrUrl}
                                  alt="QR Code"
                                  loading="eager"
                                  decoding="sync"
                                  className="w-14 h-14 object-contain rounded"
                                />
                                <div className="flex flex-col text-[8.5px] leading-tight">
                                  <span className="font-bold text-slate-800">{t.printView.scanFor4K}</span>
                                  <span className="text-slate-400 font-mono text-[8px]">ID: {photo.id.slice(0, 12)}</span>
                                </div>
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-slate-800 truncate text-xs">
                                  {photo.caption ? `📷 ${photo.caption}` : t.printView.photoNoCaption}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {new Date(photo.timestamp).toLocaleString(isRu ? 'ru-RU' : 'en-US')}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0">
                              <a
                                href={photoCloudUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-lg transition-colors print:border-slate-300 print:text-blue-800"
                              >
                                <span>🌐 {t.printView.openCloudPhoto} ↗</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    // Multiple Photos: 2-column grid
                    <div className="grid grid-cols-2 gap-3">
                      {photos.map((photo, pIdx) => {
                        const photoCloudUrl = getPhotoCloudUrl(photo.id);
                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(photoCloudUrl)}&bgcolor=ffffff&color=0f172a&margin=2`;

                        return (
                          <div
                            key={photo.id || pIdx}
                            id={`defect-photo-${photo.id || `${d.id}-${pIdx}`}`}
                            className="photo-card border border-slate-300 rounded-lg p-2 bg-white flex flex-col justify-between break-inside-avoid shadow-sm"
                          >
                            <div
                              className={`relative group flex-1 flex items-center justify-center min-h-[160px] ${isScreenPreview ? 'cursor-pointer' : ''}`}
                              onClick={() => {
                                if (isScreenPreview && onPreviewPhoto) {
                                  onPreviewPhoto(photo, details.location, itemTitle);
                                }
                              }}
                            >
                              <img
                                src={photo.url}
                                alt={photo.caption || `${itemTitle} photo ${pIdx + 1}`}
                                loading="eager"
                                decoding="sync"
                                className="max-h-[230px] w-auto max-w-full object-contain rounded border border-slate-200 shadow-sm mx-auto bg-slate-50"
                              />
                              {isScreenPreview && (
                                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-black/75 hover:bg-black/90 text-white text-[10px] font-semibold rounded opacity-90 group-hover:opacity-100 transition-opacity flex items-center gap-1 shadow">
                                  <ZoomIn className="w-3 h-3 text-emerald-400" />
                                  <span>{t.printView.zoomInScreen}</span>
                                </div>
                              )}
                            </div>
                            <div className="mt-2 pt-1.5 border-t border-slate-200 flex items-center justify-between gap-2 text-[9.5px] text-slate-600">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-0.5 rounded shrink-0">
                                  <img
                                    src={qrUrl}
                                    alt="QR"
                                    loading="eager"
                                    decoding="sync"
                                    className="w-10 h-10 object-contain rounded"
                                  />
                                  <span className="text-[7px] font-bold text-slate-700 leading-tight max-w-[45px] block">
                                    {t.printView.scanFor4K}
                                  </span>
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-semibold text-slate-800 truncate">
                                    {photo.caption ? `📷 ${photo.caption}` : `${t.printView.photoWord} #${pIdx + 1}`}
                                  </span>
                                  <span className="text-slate-500 text-[8.5px]">
                                    {new Date(photo.timestamp).toLocaleDateString(isRu ? 'ru-RU' : 'en-US')}{' '}
                                    {new Date(photo.timestamp).toLocaleTimeString(isRu ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0">
                                <a
                                  href={photoCloudUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-200 rounded transition-colors print:text-blue-800"
                                >
                                  <span>🌐 {t.printView.openCloudPhoto} ↗</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Appendix End Summary */}
          <div className="mt-4 pt-2 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500 break-inside-avoid font-mono">
            <span>
              {t.printView.endOfAppendix} {totalPhotosCount}
            </span>
            <span>
              {session.id} | {new Date().toLocaleDateString(isRu ? 'ru-RU' : 'en-US')}
            </span>
          </div>
        </div>
      )}

      {/* Print Footer Metadata with Version and Commit */}
      <div className="mt-6 pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-500 break-inside-avoid">
        <span>
          Daily Facility & EHS Walkthrough PWA {APP_VERSION} (Commit: {COMMIT_HASH})
        </span>
        <span>
          {isRu ? 'Сформировано:' : 'Generated on:'} {new Date().toLocaleString(isRu ? 'ru-RU' : 'en-US')}
        </span>
      </div>
    </div>
  );
};

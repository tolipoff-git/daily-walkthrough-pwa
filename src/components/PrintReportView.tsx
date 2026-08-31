import React from 'react';
import { InspectionSession } from '../types/inspection';
import { calculateMetrics } from '../utils/metrics';

interface PrintReportViewProps {
  session: InspectionSession;
}

export const PrintReportView: React.FC<PrintReportViewProps> = ({ session }) => {
  const metrics = calculateMetrics(session.items);
  const defects = session.items.filter((item) => item.status === 'FAIL');

  return (
    <div className="print-report-container hidden print:block bg-white text-black p-8 font-sans leading-normal">
      {/* Document Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
              Итоговый отчет ежедневного обхода
            </h1>
            <p className="text-sm font-semibold text-slate-600">
              Facility & EHS Daily Walkthrough Inspection Report
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold font-mono text-slate-900">
              ID: {session.id}
            </div>
            <div className="text-xs text-slate-600">
              Дата формирования: {new Date().toLocaleDateString('ru-RU')}
            </div>
          </div>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-2 gap-4 text-xs mb-6 border border-slate-300 p-4 rounded-lg bg-slate-50">
        <div>
          <p className="mb-1"><strong className="text-slate-800">Объект / Площадка:</strong> {session.facilityName}</p>
          <p className="mb-1"><strong className="text-slate-800">Зона инспекции:</strong> {session.facilityArea}</p>
          <p><strong className="text-slate-800">Смена:</strong> {session.shift}</p>
        </div>
        <div>
          <p className="mb-1"><strong className="text-slate-800">Дата инспекции:</strong> {session.date}</p>
          <p className="mb-1"><strong className="text-slate-800">Время обхода:</strong> {session.startTime} — {session.endTime || 'Завершен'}</p>
          <p><strong className="text-slate-800">Аудитор (EHS):</strong> {session.inspectorName} ({session.inspectorRole})</p>
        </div>
      </div>

      {/* Metrics & KPIs Table */}
      <div className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900 mb-2 border-b border-slate-300 pb-1">
          1. Сводные показатели соответствия (KPI)
        </h2>
        <table className="w-full text-xs text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-200 text-slate-900 font-bold">
              <th className="border border-slate-300 p-2">Всего пунктов</th>
              <th className="border border-slate-300 p-2 text-emerald-800">Соответствует (PASS)</th>
              <th className="border border-slate-300 p-2 text-red-800">Замечания (FAIL)</th>
              <th className="border border-slate-300 p-2">N/A</th>
              <th className="border border-slate-300 p-2">Индекс соответствия</th>
              <th className="border border-slate-300 p-2">Приоритеты замечаний</th>
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
          2. Журнал выявленных дефектов и корректирующих действий (CAPA)
        </h2>
        {defects.length === 0 ? (
          <p className="text-xs text-emerald-700 font-semibold p-3 border border-emerald-300 rounded bg-emerald-50">
            ✓ Замечаний и несоответствий не выявлено. Все участки соответствуют стандартам EHS & 5S.
          </p>
        ) : (
          <div className="space-y-4">
            {defects.map((d, index) => {
              const details = d.defectDetails;
              return (
                <div key={d.id} className="border border-slate-300 rounded-lg p-3 text-xs bg-slate-50 break-inside-avoid">
                  <div className="flex items-center justify-between mb-1.5 font-bold">
                    <span className="text-slate-900 font-mono">
                      #{index + 1} | Пункт {d.id}: {d.titleRu}
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
                      Приоритет: {details?.priority || 'P2'}
                    </span>
                  </div>

                  <p className="text-slate-800 font-medium mb-2">
                    <strong>Описание:</strong> {details?.description || 'Нет описания'}
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 mb-2">
                    <div><strong>Локация:</strong> {details?.location || 'Не указана'}</div>
                    <div><strong>Ответственный:</strong> {details?.assignedTo || 'Не назначен'}</div>
                    <div><strong>Срок:</strong> {details?.targetDate || 'Сегодня'}</div>
                  </div>

                  {details?.notes && (
                    <p className="text-[11px] text-slate-600 italic mb-2">
                      <strong>Меры/Комментарий:</strong> {details.notes}
                    </p>
                  )}

                  {/* Defect Photos Thumbnails in Print */}
                  {details?.photos && details.photos.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-500">Фотофиксация:</span>
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
          3. Итоговый протокол обхода (все 17 контрольных пунктов)
        </h2>
        <table className="w-full text-[10px] border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-200 text-slate-900 font-bold">
              <th className="border border-slate-300 p-1.5 text-center w-10">ID</th>
              <th className="border border-slate-300 p-1.5 w-24 text-center">Статус</th>
              <th className="border border-slate-300 p-1.5">Пункт проверки</th>
              <th className="border border-slate-300 p-1.5">Стандарт / Требование безопасности</th>
              <th className="border border-slate-300 p-1.5 w-44">Примечание / Локация</th>
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
                <td className="border border-slate-300 p-1.5 font-semibold text-slate-900">{item.titleRu}</td>
                <td className="border border-slate-300 p-1.5 text-slate-700">{item.standardRu}</td>
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
          <strong className="block text-slate-900 mb-1">Общие замечания и культура 5S:</strong>
          <p className="text-slate-700 leading-relaxed">{session.generalNotes}</p>
        </div>
      )}

      {/* Signatures and Sign-off */}
      <div className="mt-8 pt-4 border-t-2 border-slate-400 grid grid-cols-2 gap-8 text-xs break-inside-avoid">
        <div>
          <p className="font-bold text-slate-900 mb-1">Инспектор / Аудитор EHS:</p>
          <div className="mt-6 border-b border-slate-900 pb-1 flex justify-between items-end">
            <span className="font-medium text-slate-800">{session.inspectorName}</span>
            <span className="text-[10px] text-slate-500 font-mono">Подпись: ____________</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Дата: {new Date(session.signatures.timestamp).toLocaleString('ru-RU')}
          </p>
        </div>

        <div>
          <p className="font-bold text-slate-900 mb-1">Руководитель производства / Ответственный:</p>
          <div className="mt-6 border-b border-slate-900 pb-1 flex justify-between items-end">
            <span className="font-medium text-slate-800">
              {session.signatures.reviewedBy || '__________________________'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Подпись: ____________</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Дата: {session.signatures.reviewTimestamp ? new Date(session.signatures.reviewTimestamp).toLocaleString('ru-RU') : '________________'}
          </p>
        </div>
      </div>
    </div>
  );
};

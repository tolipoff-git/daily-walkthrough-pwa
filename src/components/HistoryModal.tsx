import React from 'react';
import { 
  X, 
  History, 
  Trash2, 
  FolderOpen, 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  Clock, 
  User
} from 'lucide-react';
import { InspectionSession } from '../types/inspection';
import { calculateMetrics } from '../utils/metrics';
import { exportInspectionToExcel } from '../utils/exportExcel';
import { generatePlaintextReport } from '../utils/exportPlaintext';
import { triggerHaptic } from '../utils/haptics';

interface HistoryModalProps {
  history: InspectionSession[];
  onClose: () => void;
  onLoadSession: (session: InspectionSession) => void;
  onDeleteSession: (id: string) => void;
  onClearHistory: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  history,
  onClose,
  onLoadSession,
  onDeleteSession,
  onClearHistory,
}) => {
  const handleDownloadTxt = (session: InspectionSession) => {
    triggerHaptic();
    const text = generatePlaintextReport(session);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EHS_Report_${session.date}_${session.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadXlsx = (session: InspectionSession) => {
    triggerHaptic();
    exportInspectionToExcel(session);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 animate-fade-in">
      <div 
        className="relative max-w-3xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-850 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-950/80 border border-blue-800 flex items-center justify-center text-blue-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                История сохраненных обходов
              </h2>
              <p className="text-xs text-slate-400">
                Сохранено записей: <strong className="text-blue-400">{history.length}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-750 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-14 text-slate-400">
              <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-200">
                История инспекций пуста
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Завершите текущий обход или нажмите «Экспорт / Отчеты», чтобы сохранить результаты в локальную базу данных.
              </p>
            </div>
          ) : (
            history.map((session) => {
              const metrics = calculateMetrics(session.items);
              return (
                <div
                  key={session.id}
                  className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 transition-all hover:border-slate-600 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                        {session.id}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          metrics.scorePercentage >= 90
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : metrics.scorePercentage >= 75
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-red-950 text-red-400 border border-red-800'
                        }`}
                      >
                        Score: {metrics.scorePercentage}%
                      </span>
                      <span className="text-[11px] text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded">
                        {session.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        {session.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {session.startTime} - {session.endTime || '??'}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                        {session.inspectorName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5">
                      <span className="text-emerald-400">✓ Пройдено: {metrics.passed}</span>
                      {metrics.failed > 0 && (
                        <span className="text-red-400 font-semibold">✗ Замечаний: {metrics.failed}</span>
                      )}
                      <span>N/A: {metrics.na}</span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => {
                        triggerHaptic();
                        onLoadSession(session);
                        onClose();
                      }}
                      className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                      title="Открыть этот обход в редакторе"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Открыть</span>
                    </button>

                    <button
                      onClick={() => handleDownloadXlsx(session)}
                      className="p-1.5 bg-slate-700/80 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-lg transition-colors"
                      title="Скачать Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDownloadTxt(session)}
                      className="p-1.5 bg-slate-700/80 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg transition-colors"
                      title="Скачать текстовый отчет (.txt)"
                    >
                      <FileText className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Удалить инспекцию ${session.id}?`)) {
                          triggerHaptic();
                          onDeleteSession(session.id);
                        }
                      }}
                      className="p-1.5 bg-slate-700/80 hover:bg-red-600 text-slate-300 hover:text-white rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-850 border-t border-slate-700 flex items-center justify-between">
          {history.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Вы уверены, что хотите очистить всю историю обходов?')) {
                  triggerHaptic();
                  onClearHistory();
                }
              }}
              className="text-xs text-red-400 hover:text-red-300 font-semibold"
            >
              Очистить историю
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

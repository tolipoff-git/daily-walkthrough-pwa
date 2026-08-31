import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  AlertOctagon, 
  AlertCircle, 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  User, 
  ExternalLink,
  Repeat
} from 'lucide-react';
import { ChecklistItem, DefectPhoto, Priority } from '../types/inspection';

interface ActionPlanViewProps {
  items: ChecklistItem[];
  onClose: () => void;
  onUpdateDefectStatus: (itemId: string, status: 'Open' | 'In Progress' | 'Resolved') => void;
  onScrollToItem: (itemId: string) => void;
  onPreviewPhoto: (photo: DefectPhoto, location?: string, itemTitle?: string) => void;
}

export const ActionPlanView: React.FC<ActionPlanViewProps> = ({
  items,
  onClose,
  onUpdateDefectStatus,
  onScrollToItem,
  onPreviewPhoto,
}) => {
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | Priority>('ALL');

  const failedItems = items.filter((item) => item.status === 'FAIL');

  const filteredDefects = failedItems.filter((item) => {
    if (priorityFilter === 'ALL') return true;
    return item.defectDetails?.priority === priorityFilter;
  });

  const p1Count = failedItems.filter((i) => i.defectDetails?.priority === 'P1').length;
  const p2Count = failedItems.filter((i) => i.defectDetails?.priority === 'P2').length;
  const p3Count = failedItems.filter((i) => i.defectDetails?.priority === 'P3').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 animate-fade-in">
      <div 
        className="relative max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-850 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-950/80 border border-red-800 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Журнал замечаний и план действий (CAPA)
              </h2>
              <p className="text-xs text-slate-400">
                Всего выявлено замечаний: <strong className="text-red-400">{failedItems.length}</strong>
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

        {/* Priority Filter Bar */}
        <div className="px-5 py-3 bg-slate-900 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          <span className="text-slate-400 mr-1">Приоритет:</span>
          <button
            onClick={() => setPriorityFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              priorityFilter === 'ALL'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Все ({failedItems.length})
          </button>
          <button
            onClick={() => setPriorityFilter('P1')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
              priorityFilter === 'P1'
                ? 'bg-red-600 text-white shadow-md shadow-red-950/60'
                : 'bg-red-950/60 text-red-300 hover:bg-red-900/60'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            P1 Критично ({p1Count})
          </button>
          <button
            onClick={() => setPriorityFilter('P2')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
              priorityFilter === 'P2'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/60'
                : 'bg-amber-950/60 text-amber-300 hover:bg-amber-900/60'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            P2 В смену ({p2Count})
          </button>
          <button
            onClick={() => setPriorityFilter('P3')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
              priorityFilter === 'P3'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-950/60'
                : 'bg-blue-950/60 text-blue-300 hover:bg-blue-900/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            P3 Планово ({p3Count})
          </button>
        </div>

        {/* Defects List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {filteredDefects.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-60" />
              <p className="text-base font-semibold text-slate-200">
                Замечаний с выбранным приоритетом не обнаружено
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Все участки соответствуют установленным нормам безопасности
              </p>
            </div>
          ) : (
            filteredDefects.map((item) => {
              const details = item.defectDetails;
              return (
                <div
                  key={item.id}
                  className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 transition-all hover:border-slate-600 shadow-md"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-900 text-emerald-400 border border-slate-700">
                        {item.id}
                      </span>
                      <span className="text-xs font-semibold text-slate-300">
                        {item.titleRu}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          details?.priority === 'P1'
                            ? 'bg-red-600 text-white'
                            : details?.priority === 'P2'
                            ? 'bg-amber-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {details?.priority || 'P2'}
                      </span>

                      {details?.isRepeatIssue && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1">
                          <Repeat className="w-2.5 h-2.5" />
                          Повторно
                        </span>
                      )}
                    </div>

                    {/* Status badge & Scroll to item */}
                    <div className="flex items-center gap-2">
                      <select
                        value={details?.resolutionStatus || 'Open'}
                        onChange={(e) =>
                          onUpdateDefectStatus(
                            item.id,
                            e.target.value as 'Open' | 'In Progress' | 'Resolved'
                          )
                        }
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold border ${
                          details?.resolutionStatus === 'Resolved'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                            : details?.resolutionStatus === 'In Progress'
                            ? 'bg-amber-950 text-amber-300 border-amber-700'
                            : 'bg-red-950 text-red-300 border-red-700'
                        }`}
                      >
                        <option value="Open">Открыто (Open)</option>
                        <option value="In Progress">В работе (In Progress)</option>
                        <option value="Resolved">Устранено (Resolved)</option>
                      </select>

                      <button
                        onClick={() => {
                          onClose();
                          onScrollToItem(item.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
                        title="Перейти к пункту в чек-листе"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Defect Description */}
                  <p className="text-xs sm:text-sm text-slate-200 font-medium mb-3 leading-relaxed">
                    {details?.description || 'Описание дефекта не заполнено'}
                  </p>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-750">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="truncate">{details?.location || 'Локация не указана'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">Ответств: {details?.assignedTo || 'Не назначен'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">Срок: {details?.targetDate || 'Сегодня'}</span>
                    </div>
                  </div>

                  {/* Photos attachments row */}
                  {details?.photos && details.photos.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Фото ({details.photos.length}):</span>
                      <div className="flex items-center gap-2">
                        {details.photos.map((p) => (
                          <img
                            key={p.id}
                            src={p.url}
                            alt="Defect"
                            className="w-10 h-10 rounded-lg object-cover cursor-pointer border border-slate-700 hover:scale-105 transition-transform"
                            onClick={() => onPreviewPhoto(p, details.location, item.titleRu)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {details?.notes && (
                    <div className="mt-2.5 text-xs text-slate-400 italic">
                      Примечание аудитора: {details.notes}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-850 border-t border-slate-700 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

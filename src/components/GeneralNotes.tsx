import React from 'react';
import { FileText, PenTool, UserCheck } from 'lucide-react';
import { InspectionSession } from '../types/inspection';

interface GeneralNotesProps {
  session: InspectionSession;
  onUpdateNotes: (notes: string) => void;
  onUpdateSignatures: (signatures: InspectionSession['signatures']) => void;
}

export const GeneralNotes: React.FC<GeneralNotesProps> = ({
  session,
  onUpdateNotes,
  onUpdateSignatures,
}) => {
  return (
    <div className="bg-slate-800/90 border border-slate-700/90 rounded-2xl p-4 sm:p-5 mb-6 shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3 text-slate-200">
        <FileText className="w-5 h-5 text-indigo-400" />
        <h3 className="text-sm sm:text-base font-bold">
          Общие наблюдения, культура 5S и согласование
        </h3>
      </div>

      {/* Textarea for general observations */}
      <div className="mb-4">
        <label className="block text-xs text-slate-400 font-medium mb-1.5">
          Общие комментарии по смене / Замечания по культуре безопасности и 5S
        </label>
        <textarea
          rows={3}
          value={session.generalNotes}
          onChange={(e) => onUpdateNotes(e.target.value)}
          placeholder="Укажите общие тренды, состояние культуры безопасности, положительные примеры соблюдения стандартов 5S или системные замечания..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
        />
      </div>

      {/* Sign-Off / Approval Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3 border-t border-slate-700/80 text-xs">
        {/* Inspector Signature Box */}
        <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-emerald-400" />
                Инспектор (EHS Аудитор)
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Подписано</span>
            </div>
            <p className="text-sm font-bold text-white mt-1">{session.inspectorName}</p>
            <p className="text-slate-400 text-xs">{session.inspectorRole}</p>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 font-mono">
            {new Date(session.signatures.timestamp).toLocaleString('ru-RU')}
          </div>
        </div>

        {/* Approver / Shift Lead Review Box */}
        <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                Руководитель производства / Начальник смены
              </span>
              <span className="text-[10px] text-slate-400">Согласование</span>
            </div>
            <input
              type="text"
              value={session.signatures.reviewedBy || ''}
              onChange={(e) => {
                onUpdateSignatures({
                  ...session.signatures,
                  reviewedBy: e.target.value,
                  reviewTimestamp: e.target.value ? new Date().toISOString() : undefined,
                });
              }}
              placeholder="ФИО руководителя (для утверждения отчета)"
              className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="text-[10px] text-slate-500 mt-2 font-mono">
            {session.signatures.reviewTimestamp ? new Date(session.signatures.reviewTimestamp).toLocaleString('ru-RU') : 'Ожидает подписи'}
          </div>
        </div>
      </div>
    </div>
  );
};

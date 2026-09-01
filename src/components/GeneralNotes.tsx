import React, { useState } from 'react';
import { FileText, PenTool, UserCheck, Users, BookmarkPlus, Check } from 'lucide-react';
import { InspectionSession } from '../types/inspection';
import { useLanguage } from '../i18n/LanguageContext';
import { usePersonnel } from '../hooks/usePersonnel';
import { triggerHaptic } from '../utils/haptics';

interface GeneralNotesProps {
  session: InspectionSession;
  onUpdateNotes: (notes: string) => void;
  onUpdateSignatures: (signatures: InspectionSession['signatures']) => void;
  onOpenPersonnel: () => void;
}

export const GeneralNotes: React.FC<GeneralNotesProps> = ({
  session,
  onUpdateNotes,
  onUpdateSignatures,
  onOpenPersonnel,
}) => {
  const { language, t } = useLanguage();
  const { personnel, addPerson } = usePersonnel();
  const [savedToast, setSavedToast] = useState(false);

  const handleSelectApprover = (personId: string) => {
    const person = personnel.find((p) => p.id === personId);
    if (!person) return;
    triggerHaptic();
    const approverString = `${person.name} (${person.role})`;
    onUpdateSignatures({
      ...session.signatures,
      reviewedBy: approverString,
      reviewTimestamp: new Date().toISOString(),
    });
  };

  const handleSaveCurrentApprover = () => {
    if (!session.signatures.reviewedBy?.trim()) return;
    triggerHaptic(30);
    const raw = session.signatures.reviewedBy.trim();
    // Parse "Name (Role)" or just "Name"
    const match = raw.match(/^([^(]+)(?:\(([^)]+)\))?$/);
    const name = match ? match[1].trim() : raw;
    const role = match && match[2] ? match[2].trim() : (language === 'ru' ? 'Руководитель смены' : 'Operations Lead');
    
    addPerson({
      name,
      role,
      department: 'Production',
      isDefault: false,
    });

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700/90 rounded-2xl p-4 sm:p-5 mb-6 shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3 text-slate-200">
        <FileText className="w-5 h-5 text-indigo-400" />
        <h3 className="text-sm sm:text-base font-bold">
          {t.generalNotes.title}
        </h3>
      </div>

      {/* Textarea for general observations */}
      <div className="mb-4">
        <label className="block text-xs text-slate-400 font-medium mb-1.5">
          {t.generalNotes.textareaLabel}
        </label>
        <textarea
          rows={3}
          value={session.generalNotes}
          onChange={(e) => onUpdateNotes(e.target.value)}
          placeholder={t.generalNotes.textareaPlaceholder}
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
                {t.generalNotes.inspectorSignBox}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">{t.generalNotes.signed}</span>
            </div>
            <p className="text-sm font-bold text-white mt-1">{session.inspectorName}</p>
            <p className="text-slate-400 text-xs">{session.inspectorRole}</p>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 font-mono">
            {session.signatures?.timestamp ? new Date(session.signatures.timestamp).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US') : ''}
          </div>
        </div>

        {/* Approver / Shift Lead Review Box */}
        <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                {t.generalNotes.approverBox}
              </span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onOpenPersonnel();
                }}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/60 transition-colors"
                title={language === 'ru' ? 'Редактировать список сотрудников' : 'Manage Personnel Directory'}
              >
                <Users className="w-3 h-3" />
                <span>{language === 'ru' ? 'Персонал' : 'Manage'}</span>
              </button>
            </div>

            {/* Quick picker from saved staff */}
            {personnel.length > 0 && (
              <div className="mb-1.5">
                <select
                  aria-label={t.generalNotes.selectApprover}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSelectApprover(e.target.value);
                    }
                  }}
                  className="w-full bg-slate-950/90 border border-slate-700 rounded-lg px-2 py-1 text-slate-300 hover:text-white text-xs focus:outline-none focus:border-blue-500 truncate"
                >
                  <option value="" disabled>
                    {t.generalNotes.selectApprover}
                  </option>
                  {personnel.map((p) => (
                    <option key={p.id} value={p.id}>
                      👤 {p.name} — {p.role}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1">
              <input
                type="text"
                value={session.signatures?.reviewedBy || ''}
                onChange={(e) => {
                  onUpdateSignatures({
                    ...session.signatures,
                    reviewedBy: e.target.value,
                    reviewTimestamp: e.target.value ? new Date().toISOString() : undefined,
                  });
                }}
                placeholder={t.generalNotes.approverPlaceholder}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />

              {session.signatures?.reviewedBy && (
                <button
                  type="button"
                  onClick={handleSaveCurrentApprover}
                  className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                    savedToast
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                  }`}
                  title={language === 'ru' ? 'Сохранить этого руководителя в список персонала' : 'Save this approver to personnel directory'}
                >
                  {savedToast ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5 text-indigo-400" />}
                </button>
              )}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 font-mono">
            {session.signatures?.reviewTimestamp ? new Date(session.signatures.reviewTimestamp).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US') : t.generalNotes.awaitingSign}
          </div>
        </div>
      </div>
    </div>
  );
};

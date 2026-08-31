import React, { useState } from 'react';
import { 
  X, 
  Users, 
  UserPlus, 
  Star, 
  Trash2, 
  Edit3, 
  Check, 
  Search, 
  RotateCcw,
  Building,
  Briefcase
} from 'lucide-react';
import { Person } from '../types/personnel';
import { usePersonnel } from '../hooks/usePersonnel';
import { useLanguage } from '../i18n/LanguageContext';
import { triggerHaptic } from '../utils/haptics';

interface PersonnelModalProps {
  onClose: () => void;
  onSelectInspector?: (person: Person) => void;
}

export const PersonnelModal: React.FC<PersonnelModalProps> = ({
  onClose,
  onSelectInspector,
}) => {
  const { t } = useLanguage();
  const {
    personnel,
    addPerson,
    updatePerson,
    deletePerson,
    setDefaultPerson,
    resetToDefaultPersonnel,
  } = usePersonnel();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formDepartment, setFormDepartment] = useState('Safety & EHS');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 2500);
  };

  const handleStartAdd = () => {
    triggerHaptic();
    setEditingId(null);
    setFormName('');
    setFormRole('');
    setFormDepartment('Safety & EHS');
    setFormIsDefault(personnel.length === 0);
    setIsAdding(true);
  };

  const handleStartEdit = (p: Person) => {
    triggerHaptic();
    setIsAdding(false);
    setEditingId(p.id);
    setFormName(p.name);
    setFormRole(p.role);
    setFormDepartment(p.department || 'Safety & EHS');
    setFormIsDefault(Boolean(p.isDefault));
  };

  const handleCancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormName('');
    setFormRole('');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formRole.trim()) {
      alert(t.personnelModal.fillRequired);
      return;
    }

    triggerHaptic(30);

    if (isAdding) {
      addPerson({
        name: formName.trim(),
        role: formRole.trim(),
        department: formDepartment.trim() || undefined,
        isDefault: formIsDefault,
      });
      showToast(t.personnelModal.saveSuccess);
      handleCancelForm();
    } else if (editingId) {
      updatePerson(editingId, {
        name: formName.trim(),
        role: formRole.trim(),
        department: formDepartment.trim() || undefined,
        isDefault: formIsDefault,
      });
      showToast(t.personnelModal.saveSuccess);
      handleCancelForm();
    }
  };

  const handleDelete = (p: Person) => {
    const confirmPrompt = t.personnelModal.deleteConfirm.replace('{name}', p.name);
    if (window.confirm(confirmPrompt)) {
      triggerHaptic([40, 40]);
      deletePerson(p.id);
      showToast(`${p.name} deleted`);
      if (editingId === p.id) {
        handleCancelForm();
      }
    }
  };

  const handleSetDefault = (p: Person) => {
    triggerHaptic(25);
    setDefaultPerson(p.id);
    showToast(`"${p.name}" is now default inspector`);
  };

  const handleResetDefaults = () => {
    if (window.confirm(t.personnelModal.resetConfirm)) {
      triggerHaptic([50, 50]);
      resetToDefaultPersonnel();
      handleCancelForm();
      showToast(t.personnelModal.saveSuccess);
    }
  };

  const filteredPersonnel = personnel.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q) ||
      (p.department && p.department.toLowerCase().includes(q))
    );
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 animate-fade-in print:hidden"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative max-w-3xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-850 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-800 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                {t.personnelModal.title}
              </h2>
              <p className="text-xs text-slate-400">
                {t.personnelModal.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-750 transition-colors"
            title={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Search Bar */}
        <div className="px-5 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.personnelModal.searchPlaceholder}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            {!isAdding && !editingId && (
              <button
                type="button"
                onClick={handleStartAdd}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-950/50 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>{t.personnelModal.addBtn}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors"
              title={t.personnelModal.resetDefaultsBtn}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.personnelModal.resetDefaultsBtn}</span>
            </button>
          </div>
        </div>

        {/* Notification Feedback Toast */}
        {feedbackMsg && (
          <div className="bg-emerald-950/90 border-b border-emerald-800 text-emerald-300 text-xs px-5 py-2 flex items-center gap-2 animate-fade-in font-medium">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Add / Edit Form Card */}
          {(isAdding || editingId) && (
            <form
              onSubmit={handleSaveForm}
              className="bg-slate-850 border border-indigo-700/60 rounded-xl p-4 shadow-lg animate-fade-in space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <h3 className="text-xs sm:text-sm font-bold text-indigo-300 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-indigo-400" />
                  {isAdding ? t.personnelModal.addTitle : t.personnelModal.editTitle}
                </h3>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-slate-400 hover:text-slate-200 text-xs"
                >
                  {t.common.cancel}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Full Name */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t.personnelModal.nameLabel} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={t.personnelModal.namePlaceholder}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Role / Job Title */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t.personnelModal.roleLabel} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    placeholder={t.personnelModal.rolePlaceholder}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t.personnelModal.deptLabel}
                  </label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder={t.personnelModal.deptPlaceholder}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Is Default Inspector */}
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formIsDefault}
                      onChange={(e) => setFormIsDefault(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-slate-300 font-medium">
                      {t.personnelModal.isDefaultLabel}
                    </span>
                  </label>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-750">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-950/60 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{t.common.save}</span>
                </button>
              </div>
            </form>
          )}

          {/* Personnel List */}
          {filteredPersonnel.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-850/50 rounded-xl border border-slate-800 p-6">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">
                {t.personnelModal.noResults}
              </p>
              <button
                type="button"
                onClick={handleStartAdd}
                className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
              >
                {t.personnelModal.addBtn}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredPersonnel.map((person) => (
                <div
                  key={person.id}
                  className={`bg-slate-800/80 border rounded-xl p-3 sm:p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    person.isDefault
                      ? 'border-indigo-500/80 bg-indigo-950/20 shadow-md shadow-indigo-950/40'
                      : 'border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  {/* Info details */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {person.name}
                      </span>

                      {person.isDefault && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700 flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-indigo-400 text-indigo-400" />
                          {t.personnelModal.defaultBadge}
                        </span>
                      )}

                      {person.department && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-900 text-slate-400 border border-slate-750 flex items-center gap-1">
                          <Building className="w-2.5 h-2.5 text-slate-500" />
                          {person.department}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300">
                      {person.role}
                    </p>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {/* Choose as Inspector for current walkthrough */}
                    {onSelectInspector && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          onSelectInspector(person);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-600/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                        title={t.inspectorBar.selectInspector}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{t.inspectorBar.selectInspector}</span>
                      </button>
                    )}

                    {/* Set Default */}
                    {!person.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(person)}
                        className="p-1.5 bg-slate-900 hover:bg-indigo-600 text-slate-400 hover:text-white border border-slate-700 rounded-lg transition-colors"
                        title={t.personnelModal.setDefaultTitle}
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(person)}
                      className="p-1.5 bg-slate-900 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-colors"
                      title={t.personnelModal.editBtn}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDelete(person)}
                      className="p-1.5 bg-slate-900 hover:bg-red-600 text-slate-400 hover:text-white border border-slate-700 rounded-lg transition-colors"
                      title={t.personnelModal.deleteBtn}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-850 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <span>
            {t.personnelModal.totalCount} <strong className="text-slate-200">{personnel.length}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};

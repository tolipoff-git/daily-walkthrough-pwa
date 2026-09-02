import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Printer,
  Download,
  Eye
} from 'lucide-react';
import { InspectionSession } from '../types/inspection';
import { exportInspectionToExcel } from '../utils/exportExcel';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../i18n/LanguageContext';

interface ExportModalProps {
  session: InspectionSession;
  onClose: () => void;
  onSaveToHistory: (session: InspectionSession) => void;
  onOpenPrintPreview?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  session,
  onClose,
  onSaveToHistory,
  onOpenPrintPreview,
}) => {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'xlsx' | 'print'>('xlsx');

  const handleDownloadXlsx = () => {
    triggerHaptic();
    onSaveToHistory(session);
    exportInspectionToExcel(session, language);
  };

  const handleTriggerPrint = () => {
    triggerHaptic();
    onSaveToHistory(session);
    // Unmount modal from DOM before printing to ensure pristine print snapshot
    onClose();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 animate-fade-in print:hidden"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-850 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                {t.exportModal.title}
              </h2>
              <p className="text-xs text-slate-400">
                {t.exportModal.subtitle}
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

        {/* Tab Navigation */}
        <div className="px-5 pt-3 bg-slate-900 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('xlsx')}
            className={`px-3.5 py-2 rounded-t-xl border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'xlsx'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/80 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.exportModal.tabXlsx}</span>
          </button>

          <button
            onClick={() => setActiveTab('print')}
            className={`px-3.5 py-2 rounded-t-xl border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'print'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/80 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>{t.exportModal.tabPrint}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* TAB 1: EXCEL XLSX */}
          {activeTab === 'xlsx' && (
            <div className="space-y-4">
              <div className="bg-slate-850 border border-slate-755 p-5 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-400 shrink-0">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-white mb-1">
                      {t.exportModal.xlsxHeading}
                    </h3>
                    <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                      {t.exportModal.xlsxSub}
                    </p>

                    <ul className="space-y-2 text-xs text-slate-300 mb-6">
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>{t.exportModal.xlsxSheet1Desc}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                        <span>{t.exportModal.xlsxSheet2Desc}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        <span>{t.exportModal.xlsxSheet3Desc}</span>
                      </li>
                    </ul>

                    <button
                      onClick={handleDownloadXlsx}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/60 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>{t.exportModal.downloadXlsx}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRINT / PDF */}
          {activeTab === 'print' && (
            <div className="space-y-4">
              <div className="bg-slate-850 border border-slate-755 p-5 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-950 border border-blue-700 flex items-center justify-center text-blue-400 shrink-0">
                    <Printer className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-white mb-1">
                      {t.exportModal.printHeading}
                    </h3>
                    <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                      {t.exportModal.printSub}
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={handleTriggerPrint}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-blue-950/60 transition-all"
                      >
                        <Printer className="w-4 h-4" />
                        <span>{t.exportModal.printBtn}</span>
                      </button>

                      {onOpenPrintPreview && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenPrintPreview();
                          }}
                          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-2 border border-slate-700 transition-all"
                        >
                          <Eye className="w-4 h-4 text-indigo-400" />
                          <span>{language === 'ru' ? 'Предпросмотр на экране' : 'Preview Layout on Screen'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-850 border-t border-slate-700 flex items-center justify-end">
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

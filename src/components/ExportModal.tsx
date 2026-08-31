import React, { useState, useRef, useMemo } from 'react';
import { 
  X, 
  FileText, 
  FileSpreadsheet, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  Upload, 
  Database
} from 'lucide-react';
import { InspectionSession } from '../types/inspection';
import { generatePlaintextReport } from '../utils/exportPlaintext';
import { exportInspectionToExcel } from '../utils/exportExcel';
import { exportInspectionToJson, importInspectionFromJson } from '../utils/exportJson';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../i18n/LanguageContext';

interface ExportModalProps {
  session: InspectionSession;
  onClose: () => void;
  onRestoreSession: (session: InspectionSession) => void;
  onSaveToHistory: (session: InspectionSession) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  session,
  onClose,
  onRestoreSession,
  onSaveToHistory,
}) => {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'txt' | 'xlsx' | 'print' | 'json'>('txt');
  const [copied, setCopied] = useState(false);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const plaintextReport = useMemo(() => {
    return generatePlaintextReport(session, language);
  }, [session, language]);

  const handleCopyText = async () => {
    triggerHaptic();
    try {
      await navigator.clipboard.writeText(plaintextReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = plaintextReport;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadTxt = () => {
    triggerHaptic();
    onSaveToHistory(session);
    const blob = new Blob([plaintextReport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EHS_Walkthrough_${session.date}_${session.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadXlsx = () => {
    triggerHaptic();
    onSaveToHistory(session);
    exportInspectionToExcel(session, language);
  };

  const handleDownloadJson = () => {
    triggerHaptic();
    exportInspectionToJson(session);
  };

  const handleTriggerPrint = () => {
    triggerHaptic();
    onSaveToHistory(session);
    window.print();
  };

  const handleJsonUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = await importInspectionFromJson(file);
      onRestoreSession(parsed);
      triggerHaptic([50, 50]);
      alert(t.exportModal.jsonSuccessAlert);
      onClose();
    } catch (err: any) {
      alert(`${t.exportModal.jsonErrorAlert} ${err?.message || err}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 animate-fade-in">
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
            onClick={() => setActiveTab('txt')}
            className={`px-3.5 py-2 rounded-t-xl border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'txt'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/80 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{t.exportModal.tabTxt}</span>
          </button>

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

          <button
            onClick={() => setActiveTab('json')}
            className={`px-3.5 py-2 rounded-t-xl border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'json'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/80 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>{t.exportModal.tabJson}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* TAB 1: PLAINTEXT ASCII */}
          {activeTab === 'txt' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-850 p-3 rounded-xl border border-slate-755 text-xs">
                <span className="text-slate-300">
                  {t.exportModal.txtDescription}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyText}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? t.common.copied : t.common.copy}</span>
                  </button>
                  <button
                    onClick={handleDownloadTxt}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-md transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t.exportModal.downloadTxt}</span>
                  </button>
                </div>
              </div>

              {/* ASCII Preview Box */}
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto select-all leading-relaxed max-h-[50vh]">
                {plaintextReport}
              </pre>
            </div>
          )}

          {/* TAB 2: EXCEL XLSX */}
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

          {/* TAB 3: PRINT / PDF */}
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
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: JSON BACKUP / RESTORE */}
          {activeTab === 'json' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export JSON */}
                <div className="bg-slate-850 border border-slate-700 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-emerald-400" />
                      {t.exportModal.jsonExportHeading}
                    </h4>
                    <p className="text-xs text-slate-400 mb-4">
                      {t.exportModal.jsonExportSub}
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadJson}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 border border-slate-600 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.exportModal.downloadJson}</span>
                  </button>
                </div>

                {/* Import JSON */}
                <div className="bg-slate-850 border border-slate-700 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-blue-400" />
                      {t.exportModal.jsonImportHeading}
                    </h4>
                    <p className="text-xs text-slate-400 mb-4">
                      {t.exportModal.jsonImportSub}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".json,application/json"
                    ref={jsonInputRef}
                    className="hidden"
                    onChange={(e) => handleJsonUpload(e.target.files?.[0])}
                  />
                  <button
                    onClick={() => jsonInputRef.current?.click()}
                    className="w-full py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 border border-blue-500/50 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{t.exportModal.selectJson}</span>
                  </button>
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

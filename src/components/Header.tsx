import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  Download, 
  FileSpreadsheet, 
  History, 
  AlertTriangle, 
  Sparkles, 
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { InspectionMetrics } from '../types/inspection';
import { triggerHaptic } from '../utils/haptics';

interface HeaderProps {
  metrics: InspectionMetrics;
  onOpenExport: () => void;
  onOpenHistory: () => void;
  onOpenActionPlan: () => void;
  onLoadDemo: () => void;
  onReset: () => void;
  onFinish: () => void;
  isFinished: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  metrics,
  onOpenExport,
  onOpenHistory,
  onOpenActionPlan,
  onLoadDemo,
  onReset,
  onFinish,
  isFinished,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!installPrompt) return;
    triggerHaptic();
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Brand & Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-950/40 text-white font-bold shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
                  EHS & 5S Walkthrough
                </h1>
                {/* Online/Offline status pill */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    isOnline
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                  }`}
                  title={isOnline ? 'Работает в сети' : 'Офлайн режим (данные сохраняются локально)'}
                >
                  {isOnline ? (
                    <>
                      <Wifi className="w-2.5 h-2.5" />
                      <span>Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-2.5 h-2.5" />
                      <span>Offline</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden xs:block">
                Итоговый чек-лист ежедневного обхода предприятия
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
            {/* Install PWA Prompt Button */}
            {installPrompt && (
              <button
                onClick={handleInstallPWA}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all animate-bounce"
                title="Установить как PWA приложение"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Установить PWA</span>
              </button>
            )}

            {/* Action Log / CAPA button */}
            <button
              onClick={() => {
                triggerHaptic();
                onOpenActionPlan();
              }}
              className={`relative px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                metrics.failed > 0
                  ? 'bg-red-950/60 text-red-300 border-red-800 hover:bg-red-900/80'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Журнал выявленных замечаний и корректирующих мер (CAPA)"
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${metrics.failed > 0 ? 'text-red-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">Замечания</span>
              {metrics.failed > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.2 min-w-4 text-[10px] font-bold bg-red-600 text-white rounded-full">
                  {metrics.failed}
                </span>
              )}
            </button>

            {/* History button */}
            <button
              onClick={() => {
                triggerHaptic();
                onOpenHistory();
              }}
              className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
              title="История сохраненных обходов"
            >
              <History className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">История</span>
            </button>

            {/* Demo Data button */}
            <button
              onClick={() => {
                triggerHaptic();
                onLoadDemo();
              }}
              className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-indigo-950 text-indigo-300 border border-indigo-900/60 hover:border-indigo-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
              title="Заполнить реалистичными демо-данными"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden lg:inline">Демо-данные</span>
            </button>

            {/* Reset button */}
            <button
              onClick={() => {
                triggerHaptic();
                onReset();
              }}
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all"
              title="Сбросить текущий обход"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Сброс</span>
            </button>

            {/* Export & Report Button */}
            <button
              onClick={() => {
                triggerHaptic();
                onOpenExport();
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-950/50 transition-all"
              title="Экспорт отчета (Excel, Plaintext, PDF Print, JSON)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Отчет / Экспорт</span>
            </button>

            {/* Finish / Complete Button */}
            <button
              onClick={() => {
                triggerHaptic();
                onFinish();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                isFinished
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50 cursor-default'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-950/50 active:scale-95'
              }`}
              title={isFinished ? 'Обход завершен' : 'Зафиксировать время окончания и завершить'}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-300" />
              <span>{isFinished ? 'Завершен' : 'Завершить'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

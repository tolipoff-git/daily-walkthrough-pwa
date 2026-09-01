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
  CheckCircle2,
  GitCommit,
  Users,
  ShieldAlert,
  Cloud,
  CloudRain,
  RefreshCw
} from 'lucide-react';
import { InspectionMetrics } from '../types/inspection';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../i18n/LanguageContext';
import { APP_VERSION, COMMIT_HASH, COMMIT_URL } from '../version';
import { SyncStatus } from '../hooks/useCloudSync';

interface HeaderProps {
  metrics: InspectionMetrics;
  onOpenExport: () => void;
  onOpenHistory: () => void;
  onOpenActionPlan: () => void;
  onOpenPersonnel?: () => void;
  onOpenSafetyRef?: () => void;
  onOpenSync?: () => void;
  syncStatus?: SyncStatus;
  syncRoom?: string;
  onReset: () => void;
  onFinish: () => void;
  isFinished: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  metrics,
  onOpenExport,
  onOpenHistory,
  onOpenActionPlan,
  onOpenPersonnel,
  onOpenSafetyRef,
  onOpenSync,
  syncStatus = 'synced',
  syncRoom = 'FSE-MAIN',
  onReset,
  onFinish,
  isFinished,
}) => {
  const { language, setLanguage, t } = useLanguage();

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
          {/* Brand & Logo with Version Link */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-950/40 text-white font-bold shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
                  {t.common.appName}
                </h1>

                {/* Clickable Version badge linking to GitHub commit */}
                <a
                  href={COMMIT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 border border-slate-700 hover:border-indigo-500 transition-colors"
                  title={`GitHub Commit: ${COMMIT_HASH}`}
                >
                  <GitCommit className="w-2.5 h-2.5" />
                  <span>{APP_VERSION} ({COMMIT_HASH})</span>
                </a>

                {/* Online/Offline status pill */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    isOnline
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                  }`}
                  title={isOnline ? t.common.onlineTitle : t.common.offlineTitle}
                >
                  {isOnline ? (
                    <>
                      <Wifi className="w-2.5 h-2.5" />
                      <span>{t.common.online}</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-2.5 h-2.5" />
                      <span>{t.common.offline}</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden xs:block">
                {t.common.appSubtitle}
              </p>
            </div>
          </div>

          {/* Action Buttons & Language Switcher */}
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
            {/* Prominent Bilingual Language Toggle */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-750 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setLanguage('ru');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                  language === 'ru'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 scale-102'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={language === 'ru' ? 'Переключить интерфейс на Русский язык' : 'Switch to Russian'}
              >
                <span>RU</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setLanguage('en');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                  language === 'en'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 scale-102'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={language === 'ru' ? 'Переключить интерфейс на Английский язык' : 'Switch to English'}
              >
                <span>ENG</span>
              </button>
            </div>

            {/* Install PWA Prompt Button */}
            {installPrompt && (
              <button
                onClick={handleInstallPWA}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all animate-bounce"
                title={t.common.installPwa}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.common.installPwa}</span>
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
              title={t.common.actionPlanTitle}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${metrics.failed > 0 ? 'text-red-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">{t.common.actionPlan}</span>
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
              title={t.common.historyTitle}
            >
              <History className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">{t.common.history}</span>
            </button>

            {/* Personnel Directory button */}
            {onOpenPersonnel && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onOpenPersonnel();
                }}
                className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                title={language === 'ru' ? 'Справочник персонала (инспекторы, мастера, руководители)' : 'Staff & Personnel Directory (Inspectors, Supervisors)'}
              >
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden md:inline">{language === 'ru' ? 'Персонал' : 'Staff'}</span>
              </button>
            )}

            {/* FSE Safety Reference button */}
            {onOpenSafetyRef && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onOpenSafetyRef();
                }}
                className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-amber-950/60 text-amber-300 border border-amber-900/60 hover:border-amber-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                title={language === 'ru' ? 'Справочник стандартов безопасности FSE (HazCom, GHS 9 пиктограмм, СИЗ, SDS)' : 'FSE Safety Standards Guide (OSHA HazCom, 9 GHS Pictograms, PPE rules, SDS)'}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">{language === 'ru' ? 'Справочник EHS' : 'FSE Safety'}</span>
              </button>
            )}

            {/* Live Sync Status & Room Button */}
            {onOpenSync && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onOpenSync();
                }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  syncStatus === 'syncing'
                    ? 'bg-blue-950/60 text-blue-300 border-blue-800 animate-pulse'
                    : syncStatus === 'offline'
                    ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                    : 'bg-slate-800 hover:bg-cyan-950/50 text-cyan-300 border-slate-700 hover:border-cyan-700'
                }`}
                title={language === 'ru' ? `Онлайн-синхронизация активна (Комната: ${syncRoom}). Кликните для подключения телефона.` : `Live Cloud Sync Active (Room: ${syncRoom}). Click to connect phone.`}
              >
                {syncStatus === 'syncing' ? (
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                ) : syncStatus === 'offline' ? (
                  <CloudRain className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span className="hidden md:inline">
                  {syncStatus === 'syncing' 
                    ? (language === 'ru' ? 'Синхронизация...' : 'Syncing...')
                    : `Sync • ${syncRoom}`}
                </span>
              </button>
            )}

            {/* Reset button */}
            <button
              onClick={() => {
                triggerHaptic();
                onReset();
              }}
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all"
              title={t.common.resetTitle}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">{t.common.reset}</span>
            </button>

            {/* Export & Report Button */}
            <button
              onClick={() => {
                triggerHaptic();
                onOpenExport();
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-950/50 transition-all"
              title={t.common.exportTitle}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{t.common.export}</span>
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
              title={isFinished ? t.common.finishedTitle : t.common.finishTitle}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-300" />
              <span>{isFinished ? t.common.finished : t.common.finish}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

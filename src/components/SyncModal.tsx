import React, { useState } from 'react';
import { 
  Cloud, 
  RefreshCw, 
  Copy, 
  Check, 
  X, 
  QrCode, 
  WifiOff, 
  Radio,
  Camera
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { triggerHaptic } from '../utils/haptics';
import { SyncStatus } from '../hooks/useCloudSync';
import { QrScannerModal } from './QrScannerModal';
import { buildSyncQrPayload } from '../utils/syncApi';

interface SyncModalProps {
  onClose: () => void;
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  syncRoom: string;
  onSetSyncRoom: (room: string) => void;
  syncToken: string;
  onSetSyncToken: (token: string) => void;
  onForcePush: () => void;
  onForcePull: () => void;
  isOnline: boolean;
  deviceId: string;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  onClose,
  syncStatus,
  lastSyncedAt,
  syncRoom,
  onSetSyncRoom,
  syncToken,
  onSetSyncToken,
  onForcePush,
  onForcePull,
  isOnline,
  deviceId,
}) => {
  const { language } = useLanguage();
  const isRu = language === 'ru';
  const [roomInput, setRoomInput] = useState(syncRoom);
  const [tokenInput, setTokenInput] = useState(syncToken);
  const [copied, setCopied] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNoticeMsg(msg);
    setTimeout(() => setNoticeMsg(null), 4000);
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://daily-walkthrough-pwa.tolipoff.workers.dev';
  const syncUrl = baseUrl && syncRoom ? buildSyncQrPayload(syncRoom, syncToken) || baseUrl : '';
  const qrApiUrl = syncUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(syncUrl)}&bgcolor=0f172a&color=38bdf8&margin=6`
    : '';

  const handleCopyLink = () => {
    triggerHaptic(30);
    if (!syncUrl) return;
    navigator.clipboard.writeText(syncUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomInput.trim()) return;
    triggerHaptic();
    onSetSyncRoom(roomInput.trim().toUpperCase());
    if (!syncToken) {
      showNotice(isRu
        ? '⚠ Установите секретный токен комнаты ниже — без него синхронизация не работает'
        : '⚠ Set the room secret token below — sync stays disabled without it');
    }
  };

  const generateToken = () => {
    const gen = `tk-${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    setTokenInput(gen);
    onSetSyncToken(gen);
    triggerHaptic(30);
    showNotice(isRu
      ? '🔑 Токен сгенерирован. Передайте этот же токен на другие устройства этой комнаты.'
      : '🔑 Token generated. Give this exact token to the other devices in this room.');
  };

  const handleSaveToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    triggerHaptic(30);
    onSetSyncToken(tokenInput.trim());
    showNotice(isRu
      ? 'Токен сохранен. Синхронизация активирована.'
      : 'Token saved. Sync is now active.');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-fade-in print:hidden"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative max-w-2xl w-full bg-slate-900 border border-slate-750 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{isRu ? 'Онлайн-синхронизация (Live Sync)' : 'Cloud Live Synchronization'}</span>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-semibold animate-pulse">
                  <Radio className="w-2.5 h-2.5" />
                  {isRu ? 'В реальном времени' : 'Real-time'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isRu 
                  ? 'Мгновенный обмен данными между телефоном и компьютером' 
                  : 'Seamless two-way live synchronization between Phone & Desktop'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Status Indicator Card */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${
                !syncRoom || !syncToken
                  ? 'bg-amber-950/60 border-amber-800 text-amber-400'
                  : !isOnline
                  ? 'bg-amber-950/60 border-amber-800 text-amber-400'
                  : syncStatus === 'syncing'
                  ? 'bg-blue-950/60 border-blue-800 text-blue-400 animate-spin'
                  : 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
              }`}>
                {!syncRoom || !syncToken ? <Radio className="w-5 h-5" /> : !isOnline ? <WifiOff className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
              </div>

              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  {!syncRoom || !syncToken
                    ? (isRu ? 'Синхронизация отключена' : 'Sync Disabled')
                    : !isOnline
                    ? (isRu ? 'Автономный режим (Офлайн)' : 'Offline Mode (Local Storage)')
                    : syncStatus === 'syncing'
                    ? (isRu ? 'Идет синхронизация с облаком...' : 'Syncing with cloud...')
                    : (isRu ? 'Синхронизировано в облаке' : 'Fully Synced with Cloud')}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {!syncRoom || !syncToken
                    ? (isRu
                        ? 'Укажите комнату и секретный токен ниже, чтобы включить синхронизацию'
                        : 'Set a room code and the shared secret token below to enable sync')
                    : lastSyncedAt
                    ? `${isRu ? 'Последняя синхронизация:' : 'Last synced:'} ${lastSyncedAt.toLocaleTimeString()}`
                    : (isRu ? 'Готово к передаче данных' : 'Ready to sync')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onForcePull();
                }}
                disabled={!syncRoom || !syncToken}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title={isRu ? 'Получить свежие данные из облака' : 'Pull latest changes from cloud'}
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isRu ? 'Обновить' : 'Pull'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onForcePush();
                }}
                disabled={!syncRoom || !syncToken}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                title={isRu ? 'Принудительно отправить текущую сессию в облако' : 'Force push current session to cloud'}
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>{isRu ? 'Отправить' : 'Push'}</span>
              </button>
            </div>
          </div>

          {/* Connect Phone Section with QR Code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <div className="flex flex-col items-center justify-center p-3 bg-slate-900 border border-slate-750 rounded-xl text-center">
              <div className="relative p-2 bg-slate-950 rounded-lg border border-cyan-800/60 shadow-inner">
                {qrApiUrl ? (
                  <img 
                    src={qrApiUrl} 
                    alt="Sync QR Code" 
                    className="w-40 h-40 object-contain rounded"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-40 h-40 flex items-center justify-center text-[11px] text-slate-500 px-3 text-center">
                    {isRu
                      ? 'Задайте комнату и токен, чтобы показать QR-код'
                      : 'Set room + token to show the QR code'}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-medium">
                <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                {isRu ? 'QR-код содержит комнату и токен — одно сканирование настраивает телефон' : 'QR carries room + token — one scan pairs your phone'}
              </p>

              {/* In-App Camera Scanner Button */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setShowScanner(true);
                }}
                className="mt-3 w-full px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>{isRu ? '📷 Сканировать QR камерой PWA' : '📷 Scan QR with In-App Camera'}</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-white text-sm block mb-1">
                  📱 {isRu ? 'Как это работает:' : 'How Live Sync Works:'}
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {isRu
                    ? '1. На ноутбуке откройте Синхронизацию, задайте комнату и токен — QR-код ниже.'
                    : '1. On your laptop open Sync, set room + token — QR below.'}
                </p>
                <p className="text-slate-300 leading-relaxed">
                  {isRu
                    ? '2. Отсканируйте QR-код камерой телефона (или камерой PWA). Комната и токен применятся автоматически.'
                    : '2. Scan the QR with your phone camera (or the in-app camera). Room + token apply automatically.'}
                </p>
                <p className="text-slate-300 leading-relaxed">
                  {isRu
                    ? '3. Все отметки, сделанные во время обхода на телефоне, автоматически появляются на мониторе компьютера за 1-2 секунды.'
                    : '3. Checkmarks and notes made on your phone appear live on your desktop monitor within 1-2 seconds.'}
                </p>
                <p className="text-slate-300 leading-relaxed">
                  {isRu
                    ? '4. Если внести правки на компьютере — телефон мгновенно обновляет свой экран.'
                    : '4. Edits made on desktop immediately update the phone screen.'}
                </p>
              </div>

              {/* Direct Link Box */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  {isRu ? 'Прямая ссылка для синхронизации:' : 'Direct Live Sync Link:'}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={syncUrl}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 text-xs font-mono select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shrink-0 ${
                      copied 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? (isRu ? 'Скопировано!' : 'Copied!') : (isRu ? 'Копировать' : 'Copy')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sync Room Code Selector */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl">
            <form onSubmit={handleSaveRoom} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-0.5">
                  {isRu ? 'Код комнаты синхронизации (Sync Room):' : 'Active Sync Room Code:'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {isRu 
                    ? 'Устройства с одинаковым кодом комнаты работают в одной общей сессии.' 
                    : 'Devices with the same room code share the exact same live session.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                  placeholder="FSE-MAIN"
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono font-bold text-xs uppercase focus:outline-none focus:border-cyan-500 w-32 text-center"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg transition-colors"
                >
                  {isRu ? 'Применить' : 'Apply'}
                </button>
              </div>
            </form>
          </div>

          {/* Shared-Secret Token (required for sync) */}
          <div className="p-4 bg-slate-950/80 border border-amber-800/60 rounded-xl">
            <form onSubmit={handleSaveToken} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-0.5 flex items-center gap-1.5">
                  🔑 {isRu ? 'Секретный токен комнаты (обязательно)' : 'Room Secret Token (required)'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {isRu 
                    ? 'Первый, кто включит синхронизацию, задает токен — остальные устройства должны ввести тот же токен. Без токена синхронизация отключена и данные не отправляются.'
                    : 'The first device to enable sync sets the token — all others must enter the same one. Without a token, sync stays disabled and no data is sent.'}
                </p>
                {!syncToken && (
                  <p className="text-[11px] font-semibold text-amber-400 mt-1">
                    {isRu ? '⚠ Синхронизация отключена: токен не задан' : '⚠ Sync disabled: no token set'}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="tk-..."
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono font-bold text-xs focus:outline-none focus:border-amber-500 w-36"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  {isRu ? 'Сохранить' : 'Save'}
                </button>
              </div>
            </form>
            <button
              type="button"
              onClick={generateToken}
              className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              {isRu ? '🎲 Сгенерировать надежный токен' : '🎲 Generate a strong token'}
            </button>
          </div>

          {/* In-Modal Toast / Notice */}
          {noticeMsg && (
            <div className="p-3 bg-slate-800 border border-cyan-800/60 rounded-xl text-xs text-slate-100 animate-fade-in">
              {noticeMsg}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            {isRu ? 'ID Устройства:' : 'Device ID:'} {deviceId.substring(0, 16)}...
          </span>
          <button
            onClick={() => {
              triggerHaptic();
              onClose();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
          >
            {isRu ? 'Закрыть' : 'Close'}
          </button>
        </div>
      </div>

      {/* In-App QR Camera Scanner Modal */}
      {showScanner && (
        <QrScannerModal
          onClose={() => setShowScanner(false)}
          onScanRoom={(room) => {
            onSetSyncRoom(room);
            setRoomInput(room);
            onForcePush();
            setTimeout(() => {
              onForcePull();
            }, 500);
          }}
          onScanToken={(token) => {
            if (token) {
              onSetSyncToken(token);
              setTokenInput(token);
            }
          }}
        />
      )}
    </div>
  );
};

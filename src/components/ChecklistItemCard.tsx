import React, { useState, useRef } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Camera, 
  Trash2, 
  ZoomIn, 
  MapPin, 
  Calendar, 
  Repeat, 
  MessageSquare,
  Upload
} from 'lucide-react';
import { 
  ChecklistItem, 
  InspectionStatus, 
  Priority, 
  Assignee, 
  DefectPhoto, 
  DefectDetails 
} from '../types/inspection';
import { compressImage } from '../utils/imageCompressor';
import { triggerHaptic } from '../utils/haptics';

interface ChecklistItemCardProps {
  item: ChecklistItem;
  onSetStatus: (itemId: string, status: InspectionStatus) => void;
  onUpdateDefect: (itemId: string, updates: Partial<DefectDetails>) => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
  onAddPhoto: (itemId: string, photo: DefectPhoto) => void;
  onRemovePhoto: (itemId: string, photoId: string) => void;
  onPreviewPhoto: (photo: DefectPhoto, location?: string, itemTitle?: string) => void;
}

const ZONE_PRESETS = [
  'Цех №1 (Металлообработка)',
  'Цех №2 (Сборка & Упаковка)',
  'Склад ГП (Ряды 1-10)',
  'Склад сырья & Комплектации',
  'Зона доков / Рампа №1-4',
  'Зарядная станция АКБ',
  'Электрощитовая / ВРУ',
  'Наружный периметр & КПП',
];

const ASSIGNEES: Assignee[] = [
  'Maintenance',
  'Logistics',
  'Facilities',
  'Safety & EHS',
  'Production',
  'Warehouse',
  'Quality',
  'Cleaning',
];

export const ChecklistItemCard: React.FC<ChecklistItemCardProps> = ({
  item,
  onSetStatus,
  onUpdateDefect,
  onUpdateNotes,
  onAddPhoto,
  onRemovePhoto,
  onPreviewPhoto,
}) => {
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showPassNoteInput, setShowPassNoteInput] = useState(Boolean(item.itemNotes));
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const defect = item.defectDetails || {
    location: '',
    zonePreset: '',
    description: '',
    priority: 'P2' as Priority,
    assignedTo: 'Maintenance' as Assignee,
    targetDate: 'Today',
    photos: [],
    isRepeatIssue: false,
    resolutionStatus: 'Open' as const,
  };

  const handleStatusChange = (newStatus: InspectionStatus) => {
    triggerHaptic(newStatus === 'FAIL' ? [50, 50] : 25);
    onSetStatus(item.id, newStatus);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingPhoto(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedBase64 = await compressImage(file);
        const newPhoto: DefectPhoto = {
          id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          url: compressedBase64,
          caption: `${item.id} - ${defect.location || 'Дефект'}`,
          timestamp: new Date().toISOString(),
        };
        onAddPhoto(item.id, newPhoto);
      }
      triggerHaptic(30);
    } catch (err) {
      console.error('Photo compression error:', err);
      alert('Ошибка при обработке фотографии');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Status visual state
  const getCardBorder = () => {
    if (item.status === 'PASS') return 'border-emerald-500/50 bg-slate-900/90 shadow-emerald-950/20';
    if (item.status === 'FAIL') return 'border-red-500 bg-slate-900 shadow-red-950/40 ring-1 ring-red-500/30';
    if (item.status === 'NA') return 'border-slate-700 bg-slate-900/60 opacity-85';
    return 'border-slate-800 bg-slate-850 hover:border-slate-700';
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 shadow-lg p-4 sm:p-5 mb-4 ${getCardBorder()}`}
      id={`item-${item.id}`}
    >
      {/* Top Header Row: Item ID, Title, Guidelines toggle */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-black font-mono bg-slate-800 text-emerald-400 border border-slate-700">
              {item.id}
            </span>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {item.categoryTitleRu}
            </span>

            {item.status === 'FAIL' && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                  defect.priority === 'P1'
                    ? 'bg-red-600 text-white animate-pulse'
                    : defect.priority === 'P2'
                    ? 'bg-amber-600 text-white'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {defect.priority === 'P1' ? 'P1 • Критично' : defect.priority === 'P2' ? 'P2 • Смена' : 'P3 • Планово'}
              </span>
            )}

            {defect.isRepeatIssue && item.status === 'FAIL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                <Repeat className="w-2.5 h-2.5" />
                Повторно
              </span>
            )}
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
            {item.titleRu}
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
            {item.standardRu}
          </p>
        </div>

        {/* 3-Button Status Toggle */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shrink-0 self-start">
          {/* PASS Button */}
          <button
            type="button"
            onClick={() => handleStatusChange('PASS')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              item.status === 'PASS'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60 scale-102 ring-1 ring-emerald-400'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80'
            }`}
            title="Отметить как Соответствует (PASS)"
          >
            <CheckCircle2 className={`w-4 h-4 ${item.status === 'PASS' ? 'text-white' : 'text-emerald-500'}`} />
            <span>PASS</span>
          </button>

          {/* FAIL Button */}
          <button
            type="button"
            onClick={() => handleStatusChange('FAIL')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              item.status === 'FAIL'
                ? 'bg-red-600 text-white shadow-md shadow-red-950/60 scale-102 ring-1 ring-red-400'
                : 'text-slate-400 hover:text-red-400 hover:bg-slate-800/80'
            }`}
            title="Зафиксировать дефект / несоответствие (FAIL)"
          >
            <XCircle className={`w-4 h-4 ${item.status === 'FAIL' ? 'text-white' : 'text-red-500'}`} />
            <span>FAIL</span>
          </button>

          {/* NA Button */}
          <button
            type="button"
            onClick={() => handleStatusChange('NA')}
            className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              item.status === 'NA'
                ? 'bg-slate-700 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
            title="Не применимо к данной зоне (N/A)"
          >
            <MinusCircle className="w-4 h-4 text-slate-400" />
            <span>N/A</span>
          </button>
        </div>
      </div>

      {/* Collapsible Guidelines / Inspection Tips */}
      {item.guidelines && item.guidelines.length > 0 && (
        <div className="mt-2.5">
          <button
            type="button"
            onClick={() => setShowGuidelines(!showGuidelines)}
            className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
          >
            <HelpCircle className="w-3 h-3" />
            <span>{showGuidelines ? 'Скрыть контрольные точки' : 'Что проверять (критерии аудита)'}</span>
            {showGuidelines ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showGuidelines && (
            <div className="mt-2 p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 animate-fade-in space-y-1.5">
              <span className="font-semibold text-slate-400 block mb-1">Чек-лист для инспектора:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {item.guidelines.map((g, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* INLINE DEFECT LOGGING DRAWER (WHEN STATUS === FAIL) */}
      {item.status === 'FAIL' && (
        <div className="mt-4 pt-4 border-t border-red-900/60 bg-red-950/15 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-4 sm:p-5 rounded-b-2xl animate-fade-in">
          <div className="flex items-center gap-2 mb-3 text-red-400">
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wide">
              Карточка несоответствия & План действий (CAPA)
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            {/* 1. Priority Toggle */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Уровень критичности (Приоритет)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    onUpdateDefect(item.id, { priority: 'P1' });
                  }}
                  className={`py-2 px-2 rounded-xl font-bold flex flex-col items-center justify-center gap-0.5 border transition-all ${
                    defect.priority === 'P1'
                      ? 'bg-red-600 text-white border-red-400 shadow-md shadow-red-950/60'
                      : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-red-600'
                  }`}
                >
                  <span className="text-xs font-black">P1</span>
                  <span className="text-[10px] leading-tight">Критично</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    onUpdateDefect(item.id, { priority: 'P2' });
                  }}
                  className={`py-2 px-2 rounded-xl font-bold flex flex-col items-center justify-center gap-0.5 border transition-all ${
                    defect.priority === 'P2'
                      ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-950/60'
                      : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-amber-600'
                  }`}
                >
                  <span className="text-xs font-black">P2</span>
                  <span className="text-[10px] leading-tight">В смену</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    onUpdateDefect(item.id, { priority: 'P3' });
                  }}
                  className={`py-2 px-2 rounded-xl font-bold flex flex-col items-center justify-center gap-0.5 border transition-all ${
                    defect.priority === 'P3'
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-950/60'
                      : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-blue-600'
                  }`}
                >
                  <span className="text-xs font-black">P3</span>
                  <span className="text-[10px] leading-tight">Планово</span>
                </button>
              </div>
            </div>

            {/* 2. Assignee */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Ответственное подразделение / Исполнитель
              </label>
              <select
                value={defect.assignedTo}
                onChange={(e) => onUpdateDefect(item.id, { assignedTo: e.target.value as Assignee })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-medium focus:outline-none focus:border-red-500"
              >
                {ASSIGNEES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Zone / Specific Location with quick chips */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-300 font-semibold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  Точная локация / Место обнаружения
                </label>
              </div>

              {/* Quick preset chips */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {ZONE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      onUpdateDefect(item.id, {
                        location: defect.location ? `${defect.location}, ${preset}` : preset,
                      });
                    }}
                    className="text-[10px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-2 py-1 rounded-lg border border-slate-700 transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={defect.location}
                onChange={(e) => onUpdateDefect(item.id, { location: e.target.value })}
                placeholder="Например: Участок ЧПУ №2, стойка 04-B, проход у ворот №3"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* 4. Defect Description */}
            <div className="md:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1.5">
                Описание замечания / Фактическое состояние
              </label>
              <textarea
                rows={2}
                value={defect.description}
                onChange={(e) => onUpdateDefect(item.id, { description: e.target.value })}
                placeholder="Опишите, что именно нарушено, риск и требуемое действие..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 leading-relaxed"
              />
            </div>

            {/* 5. Target Date & Repeat Issue */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                Срок устранения (Target Date)
              </label>
              <select
                value={defect.targetDate}
                onChange={(e) => onUpdateDefect(item.id, { targetDate: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-red-500"
              >
                <option value="Today">Сегодня (Немедленно / До конца смены)</option>
                <option value="Tomorrow AM">Завтра утром (08:00)</option>
                <option value="Next Shift">Следующая смена</option>
                <option value="End of Week">До конца недели (3-5 дней)</option>
                <option value="Custom">Выбрать точную дату...</option>
              </select>

              {defect.targetDate === 'Custom' && (
                <input
                  type="date"
                  value={defect.customTargetDate || ''}
                  onChange={(e) => onUpdateDefect(item.id, { customTargetDate: e.target.value })}
                  className="mt-2 w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-100 focus:outline-none focus:border-red-500"
                />
              )}
            </div>

            {/* Repeat Issue Toggle */}
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2.5 p-2.5 bg-slate-900 border border-slate-700 rounded-xl cursor-pointer hover:bg-slate-850">
                <input
                  type="checkbox"
                  checked={defect.isRepeatIssue || false}
                  onChange={(e) => onUpdateDefect(item.id, { isRepeatIssue: e.target.checked })}
                  className="w-4 h-4 rounded text-red-600 focus:ring-0 bg-slate-800 border-slate-600 cursor-pointer"
                />
                <span className="text-xs text-slate-200 font-medium select-none">
                  Повторное замечание (хроническая проблема)
                </span>
              </label>
            </div>

            {/* 6. Photo Attachments & Camera Upload */}
            <div className="md:col-span-2 mt-1">
              <div className="flex items-center justify-between mb-2">
                <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  Фотофиксация дефекта ({defect.photos?.length || 0})
                </label>
                <span className="text-[10px] text-slate-400">Сжатие до 1024px JPEG</span>
              </div>

              {/* Photos Gallery Thumbnails */}
              <div className="flex flex-wrap items-center gap-2.5">
                {defect.photos?.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shadow-md"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || 'Thumbnail'}
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => onPreviewPhoto(photo, defect.location, item.titleRu)}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onPreviewPhoto(photo, defect.location, item.titleRu)}
                        className="p-1 bg-slate-900/80 rounded-md text-white hover:bg-slate-900"
                        title="Увеличить"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemovePhoto(item.id, photo.id)}
                        className="p-1 bg-red-600/90 rounded-md text-white hover:bg-red-600"
                        title="Удалить фото"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Camera Capture Button */}
                <button
                  type="button"
                  disabled={isUploadingPhoto}
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500 bg-slate-900/80 hover:bg-slate-900 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-400 transition-all gap-1 text-[10px] font-medium"
                >
                  <Camera className="w-5 h-5 text-emerald-400" />
                  <span>Камера</span>
                </button>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />

                {/* Gallery Upload Button */}
                <button
                  type="button"
                  disabled={isUploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl border border-dashed border-slate-700 hover:border-blue-500 bg-slate-900/80 hover:bg-slate-900 flex flex-col items-center justify-center text-slate-400 hover:text-blue-400 transition-all gap-1 text-[10px] font-medium"
                >
                  <Upload className="w-5 h-5 text-blue-400" />
                  <span>Галерея</span>
                </button>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </div>
            </div>

            {/* 7. Inspector Action Notes */}
            <div className="md:col-span-2 mt-1">
              <label className="block text-slate-300 font-semibold mb-1">
                Комментарий аудитора / Принятые оперативные меры
              </label>
              <input
                type="text"
                value={defect.notes || ''}
                onChange={(e) => onUpdateDefect(item.id, { notes: e.target.value })}
                placeholder="Например: Уведомлен начальник смены, выставлен сигнальный конус..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Optional Note field for PASS / NA items */}
      {item.status !== 'FAIL' && item.status !== 'PENDING' && (
        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
          {!showPassNoteInput ? (
            <button
              type="button"
              onClick={() => setShowPassNoteInput(true)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <MessageSquare className="w-3 h-3 text-slate-500" />
              <span>Добавить примечание / наблюдение 5S</span>
            </button>
          ) : (
            <div className="w-full flex items-center gap-2 animate-fade-in">
              <input
                type="text"
                value={item.itemNotes || ''}
                onChange={(e) => onUpdateNotes(item.id, e.target.value)}
                placeholder="Примечание к данному пункту (например: проведена влажная уборка)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => {
                  onUpdateNotes(item.id, '');
                  setShowPassNoteInput(false);
                }}
                className="text-xs text-slate-500 hover:text-slate-300 p-1"
                title="Очистить"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

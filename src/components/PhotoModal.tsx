import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, ZoomIn, ZoomOut } from 'lucide-react';
import { DefectPhoto } from '../types/inspection';
import { useLanguage } from '../i18n/LanguageContext';

interface PhotoModalProps {
  photo: DefectPhoto | null;
  location?: string;
  itemTitle?: string;
  onClose: () => void;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({ photo, location, itemTitle, onClose }) => {
  const { language, t } = useLanguage();
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  // Reset zoom whenever a new photo is opened
  useEffect(() => {
    setIsZoomed(false);
  }, [photo]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!photo) return null;

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fade-in print:hidden"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-slate-800 border-b border-slate-700">
          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-sm font-semibold text-white truncate max-w-md">
              {itemTitle || t.photoModal.defaultTitle}
            </span>
            {location && (
              <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                {location}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsZoomed((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold bg-slate-750 border border-slate-650 shadow-sm"
              title={isZoomed ? t.photoModal.fitToScreen : t.photoModal.zoomIn}
            >
              {isZoomed ? (
                <>
                  <ZoomOut className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">{t.photoModal.fitToScreen}</span>
                </>
              ) : (
                <>
                  <ZoomIn className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">{t.photoModal.actualSize}</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              title={t.common.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Content */}
        <div className="relative flex-1 bg-slate-950 flex items-center justify-center p-2 sm:p-4 overflow-auto min-h-[40vh] max-h-[70vh]">
          <img
            src={photo.url}
            alt={photo.caption || 'Defect capture'}
            onClick={() => setIsZoomed((prev) => !prev)}
            className={`rounded-lg shadow-lg transition-all duration-200 select-none ${
              isZoomed
                ? 'max-h-none max-w-none cursor-zoom-out object-none'
                : 'max-h-[65vh] w-auto max-w-full object-contain cursor-zoom-in'
            }`}
            title={isZoomed ? t.photoModal.zoomOut : t.photoModal.zoomIn}
          />
        </div>

        {/* Footer info */}
        <div className="px-4 sm:px-5 py-3 bg-slate-800 border-t border-slate-700 flex items-center justify-between text-xs text-slate-300">
          <div className="truncate mr-3">
            {photo.caption ? (
              <span className="font-medium text-slate-200">{photo.caption}</span>
            ) : (
              <span className="italic text-slate-500">{t.photoModal.noCaption}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-slate-400 shrink-0">
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date(photo.timestamp).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

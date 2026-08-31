import React from 'react';
import { X, Calendar, MapPin } from 'lucide-react';
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
  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div 
        className="relative max-w-3xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-800 border-b border-slate-700">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white truncate max-w-md">
              {itemTitle || t.photoModal.defaultTitle}
            </span>
            {location && (
              <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                {location}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Content */}
        <div className="relative flex-1 bg-slate-950 flex items-center justify-center p-2 overflow-auto">
          <img
            src={photo.url}
            alt={photo.caption || 'Defect capture'}
            className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
          />
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-slate-800 border-t border-slate-700 flex items-center justify-between text-xs text-slate-300">
          <div>
            {photo.caption ? (
              <span className="font-medium text-slate-200">{photo.caption}</span>
            ) : (
              <span className="italic text-slate-500">{t.photoModal.noCaption}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date(photo.timestamp).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, Flashlight, FlashlightOff, AlertCircle, Aperture } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { triggerHaptic } from '../utils/haptics';
import { captureVideoFrame } from '../utils/imageCompressor';

interface CameraCaptureModalProps {
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

/**
 * In-app camera for defect photos. Deliberately uses getUserMedia instead of
 * <input type="file" capture> because the native camera hand-off crashes some
 * phones at the GPU/driver level (frozen UI, display noise, reboot).
 */
export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({ onClose, onCapture }) => {
  const { language } = useLanguage();
  const isRu = language === 'ru';

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera API not supported');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
        }

        const track = stream.getVideoTracks()[0];
        const capabilities = track?.getCapabilities ? (track.getCapabilities() as any) : {};
        if (capabilities?.torch) setHasTorch(true);
      } catch (err) {
        console.warn('In-app camera error:', err);
        if (active) {
          setCameraError(
            isRu
              ? 'Не удалось открыть камеру. Проверьте разрешение камеры для сайта или используйте кнопку "Галерея".'
              : 'Unable to open the camera. Check camera permission for this site or use the "Gallery" button.'
          );
        }
      }
    }

    startCamera();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [isRu]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !hasTorch) return;
    try {
      const next = !torchEnabled;
      await track.applyConstraints({ advanced: [{ torch: next } as any] });
      setTorchEnabled(next);
      triggerHaptic(20);
    } catch (e) {
      console.warn('Torch toggle error:', e);
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      const dataUrl = captureVideoFrame(video);
      triggerHaptic(50);
      onCapture(dataUrl);
      onClose();
    } catch (err) {
      console.warn('Capture error:', err);
      setCameraError(
        isRu
          ? 'Камера ещё не готова. Подождите секунду и попробуйте снова.'
          : 'Camera is not ready yet. Wait a second and try again.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-6 animate-fade-in print:hidden"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-w-lg w-full bg-slate-900 border border-slate-750 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {isRu ? 'Фото дефекта' : 'Defect Photo'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isRu ? 'Съёмка внутри приложения, без вызова системной камеры' : 'In-app capture, no system camera hand-off'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="relative bg-black flex-1 min-h-[300px] flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center space-y-3 max-w-sm">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
              <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
            </div>
          ) : (
            <>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-md transition-all z-10 ${
                    torchEnabled
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/40'
                      : 'bg-black/60 text-white border border-white/20'
                  }`}
                  aria-label="Toggle Flashlight"
                >
                  {torchEnabled ? <Flashlight className="w-5 h-5" /> : <FlashlightOff className="w-5 h-5" />}
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer: Capture + Cancel */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              triggerHaptic();
              onClose();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-all"
          >
            {isRu ? 'Отмена' : 'Cancel'}
          </button>

          {!cameraError && (
            <button
              onClick={handleCapture}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-950/50 transition-all"
            >
              <Aperture className="w-5 h-5" />
              <span>{isRu ? 'Снять' : 'Capture'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

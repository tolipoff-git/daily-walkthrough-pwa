import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { 
  Camera, 
  X, 
  Flashlight, 
  FlashlightOff, 
  AlertCircle,
  CheckCircle2,
  ScanLine
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { triggerHaptic } from '../utils/haptics';

interface QrScannerModalProps {
  onClose: () => void;
  onScanRoom: (roomCode: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({ onClose, onScanRoom }) => {
  const { language } = useLanguage();
  const isRu = language === 'ru';

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [hasCameraError, setHasCameraError] = useState<string | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [scannedRoom, setScannedRoom] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');

  // Extract room parameter from scanned URL or raw string
  const extractRoomCode = useCallback((raw: string): string => {
    const trimmed = raw.trim();
    try {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const url = new URL(trimmed);
        const room = url.searchParams.get('room') || url.searchParams.get('sync');
        if (room) return room.toUpperCase();
      }
    } catch {
      // Not a full URL, continue parsing
    }

    if (trimmed.includes('room=')) {
      const match = trimmed.match(/room=([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) return match[1].toUpperCase();
    }

    // Default: sanitize alphanumeric room code
    return trimmed.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase() || 'FSE-MAIN';
  }, []);

  const handleDetected = useCallback((rawCode: string) => {
    if (!isScanning) return;
    setIsScanning(false);
    triggerHaptic(50);

    const room = extractRoomCode(rawCode);
    setScannedRoom(room);

    setTimeout(() => {
      onScanRoom(room);
      onClose();
    }, 600);
  }, [isScanning, extractRoomCode, onScanRoom, onClose]);

  // Start Video Stream
  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        setHasCameraError(null);
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API not supported on this device');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
        }

        // Check if torch/flashlight is supported
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = videoTrack.getCapabilities ? (videoTrack.getCapabilities() as any) : {};
          if (capabilities && capabilities.torch) {
            setHasTorch(true);
          }
        }
      } catch (err: any) {
        console.warn('Camera access error:', err);
        setHasCameraError(
          isRu 
            ? 'Не удалось получить доступ к камере. Разрешите доступ в настройках или введите код вручную.' 
            : 'Unable to access camera. Please allow camera permissions or enter room code manually.'
        );
      }
    }

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRu]);

  // Video Frame Scanning Loop
  useEffect(() => {
    if (hasCameraError || !isScanning) return;

    let stopped = false;

    // Check for native BarcodeDetector API first
    const hasNativeBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    let barcodeDetector: any = null;
    if (hasNativeBarcodeDetector) {
      try {
        barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch {
        barcodeDetector = null;
      }
    }

    const scanFrame = async () => {
      if (stopped || !isScanning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        // Try native BarcodeDetector
        if (barcodeDetector) {
          try {
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              handleDetected(barcodes[0].rawValue);
              return;
            }
          } catch {
            // Fallback to jsQR
          }
        }

        // Fallback: jsQR via canvas
        if (canvas) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (qrCode && qrCode.data) {
              handleDetected(qrCode.data);
              return;
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);

    return () => {
      stopped = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [hasCameraError, isScanning, handleDetected]);

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextState = !torchEnabled;
        await track.applyConstraints({
          advanced: [{ torch: nextState } as any],
        });
        setTorchEnabled(nextState);
        triggerHaptic(20);
      } catch (e) {
        console.warn('Torch toggle error:', e);
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    triggerHaptic();
    onScanRoom(manualInput.trim().toUpperCase());
    onClose();
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
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {isRu ? 'Сканирование QR-кода' : 'Scan Live Sync QR'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isRu ? 'Наведите камеру на QR-код с экрана ноутбука' : 'Point camera at the QR code on your desktop screen'}
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
          {hasCameraError ? (
            <div className="p-6 text-center space-y-4 max-w-sm">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
              <p className="text-xs text-slate-300 leading-relaxed">{hasCameraError}</p>
              <form onSubmit={handleManualSubmit} className="space-y-2 pt-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                  placeholder="FSE-MAIN"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold text-center text-sm focus:outline-none focus:border-cyan-500 uppercase"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition-all"
                >
                  {isRu ? 'Подключиться к комнате' : 'Connect to Room'}
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Video Element */}
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover"
                playsInline 
                muted 
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewport Scanner Reticle Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Dark Vignette Mask */}
                <div className="relative w-64 h-64 border-2 border-cyan-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] overflow-hidden">
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />

                  {/* Animated Scanning Laser Line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#22d3ee] animate-scan-laser absolute top-0" />
                </div>
              </div>

              {/* Success Banner when code recognized */}
              {scannedRoom && (
                <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center gap-2 p-6 text-center animate-fade-in z-20">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                  <h4 className="text-base font-bold text-white">
                    {isRu ? 'QR-код распознан!' : 'QR Code Recognized!'}
                  </h4>
                  <p className="text-xs text-emerald-300 font-mono font-bold bg-emerald-900/60 px-3 py-1 rounded-full border border-emerald-700">
                    {scannedRoom}
                  </p>
                </div>
              )}

              {/* Floating Torch Control */}
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

        {/* Footer info and manual fallback */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ScanLine className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{isRu ? 'Сканируйте прямо внутри приложения PWA' : 'Seamless in-app scanning for installed PWA'}</span>
          </div>

          <button
            onClick={() => {
              triggerHaptic();
              onClose();
            }}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-all"
          >
            {isRu ? 'Отмена' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};

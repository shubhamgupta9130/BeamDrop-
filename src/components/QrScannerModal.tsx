import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  X,
  Camera,
  RefreshCw,
  Zap,
  Upload,
  AlertCircle,
  CheckCircle2,
  Flashlight,
  FlashlightOff,
  ScanLine,
} from 'lucide-react';
import { playQrScanSuccess } from '../utils/audioFeedback';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (result: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanResult,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Start video stream when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setIsScanning(true);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Check torch capability
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = (videoTrack.getCapabilities && (videoTrack.getCapabilities() as any)) || {};
      setHasTorch(Boolean(capabilities.torch));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        startScanLoop();
      }
    } catch (err: any) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera access or upload a QR image below.'
          : `Camera error: ${err.message || 'Unable to access camera'}`
      );
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setTorchOn(false);
  };

  // Toggle torch/flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Torch failed', err);
      }
    }
  };

  // Continuous frame scanning loop
  const startScanLoop = () => {
    const scan = () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          handleDetectedCode(code.data);
          return; // Stop scan loop on detection
        }
      }

      animFrameRef.current = requestAnimationFrame(scan);
    };

    animFrameRef.current = requestAnimationFrame(scan);
  };

  const handleDetectedCode = (codeText: string) => {
    playQrScanSuccess();
    setScanSuccess(codeText);
    stopCamera();

    setTimeout(() => {
      onScanResult(codeText);
      onClose();
    }, 900);
  };

  // Fallback: Scan QR from uploaded image file
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleDetectedCode(code.data);
          } else {
            setCameraError('No valid BeamDrop QR code recognized in this image.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <ScanLine className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Scan BeamDrop QR Code
              </h3>
              <p className="text-[11px] text-slate-400">
                Point camera at another device to pair instantly
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close QR scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="relative w-full aspect-square bg-black overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Viewfinder Target Reticle */}
          {isScanning && !cameraError && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* Target box */}
              <div className="relative w-64 h-64 border-2 border-cyan-400/40 rounded-3xl overflow-hidden shadow-2xl">
                {/* 4 Glowing Corner brackets */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-xl"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-xl"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-xl"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-xl"></div>

                {/* Animated Sweeping Laser Line */}
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-pulse absolute top-1/2 -translate-y-1/2"></div>
              </div>

              <span className="mt-4 text-xs font-semibold text-cyan-200 bg-slate-900/80 px-3 py-1 rounded-full border border-cyan-500/30 backdrop-blur-sm">
                Align QR Code inside box
              </span>
            </div>
          )}

          {/* Success Overlay */}
          {scanSuccess && (
            <div className="absolute inset-0 z-30 bg-emerald-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 space-y-3 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-base font-bold text-white">QR Code Detected!</h4>
              <p className="text-xs font-mono text-emerald-300 break-all max-w-xs bg-slate-900/80 p-2 rounded-lg border border-emerald-500/30">
                {scanSuccess}
              </p>
              <p className="text-xs text-slate-300">Pairing device now...</p>
            </div>
          )}

          {/* Error / Fallback display */}
          {cameraError && (
            <div className="absolute inset-0 z-20 bg-slate-950/90 flex flex-col items-center justify-center text-center p-6 space-y-3">
              <AlertCircle className="w-12 h-12 text-amber-400" />
              <p className="text-xs text-slate-300 max-w-xs">{cameraError}</p>
              <button
                type="button"
                onClick={startCamera}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold shadow"
              >
                Retry Camera
              </button>
            </div>
          )}
        </div>

        {/* Scanner Controls Bar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2">
          {/* Flip camera */}
          <button
            type="button"
            onClick={() =>
              setFacingMode((curr) => (curr === 'environment' ? 'user' : 'environment'))
            }
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Switch front/rear camera"
            aria-label="Switch camera"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Flip Camera</span>
          </button>

          {/* Torch toggle if supported */}
          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`p-2.5 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-medium ${
                torchOn
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="Toggle flashlight"
              aria-label="Toggle flashlight"
            >
              {torchOn ? (
                <Flashlight className="w-4 h-4 fill-amber-300" />
              ) : (
                <FlashlightOff className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Torch</span>
            </button>
          )}

          {/* Upload QR image fallback */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
            id="beamdrop-qr-upload"
          />
          <label
            htmlFor="beamdrop-qr-upload"
            className="cursor-pointer p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-medium ml-auto"
            title="Scan from screenshot or photo"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Image</span>
          </label>
        </div>
      </div>
    </div>
  );
};

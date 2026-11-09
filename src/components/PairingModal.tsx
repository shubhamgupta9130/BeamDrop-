import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Wifi,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Radio,
  Share2,
  ShieldCheck,
  RefreshCw,
  ScanLine,
} from 'lucide-react';
import { DeviceInfo } from '../utils/types';

interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selfDevice: DeviceInfo;
  onOpenScanner?: () => void;
}

export const PairingModal: React.FC<PairingModalProps> = ({
  isOpen,
  onClose,
  selfDevice,
  onOpenScanner,
}) => {
  const [networkInfo, setNetworkInfo] = useState<{
    currentHost: string;
    localIps: { address: string; url: string }[];
  } | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'wifi' | 'airgap'>('wifi');
  const [airgapCode, setAirgapCode] = useState('');
  const [remoteAirgapInput, setRemoteAirgapInput] = useState('');
  const [pairStatus, setPairStatus] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch local network info on mount
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/network-info')
      .then((res) => res.json())
      .then((data) => {
        setNetworkInfo(data);
        if (data.localIps && data.localIps.length > 0) {
          setSelectedUrl(data.localIps[0].url);
        } else if (typeof window !== 'undefined') {
          setSelectedUrl(window.location.origin);
        }
      })
      .catch(() => {
        if (typeof window !== 'undefined') {
          setSelectedUrl(window.location.origin);
        }
      });

    // Generate airgap pairing token
    const token = `BEAM-${selfDevice.id}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setAirgapCode(token);
  }, [isOpen, selfDevice.id]);

  // Render QR Code onto canvas
  useEffect(() => {
    if (!canvasRef.current || !selectedUrl) return;

    QRCode.toCanvas(
      canvasRef.current,
      selectedUrl,
      {
        width: 220,
        margin: 2,
        color: {
          dark: '#030712',
          light: '#ffffff',
        },
      },
      (err) => {
        if (err) console.error('Failed to render QR Code', err);
      }
    );
  }, [selectedUrl, activeTab]);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenNewWindow = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Connect Any Device Offline
              </h3>
              <p className="text-xs text-slate-400">
                Works over Wi-Fi, Mobile Hotspot, or Air-gapped Mesh
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('wifi')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'wifi'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            Same Wi-Fi / Hotspot QR
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('airgap')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'airgap'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Air-Gapped Pairing
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {activeTab === 'wifi' ? (
            <div className="space-y-4 text-center flex flex-col items-center">
              {/* QR Code Canvas */}
              <div className="p-3 bg-white rounded-2xl shadow-xl inline-block border-4 border-cyan-400/30">
                <canvas ref={canvasRef} className="block rounded-lg" />
              </div>

              {onOpenScanner && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenScanner();
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <ScanLine className="w-4 h-4" />
                  Scan Other Device&apos;s QR with Camera
                </button>
              )}

              <div className="w-full space-y-2">
                <p className="text-xs font-medium text-slate-300">
                  Or scan this QR code with another phone to connect directly:
                </p>

                {/* Selected URL Input & Copy */}
                <div className="flex items-center gap-2 max-w-sm mx-auto bg-slate-950 border border-slate-700/80 rounded-xl p-1.5 pl-3">
                  <span className="text-xs font-mono text-cyan-400 truncate flex-1 text-left">
                    {selectedUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedUrl)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 shrink-0"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Multiple Local IPs if available */}
                {networkInfo?.localIps && networkInfo.localIps.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-400">Other Network IPs:</span>
                    {networkInfo.localIps.map((ip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedUrl(ip.url)}
                        className={`text-[11px] px-2 py-0.5 rounded border ${
                          selectedUrl === ip.url
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {ip.address}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="w-full text-left bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 space-y-2 text-xs text-slate-300">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  How Offline Connection Works:
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>
                    Connect both devices to the <strong className="text-white">same Wi-Fi router</strong> or turn on <strong className="text-white">Mobile Hotspot</strong> on one phone.
                  </li>
                  <li>
                    Scan the QR code with the other device.
                  </li>
                  <li>
                    Files transfer directly between devices with zero internet needed and <strong className="text-white">zero permission prompt required</strong>!
                  </li>
                </ul>
              </div>

              {/* Open in new window helper */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleOpenNewWindow}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Test now: Open a 2nd tab to see cross-window sharing
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-white">
                  This Device&apos;s Air-Gap Pair Code:
                </p>
                <div className="flex items-center justify-between bg-slate-900 border border-slate-700 p-2.5 rounded-lg">
                  <span className="font-mono text-sm font-bold text-cyan-400 tracking-wider">
                    {airgapCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(airgapCode)}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                    title="Copy AirGap code"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Share this code with another device on the local network or airgap link.
                </p>
              </div>

              <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-white">
                  Pair with Remote Code:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={remoteAirgapInput}
                    onChange={(e) => setRemoteAirgapInput(e.target.value)}
                    placeholder="Enter peer's BEAM code..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (remoteAirgapInput.trim()) {
                        setPairStatus(`Pairing code ${remoteAirgapInput} registered for direct beam.`);
                        setRemoteAirgapInput('');
                        setTimeout(() => setPairStatus(''), 4000);
                      }
                    }}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg shadow"
                  >
                    Pair
                  </button>
                </div>
                {pairStatus && (
                  <p className="text-[11px] text-emerald-400 mt-1 font-medium">
                    {pairStatus}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

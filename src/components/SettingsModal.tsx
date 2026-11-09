import React, { useState } from 'react';
import {
  X,
  Settings as SettingsIcon,
  Zap,
  Volume2,
  VolumeX,
  Download,
  Laptop,
  Check,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import { AppSettings } from '../utils/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: Partial<AppSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [localName, setLocalName] = useState(settings.deviceName);
  const [autoAccept, setAutoAccept] = useState(settings.autoAccept);
  const [autoDownload, setAutoDownload] = useState(settings.autoDownload);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
  const [chunkSize, setChunkSize] = useState(settings.maxChunkSize || 65536);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      deviceName: localName.trim() || settings.deviceName,
      autoAccept,
      autoDownload,
      soundEnabled,
      maxChunkSize: chunkSize,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                BeamDrop Settings
              </h3>
              <p className="text-xs text-slate-400">
                P2P network behavior & permission policies
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Device Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-cyan-400" />
              Device Display Name
            </label>
            <input
              type="text"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:border-cyan-400 outline-none"
              placeholder="e.g. Cosmic MacBook"
            />
          </div>

          {/* Zero-Permission Direct Share Mode */}
          <div className="p-3.5 bg-slate-800/60 border border-slate-700/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Zap className="w-4 h-4 fill-emerald-400" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Zero-Permission Direct Accept
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Receive files automatically without prompt
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoAccept(!autoAccept)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoAccept ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    autoAccept ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When turned on, any paired device or device on the local network can
              beam files, text, and media straight into your vault with zero manual approval clicks.
            </p>
          </div>

          {/* Auto Download to Disk */}
          <div className="flex items-center justify-between p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-xs font-bold text-white block">
                  Auto-Save / Auto-Download
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Save files immediately upon reception
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoDownload(!autoDownload)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoDownload ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  autoDownload ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Audio Chimes */}
          <div className="flex items-center justify-between p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl">
            <div className="flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
              <div>
                <span className="text-xs font-bold text-white block">
                  Sound Feedback
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Play harmonic chimes on beam and receipt
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                soundEnabled ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  soundEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Chunk Size */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                Network Streaming Chunk Size
              </span>
              <span className="font-mono text-cyan-400 text-xs">
                {chunkSize / 1024} KB
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[32768, 65536, 131072].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setChunkSize(size)}
                  className={`py-1.5 rounded-lg text-xs font-medium border ${
                    chunkSize === size
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {size / 1024} KB
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow"
          >
            <Check className="w-4 h-4" />
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

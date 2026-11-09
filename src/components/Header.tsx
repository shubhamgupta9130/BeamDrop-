import React, { useState } from 'react';
import {
  Wifi,
  WifiOff,
  Zap,
  QrCode,
  Laptop,
  Smartphone,
  Tablet,
  Settings as SettingsIcon,
  Edit2,
  Check,
  SplitSquareVertical,
  Radio,
  ShieldCheck,
  Info,
  ScanLine,
} from 'lucide-react';
import { DeviceInfo, AppSettings } from '../utils/types';

interface HeaderProps {
  selfDevice: DeviceInfo;
  settings: AppSettings;
  connectedCount: number;
  isWsConnected: boolean;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  onOpenPairing: () => void;
  onOpenScanner: () => void;
  onOpenSettings: () => void;
  onToggleSimulator: () => void;
  isSimulatorOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  selfDevice,
  settings,
  connectedCount,
  isWsConnected,
  onUpdateSettings,
  onOpenPairing,
  onOpenScanner,
  onOpenSettings,
  onToggleSimulator,
  isSimulatorOpen,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(selfDevice.name);
  const [showDirectInfo, setShowDirectInfo] = useState(false);

  const handleSaveName = () => {
    if (tempName.trim()) {
      onUpdateSettings({ deviceName: tempName.trim() });
    }
    setIsEditingName(false);
  };

  const getDeviceIcon = () => {
    switch (selfDevice.deviceType) {
      case 'mobile':
        return <Smartphone className="w-4 h-4 text-cyan-400" />;
      case 'tablet':
        return <Tablet className="w-4 h-4 text-cyan-400" />;
      default:
        return <Laptop className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Active Device */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 shadow-lg shadow-cyan-500/20 text-white font-bold">
            <Radio className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1.5">
                BeamDrop
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Offline P2P
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1 font-medium text-slate-300">
                {getDeviceIcon()}
                {isEditingName ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                      className="bg-slate-800 text-white text-xs px-1.5 py-0.5 rounded border border-cyan-500 outline-none w-28"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      className="text-cyan-400 hover:text-cyan-300"
                      aria-label="Save device name"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span
                    onClick={() => {
                      setTempName(selfDevice.name);
                      setIsEditingName(true);
                    }}
                    className="cursor-pointer hover:text-cyan-400 flex items-center gap-1 group"
                    title="Click to rename this device"
                  >
                    {selfDevice.name}
                    <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                  </span>
                )}
              </span>
              <span>•</span>
              <span className="text-slate-400">{selfDevice.os}</span>
            </div>
          </div>
        </div>

        {/* Zero-Permission Direct Share Mode Banner */}
        <div className="relative flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                settings.autoAccept
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {settings.autoAccept ? (
                <Zap className="w-4 h-4 fill-emerald-400/20" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-200">
                  Direct Auto-Receive
                </span>
                <button
                  type="button"
                  onClick={() => setShowDirectInfo(!showDirectInfo)}
                  className="text-slate-400 hover:text-slate-200"
                  aria-label="Info about zero-permission sharing"
                >
                  <Info className="w-3 h-3" />
                </button>
              </div>
              <span className="text-[11px] text-slate-400">
                {settings.autoAccept
                  ? 'No permission prompts on target'
                  : 'Prompt on incoming transfer'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onUpdateSettings({ autoAccept: !settings.autoAccept })}
              aria-label="Toggle direct auto-accept without permission"
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.autoAccept ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.autoAccept ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Info popover */}
          {showDirectInfo && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl z-50 text-xs text-slate-300">
              <p className="font-semibold text-white mb-1">
                Zero-Permission Direct Share:
              </p>
              <p className="text-slate-400 leading-relaxed">
                When enabled, incoming files, live clipboard updates, and photos
                stream directly into this device and auto-save without requiring
                anyone to tap an &apos;Accept&apos; button!
              </p>
              <button
                onClick={() => setShowDirectInfo(false)}
                className="mt-2 text-[11px] text-cyan-400 font-medium hover:underline block ml-auto"
              >
                Got it
              </button>
            </div>
          )}
        </div>

        {/* Network status & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Network Health Indicator */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-800/50 border border-slate-700/40 rounded-lg px-2.5 py-1 text-xs text-slate-300">
            {isWsConnected ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                LAN Mesh
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                Local Bus
              </span>
            )}
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              {connectedCount} {connectedCount === 1 ? 'peer' : 'peers'}
            </span>
          </div>

          {/* Scan QR Camera Button */}
          <button
            type="button"
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all shadow-sm"
            aria-label="Scan QR code using camera"
          >
            <ScanLine className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Scan QR</span>
          </button>

          {/* Pair / QR Button */}
          <button
            type="button"
            onClick={onOpenPairing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-all"
            aria-label="Connect devices via QR code"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden md:inline">Connect Devices</span>
          </button>

          {/* Virtual 2nd Device Simulator Toggle */}
          <button
            type="button"
            onClick={onToggleSimulator}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isSimulatorOpen
                ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            aria-label="Toggle dual device split simulator"
            title="Simulate a 2nd device in this browser to test direct transfers right now"
          >
            <SplitSquareVertical className="w-4 h-4" />
            <span className="hidden md:inline">Dual Device Simulator</span>
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            aria-label="Open settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

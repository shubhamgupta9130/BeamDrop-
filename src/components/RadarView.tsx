import React, { useState } from 'react';
import {
  Laptop,
  Smartphone,
  Tablet,
  Radio,
  Zap,
  Users,
  Send,
  CheckCircle2,
  Share2,
  FileUp,
} from 'lucide-react';
import { DeviceInfo } from '../utils/types';

interface RadarViewProps {
  selfDevice: DeviceInfo;
  peers: DeviceInfo[];
  selectedPeerId: string | null;
  onSelectPeer: (peerId: string | null) => void;
  onFilesDropped: (files: FileList) => void;
  onOpenPairModal: () => void;
}

export const RadarView: React.FC<RadarViewProps> = ({
  selfDevice,
  peers,
  selectedPeerId,
  onSelectPeer,
  onFilesDropped,
  onOpenPairModal,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesDropped(e.dataTransfer.files);
    }
  };

  const renderIcon = (type: string, className = 'w-5 h-5') => {
    switch (type) {
      case 'mobile':
        return <Smartphone className={className} />;
      case 'tablet':
        return <Tablet className={className} />;
      default:
        return <Laptop className={className} />;
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full rounded-2xl border transition-all duration-300 overflow-hidden ${
        isDragOver
          ? 'bg-cyan-950/40 border-cyan-400 ring-4 ring-cyan-500/20'
          : 'bg-slate-900/60 border-slate-800 backdrop-blur-sm'
      }`}
    >
      {/* Drag Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-cyan-950/80 backdrop-blur-sm border-2 border-dashed border-cyan-400 text-cyan-200 pointer-events-none animate-fadeIn">
          <FileUp className="w-14 h-14 text-cyan-400 animate-bounce mb-3" />
          <p className="text-lg font-bold text-white">
            Drop to Beam Directly!
          </p>
          <p className="text-xs text-cyan-300">
            Files will transfer immediately with zero permission prompts
          </p>
        </div>
      )}

      {/* Top Banner / Controls */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              Nearby Device Radar
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {peers.length} detected
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-discovers devices on the same Wi-Fi, Hotspot, or offline AirGap mesh
          </p>
        </div>

        {/* Target peer selector toggle */}
        <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => onSelectPeer(null)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              selectedPeerId === null
                ? 'bg-cyan-500 text-slate-950 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Beam to All ({peers.length})
          </button>

          {peers.map((peer) => (
            <button
              key={peer.id}
              type="button"
              onClick={() => onSelectPeer(peer.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                selectedPeerId === peer.id
                  ? 'bg-cyan-500 text-slate-950 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {renderIcon(peer.deviceType, 'w-3.5 h-3.5')}
              <span className="truncate max-w-[100px]">{peer.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Radar Graphic Area */}
      <div className="relative py-12 px-4 flex flex-col items-center justify-center min-h-[320px]">
        {/* Radar Concentric Rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
          <div className="w-[300px] h-[300px] sm:w-[380px] sm:h-[380px] rounded-full border border-cyan-500/20 animate-pulse"></div>
          <div className="absolute w-[200px] h-[200px] sm:w-[260px] sm:h-[260px] rounded-full border border-cyan-500/30"></div>
          <div className="absolute w-[100px] h-[100px] sm:w-[140px] sm:h-[140px] rounded-full border border-cyan-500/40"></div>
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
          <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent"></div>
        </div>

        {/* Central Self Device Node */}
        <div className="relative z-10 flex flex-col items-center mb-6">
          <div className="relative group">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-cyan-500/30 border-2 border-cyan-300">
              {renderIcon(selfDevice.deviceType, 'w-8 h-8')}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1 rounded-full border-2 border-slate-900 shadow">
              <Zap className="w-3 h-3 fill-slate-950" />
            </div>
          </div>
          <span className="mt-2 text-xs font-bold text-white flex items-center gap-1">
            {selfDevice.name}
            <span className="text-[10px] text-cyan-400 font-normal">(This Device)</span>
          </span>
          <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Zero-Permission Auto-Receive Ready
          </span>
        </div>

        {/* Peers List / Radar Grid */}
        {peers.length === 0 ? (
          <div className="relative z-10 mt-2 text-center max-w-md bg-slate-900/80 border border-slate-800 p-4 rounded-xl backdrop-blur-sm">
            <p className="text-sm font-medium text-slate-300 mb-1">
              Scanning for nearby devices...
            </p>
            <p className="text-xs text-slate-400 mb-3">
              Open BeamDrop on another phone, tablet, or laptop on this Wi-Fi / Hotspot, or scan pairing QR code.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={onOpenPairModal}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                Show Pairing QR / IP
              </button>
            </div>
          </div>
        ) : (
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-2xl px-4">
            {peers.map((peer) => {
              const isSelected = selectedPeerId === peer.id;
              return (
                <div
                  key={peer.id}
                  onClick={() => onSelectPeer(isSelected ? null : peer.id)}
                  className={`cursor-pointer rounded-xl p-3 border transition-all duration-200 flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-400 shadow-lg shadow-cyan-500/10 ring-2 ring-cyan-500/30'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${peer.avatarColor} flex items-center justify-center text-white shrink-0 shadow-md`}
                    >
                      {renderIcon(peer.deviceType, 'w-5 h-5')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {peer.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {peer.os} • {peer.browser}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span className="text-[10px] text-emerald-400 font-medium">
                          Direct Beam Ready
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    {isSelected ? (
                      <span className="p-1 rounded-full bg-cyan-400 text-slate-950">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 hover:text-cyan-400 p-1">
                        <Send className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useState, useRef } from 'react';
import {
  Smartphone,
  Tablet,
  X,
  Zap,
  Download,
  Upload,
  ArrowRight,
  Clipboard,
  FileText,
  ImageIcon,
  CheckCircle2,
  Minimize2,
  Maximize2,
  Send,
  Eye,
  Volume2,
  Sun,
} from 'lucide-react';
import { MeshNetwork } from '../utils/meshNetwork';
import { DeviceInfo, TransferItem } from '../utils/types';
import { formatBytes } from '../utils/packetProtocol';

interface VirtualDeviceSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  mainDeviceName: string;
}

export const VirtualDeviceSimulator: React.FC<VirtualDeviceSimulatorProps> = ({
  isOpen,
  onClose,
  mainDeviceName,
}) => {
  const [virtualNetwork, setVirtualNetwork] = useState<MeshNetwork | null>(null);
  const [virtualDevice, setVirtualDevice] = useState<DeviceInfo | null>(null);
  const [virtualTransfers, setVirtualTransfers] = useState<TransferItem[]>([]);
  const [activeTab, setActiveTab] = useState<'vault' | 'send'>('vault');
  const [isMinimized, setIsMinimized] = useState(false);
  const [simText, setSimText] = useState('');
  const [isRinging, setIsRinging] = useState(false);
  const [isTorching, setIsTorching] = useState(false);

  const sampleImages = [
    {
      name: 'Mobile_Camera_Photo.jpg',
      type: 'image/jpeg',
      dataUrl:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%230ea5e9"/><circle cx="200" cy="150" r="80" fill="%2338bdf8"/><text x="200" y="160" font-family="sans-serif" font-size="20" fill="white" text-anchor="middle">Sample Camera Shot</text></svg>',
    },
    {
      name: 'Project_Schematics.pdf',
      type: 'application/pdf',
      dataUrl:
        'data:application/pdf;base64,JVBERi0xLjAKMSAwIG9iajw8L1BhZ2VzIDIgMCBSPj5lbmRvYmo=',
    },
  ];

  useEffect(() => {
    if (!isOpen) {
      if (virtualNetwork) {
        virtualNetwork.destroy();
        setVirtualNetwork(null);
      }
      return;
    }

    // Initialize second independent virtual peer
    const net = new MeshNetwork('dev_simulated_mobile', 'Pixel 9 Pro');
    net.selfDevice.deviceType = 'mobile';
    net.selfDevice.os = 'Android 15';
    net.selfDevice.browser = 'Chrome Mobile';
    net.selfDevice.avatarColor = 'from-emerald-400 to-teal-600';
    net.settings.autoAccept = true; // Auto accept without permission

    net.onTransferStarted = (item) => {
      setVirtualTransfers((prev) => [item, ...prev.filter((p) => p.id !== item.id)]);
    };

    net.onTransferProgress = (item) => {
      setVirtualTransfers((prev) => [item, ...prev.filter((p) => p.id !== item.id)]);
    };

    net.onTransferCompleted = (item) => {
      setVirtualTransfers((prev) => [item, ...prev.filter((p) => p.id !== item.id)]);
    };

    net.onRemoteCommandReceived = (command) => {
      if (command.action === 'speaker_ring') {
        setIsRinging(true);
        setTimeout(() => setIsRinging(false), 3500);
      } else if (command.action === 'screen_torch') {
        setIsTorching(true);
        setTimeout(() => setIsTorching(false), (command.payload?.duration || 5) * 1000);
      }
    };

    net.start();
    setVirtualNetwork(net);
    setVirtualDevice(net.selfDevice);

    return () => {
      net.destroy();
    };
  }, [isOpen]);

  if (!isOpen || !virtualDevice) return null;

  // Send sample photo from simulated phone to main device
  const handleSendSampleFromPhone = async (idx: number) => {
    if (!virtualNetwork) return;
    const sample = sampleImages[idx];
    const blob = new Blob([sample.dataUrl], { type: sample.type });
    await virtualNetwork.sendFile(
      blob,
      sample.name,
      sample.type,
      sample.type.startsWith('image') ? 'image' : 'file'
    );
  };

  // Send clipboard from simulated phone to main device
  const handleSendClipboardFromPhone = async () => {
    if (!virtualNetwork) return;
    const text = simText || 'Sync token: 948-201-994 (Direct Beamed from Phone)';
    await virtualNetwork.sendTextOrClipboard(text, true);
    setSimText('');
  };

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ${
        isMinimized
          ? 'bottom-4 right-4 w-72'
          : 'bottom-4 right-4 w-96 max-h-[85vh] sm:max-h-[640px]'
      }`}
    >
      <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-2xl shadow-2xl shadow-emerald-950/40 overflow-hidden flex flex-col h-full backdrop-blur-xl">
        {/* Simulator Device Header */}
        <div className="bg-gradient-to-r from-emerald-950 to-slate-900 border-b border-emerald-500/30 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">
                  {virtualDevice.name}
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-1.5 py-0.2 rounded border border-emerald-500/30">
                  Virtual Peer
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block">
                {virtualDevice.os} • Auto-Accept: ON
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label={isMinimized ? 'Expand simulator' : 'Minimize simulator'}
            >
              {isMinimized ? (
                <Maximize2 className="w-3.5 h-3.5" />
              ) : (
                <Minimize2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Close virtual device simulator"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="flex flex-col flex-1 overflow-hidden p-3.5 space-y-3">
            {/* Status explanation */}
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 text-xs text-emerald-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Files sent to this phone auto-save directly with{' '}
                <strong>zero approval prompt</strong>!
              </span>
            </div>

            {/* Remote Alert Banner */}
            {isRinging && (
              <div className="bg-rose-500 text-white font-bold text-xs p-2.5 rounded-xl flex items-center justify-center gap-2 animate-bounce shadow-lg">
                <Volume2 className="w-4 h-4 fill-white" />
                <span>Ringing Speaker Alert from {mainDeviceName}!</span>
              </div>
            )}

            {isTorching && (
              <div className="bg-amber-300 text-slate-950 font-bold text-xs p-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-300/40">
                <Sun className="w-4 h-4" />
                <span>Remote Screen Torch Active</span>
              </div>
            )}

            {/* Nav Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('vault')}
                className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'vault'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Phone Inbox ({virtualTransfers.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('send')}
                className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'send'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Beam from Phone
              </button>
            </div>

            {/* Tab 1: Phone Inbox */}
            {activeTab === 'vault' ? (
              <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[300px] pr-1">
                {virtualTransfers.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    <p className="font-medium text-slate-400">
                      Phone inbox is empty
                    </p>
                    <p className="mt-1">
                      Drop a file or beam clipboard from the main screen to watch it
                      land on this phone instantly!
                    </p>
                  </div>
                ) : (
                  virtualTransfers.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white truncate max-w-[180px]">
                          {item.fileName}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          Auto-Saved
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{formatBytes(item.fileSize)}</span>
                        <span>{item.speed || 'Direct Stream'}</span>
                      </div>
                      {item.textContent && (
                        <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-300">
                          {item.textContent}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Tab 2: Send from Phone */
              <div className="space-y-3">
                <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl space-y-2">
                  <span className="text-xs font-semibold text-slate-300 block">
                    Quick Sample Media:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendSampleFromPhone(0)}
                      className="p-2 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-600 transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                      Beam Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendSampleFromPhone(1)}
                      className="p-2 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-600 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      Beam PDF
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl space-y-2">
                  <span className="text-xs font-semibold text-slate-300 block">
                    Beam Text / Clipboard to {mainDeviceName}:
                  </span>
                  <input
                    type="text"
                    value={simText}
                    onChange={(e) => setSimText(e.target.value)}
                    placeholder="Enter message or sync code..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={handleSendClipboardFromPhone}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Beam to {mainDeviceName}
                  </button>

                  <button
                    type="button"
                    onClick={() => virtualNetwork?.sendRemoteCommand('speaker_ring')}
                    className="w-full py-2 bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Ring {mainDeviceName}&apos;s Speaker
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

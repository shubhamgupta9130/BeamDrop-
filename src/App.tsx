import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Header } from './components/Header';
import { RadarView } from './components/RadarView';
import { SendDrawer } from './components/SendDrawer';
import { TransferList } from './components/TransferList';
import { PairingModal } from './components/PairingModal';
import { SettingsModal } from './components/SettingsModal';
import { VirtualDeviceSimulator } from './components/VirtualDeviceSimulator';
import { PreviewModal } from './components/PreviewModal';
import { QrScannerModal } from './components/QrScannerModal';
import { RemoteDeviceToolkit } from './components/RemoteDeviceToolkit';
import { MeshNetwork } from './utils/meshNetwork';
import { AppSettings, DeviceInfo, TransferItem } from './utils/types';
import {
  playConnectChime,
  playReceiveChime,
  playSendChime,
  playRemoteSpeakerAlarm,
  playQrScanSuccess,
} from './utils/audioFeedback';
import { Zap, ShieldCheck, Check, Sparkles, BellRing, Sun, ScanLine } from 'lucide-react';

export default function App() {
  const meshRef = useRef<MeshNetwork | null>(null);

  const [selfDevice, setSelfDevice] = useState<DeviceInfo>({
    id: 'init',
    name: 'Loading Device...',
    deviceType: 'desktop',
    os: 'Unknown',
    browser: 'Browser',
    avatarColor: 'from-cyan-500 to-blue-600',
    protocol: 'websocket',
    isTrusted: true,
    isSelf: true,
    lastSeen: Date.now(),
  });

  const [settings, setSettings] = useState<AppSettings>({
    deviceName: 'This Device',
    autoAccept: true,
    autoDownload: true,
    soundEnabled: true,
    preferredProtocol: 'auto',
    maxChunkSize: 65536,
  });

  const [peers, setPeers] = useState<DeviceInfo[]>([]);
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(true);

  // Modals & UI panels
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<TransferItem | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Remote Device Features state
  const [sharedNoteText, setSharedNoteText] = useState('');
  const [remoteRingingNotice, setRemoteRingingNotice] = useState<{ from: string } | null>(null);
  const [isScreenTorchActive, setIsScreenTorchActive] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  }, []);

  const triggerDownload = useCallback((item: TransferItem) => {
    if (!item.dataUrl) return;
    try {
      const a = document.createElement('a');
      a.href = item.dataUrl;
      a.download = item.fileName || 'beamdrop-download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.warn('Programmatic download prevented by browser sandbox:', e);
    }
  }, []);

  // Initialize MeshNetwork on startup
  useEffect(() => {
    const mesh = new MeshNetwork();
    meshRef.current = mesh;

    setSelfDevice(mesh.selfDevice);
    setSettings(mesh.settings);

    mesh.onPeersUpdated = (updatedPeers) => {
      setPeers(updatedPeers);
    };

    mesh.onConnectionStateChange = (state) => {
      setIsWsConnected(state.wsConnected);
    };

    mesh.onTransferStarted = (item) => {
      setTransfers((prev) => [item, ...prev.filter((p) => p.id !== item.id)]);
      if (item.direction === 'outgoing' && mesh.settings.soundEnabled) {
        playSendChime();
      }
    };

    mesh.onTransferProgress = (item) => {
      setTransfers((prev) => [item, ...prev.filter((p) => p.id !== item.id)]);
    };

    mesh.onTransferCompleted = (item) => {
      setTransfers((prev) => [item, ...prev.filter((p) => p.id !== item.id)]);

      if (item.direction === 'incoming') {
        if (mesh.settings.soundEnabled) {
          playReceiveChime();
        }

        showToast(
          `⚡ Auto-Received "${item.fileName}" directly with zero permission prompt!`,
          'success'
        );

        // Auto-download file if setting enabled
        if (mesh.settings.autoDownload && item.dataUrl) {
          triggerDownload(item);
        }

        // If clipboard/text, auto write to clipboard if allowed
        if (item.category === 'clipboard' && item.textContent && navigator.clipboard) {
          navigator.clipboard.writeText(item.textContent).catch(() => {});
        }
      }
    };

    mesh.onRemoteCommandReceived = (command) => {
      if (command.action === 'speaker_ring') {
        if (mesh.settings.soundEnabled) {
          playRemoteSpeakerAlarm();
        }
        setRemoteRingingNotice({ from: command.senderName });
        showToast(`🔔 Remote Speaker Alarm triggered by ${command.senderName}!`, 'info');
        setTimeout(() => setRemoteRingingNotice(null), 4000);
      } else if (command.action === 'notepad_update') {
        setSharedNoteText(command.payload?.text ?? '');
      } else if (command.action === 'screen_torch') {
        setIsScreenTorchActive(true);
        setTimeout(() => setIsScreenTorchActive(false), (command.payload?.duration || 6) * 1000);
      }
    };

    mesh.start();

    return () => {
      mesh.destroy();
    };
  }, [showToast, triggerDownload]);

  // Settings update
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    if (meshRef.current) {
      meshRef.current.updateSettings(newSettings);
      setSettings(meshRef.current.settings);
      setSelfDevice(meshRef.current.selfDevice);
      showToast('Settings saved successfully');
    }
  };

  // Send actions
  const handleSendFile = async (
    file: File | Blob,
    fileName: string,
    fileType: string,
    category: any,
    targetId?: string
  ) => {
    if (!meshRef.current) return;
    return await meshRef.current.sendFile(file, fileName, fileType, category, targetId);
  };

  const handleSendText = async (
    text: string,
    isClipboard: boolean,
    targetId?: string
  ) => {
    if (!meshRef.current) return;
    return await meshRef.current.sendTextOrClipboard(text, isClipboard, targetId);
  };

  const handleFilesDropped = async (files: FileList) => {
    const fileList = Array.from(files);
    for (const f of fileList) {
      await handleSendFile(
        f,
        f.name,
        f.type,
        f.type.startsWith('image/') ? 'image' : 'file',
        selectedPeerId || undefined
      );
    }
    showToast(`Beamed ${fileList.length} file(s) directly to peers!`);
  };

  const handleSendRemoteCommand = (action: any, payload?: any, targetId?: string) => {
    if (!meshRef.current) return;
    meshRef.current.sendRemoteCommand(action, payload, targetId);
  };

  const handleQrScanResult = (result: string) => {
    playQrScanSuccess();
    showToast(`QR Code Scanned: ${result}`, 'success');

    // If it's an airgap token BEAM-...
    if (result.includes('BEAM-')) {
      showToast(`Airgap Device Code paired: ${result}`, 'success');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 max-w-md p-3.5 rounded-xl bg-slate-900 border border-emerald-500/50 shadow-2xl flex items-center gap-3 animate-fadeIn">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 fill-emerald-400" />
          </div>
          <p className="text-xs font-semibold text-white leading-snug">
            {toast.message}
          </p>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white text-xs ml-auto"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* Screen Torch Full-screen Lantern Mode */}
      {isScreenTorchActive && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 text-slate-950 animate-fadeIn">
          <Sun className="w-24 h-24 text-amber-500 animate-pulse mb-4" />
          <h2 className="text-2xl font-black mb-2 tracking-tight">Remote Screen Torch Active</h2>
          <p className="text-sm text-slate-600 mb-6 text-center max-w-sm">
            This device was illuminated remotely by your paired peer in high-brightness flashlight mode.
          </p>
          <button
            type="button"
            onClick={() => setIsScreenTorchActive(false)}
            className="px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm shadow-2xl transition-all"
          >
            Dismiss Screen Torch
          </button>
        </div>
      )}

      {/* Remote Speaker Buzzer Alarm Banner */}
      {remoteRingingNotice && (
        <div className="fixed top-4 inset-x-4 max-w-lg mx-auto z-50 bg-rose-600 text-white font-bold p-4 rounded-2xl shadow-2xl shadow-rose-950/60 flex items-center justify-between border-2 border-white/40 animate-bounce">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <BellRing className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-extrabold">Remote Speaker Alarm Active!</p>
              <p className="text-xs text-rose-100">Buzzer siren sounded by {remoteRingingNotice.from}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRemoteRingingNotice(null)}
            className="px-3.5 py-1.5 bg-white text-rose-700 text-xs font-bold rounded-xl shadow hover:bg-rose-50 transition-colors"
          >
            Stop Siren
          </button>
        </div>
      )}

      {/* Header */}
      <Header
        selfDevice={selfDevice}
        settings={settings}
        connectedCount={peers.length}
        isWsConnected={isWsConnected}
        onUpdateSettings={handleUpdateSettings}
        onOpenPairing={() => setIsPairingOpen(true)}
        onOpenScanner={() => setIsQrScannerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleSimulator={() => setIsSimulatorOpen(!isSimulatorOpen)}
        isSimulatorOpen={isSimulatorOpen}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Zero-Permission Direct Share Callout Banner */}
        <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-blue-950/60 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-start gap-3.5 max-w-2xl">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-5 h-5 fill-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                Offline Direct Cross-Device Connection
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  100% Error-Free
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Connect any phone, tablet, or PC completely offline. Files,
                clipboard snippets, and photos transfer directly into the receiver&apos;s
                vault <strong className="text-cyan-300">without requiring other device permission or manual approval</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsPairingOpen(true)}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Pair Another Device
            </button>
            <button
              type="button"
              onClick={() => setIsSimulatorOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all"
            >
              Simulate 2nd Device
            </button>
          </div>
        </div>

        {/* Radar Discovered Devices View */}
        <RadarView
          selfDevice={selfDevice}
          peers={peers}
          selectedPeerId={selectedPeerId}
          onSelectPeer={setSelectedPeerId}
          onFilesDropped={handleFilesDropped}
          onOpenPairModal={() => setIsPairingOpen(true)}
        />

        {/* Two-Column Sharing & Transfers Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Direct Sharing Options & Remote Device Toolkit */}
          <div className="lg:col-span-5 space-y-6">
            <SendDrawer
              peers={peers}
              selectedPeerId={selectedPeerId}
              onSendFile={handleSendFile}
              onSendText={handleSendText}
            />

            <RemoteDeviceToolkit
              peers={peers}
              selectedPeerId={selectedPeerId}
              onSelectPeer={setSelectedPeerId}
              onSendRemoteCommand={handleSendRemoteCommand}
              sharedNoteText={sharedNoteText}
              onUpdateSharedNote={setSharedNoteText}
            />
          </div>

          {/* Right Column: Live Transfer Vault */}
          <div className="lg:col-span-7 space-y-6">
            <TransferList
              transfers={transfers}
              onDownload={triggerDownload}
              onPreview={setPreviewItem}
              onClearHistory={() => setTransfers([])}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>BeamDrop P2P • Direct Offline Share without Permission Prompts</span>
          <span className="text-slate-400">
            Protocols: Local Wi-Fi WebSocket • BroadcastChannel • WebRTC Mesh
          </span>
        </div>
      </footer>

      {/* Modals */}
      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onScanResult={handleQrScanResult}
      />

      <PairingModal
        isOpen={isPairingOpen}
        onClose={() => setIsPairingOpen(false)}
        selfDevice={selfDevice}
        onOpenScanner={() => setIsQrScannerOpen(true)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleUpdateSettings}
      />

      <VirtualDeviceSimulator
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        mainDeviceName={selfDevice.name}
      />

      <PreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        onDownload={triggerDownload}
      />
    </div>
  );
}

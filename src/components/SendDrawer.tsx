import React, { useState, useRef } from 'react';
import {
  FileUp,
  Clipboard,
  FileText,
  Camera,
  Mic,
  Send,
  Zap,
  Users,
  Check,
  AlertCircle,
  Square,
  Sparkles,
} from 'lucide-react';
import { DeviceInfo } from '../utils/types';
import { determineCategory, formatBytes } from '../utils/packetProtocol';

interface SendDrawerProps {
  peers: DeviceInfo[];
  selectedPeerId: string | null;
  onSendFile: (file: File | Blob, name: string, type: string, category: any, targetId?: string) => Promise<any>;
  onSendText: (text: string, isClipboard: boolean, targetId?: string) => Promise<any>;
}

type TabType = 'files' | 'clipboard' | 'text' | 'camera' | 'audio';

export const SendDrawer: React.FC<SendDrawerProps> = ({
  peers,
  selectedPeerId,
  onSendFile,
  onSendText,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('files');
  const [textInput, setTextInput] = useState('');
  const [clipboardContent, setClipboardContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedPeer = peers.find((p) => p.id === selectedPeerId);
  const targetLabel = selectedPeer ? selectedPeer.name : `All Devices (${peers.length})`;

  // Handle file select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    setIsSending(true);
    setStatusMessage(`Direct beaming ${files.length} file(s)...`);

    try {
      for (const file of files) {
        const category = determineCategory(file.type, file.name);
        await onSendFile(
          file,
          file.name,
          file.type,
          category,
          selectedPeerId || undefined
        );
      }
      triggerSuccess(`Directly beamed ${files.length} file(s) without prompt!`);
    } catch (err: any) {
      setStatusMessage(`Transfer error: ${err.message || 'Failed to beam'}`);
    } finally {
      setIsSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle live clipboard paste & beam
  const handleReadAndBeamClipboard = async () => {
    setIsSending(true);
    try {
      let text = clipboardContent;
      if (!text && navigator.clipboard && navigator.clipboard.readText) {
        try {
          text = await navigator.clipboard.readText();
          setClipboardContent(text);
        } catch {
          // Fallback if browser permission is restricted
        }
      }

      if (!text.trim()) {
        setStatusMessage('Clipboard is empty. Type or paste your text below.');
        setIsSending(false);
        return;
      }

      await onSendText(text, true, selectedPeerId || undefined);
      triggerSuccess('Clipboard beamed directly! Auto-copied on receiver.');
    } catch (err: any) {
      setStatusMessage(`Clipboard error: ${err.message || 'Failed'}`);
    } finally {
      setIsSending(false);
    }
  };

  // Handle text snippet send
  const handleSendText = async () => {
    if (!textInput.trim()) return;
    setIsSending(true);
    try {
      await onSendText(textInput, false, selectedPeerId || undefined);
      setTextInput('');
      triggerSuccess('Note beamed directly with zero permission needed!');
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message || 'Failed to send'}`);
    } finally {
      setIsSending(false);
    }
  };

  // Camera start / capture
  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setStatusMessage('Camera access not granted or not available.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhotoAndBeam = async () => {
    if (!videoRef.current) return;
    setIsSending(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (blob) {
            const fileName = `Photo_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
            await onSendFile(
              blob,
              fileName,
              'image/jpeg',
              'image',
              selectedPeerId || undefined
            );
            triggerSuccess('Photo beamed directly! Visible instantly on device.');
            stopCamera();
          }
          setIsSending(false);
        }, 'image/jpeg', 0.85);
      }
    } catch (err: any) {
      setStatusMessage(`Camera error: ${err.message}`);
      setIsSending(false);
    }
  };

  // Voice recording
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const fileName = `VoiceNote_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
        setIsSending(true);
        try {
          await onSendFile(
            audioBlob,
            fileName,
            'audio/webm',
            'audio',
            selectedPeerId || undefined
          );
          triggerSuccess('Voice note beamed directly!');
        } catch (err: any) {
          setStatusMessage(`Audio send error: ${err.message}`);
        } finally {
          setIsSending(false);
        }

        // Clean up tracks
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setStatusMessage('Microphone access denied or not available.');
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  const triggerSuccess = (msg: string) => {
    setStatusMessage(msg);
    setSendSuccess(true);
    setTimeout(() => {
      setSendSuccess(false);
    }, 3500);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-md shadow-xl">
      {/* Target Device Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Zap className="w-4 h-4 fill-cyan-400/20" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">
              Direct Beam Destination:
            </span>
            <span className="text-sm font-bold text-white flex items-center gap-1.5">
              {targetLabel}
              <span className="text-[10px] text-emerald-400 font-normal px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                Zero-Prompt Delivery
              </span>
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'files'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileUp className="w-3.5 h-3.5" />
            Files
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clipboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'clipboard'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clipboard className="w-3.5 h-3.5" />
            Clipboard
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'text'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Note/Code
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('camera');
              startCamera();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'camera'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Camera
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audio')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'audio'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            Voice
          </button>
        </div>
      </div>

      {/* Tab 1: Files */}
      {activeTab === 'files' && (
        <div className="space-y-4">
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            id="beamdrop-file-input"
          />

          <label
            htmlFor="beamdrop-file-input"
            className="group flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-400 bg-slate-800/40 hover:bg-cyan-950/20 cursor-pointer transition-all duration-200"
          >
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 flex items-center justify-center mb-3 transition-transform shadow-lg shadow-cyan-500/10 border border-cyan-500/30">
              <FileUp className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-white group-hover:text-cyan-300">
              Select or Drop Any Files to Beam
            </p>
            <p className="text-xs text-slate-400 mt-1 text-center max-w-sm">
              Images, Videos, PDFs, ZIPs, Code, Audio or APKs. Directly streams chunked with zero permission prompt required.
            </p>
            <span className="mt-4 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md">
              <Zap className="w-4 h-4 fill-slate-950" />
              Choose Files Now
            </span>
          </label>
        </div>
      )}

      {/* Tab 2: Live Clipboard */}
      {activeTab === 'clipboard' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clipboard className="w-3.5 h-3.5 text-cyan-400" />
                Live Clipboard Sync
              </span>
              <span className="text-[11px] text-emerald-400 font-medium">
                Auto-pastes to receiver
              </span>
            </div>
            <textarea
              value={clipboardContent}
              onChange={(e) => setClipboardContent(e.target.value)}
              placeholder="Paste or type text, URLs, OTP codes, or passwords to sync immediately..."
              rows={4}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-cyan-400 outline-none resize-none font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleReadAndBeamClipboard}
              disabled={isSending}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              Beam Clipboard Directly
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Note / Code */}
      {activeTab === 'text' && (
        <div className="space-y-4">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type notes, commands, instructions, or code snippets to beam to other devices..."
            rows={5}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-sm text-white focus:border-cyan-400 outline-none resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {textInput.length} characters
            </span>
            <button
              type="button"
              onClick={handleSendText}
              disabled={isSending || !textInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50 transition-all"
            >
              <Send className="w-4 h-4" />
              Beam Note Directly
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Camera */}
      {activeTab === 'camera' && (
        <div className="space-y-4">
          <div className="relative aspect-video max-h-72 w-full bg-black rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-900/90 text-center">
                <Camera className="w-10 h-10 text-cyan-400 mb-2" />
                <p className="text-xs text-slate-300 mb-2">Camera is paused</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold"
                >
                  Start Camera
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={stopCamera}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
            >
              Close Camera
            </button>
            <button
              type="button"
              onClick={capturePhotoAndBeam}
              disabled={!cameraActive || isSending}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              Snap & Beam Directly
            </button>
          </div>
        </div>
      )}

      {/* Tab 5: Voice Memo */}
      {activeTab === 'audio' && (
        <div className="p-6 rounded-xl bg-slate-800/40 border border-slate-700/80 flex flex-col items-center text-center">
          {isRecording ? (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-500 border border-rose-500/40 flex items-center justify-center animate-pulse mx-auto">
                <Mic className="w-8 h-8" />
              </div>
              <div>
                <p className="text-base font-bold text-white">Recording Voice...</p>
                <p className="text-sm font-mono text-cyan-400 mt-1">
                  00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                </p>
              </div>
              <button
                type="button"
                onClick={stopAudioRecording}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg mx-auto"
              >
                <Square className="w-4 h-4 fill-white" />
                Stop & Beam Voice Note
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto">
                <Mic className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Quick Voice Note Beam</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Record microphone audio and beam straight to connected device
                </p>
              </div>
              <button
                type="button"
                onClick={startAudioRecording}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md mx-auto"
              >
                <Mic className="w-4 h-4" />
                Start Recording
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status / Feedback Banner */}
      {(statusMessage || sendSuccess) && (
        <div
          className={`mt-4 p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-all ${
            sendSuccess
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-slate-800 text-slate-300 border border-slate-700'
          }`}
        >
          {sendSuccess ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-spin" />
          )}
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
};

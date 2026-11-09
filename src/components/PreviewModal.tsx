import React from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileText,
  Music,
  ExternalLink,
} from 'lucide-react';
import { TransferItem } from '../utils/types';
import { formatBytes } from '../utils/packetProtocol';

interface PreviewModalProps {
  item: TransferItem | null;
  onClose: () => void;
  onDownload: (item: TransferItem) => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  item,
  onClose,
  onDownload,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!item) return null;

  const handleCopy = () => {
    const text = item.textContent || item.dataUrl || '';
    if (text && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isImage = item.category === 'image' || item.fileType.startsWith('image/');
  const isAudio = item.category === 'audio' || item.fileType.startsWith('audio/');
  const isVideo = item.fileType.startsWith('video/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="min-w-0 pr-4">
            <h3 className="text-sm font-bold text-white truncate">
              {item.fileName}
            </h3>
            <p className="text-xs text-slate-400">
              {formatBytes(item.fileSize)} • {item.fileType || 'Payload'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {item.dataUrl && (
              <button
                type="button"
                onClick={() => onDownload(item)}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="p-4 overflow-y-auto flex flex-col items-center justify-center bg-slate-950/60 min-h-[250px]">
          {isImage && item.dataUrl ? (
            <img
              src={item.dataUrl}
              alt={item.fileName}
              className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-lg"
            />
          ) : isAudio && item.dataUrl ? (
            <div className="w-full max-w-md p-6 bg-slate-800/80 rounded-2xl border border-slate-700 flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <Music className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-white">{item.fileName}</p>
              <audio src={item.dataUrl} controls className="w-full" autoPlay />
            </div>
          ) : isVideo && item.dataUrl ? (
            <video
              src={item.dataUrl}
              controls
              className="max-h-[60vh] max-w-full rounded-xl shadow-lg"
              autoPlay
            />
          ) : item.textContent ? (
            <div className="w-full space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copied ? 'Copied' : 'Copy Content'}</span>
                </button>
              </div>
              <pre className="w-full p-4 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre-wrap">
                {item.textContent}
              </pre>
            </div>
          ) : (
            <div className="text-center p-8 text-slate-400 space-y-2">
              <FileText className="w-12 h-12 mx-auto text-slate-600" />
              <p className="text-sm font-medium">Binary Document</p>
              <p className="text-xs text-slate-500">
                Click &quot;Save&quot; above to open this file with your operating system&apos;s viewer.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Download,
  FileText,
  Image as ImageIcon,
  Music,
  FileCode,
  Archive,
  File,
  Clipboard,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  Copy,
  Check,
  Zap,
  Trash2,
} from 'lucide-react';
import { TransferItem } from '../utils/types';
import { formatBytes } from '../utils/packetProtocol';

interface TransferListProps {
  transfers: TransferItem[];
  onDownload: (item: TransferItem) => void;
  onPreview: (item: TransferItem) => void;
  onClearHistory: () => void;
}

export const TransferList: React.FC<TransferListProps> = ({
  transfers,
  onDownload,
  onPreview,
  onClearHistory,
}) => {
  const [filter, setFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredTransfers = transfers.filter((t) => {
    if (filter === 'incoming') return t.direction === 'incoming';
    if (filter === 'outgoing') return t.direction === 'outgoing';
    return true;
  });

  const handleCopyText = (item: TransferItem) => {
    const text = item.textContent || item.dataUrl || '';
    if (text && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const getCategoryIcon = (category: string, type: string) => {
    if (category === 'clipboard') {
      return <Clipboard className="w-5 h-5 text-amber-400" />;
    }
    if (category === 'image' || type.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-cyan-400" />;
    }
    if (category === 'audio' || type.startsWith('audio/')) {
      return <Music className="w-5 h-5 text-rose-400" />;
    }
    if (type.includes('json') || type.includes('javascript') || type.includes('typescript') || type.includes('html')) {
      return <FileCode className="w-5 h-5 text-blue-400" />;
    }
    if (type.includes('zip') || type.includes('tar') || type.includes('compressed')) {
      return <Archive className="w-5 h-5 text-purple-400" />;
    }
    if (category === 'text') {
      return <FileText className="w-5 h-5 text-emerald-400" />;
    }
    return <File className="w-5 h-5 text-slate-400" />;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-md shadow-xl">
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            Transfer Vault & Activity
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {transfers.length} items
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Incoming files auto-accepted directly without waiting for permission
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Direction Filter */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('incoming')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                filter === 'incoming'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
              Received
            </button>
            <button
              type="button"
              onClick={() => setFilter('outgoing')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                filter === 'outgoing'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3 h-3 text-cyan-400" />
              Sent
            </button>
          </div>

          {transfers.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
              title="Clear transfer history"
              aria-label="Clear transfer history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Transfers List */}
      {filteredTransfers.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium text-slate-400">No transfers yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Send a file, copy text, or snap a photo above to watch direct beaming in action!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransfers.map((item) => {
            const isIncoming = item.direction === 'incoming';
            const isCompleted = item.status === 'completed';

            return (
              <div
                key={item.id}
                className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl p-3.5 transition-all flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Left: Icon and Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 shadow-inner">
                      {getCategoryIcon(item.category, item.fileType)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                          {item.fileName}
                        </p>
                        {isIncoming && (
                          <span className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                            <Zap className="w-2.5 h-2.5 fill-emerald-400" />
                            Direct Auto-Received
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1 font-medium text-slate-300">
                          {isIncoming ? (
                            <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 text-cyan-400" />
                          )}
                          {isIncoming ? `From ${item.senderName}` : 'Sent'}
                        </span>
                        <span>•</span>
                        <span>{formatBytes(item.fileSize)}</span>
                        {item.speed && (
                          <>
                            <span>•</span>
                            <span className="text-cyan-400 font-mono">
                              {item.speed}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Preview / View button */}
                    {(item.dataUrl || item.textContent) && (
                      <button
                        type="button"
                        onClick={() => onPreview(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors"
                        title="Preview payload"
                        aria-label="Preview item"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Preview</span>
                      </button>
                    )}

                    {/* Copy text if text or clipboard */}
                    {(item.category === 'clipboard' || item.category === 'text') && item.textContent && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors"
                        title="Copy text to clipboard"
                        aria-label="Copy text"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {copiedId === item.id ? 'Copied' : 'Copy'}
                        </span>
                      </button>
                    )}

                    {/* 1-Click Download button */}
                    {isCompleted && item.dataUrl && (
                      <button
                        type="button"
                        onClick={() => onDownload(item)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition-all"
                        aria-label="Save or download file"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* In-Flight Progress Bar */}
                {!isCompleted && (
                  <div className="w-full space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Streaming chunks...</span>
                      <span className="font-mono text-cyan-400 font-semibold">
                        {item.progress}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-150"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Text / Clipboard inline snippet */}
                {item.textContent && (
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/50 text-xs font-mono text-slate-300 break-words line-clamp-2">
                    {item.textContent}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

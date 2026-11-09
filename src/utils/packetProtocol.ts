import { AppSettings, DeviceType, TransferCategory, TransferHeaderPacket } from './types';

export const CHUNK_SIZE = 64 * 1024; // 64KB per chunk for optimal WebRTC / WebSocket frame buffer

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm))} ${sizes[safeI]}`;
}

export function formatSpeed(bytes: number, timeMs: number): string {
  if (timeMs <= 0 || bytes <= 0) return '0 KB/s';
  const seconds = timeMs / 1000;
  const bytesPerSec = bytes / seconds;
  return `${formatBytes(bytesPerSec)}/s`;
}

export function chunkBase64(base64Data: string, chunkSize: number = CHUNK_SIZE): string[] {
  if (!base64Data) return [];
  const chunks: string[] = [];
  let offset = 0;
  while (offset < base64Data.length) {
    chunks.push(base64Data.slice(offset, offset + chunkSize));
    offset += chunkSize;
  }
  return chunks;
}

export function reassembleBase64(chunks: string[]): string {
  return chunks.join('');
}

export function detectDeviceDetails(userAgent: string): {
  type: DeviceType;
  os: string;
  browser: string;
} {
  const ua = userAgent.toLowerCase();
  let type: DeviceType = 'desktop';
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';

  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    type = 'tablet';
  } else if (/mobile|iphone|ipod|android/i.test(ua)) {
    type = 'mobile';
  } else {
    type = 'desktop';
  }

  // OS - Check mobile operating systems before desktop since iPhone UA contains 'like Mac OS X'
  if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/cros/i.test(ua)) os = 'ChromeOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  // Browser
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';

  return { type, os, browser };
}

const ADJECTIVES = [
  'Swift', 'Cosmic', 'Solar', 'Quantum', 'Nebula', 'Hyper', 'Nova',
  'Pulse', 'Cyber', 'Aura', 'Turbo', 'Vivid', 'Echo', 'Zenith', 'Phantom'
];

const NOUNS: Record<DeviceType, string[]> = {
  desktop: ['Rig', 'Station', 'Tower', 'Book', 'Mac', 'Blade', 'Desktop'],
  mobile: ['Phone', 'Pixel', 'Galaxy', 'Pocket', 'Mobile', 'Node', 'Nexus'],
  tablet: ['Pad', 'Tab', 'Slate', 'Surface', 'Canvas', 'Touch'],
  unknown: ['Device', 'Peer', 'Node', 'Portal']
};

export function generateFriendlyName(type: DeviceType): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const nounsList = NOUNS[type] || NOUNS.unknown;
  const noun = nounsList[Math.floor(Math.random() * nounsList.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${adj} ${noun} ${num}`;
}

export const AVATAR_COLORS = [
  'from-cyan-500 to-blue-600',
  'from-emerald-400 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-amber-400 to-orange-500',
  'from-rose-500 to-pink-600',
  'from-indigo-500 to-sky-500',
  'from-fuchsia-500 to-rose-500'
];

export function getRandomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

export function determineCategory(mimeType: string, fileName: string): TransferCategory {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) return 'text';
  return 'file';
}

export function shouldAutoAccept(
  header: TransferHeaderPacket,
  settings: AppSettings
): boolean {
  // If user has autoAccept enabled, everything is accepted directly without prompts
  if (settings.autoAccept) return true;
  // If the sender explicitly marked it as autoAccept (e.g. self-beaming between user's own devices)
  if (header.autoAccept) return true;
  return false;
}

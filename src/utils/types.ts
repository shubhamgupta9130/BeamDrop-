export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

export type TransportProtocol = 'webrtc' | 'websocket' | 'broadcast' | 'airgap';

export interface DeviceInfo {
  id: string;
  name: string;
  deviceType: DeviceType;
  os: string;
  browser: string;
  avatarColor: string;
  protocol: TransportProtocol;
  isTrusted: boolean;
  isSelf: boolean;
  lastSeen: number;
  ip?: string;
}

export type TransferCategory = 'file' | 'text' | 'clipboard' | 'image' | 'audio';

export interface TransferItem {
  id: string;
  senderId: string;
  senderName: string;
  receiverId?: string; // empty means broadcast to all
  fileName: string;
  fileSize: number;
  fileType: string;
  category: TransferCategory;
  dataUrl?: string; // for completed files / previews
  textContent?: string;
  timestamp: number;
  status: 'preparing' | 'transferring' | 'completed' | 'failed';
  progress: number; // 0 to 100
  bytesTransferred: number;
  speed: string; // e.g. "4.2 MB/s"
  autoAccepted: boolean;
  direction: 'incoming' | 'outgoing';
}

export interface ChunkPacket {
  type: 'chunk';
  transferId: string;
  chunkIndex: number;
  totalChunks: number;
  data: string; // base64 or text chunk
}

export interface TransferHeaderPacket {
  type: 'header';
  transferId: string;
  senderId: string;
  senderName: string;
  receiverId?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  category: TransferCategory;
  totalChunks: number;
  autoAccept: boolean;
  textContent?: string;
}

export interface TransferAckPacket {
  type: 'ack';
  transferId: string;
  senderId: string;
  receivedChunks: number;
}

export interface PeerAnnouncementPacket {
  type: 'announce';
  device: DeviceInfo;
}

export interface PeerLeavePacket {
  type: 'leave';
  deviceId: string;
}

export interface WebRtcSignalPacket {
  type: 'signal';
  senderId: string;
  targetId: string;
  signalData: any; // SDP offer/answer or ICE candidate
}

export type RemoteAction =
  | 'speaker_ring'
  | 'notepad_update'
  | 'screen_torch'
  | 'ping';

export interface RemoteCommandPacket {
  type: 'remote_command';
  senderId: string;
  senderName: string;
  receiverId?: string;
  action: RemoteAction;
  payload?: any;
}

export type PacketMessage =
  | TransferHeaderPacket
  | ChunkPacket
  | TransferAckPacket
  | PeerAnnouncementPacket
  | PeerLeavePacket
  | WebRtcSignalPacket
  | RemoteCommandPacket;

export interface AppSettings {
  deviceName: string;
  autoAccept: boolean;
  autoDownload: boolean;
  soundEnabled: boolean;
  preferredProtocol: 'auto' | 'webrtc' | 'websocket' | 'broadcast';
  maxChunkSize: number; // default 64KB (65536)
}

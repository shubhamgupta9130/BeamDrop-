import {
  AppSettings,
  ChunkPacket,
  DeviceInfo,
  PacketMessage,
  PeerAnnouncementPacket,
  RemoteAction,
  RemoteCommandPacket,
  TransferHeaderPacket,
  TransferItem,
  TransportProtocol,
} from './types';
import {
  CHUNK_SIZE,
  chunkBase64,
  detectDeviceDetails,
  formatSpeed,
  generateFriendlyName,
  getRandomAvatarColor,
  reassembleBase64,
  shouldAutoAccept,
} from './packetProtocol';

export class MeshNetwork {
  public selfDevice: DeviceInfo;
  public settings: AppSettings;
  private peers: Map<string, DeviceInfo> = new Map();
  private ws: WebSocket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private isDestroyed = false;
  private heartbeatTimer: any = null;
  private pruneTimer: any = null;

  // Active incoming transfers: transferId -> { header, chunks: Map<number, string>, startTime, lastTime }
  private incomingTransfers: Map<
    string,
    {
      header: TransferHeaderPacket;
      chunks: Map<number, string>;
      startTime: number;
      lastChunkTime: number;
      receivedBytes: number;
    }
  > = new Map();

  // Callbacks
  public onPeersUpdated: ((peers: DeviceInfo[]) => void) | null = null;
  public onTransferStarted: ((item: TransferItem) => void) | null = null;
  public onTransferProgress: ((item: TransferItem) => void) | null = null;
  public onTransferCompleted: ((item: TransferItem) => void) | null = null;
  public onConnectionStateChange: ((state: { wsConnected: boolean; peersCount: number }) => void) | null = null;
  public onRemoteCommandReceived: ((command: RemoteCommandPacket) => void) | null = null;

  constructor(customId?: string, customName?: string) {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const details = detectDeviceDetails(userAgent);

    const savedId = customId || (typeof localStorage !== 'undefined' ? localStorage.getItem('beamdrop_device_id') : null);
    const id = savedId || `dev_${Math.random().toString(36).substring(2, 9)}`;
    if (typeof localStorage !== 'undefined' && !customId) {
      localStorage.setItem('beamdrop_device_id', id);
    }

    const savedName = customName || (typeof localStorage !== 'undefined' ? localStorage.getItem('beamdrop_device_name') : null);
    const name = savedName || generateFriendlyName(details.type);
    if (typeof localStorage !== 'undefined' && !customName) {
      localStorage.setItem('beamdrop_device_name', name);
    }

    const savedColor = typeof localStorage !== 'undefined' ? localStorage.getItem('beamdrop_avatar_color') : null;
    const avatarColor = savedColor || getRandomAvatarColor();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('beamdrop_avatar_color', avatarColor);
    }

    this.selfDevice = {
      id,
      name,
      deviceType: details.type,
      os: details.os,
      browser: details.browser,
      avatarColor,
      protocol: 'websocket',
      isTrusted: true,
      isSelf: true,
      lastSeen: Date.now(),
    };

    const savedSettings = typeof localStorage !== 'undefined' ? localStorage.getItem('beamdrop_settings') : null;
    if (savedSettings) {
      try {
        this.settings = JSON.parse(savedSettings);
      } catch {
        this.settings = this.getDefaultSettings();
      }
    } else {
      this.settings = this.getDefaultSettings();
    }
  }

  private getDefaultSettings(): AppSettings {
    return {
      deviceName: this.selfDevice.name,
      autoAccept: true, // Default to true for zero-permission direct share
      autoDownload: true,
      soundEnabled: true,
      preferredProtocol: 'auto',
      maxChunkSize: CHUNK_SIZE,
    };
  }

  public updateSettings(newSettings: Partial<AppSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    if (newSettings.deviceName && newSettings.deviceName !== this.selfDevice.name) {
      this.selfDevice.name = newSettings.deviceName;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('beamdrop_device_name', newSettings.deviceName);
      }
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('beamdrop_settings', JSON.stringify(this.settings));
    }
    this.broadcastAnnouncement();
  }

  public start() {
    this.isDestroyed = false;
    this.setupBroadcastChannel();
    this.setupWebSocket();

    // Heartbeat every 3 seconds to keep discovery fresh
    this.heartbeatTimer = setInterval(() => {
      this.broadcastAnnouncement();
    }, 3000);

    // Prune stale peers every 4 seconds
    this.pruneTimer = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, peer] of this.peers.entries()) {
        if (now - peer.lastSeen > 12000) {
          this.peers.delete(id);
          changed = true;
        }
      }
      if (changed) {
        this.notifyPeersUpdated();
      }
    }, 4000);

    // Initial announcement
    setTimeout(() => {
      this.broadcastAnnouncement();
    }, 200);
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.pruneTimer) clearInterval(this.pruneTimer);

    // Announce departure
    this.sendRaw({
      type: 'leave',
      deviceId: this.selfDevice.id,
    });

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
  }

  private setupBroadcastChannel() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel('beamdrop_mesh_channel');
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingPacket(event.data, 'broadcast');
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported in this environment', e);
    }
  }

  private setupWebSocket() {
    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.broadcastAnnouncement();
        this.notifyConnectionState(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const packet: PacketMessage = JSON.parse(event.data);
          this.handleIncomingPacket(packet, 'websocket');
        } catch (e) {
          console.error('Failed to parse WebSocket packet', e);
        }
      };

      this.ws.onclose = () => {
        this.notifyConnectionState(false);
        // Retry connection after 3 seconds if not destroyed
        if (!this.isDestroyed) {
          setTimeout(() => {
            if (!this.isDestroyed) this.setupWebSocket();
          }, 3000);
        }
      };

      this.ws.onerror = () => {
        this.notifyConnectionState(false);
      };
    } catch {
      this.notifyConnectionState(false);
    }
  }

  private notifyConnectionState(wsConnected: boolean) {
    if (this.onConnectionStateChange) {
      this.onConnectionStateChange({
        wsConnected,
        peersCount: this.peers.size,
      });
    }
  }

  private sendRaw(packet: PacketMessage) {
    // 1. BroadcastChannel (fast local bus)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(packet);
      } catch (err) {
        console.warn('Error posting to BroadcastChannel:', err);
      }
    }

    // 2. WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(packet));
      } catch (err) {
        console.warn('Error sending to WebSocket:', err);
      }
    }
  }

  public broadcastAnnouncement() {
    this.selfDevice.lastSeen = Date.now();
    const packet: PeerAnnouncementPacket = {
      type: 'announce',
      device: { ...this.selfDevice },
    };
    this.sendRaw(packet);
  }

  private handleIncomingPacket(packet: PacketMessage, protocol: TransportProtocol) {
    if (!packet || typeof packet !== 'object') return;

    switch (packet.type) {
      case 'announce': {
        const remoteDevice = packet.device;
        if (!remoteDevice || remoteDevice.id === this.selfDevice.id) return;

        const isNew = !this.peers.has(remoteDevice.id);
        this.peers.set(remoteDevice.id, {
          ...remoteDevice,
          protocol,
          isSelf: false,
          lastSeen: Date.now(),
        });

        this.notifyPeersUpdated();

        // If it's a newly discovered peer, respond with our announcement immediately
        if (isNew) {
          this.broadcastAnnouncement();
        }
        break;
      }

      case 'leave': {
        if (packet.deviceId && this.peers.has(packet.deviceId)) {
          this.peers.delete(packet.deviceId);
          this.notifyPeersUpdated();
        }
        break;
      }

      case 'header': {
        this.handleTransferHeader(packet);
        break;
      }

      case 'chunk': {
        this.handleTransferChunk(packet);
        break;
      }

      case 'ack': {
        // Ack handled in sender
        break;
      }

      case 'remote_command': {
        if (packet.receiverId && packet.receiverId !== this.selfDevice.id) {
          break;
        }
        if (this.onRemoteCommandReceived) {
          this.onRemoteCommandReceived(packet);
        }
        break;
      }
    }
  }

  public sendRemoteCommand(action: RemoteAction, payload?: any, receiverId?: string) {
    const packet: RemoteCommandPacket = {
      type: 'remote_command',
      senderId: this.selfDevice.id,
      senderName: this.selfDevice.name,
      receiverId,
      action,
      payload,
    };
    this.sendRaw(packet);
  }

  private notifyPeersUpdated() {
    if (this.onPeersUpdated) {
      this.onPeersUpdated(Array.from(this.peers.values()));
    }
    this.notifyConnectionState(this.ws?.readyState === WebSocket.OPEN);
  }

  public getConnectedPeers(): DeviceInfo[] {
    return Array.from(this.peers.values());
  }

  private handleTransferHeader(header: TransferHeaderPacket) {
    // Check if this transfer is addressed to us or broadcast (no receiverId or matches our id)
    if (header.receiverId && header.receiverId !== this.selfDevice.id) {
      return;
    }

    // Check zero-permission auto-accept policy
    const isAutoAccepted = shouldAutoAccept(header, this.settings);

    const initialItem: TransferItem = {
      id: header.transferId,
      senderId: header.senderId,
      senderName: header.senderName,
      receiverId: header.receiverId,
      fileName: header.fileName,
      fileSize: header.fileSize,
      fileType: header.fileType,
      category: header.category,
      textContent: header.textContent,
      timestamp: Date.now(),
      status: 'transferring',
      progress: 0,
      bytesTransferred: 0,
      speed: '0 KB/s',
      autoAccepted: isAutoAccepted,
      direction: 'incoming',
    };

    this.incomingTransfers.set(header.transferId, {
      header,
      chunks: new Map(),
      startTime: Date.now(),
      lastChunkTime: Date.now(),
      receivedBytes: 0,
    });

    if (this.onTransferStarted) {
      this.onTransferStarted(initialItem);
    }

    // If zero-chunk or text-only shortcut
    if (header.totalChunks === 0 && header.textContent) {
      initialItem.status = 'completed';
      initialItem.progress = 100;
      initialItem.bytesTransferred = header.fileSize;
      initialItem.speed = 'Instant';
      this.incomingTransfers.delete(header.transferId);
      if (this.onTransferCompleted) {
        this.onTransferCompleted(initialItem);
      }
    }
  }

  private handleTransferChunk(chunk: ChunkPacket) {
    const transfer = this.incomingTransfers.get(chunk.transferId);
    if (!transfer) return;

    transfer.chunks.set(chunk.chunkIndex, chunk.data);
    transfer.receivedBytes += chunk.data.length;
    transfer.lastChunkTime = Date.now();

    const totalChunks = transfer.header.totalChunks;
    const progress = Math.min(100, Math.round((transfer.chunks.size / totalChunks) * 100));
    const elapsedMs = transfer.lastChunkTime - transfer.startTime;
    const speed = formatSpeed(transfer.receivedBytes, elapsedMs);

    const updateItem: TransferItem = {
      id: transfer.header.transferId,
      senderId: transfer.header.senderId,
      senderName: transfer.header.senderName,
      receiverId: transfer.header.receiverId,
      fileName: transfer.header.fileName,
      fileSize: transfer.header.fileSize,
      fileType: transfer.header.fileType,
      category: transfer.header.category,
      timestamp: Date.now(),
      status: 'transferring',
      progress,
      bytesTransferred: transfer.receivedBytes,
      speed,
      autoAccepted: shouldAutoAccept(transfer.header, this.settings),
      direction: 'incoming',
    };

    if (this.onTransferProgress) {
      this.onTransferProgress(updateItem);
    }

    // Check completion
    if (transfer.chunks.size >= totalChunks) {
      // Reassemble all chunks in numerical order
      const orderedChunks: string[] = [];
      for (let i = 0; i < totalChunks; i++) {
        orderedChunks.push(transfer.chunks.get(i) || '');
      }
      const fullBase64 = reassembleBase64(orderedChunks);

      updateItem.status = 'completed';
      updateItem.progress = 100;
      updateItem.dataUrl = fullBase64;
      updateItem.speed = formatSpeed(transfer.header.fileSize, elapsedMs || 100);

      this.incomingTransfers.delete(chunk.transferId);

      // Trigger completion callback
      if (this.onTransferCompleted) {
        this.onTransferCompleted(updateItem);
      }
    }
  }

  // SENDING FUNCTIONALITY
  public async sendFile(
    file: File | Blob,
    fileName: string,
    fileType: string,
    category: any,
    targetReceiverId?: string
  ): Promise<TransferItem> {
    const transferId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const base64Data = await this.readAsDataURL(file);
    const chunks = chunkBase64(base64Data, this.settings.maxChunkSize);

    const header: TransferHeaderPacket = {
      type: 'header',
      transferId,
      senderId: this.selfDevice.id,
      senderName: this.selfDevice.name,
      receiverId: targetReceiverId,
      fileName,
      fileSize: file.size,
      fileType: fileType || 'application/octet-stream',
      category,
      totalChunks: chunks.length,
      autoAccept: true, // Auto accept enabled for direct sharing
    };

    const item: TransferItem = {
      id: transferId,
      senderId: this.selfDevice.id,
      senderName: this.selfDevice.name,
      receiverId: targetReceiverId,
      fileName,
      fileSize: file.size,
      fileType: fileType,
      category,
      dataUrl: base64Data,
      timestamp: Date.now(),
      status: 'transferring',
      progress: 0,
      bytesTransferred: 0,
      speed: '0 KB/s',
      autoAccepted: true,
      direction: 'outgoing',
    };

    if (this.onTransferStarted) {
      this.onTransferStarted(item);
    }

    // Send header first
    this.sendRaw(header);

    // Stream chunks sequentially with micro-delays to prevent frame dropping
    const startTime = Date.now();
    let sentBytes = 0;

    for (let i = 0; i < chunks.length; i++) {
      if (this.isDestroyed) break;

      const chunkPacket: ChunkPacket = {
        type: 'chunk',
        transferId,
        chunkIndex: i,
        totalChunks: chunks.length,
        data: chunks[i],
      };

      this.sendRaw(chunkPacket);
      sentBytes += chunks[i].length;

      const progress = Math.round(((i + 1) / chunks.length) * 100);
      const elapsed = Date.now() - startTime;
      item.progress = progress;
      item.bytesTransferred = sentBytes;
      item.speed = formatSpeed(sentBytes, elapsed);

      if (this.onTransferProgress) {
        this.onTransferProgress(item);
      }

      // Small pacing yield every 4 chunks to avoid clogging browser event loop
      if (i % 4 === 0) {
        await new Promise((r) => setTimeout(r, 8));
      }
    }

    item.status = 'completed';
    item.progress = 100;
    const totalElapsed = Date.now() - startTime;
    item.speed = formatSpeed(file.size, totalElapsed || 50);

    if (this.onTransferCompleted) {
      this.onTransferCompleted(item);
    }

    return item;
  }

  public async sendTextOrClipboard(
    text: string,
    isClipboard: boolean,
    targetReceiverId?: string
  ): Promise<TransferItem> {
    const transferId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const category = isClipboard ? 'clipboard' : 'text';
    const fileName = isClipboard ? 'Live Clipboard Sync' : 'Quick Note';
    const fileSize = new Blob([text]).size;

    const header: TransferHeaderPacket = {
      type: 'header',
      transferId,
      senderId: this.selfDevice.id,
      senderName: this.selfDevice.name,
      receiverId: targetReceiverId,
      fileName,
      fileSize,
      fileType: 'text/plain',
      category,
      totalChunks: 0,
      autoAccept: true,
      textContent: text,
    };

    const item: TransferItem = {
      id: transferId,
      senderId: this.selfDevice.id,
      senderName: this.selfDevice.name,
      receiverId: targetReceiverId,
      fileName,
      fileSize,
      fileType: 'text/plain',
      category,
      textContent: text,
      timestamp: Date.now(),
      status: 'completed',
      progress: 100,
      bytesTransferred: fileSize,
      speed: 'Instant',
      autoAccepted: true,
      direction: 'outgoing',
    };

    if (this.onTransferStarted) {
      this.onTransferStarted(item);
    }

    this.sendRaw(header);

    if (this.onTransferCompleted) {
      this.onTransferCompleted(item);
    }

    return item;
  }

  private readAsDataURL(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBytes,
  formatSpeed,
  chunkBase64,
  reassembleBase64,
  detectDeviceDetails,
  generateFriendlyName,
  shouldAutoAccept,
  determineCategory
} from './packetProtocol';
import { AppSettings, TransferHeaderPacket } from './types';

test('formatBytes formats binary magnitudes accurately', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1024), '1 KB');
  assert.equal(formatBytes(1024 * 1024 * 5), '5 MB');
  assert.equal(formatBytes(1024 * 1024 * 1024 * 2.5, 1), '2.5 GB');
});

test('formatSpeed calculates accurate data transfer speeds', () => {
  assert.equal(formatSpeed(0, 1000), '0 KB/s');
  assert.equal(formatSpeed(1024 * 1024, 1000), '1 MB/s');
  assert.equal(formatSpeed(1024 * 1024 * 10, 2000), '5 MB/s');
});

test('chunkBase64 splits and reassembleBase64 perfectly restores data', () => {
  const original = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const chunks = chunkBase64(original, 20);
  assert.ok(chunks.length > 3);
  const restored = reassembleBase64(chunks);
  assert.equal(restored, original);
});

test('detectDeviceDetails handles mobile, desktop, and tablets', () => {
  const mobileUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
  const mobileRes = detectDeviceDetails(mobileUa);
  assert.equal(mobileRes.type, 'mobile');
  assert.equal(mobileRes.os, 'iOS');
  assert.equal(mobileRes.browser, 'Safari');

  const macUa = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const macRes = detectDeviceDetails(macUa);
  assert.equal(macRes.type, 'desktop');
  assert.equal(macRes.os, 'macOS');
  assert.equal(macRes.browser, 'Chrome');
});

test('determineCategory identifies image, audio, text and file correctly', () => {
  assert.equal(determineCategory('image/jpeg', 'photo.jpg'), 'image');
  assert.equal(determineCategory('audio/mp3', 'memo.mp3'), 'audio');
  assert.equal(determineCategory('text/plain', 'notes.txt'), 'text');
  assert.equal(determineCategory('application/pdf', 'document.pdf'), 'file');
});

test('shouldAutoAccept respects zero-permission direct share policy', () => {
  const defaultSettings: AppSettings = {
    deviceName: 'Test Rig',
    autoAccept: true,
    autoDownload: true,
    soundEnabled: true,
    preferredProtocol: 'auto',
    maxChunkSize: 65536,
  };

  const header: TransferHeaderPacket = {
    type: 'header',
    transferId: 't-123',
    senderId: 'dev-1',
    senderName: 'Cosmic Phone',
    fileName: 'secret.png',
    fileSize: 1024,
    fileType: 'image/png',
    category: 'image',
    totalChunks: 1,
    autoAccept: false,
  };

  // With autoAccept enabled on receiver, it accepts directly without asking
  assert.equal(shouldAutoAccept(header, defaultSettings), true);

  // Even if receiver autoAccept was false, if sender explicitly beamed with autoAccept flag
  const strictSettings: AppSettings = { ...defaultSettings, autoAccept: false };
  assert.equal(shouldAutoAccept(header, strictSettings), false);

  const directBeamHeader: TransferHeaderPacket = { ...header, autoAccept: true };
  assert.equal(shouldAutoAccept(directBeamHeader, strictSettings), true);
});

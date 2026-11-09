// Offline Audio feedback generated via Web Audio API without needing external MP3 files

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function playSendChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch {
    // Graceful fallback if audio is not permitted yet
  }
}

export function playReceiveChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Harmonic double ding
    [
      { freq: 523.25, time: 0 }, // C5
      { freq: 659.25, time: 0.08 }, // E5
      { freq: 783.99, time: 0.16 }, // G5
      { freq: 1046.5, time: 0.24 }, // C6
    ].forEach((tone) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(tone.freq, now + tone.time);

      gain.gain.setValueAtTime(0.18, now + tone.time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + tone.time + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + tone.time);
      osc.stop(now + tone.time + 0.2);
    });
  } catch {
    // Ignore audio errors
  }
}

export function playConnectChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  } catch {
    // Ignore
  }
}

export function playRemoteSpeakerAlarm() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Energetic dual-tone alert siren/chime
    const tones = [
      { f: 880, d: 0.12, t: 0 },
      { f: 1174.66, d: 0.12, t: 0.14 },
      { f: 880, d: 0.12, t: 0.28 },
      { f: 1174.66, d: 0.25, t: 0.42 },
      { f: 1480, d: 0.35, t: 0.7 },
    ];

    tones.forEach((tone) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(tone.f, now + tone.t);

      gain.gain.setValueAtTime(0.25, now + tone.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + tone.t + tone.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + tone.t);
      osc.stop(now + tone.t + tone.d);
    });
  } catch {
    // Ignore
  }
}

export function playQrScanSuccess() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  } catch {
    // Ignore
  }
}


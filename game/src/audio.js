// Sound, all synthesized with WebAudio: no audio files, nothing fetched.
// The context is created on the first user gesture, so browsers allow it.
export function createAudio() {
  const a = { ctx: null, master: null, engine: null, engineGain: null, muted: false };
  a.ensure = () => {
    if (a.ctx) {
      if (a.ctx.state === 'suspended') a.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    a.ctx = new Ctx();
    a.master = a.ctx.createGain();
    a.master.gain.value = 0.5;
    a.master.connect(a.ctx.destination);
    a.engine = a.ctx.createOscillator();
    a.engine.type = 'sawtooth';
    a.engine.frequency.value = 55;
    const filt = a.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 320;
    a.engineGain = a.ctx.createGain();
    a.engineGain.gain.value = 0;
    a.engine.connect(filt);
    filt.connect(a.engineGain);
    a.engineGain.connect(a.master);
    a.engine.start();
  };
  a.setEngine = (norm) => {
    if (!a.ctx) return;
    a.engine.frequency.value = 55 + norm * 130;
    a.engineGain.gain.value = a.muted ? 0 : 0.04 + norm * 0.05;
  };
  return a;
}

// A short beep. Nothing happens before the first user gesture, when the
// AudioContext is created.
function beep(a, freq, dur, type, vol) {
  if (!a.ctx || a.muted) return;
  const t = a.ctx.currentTime;
  const osc = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  g.gain.setValueAtTime(vol || 0.15, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g);
  g.connect(a.master);
  osc.start(t);
  osc.stop(t + dur);
}

function noiseBurst(a, dur, vol) {
  if (!a.ctx || a.muted) return;
  const t = a.ctx.currentTime;
  const len = Math.floor(a.ctx.sampleRate * dur);
  const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.ctx.createBufferSource();
  src.buffer = buf;
  const g = a.ctx.createGain();
  g.gain.value = vol || 0.2;
  src.connect(g);
  g.connect(a.master);
  src.start(t);
}

// Create (or resume) the AudioContext on the first user gesture.
export function resume(a) {
  a.ensure();
}

export function setMuted(a, muted) {
  a.muted = muted;
  if (a.engineGain) a.engineGain.gain.value = muted ? 0 : 0.04;
  if (a.master) a.master.gain.value = muted ? 0 : 0.5;
}

export function setEngine(a, level) {
  if (!a.ctx) return;
  a.engine.frequency.value = 55 + level * 130;
  a.engineGain.gain.value = a.muted ? 0 : 0.04 + level * 0.05;
}

export function horn(a) {
  beep(a, 440, 0.18, 'sawtooth', 0.12);
}

export function shoot(a) {
  beep(a, 180, 0.12, 'square', 0.2);
  noiseBurst(a, 0.12, 0.25);
}

export function pickup(a) {
  beep(a, 880, 0.12, 'sine', 0.2);
  setTimeout(() => beep(a, 1320, 0.15, 'sine', 0.2), 90);
}

export function punch(a) {
  noiseBurst(a, 0.08, 0.3);
}

export function siren(a) {
  beep(a, 660, 0.25, 'triangle', 0.12);
  setTimeout(() => beep(a, 520, 0.25, 'triangle', 0.12), 200);
}

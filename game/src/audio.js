// KOTA SENJA — synthesized sound, WebAudio only, no audio files.
// Engine hum, sirens, chimes and thuds are all built from oscillators.

export function createAudioEngine() {
  const engine = {
    context: null,
    master: null,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    sirenLfo: null,
    sirenOn: false,
    muted: false,
    started: false,
  };

  function ensureContext() {
    if (engine.context) return engine.context;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      engine.context = new AudioContextClass();
      engine.master = engine.context.createGain();
      engine.master.gain.value = engine.muted ? 0 : 0.5;
      engine.master.connect(engine.context.destination);
      engine.started = true;
    } catch (err) {
      engine.context = null;
    }
    return engine.context;
  }

  function startEngineHum() {
    const ctx = ensureContext();
    if (!ctx || engine.engineOsc) return;
    engine.engineOsc = ctx.createOscillator();
    engine.engineOsc.type = 'sawtooth';
    engine.engineOsc.frequency.value = 55;
    engine.engineGain = ctx.createGain();
    engine.engineGain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    engine.engineOsc.connect(filter);
    filter.connect(engine.engineGain);
    engine.engineGain.connect(engine.master);
    engine.engineOsc.start();
  }

  function setEngineSpeed(speedRatio) {
    if (!engine.engineOsc || !engine.engineGain) return;
    const clamped = Math.min(1, Math.max(0, speedRatio));
    engine.engineGain.gain.setTargetAtTime(0.02 + clamped * 0.09, engine.context.currentTime, 0.08);
    engine.engineOsc.frequency.setTargetAtTime(52 + clamped * 130, engine.context.currentTime, 0.08);
  }

  function setSiren(on) {
    if (on === engine.sirenOn) return;
    engine.sirenOn = on;
    const ctx = ensureContext();
    if (!ctx) return;
    if (on && !engine.sirenOsc) {
      engine.sirenOsc = ctx.createOscillator();
      engine.sirenOsc.type = 'square';
      engine.sirenOsc.frequency.value = 740;
      engine.sirenGain = ctx.createGain();
      engine.sirenGain.gain.value = 0.035;
      const lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = 1.4;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 190;
      lfo.connect(lfoGain);
      lfoGain.connect(engine.sirenOsc.frequency);
      engine.sirenOsc.connect(engine.sirenGain);
      engine.sirenGain.connect(engine.master);
      engine.sirenOsc.start();
      lfo.start();
      engine.sirenLfo = lfo;
    } else if (!on && engine.sirenOsc) {
      try {
        engine.sirenOsc.stop();
        if (engine.sirenLfo) engine.sirenLfo.stop();
      } catch (err) {
        // Already stopped; nothing to do.
      }
      engine.sirenOsc = null;
      engine.sirenLfo = null;
    }
  }

  function blip(frequency, duration, type, volume, slideTo) {
    const ctx = ensureContext();
    if (!ctx || !engine.master) return;
    try {
      const osc = ctx.createOscillator();
      osc.type = type || 'sine';
      osc.frequency.value = frequency;
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume || 0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(engine.master);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.02);
    } catch (err) {
      // Sound is decorative; a failed blip never breaks the game.
    }
  }

  function playChime() {
    blip(660, 0.18, 'sine', 0.25);
    setTimeout(() => blip(880, 0.3, 'sine', 0.25), 110);
  }

  function playThud() {
    blip(90, 0.16, 'triangle', 0.4, 45);
  }

  function playShot() {
    blip(1400, 0.09, 'square', 0.16, 220);
  }

  function playJingle() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((note, i) => {
      setTimeout(() => blip(note, 0.35, 'triangle', 0.22), i * 130);
    });
  }

  function playBusted() {
    blip(392, 0.4, 'sawtooth', 0.18, 196);
  }

  function setMuted(muted) {
    engine.muted = muted;
    if (engine.master && engine.context) {
      engine.master.gain.setTargetAtTime(muted ? 0 : 0.5, engine.context.currentTime, 0.05);
    }
  }

  function stopAll() {
    setSiren(false);
    if (engine.engineGain && engine.context) {
      engine.engineGain.gain.setTargetAtTime(0, engine.context.currentTime, 0.05);
    }
  }

  return {
    engine,
    ensureContext,
    startEngineHum,
    setEngineSpeed,
    setSiren,
    playChime,
    playThud,
    playShot,
    playJingle,
    playBusted,
    setMuted,
    stopAll,
  };
}

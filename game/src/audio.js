// Sound made from nothing: every cue is a couple of oscillators and a short burst of shaped noise,
// built the first time the player touches the game (browsers only allow sound after a gesture) and
// then reused. No audio files, so the game stays a set of plain files with no assets to fetch.
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let noiseBuffer = null;

  function ensure() {
    if (context) return context;
    const Ctor = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = 0.5;
    master.connect(context.destination);
    noiseBuffer = context.createBuffer(1, context.sampleRate * 0.5, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    }
    return context;
  }

  function tone({ freq, to, dur, type = 'sine', gain = 0.2, delay = 0, glide = 'exp' }) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (to && glide === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + dur);
    else if (to) osc.frequency.linearRampToValueAtTime(to, start + dur);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(amp).connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  function noise({ dur, gain = 0.12, delay = 0, cutoff = 1400, sweep = 0 }) {
    const ctx = ensure();
    if (!ctx || muted || !noiseBuffer) return;
    const start = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(cutoff, start);
    if (sweep) filter.frequency.exponentialRampToValueAtTime(cutoff * sweep, start + dur);
    filter.Q.value = 0.8;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    source.connect(filter).connect(amp).connect(master);
    source.start(start);
    source.stop(start + dur + 0.02);
  }

  const cues = {
    launch: () => {
      noise({ dur: 0.34, gain: 0.1, cutoff: 900, sweep: 2.6 });
      tone({ freq: 320, to: 180, dur: 0.26, type: 'triangle', gain: 0.1 });
    },
    gate: (index = 1) => {
      const base = 620 * Math.pow(1.09, Math.min(index, 6));
      tone({ freq: base, dur: 0.5, type: 'sine', gain: 0.16 });
      tone({ freq: base * 1.5, dur: 0.36, type: 'sine', gain: 0.07, delay: 0.02 });
      tone({ freq: base * 2.02, dur: 0.22, type: 'sine', gain: 0.04, delay: 0.05 });
    },
    puff: () => {
      noise({ dur: 0.16, gain: 0.09, cutoff: 1800, sweep: 1.6 });
      tone({ freq: 540, to: 720, dur: 0.12, type: 'triangle', gain: 0.06 });
    },
    crash: () => {
      noise({ dur: 0.5, gain: 0.16, cutoff: 420, sweep: 0.4 });
      tone({ freq: 180, to: 62, dur: 0.5, type: 'sawtooth', gain: 0.12 });
    },
    land: () => {
      [392, 494, 587].forEach((freq, index) => tone({ freq, dur: 0.9 - index * 0.12, type: 'sine', gain: 0.11, delay: index * 0.06 }));
    },
    sector: () => {
      tone({ freq: 330, to: 440, dur: 0.3, type: 'triangle', gain: 0.08 });
    },
    over: () => {
      [262, 220, 175].forEach((freq, index) => tone({ freq, dur: 1.1, type: 'sine', gain: 0.1, delay: index * 0.14 }));
    },
    won: () => {
      [392, 494, 587, 784].forEach((freq, index) => tone({ freq, dur: 1.2, type: 'sine', gain: 0.1, delay: index * 0.11 }));
      tone({ freq: 196, dur: 1.6, type: 'triangle', gain: 0.06 });
    },
    recall: () => {
      tone({ freq: 420, to: 300, dur: 0.26, type: 'triangle', gain: 0.07 });
    },
    ui: () => {
      tone({ freq: 660, dur: 0.1, type: 'sine', gain: 0.06 });
    },
  };

  return {
    /** Play one named cue; unknown names are ignored so the loop can forward events blindly. */
    play(name, ...args) {
      const cue = cues[name];
      if (cue) cue(...args);
    },
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}

/**
 * ============================================================================
 * PROCEDURAL CHIPTUNE & EPIC MUSIC ENGINE (Web Audio API)
 * ============================================================================
 * 
 * TRACK CONFIG FORMAT SPECIFICATION:
 * Each track is a standalone config object (e.g. audio/tracks/*.js) with:
 * {
 *   id: string,                 // Unique track identifier (e.g. 'battle-vazhgan', 'flashcards-chill')
 *   title: string,              // Human-readable title
 *   bpm: number,                // Base tempo in BPM (e.g. 100, 104, 112, 128)
 *   root: string|number,        // Key root note name ('A2', 'D3', 'E2', 'F#2') or MIDI number
 *   scale: number[],            // Scale intervals in semitones relative to root
 *   loopLengthBars: number,     // Number of bars in full loop (e.g. 8 or 16)
 *   chordProgression: number[], // Array of scale degrees or roots per bar
 *   swing: number,              // Swing factor (0 to 0.5) applied to off-beat 16th notes
 *   reverbSend: number,         // Wet send amount to shared convolution reverb (0.0 to 1.0)
 *   masterGain: number,         // Track ceiling volume (0.0 to 1.0)
 *   instruments: {              // Synthesis definitions per channel
 *     [channelName]: {
 *       oscillator: string|string[], // 'sine'|'triangle'|'sawtooth'|'square'|['sawtooth','triangle']
 *       detune: number|number[],     // Detuning in cents (e.g. [-8, 0, 8])
 *       distortion?: number,         // Optional waveshaper distortion drive (e.g. 25)
 *       envelope: { attack, decay, sustain, release }, // ADSR timings in seconds
 *       filter: {                    // Biquad filter settings & optional filter envelope
 *         type: string,              // 'lowpass'|'bandpass'|'highpass'
 *         cutoff: number,            // Base cutoff frequency in Hz
 *         envAmount?: number,        // Optional envelope modulation depth in Hz
 *         attack?: number,           // Optional filter attack swell time
 *         decay?: number,            // Optional filter decay time
 *         resonance?: number         // Q resonance factor
 *       },
 *       gain: number,                // Channel relative gain multiplier
 *       vibrato?: { rate, depth }    // Optional subtle pitch LFO
 *     }
 *   },
 *   patterns: {                 // 16th-note step arrays per channel (16 steps/bar)
 *     [channelName]: (NoteEvent | null)[]
 *   },
 *   layers: {                   // Channel-to-layer mapping for dynamic arrangement (0..3)
 *     [channelName]: number     // 0 = bass/kick/pad/lead, 1 = hats/arp, 2 = snare/counter, 3 = crash/fills
 *   }
 * }
 * 
 * NoteEvent:
 *   { note?: string, degree?: number, degrees?: number[], octave?: number, duration?: number, velocity?: number, type?: string }
 * ============================================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AudioEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Constants & Scheduling Limits
  const LOOKAHEAD_INTERVAL_MS = 30;       // Scheduler tick frequency (~30ms)
  const SCHEDULE_AHEAD_TIME_SEC = 0.220;   // Scheduling lookahead window (~220ms safe buffer against mobile UI lag)
  const STORAGE_KEY_MUTED = 'gv_sound_muted';

  // Audio Context & Global Nodes
  let audioCtx = null;
  let masterGainNode = null;
  let sfxGainNode = null;
  let reverbNode = null;
  let reverbReturnGain = null;
  let isMutedState = false;

  // Track Registry
  const registeredTracks = new Map();

  // Active Music Loop State (Strictly single-loop at all times)
  let currentTrack = null;
  let currentTrackId = null;
  let currentTrackGain = null;
  let currentLayerGains = null; // Array of 4 gain nodes for layers 0..3
  let isPlaying = false;
  let schedulerTimer = null;
  let currentStep = 0;
  let nextNoteTime = 0;
  let tempoMultiplier = 1.0;
  let tempoRampStartVal = 1.0;
  let tempoRampTargetVal = 1.0;
  let tempoRampStartTime = 0;
  let tempoRampDurationMs = 0;
  let layerLevel = 3; // 0 = base, 1 = +arp/hats, 2 = +snare/counter, 3 = full/fills

  // Battle dynamics & ending jingle state
  let pendingClimaxFill = false;
  let isEndingJinglePlaying = false;
  let jingleTimeout = null;
  let battleMaxProgress = 0;
  let climaxTriggered = false;

  // Beat Clock & Scheduling Queue (TASK 1)
  const beatListeners = new Set();
  const scheduledBeatQueue = [];
  let lastBeatQuarterTime = 0;
  let isCurrentDownbeat = false;

  // Battle Intensity Single Source of Truth Store (TASK 1)
  const battleIntensityListeners = new Set();
  const battleIntensityState = {
    p: 0,
    level: 0,
    isHell: false,
    effectiveBpm: 100
  };

  // Active voice nodes for leak-free cleanup
  const activeVoiceNodes = new Set();

  // Noise Buffer & Distortion Curve Caches
  let cachedNoiseBuffer = null;
  const distortionCurves = new Map();

  /**
   * Parse note string ('D3', 'F#4', 'Bb2', 'C5') to MIDI number
   */
  const NOTE_SEMITONES = {
    'C': 0, 'C#': 1, 'DB': 1, 'D': 2, 'D#': 3, 'EB': 3,
    'E': 4, 'F': 5, 'F#': 6, 'GB': 6, 'G': 7, 'G#': 8,
    'AB': 8, 'A': 9, 'A#': 10, 'BB': 10, 'B': 11
  };

  function noteToMidi(note) {
    if (typeof note === 'number') return note;
    if (typeof note !== 'string') return 60; // Middle C fallback
    const match = note.trim().toUpperCase().match(/^([A-G][#B]?)(-?\d+)$/);
    if (!match) return 60;
    const name = match[1];
    const octave = parseInt(match[2], 10);
    const semitone = NOTE_SEMITONES[name] !== undefined ? NOTE_SEMITONES[name] : 0;
    return (octave + 1) * 12 + semitone;
  }

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function degreeToFreq(rootMidi, scale, degree, octaveOffset = 0) {
    const scaleLen = scale.length;
    const oct = Math.floor(degree / scaleLen) + octaveOffset;
    const degIdx = ((degree % scaleLen) + scaleLen) % scaleLen;
    const semitones = scale[degIdx] + oct * 12;
    return midiToFreq(rootMidi + semitones);
  }

  /**
   * Waveshaper Distortion Curve Generator (with caching)
   */
  function getDistortionCurve(amount = 25) {
    if (distortionCurves.has(amount)) {
      return distortionCurves.get(amount);
    }
    const n_samples = 2048;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    distortionCurves.set(amount, curve);
    return curve;
  }

  /**
   * Procedural Convolution Reverb Impulse Response Generator (optimized lightweight buffer)
   */
  function createImpulseResponse(ctx, duration = 0.6, decay = 1.8) {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / length;
      const envelope = Math.pow(1 - t, decay);
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
    }
    return impulse;
  }

  /**
   * Procedural Noise Buffer Generator (for percussion & vinyl crackle)
   */
  function getNoiseBuffer(ctx) {
    if (cachedNoiseBuffer && cachedNoiseBuffer.sampleRate === ctx.sampleRate) {
      return cachedNoiseBuffer;
    }
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    cachedNoiseBuffer = buffer;
    return cachedNoiseBuffer;
  }

  /**
   * Safe AudioContext Initializer
   */
  function initAudio() {
    try {
      if (!audioCtx) {
        const AudioContextClass = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext));
        if (AudioContextClass) {
          audioCtx = new AudioContextClass();
        }
      }

      if (audioCtx && !masterGainNode) {
        // Read persisted mute state
        if (typeof localStorage !== 'undefined') {
          isMutedState = localStorage.getItem(STORAGE_KEY_MUTED) === 'true';
        }

        masterGainNode = audioCtx.createGain();
        masterGainNode.gain.setValueAtTime(isMutedState ? 0.0001 : 1.0, audioCtx.currentTime);

        // SFX Gain Node
        sfxGainNode = audioCtx.createGain();
        sfxGainNode.gain.setValueAtTime(0.85, audioCtx.currentTime);
        sfxGainNode.connect(masterGainNode);

        // Shared Convolution Reverb
        reverbNode = audioCtx.createConvolver();
        reverbNode.buffer = createImpulseResponse(audioCtx, 0.6, 1.8);

        reverbReturnGain = audioCtx.createGain();
        reverbReturnGain.gain.setValueAtTime(0.35, audioCtx.currentTime);

        reverbNode.connect(reverbReturnGain);
        reverbReturnGain.connect(masterGainNode);

        masterGainNode.connect(audioCtx.destination);
      }

      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('AudioContext initialization warning:', e);
    }
    return audioCtx;
  }

  /**
   * Setup Autoplay unlock listeners and visibility handlers
   */
  if (typeof window !== 'undefined') {
    const unlockAudio = () => {
      try {
        if (!audioCtx) {
          initAudio();
        } else if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
      } catch (e) {}
    };

    window.addEventListener('pointerdown', unlockAudio, { capture: true, once: false });
    window.addEventListener('keydown', unlockAudio, { capture: true, once: false });

    // Handle tab visibility change
    document.addEventListener('visibilitychange', () => {
      try {
        if (!audioCtx) return;
        if (document.hidden) {
          if (audioCtx.state === 'running') {
            audioCtx.suspend().catch(() => {});
          }
        } else {
          if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
          }
        }
      } catch (e) {}
    });
  }

  /**
   * Synthesize a single note or voice on an instrument
   */
  function scheduleVoice(instrument, freq, time, duration, velocity, destination, reverbSendNode) {
    if (!audioCtx || velocity <= 0 || freq <= 10) return;

    try {
      const startTime = Math.max(time, audioCtx.currentTime);
      const env = instrument.envelope || { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.1 };
      const totalDur = Math.max(duration, 0.05);
      const stopTime = startTime + totalDur + (env.release || 0.1);

      // Voice Gain & Envelope
      const voiceGain = audioCtx.createGain();
      const peakGain = (instrument.gain || 0.3) * velocity;
      const sustainGain = peakGain * (env.sustain !== undefined ? env.sustain : 0.6);

      voiceGain.gain.setValueAtTime(0.0001, startTime);
      voiceGain.gain.linearRampToValueAtTime(peakGain, startTime + (env.attack || 0.01));
      voiceGain.gain.exponentialRampToValueAtTime(Math.max(sustainGain, 0.0001), startTime + (env.attack || 0.01) + (env.decay || 0.1));
      voiceGain.gain.setValueAtTime(Math.max(sustainGain, 0.0001), startTime + totalDur);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      let targetNode = voiceGain;

      // Optional Waveshaper Distortion
      if (instrument.distortion && audioCtx.createWaveShaper) {
        const shaper = audioCtx.createWaveShaper();
        shaper.curve = getDistortionCurve(instrument.distortion);
        shaper.oversample = 'none';
        shaper.connect(targetNode);
        targetNode = shaper;
      }

      // Optional Filter (with Filter Envelope swell support for brass & synth leads)
      if (instrument.filter && instrument.filter.cutoff) {
        const filter = audioCtx.createBiquadFilter();
        filter.type = instrument.filter.type || 'lowpass';
        const baseCutoff = instrument.filter.cutoff;
        filter.frequency.setValueAtTime(baseCutoff, startTime);

        if (instrument.filter.resonance) {
          filter.Q.setValueAtTime(instrument.filter.resonance, startTime);
        }

        // Filter envelope (brass-like swell)
        if (instrument.filter.envAmount) {
          const peakCutoff = Math.max(100, Math.min(18000, baseCutoff + instrument.filter.envAmount));
          const fAttack = instrument.filter.attack || env.attack || 0.04;
          const fDecay = instrument.filter.decay || env.decay || 0.25;
          filter.frequency.linearRampToValueAtTime(peakCutoff, startTime + fAttack);
          filter.frequency.exponentialRampToValueAtTime(Math.max(100, baseCutoff), startTime + fAttack + fDecay);
        }

        filter.connect(targetNode);
        targetNode = filter;
      }

      // Route to destination and reverb
      voiceGain.connect(destination);
      if (reverbSendNode) {
        voiceGain.connect(reverbSendNode);
      }

      // Oscillator(s) (supports single string or array of detuned oscillators)
      const oscTypes = Array.isArray(instrument.oscillator) ? instrument.oscillator : [instrument.oscillator || 'triangle'];
      const detunes = Array.isArray(instrument.detune) ? instrument.detune : [instrument.detune || 0];

      oscTypes.forEach((type, idx) => {
        const osc = audioCtx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);

        const det = detunes[idx] !== undefined ? detunes[idx] : (detunes[0] || 0);
        if (det) {
          osc.detune.setValueAtTime(det, startTime);
        }

        // Subtle Vibrato LFO if configured
        if (instrument.vibrato && instrument.vibrato.rate && instrument.vibrato.depth) {
          const lfo = audioCtx.createOscillator();
          const lfoGain = audioCtx.createGain();
          lfo.frequency.setValueAtTime(instrument.vibrato.rate, startTime);
          lfoGain.gain.setValueAtTime(instrument.vibrato.depth, startTime);
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          lfo.start(startTime);
          lfo.stop(stopTime);
        }

        osc.connect(targetNode);
        osc.start(startTime);
        osc.stop(stopTime);

        activeVoiceNodes.add(osc);
        osc.onended = () => {
          try {
            osc.disconnect();
            activeVoiceNodes.delete(osc);
          } catch (e) {}
        };
      });

      // Cleanup gain node on end
      setTimeout(() => {
        try {
          voiceGain.disconnect();
        } catch (e) {}
      }, Math.max(0, (stopTime - audioCtx.currentTime + 0.1) * 1000));

    } catch (e) {
      console.warn('Error scheduling voice:', e);
    }
  }

  /**
   * Synthesize percussion, orchestral timpani, crash, toms and noise events
   */
  function schedulePercussion(drumCfg, event, time, destination, reverbSendNode) {
    if (!audioCtx) return;
    try {
      const startTime = Math.max(time, audioCtx.currentTime);
      const vel = event.velocity || 0.6;
      const type = event.type || 'hat';

      // 1. Timpani / Heavy Orchestral Kick (Fast pitch drop + noise click)
      if (type === 'timpani') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        const startF = event.startFreq || (drumCfg && drumCfg.timpani && drumCfg.timpani.startFreq) || 140;
        const endF = event.endFreq || (drumCfg && drumCfg.timpani && drumCfg.timpani.endFreq) || 50;
        const dec = event.decay || (drumCfg && drumCfg.timpani && drumCfg.timpani.decay) || 0.35;

        osc.frequency.setValueAtTime(startF, startTime);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endF), startTime + dec);

        const tGain = ((drumCfg && drumCfg.timpani && drumCfg.timpani.gain) || 0.75) * vel;
        gain.gain.setValueAtTime(tGain, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dec);

        osc.connect(gain);
        gain.connect(destination);
        if (reverbSendNode) gain.connect(reverbSendNode);
        osc.start(startTime);
        osc.stop(startTime + dec + 0.02);
        osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch (_) {} };

        // Mallet noise click
        const noiseBuf = getNoiseBuffer(audioCtx);
        const clickSrc = audioCtx.createBufferSource();
        clickSrc.buffer = noiseBuf;
        const clickFilter = audioCtx.createBiquadFilter();
        clickFilter.type = 'bandpass';
        clickFilter.frequency.setValueAtTime(1800, startTime);
        const clickGain = audioCtx.createGain();
        clickGain.gain.setValueAtTime(0.2 * vel, startTime);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.015);

        clickSrc.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(destination);
        clickSrc.start(startTime);
        clickSrc.stop(startTime + 0.02);
        clickSrc.onended = () => { try { clickSrc.disconnect(); clickFilter.disconnect(); clickGain.disconnect(); } catch (_) {} };
        return;
      }

      // 2. Standard Chiptune / Deep Kick
      if (type === 'kick' || type === 'kick_and_hat') {
        const kcfg = (drumCfg && drumCfg.kick) || { startFreq: 110, endFreq: 38, decay: 0.15, gain: 0.7 };
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';

        const sF = event.startFreq || kcfg.startFreq || 110;
        const eF = event.endFreq || kcfg.endFreq || 38;
        const dec = event.decay || kcfg.decay || 0.15;

        osc.frequency.setValueAtTime(sF, startTime);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, eF), startTime + dec);

        const kickGain = (kcfg.gain || 0.7) * vel;
        gain.gain.setValueAtTime(kickGain, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dec);

        osc.connect(gain);
        gain.connect(destination);
        osc.start(startTime);
        osc.stop(startTime + dec + 0.02);
        osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch (_) {} };
      }

      // 3. Snare (Noise burst + Body tone)
      if (type === 'snare') {
        const sDur = event.decay || (drumCfg && drumCfg.snare && drumCfg.snare.decay) || 0.15;
        const sCutoff = event.cutoff || (drumCfg && drumCfg.snare && drumCfg.snare.cutoff) || 3500;
        const sGainVal = ((drumCfg && drumCfg.snare && drumCfg.snare.gain) || 0.65) * vel;

        // Noise burst
        const noiseBuf = getNoiseBuffer(audioCtx);
        const noiseSrc = audioCtx.createBufferSource();
        noiseSrc.buffer = noiseBuf;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(sCutoff, startTime);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(sGainVal, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + sDur);

        noiseSrc.connect(filter);
        filter.connect(gain);
        gain.connect(destination);
        if (reverbSendNode) gain.connect(reverbSendNode);
        noiseSrc.start(startTime);
        noiseSrc.stop(startTime + sDur + 0.02);
        noiseSrc.onended = () => { try { noiseSrc.disconnect(); filter.disconnect(); gain.disconnect(); } catch (_) {} };

        // Body tone (triangle pitch bend 185Hz -> 85Hz)
        const bodyOsc = audioCtx.createOscillator();
        const bodyGain = audioCtx.createGain();
        bodyOsc.type = 'triangle';
        bodyOsc.frequency.setValueAtTime(185, startTime);
        bodyOsc.frequency.exponentialRampToValueAtTime(85, startTime + 0.08);
        bodyGain.gain.setValueAtTime(0.35 * vel, startTime);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.09);

        bodyOsc.connect(bodyGain);
        bodyGain.connect(destination);
        bodyOsc.start(startTime);
        bodyOsc.stop(startTime + 0.1);
        bodyOsc.onended = () => { try { bodyOsc.disconnect(); bodyGain.disconnect(); } catch (_) {} };
        return;
      }

      // 4. Crash Cymbal (Long filtered noise with decay)
      if (type === 'crash') {
        const cDur = event.decay || (drumCfg && drumCfg.crash && drumCfg.crash.decay) || 1.4;
        const cCutoff = event.cutoff || (drumCfg && drumCfg.crash && drumCfg.crash.cutoff) || 4500;
        const cGainVal = ((drumCfg && drumCfg.crash && drumCfg.crash.gain) || 0.45) * vel;

        const noiseBuf = getNoiseBuffer(audioCtx);
        const noiseSrc = audioCtx.createBufferSource();
        noiseSrc.buffer = noiseBuf;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(cCutoff, startTime);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(cGainVal, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + cDur);

        noiseSrc.connect(filter);
        filter.connect(gain);
        gain.connect(destination);
        if (reverbSendNode) gain.connect(reverbSendNode);
        noiseSrc.start(startTime);
        noiseSrc.stop(startTime + cDur + 0.03);
        noiseSrc.onended = () => { try { noiseSrc.disconnect(); filter.disconnect(); gain.disconnect(); } catch (_) {} };
        return;
      }

      // 5. Toms for Fills ('tom', 'tom_hi', 'tom_mid', 'tom_low')
      if (type.startsWith('tom')) {
        const isHi = (type === 'tom_hi');
        const isLow = (type === 'tom_low');
        const startF = isHi ? 220 : (isLow ? 120 : 160);
        const endF = isHi ? 110 : (isLow ? 55 : 85);
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(startF, startTime);
        osc.frequency.exponentialRampToValueAtTime(endF, startTime + 0.16);

        gain.gain.setValueAtTime(0.55 * vel, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);
        osc.connect(gain);
        gain.connect(destination);
        if (reverbSendNode) gain.connect(reverbSendNode);
        osc.start(startTime);
        osc.stop(startTime + 0.2);
        osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch (_) {} };
        return;
      }

      // 6. Hi-hats
      if (type === 'hat' || type === 'kick_and_hat') {
        const noiseBuf = getNoiseBuffer(audioCtx);
        const noiseSrc = audioCtx.createBufferSource();
        noiseSrc.buffer = noiseBuf;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(7500, startTime);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.22 * vel, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.04);

        noiseSrc.connect(filter);
        filter.connect(gain);
        gain.connect(destination);
        if (reverbSendNode) gain.connect(reverbSendNode);
        noiseSrc.start(startTime);
        noiseSrc.stop(startTime + 0.05);
        noiseSrc.onended = () => { try { noiseSrc.disconnect(); filter.disconnect(); gain.disconnect(); } catch (_) {} };
      }

      // 7. Vinyl Crackle
      if (type === 'crackle') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2200 + Math.random() * 3000, startTime);
        gain.gain.setValueAtTime(0.015 * vel, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.015);
        osc.connect(gain);
        gain.connect(destination);
        osc.start(startTime);
        osc.stop(startTime + 0.02);
      }
    } catch (e) {}
  }

  /**
   * Schedule a single 16th-note step across all channels in the track config
   */
  function scheduleStep(track, stepIndex, stepTime, trackGainNode, reverbSendNode) {
    if (!track || !track.patterns) return;

    const secondsPerBeat = 60.0 / ((track.bpm || 100) * getCurrentTempoMultiplier());
    const secondsPer16th = secondsPerBeat / 4.0;
    const rootMidi = noteToMidi(track.root || 'C3');
    const scale = track.scale || [0, 2, 4, 5, 7, 9, 11];

    // Light swing on odd 16th notes
    let noteTime = stepTime;
    if ((stepIndex % 2 === 1) && track.swing) {
      noteTime += secondsPer16th * track.swing;
    }

    const channels = Object.keys(track.patterns);
    for (let c = 0; c < channels.length; c++) {
      const channelName = channels[c];
      const pattern = track.patterns[channelName];
      if (!pattern || pattern.length === 0) continue;

      // Layer-to-subgain routing
      const requiredLayer = (track.layers && track.layers[channelName] !== undefined)
        ? track.layers[channelName]
        : 0;

      // Click-free layer routing: send to current layer gain node
      const channelDest = (currentLayerGains && currentLayerGains[requiredLayer])
        ? currentLayerGains[requiredLayer]
        : trackGainNode;

      const event = pattern[stepIndex % pattern.length];
      if (!event) continue;

      const instrument = (track.instruments && track.instruments[channelName]) || {};

      // Percussion & Drums channel
      if (channelName === 'drums' || channelName === 'vinyl' || channelName === 'fills' || event.type) {
        schedulePercussion(instrument, event, noteTime, channelDest, reverbNode);
        continue;
      }

      // Melodic / Harmonic channels
      const durBeats = event.duration || 0.25;
      const durSec = durBeats * secondsPerBeat;
      const velocity = event.velocity !== undefined ? event.velocity : 0.8;

      if (Array.isArray(event.degrees)) {
        // Polyphonic chord (e.g. pad voicing)
        event.degrees.forEach(deg => {
          const freq = degreeToFreq(rootMidi, scale, deg, event.octave || 0);
          scheduleVoice(instrument, freq, noteTime, durSec, velocity, channelDest, reverbNode);
        });
      } else if (event.degree !== undefined) {
        // Single scale degree note
        const freq = degreeToFreq(rootMidi, scale, event.degree, event.octave || 0);
        scheduleVoice(instrument, freq, noteTime, durSec, velocity, channelDest, reverbNode);
      } else if (event.note !== undefined) {
        // Direct note name or MIDI
        const midi = noteToMidi(event.note);
        const freq = midiToFreq(midi);
        scheduleVoice(instrument, freq, noteTime, durSec, velocity, channelDest, reverbNode);
      }
    }
  }

  function checkScheduledBeats() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    while (scheduledBeatQueue.length > 0 && scheduledBeatQueue[0].time <= now) {
      const b = scheduledBeatQueue.shift();
      lastBeatQuarterTime = b.time;
      isCurrentDownbeat = b.isDownbeat;
      beatListeners.forEach(cb => {
        try { cb({ isDownbeat: b.isDownbeat, beatNumber: b.beatNumber, time: b.time }); } catch (_) {}
      });
    }
  }

  /**
   * Main Lookahead Scheduler Loop
   */
  function schedulerTick() {
    if (!isPlaying || !currentTrack || !audioCtx) return;

    try {
      checkScheduledBeats();
      const totalSteps = (currentTrack.loopLengthBars || 8) * 16;

      // Resync if main thread was blocked/paused to prevent note bursts and crackling
      if (nextNoteTime < audioCtx.currentTime - 0.08) {
        nextNoteTime = audioCtx.currentTime + 0.02;
      }

      while (nextNoteTime < audioCtx.currentTime + SCHEDULE_AHEAD_TIME_SEC) {
        // Enqueue beat clock event when step is a beat (every 4 16th steps)
        if (currentStep % 4 === 0) {
          const isDownbeat = (currentStep % 16 === 0);
          scheduledBeatQueue.push({
            time: nextNoteTime,
            isDownbeat,
            beatNumber: Math.floor(currentStep / 4)
          });
        }

        // Trigger climax crash and drum fill on the next bar line if queued (p >= 0.9)
        if (pendingClimaxFill && (currentStep % 16 === 0)) {
          pendingClimaxFill = false;
          try {
            const drumInst = (currentTrack.instruments && currentTrack.instruments.drums) || {};
            // 1. Crash cymbal on bar line
            schedulePercussion(drumInst, { type: 'crash', velocity: 0.95 }, nextNoteTime, currentTrackGain, reverbNode);
            // 2. Short energetic drum fill across first 4 sixteenth notes of bar line
            const curBpm = (currentTrack.bpm || 100) * getCurrentTempoMultiplier();
            const stepSec = (60.0 / curBpm) / 4.0;
            ['tom_hi', 'snare', 'tom_mid', 'tom_low'].forEach((tName, idx) => {
              schedulePercussion(drumInst, { type: tName, velocity: 0.85 }, nextNoteTime + idx * stepSec, currentTrackGain, reverbNode);
            });
          } catch (_) {}
        }

        // Dynamic BPM check on every step for smooth runtime tempo changes
        const currentBpm = (currentTrack.bpm || 100) * getCurrentTempoMultiplier();
        const secondsPerBeat = 60.0 / currentBpm;
        const secondsPer16th = secondsPerBeat / 4.0;

        scheduleStep(currentTrack, currentStep, nextNoteTime, currentTrackGain, reverbNode);

        nextNoteTime += secondsPer16th;
        currentStep = (currentStep + 1) % totalSteps;
      }
    } catch (e) {
      console.warn('Error in music scheduler tick:', e);
    }
  }

  /**
   * Public API Implementation
   */

  function registerTrack(config) {
    if (!config || !config.id) {
      throw new Error('Track config must contain an "id" property.');
    }
    registeredTracks.set(config.id, config);
    return config;
  }

  function getTrack(id) {
    if (registeredTracks.has(id)) {
      return registeredTracks.get(id);
    }
    // Check global namespace AudioTracks
    if (typeof window !== 'undefined' && window.AudioTracks && window.AudioTracks[id]) {
      registeredTracks.set(id, window.AudioTracks[id]);
      return window.AudioTracks[id];
    }
    return null;
  }

  function getAllRegisteredTracks() {
    const map = new Map(registeredTracks);
    if (typeof window !== 'undefined' && window.AudioTracks) {
      Object.keys(window.AudioTracks).forEach(id => {
        if (!map.has(id)) map.set(id, window.AudioTracks[id]);
      });
    }
    return Array.from(map.values());
  }

  function playTrack(id, options = {}) {
    initAudio();
    if (!audioCtx) return;

    const crossfadeMs = options.crossfadeMs !== undefined ? options.crossfadeMs : 1000;
    const track = getTrack(id);

    if (!track) {
      console.warn(`Track "${id}" not found.`);
      return;
    }

    // Guard: If identical track is already playing, preserve seamless playback
    if (currentTrackId === id && isPlaying) {
      return;
    }

    try {
      const now = audioCtx.currentTime;
      const targetGain = track.masterGain !== undefined ? track.masterGain : 0.35;
      const crossfadeSec = crossfadeMs / 1000.0;

      // Create new track gain node
      const newTrackGain = audioCtx.createGain();
      newTrackGain.gain.setValueAtTime(0.0001, now);
      newTrackGain.gain.linearRampToValueAtTime(targetGain, now + crossfadeSec);
      newTrackGain.connect(masterGainNode);

      // Create 4 click-free layer gain nodes (0..3)
      const newLayerGains = [0, 1, 2, 3].map(layerIdx => {
        const lg = audioCtx.createGain();
        const initVal = (layerIdx <= layerLevel) ? 1.0 : 0.0001;
        lg.gain.setValueAtTime(initVal, now);
        lg.connect(newTrackGain);
        return lg;
      });

      // Fade out previous track gain if active
      if (currentTrackGain && isPlaying) {
        const oldGain = currentTrackGain;
        const oldLayerGains = currentLayerGains;
        oldGain.gain.setValueAtTime(oldGain.gain.value, now);
        oldGain.gain.linearRampToValueAtTime(0.0001, now + crossfadeSec);
        setTimeout(() => {
          try {
            oldGain.disconnect();
            if (oldLayerGains) oldLayerGains.forEach(g => g.disconnect());
          } catch (e) {}
        }, crossfadeMs + 100);
      }

      // Switch to new track
      currentTrack = track;
      currentTrackId = id;
      currentTrackGain = newTrackGain;
      currentLayerGains = newLayerGains;
      currentStep = 0;
      nextNoteTime = audioCtx.currentTime + 0.05;
      lastBeatQuarterTime = audioCtx.currentTime;
      scheduledBeatQueue.length = 0;
      isPlaying = true;

      // Ensure strictly one scheduler interval runs
      if (schedulerTimer) {
        clearInterval(schedulerTimer);
        schedulerTimer = null;
      }
      schedulerTimer = setInterval(schedulerTick, LOOKAHEAD_INTERVAL_MS);

      // Update Dev Audition UI if mounted
      updateDevPanelUI();

    } catch (e) {
      console.warn('Error starting track:', e);
    }
  }

  function stopMusic(options = {}) {
    if (!isPlaying && !currentTrackGain) return;

    const fadeMs = options.fadeMs !== undefined ? options.fadeMs : 800;
    const fadeSec = fadeMs / 1000.0;

    isPlaying = false;
    currentTrack = null;
    currentTrackId = null;
    lastBeatQuarterTime = 0;
    scheduledBeatQueue.length = 0;

    if (schedulerTimer) {
      clearInterval(schedulerTimer);
      schedulerTimer = null;
    }

    if (audioCtx && currentTrackGain) {
      try {
        const gainNode = currentTrackGain;
        const layerGains = currentLayerGains;
        currentTrackGain = null;
        currentLayerGains = null;
        const now = audioCtx.currentTime;
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeSec);

        setTimeout(() => {
          try {
            gainNode.disconnect();
            if (layerGains) layerGains.forEach(g => g.disconnect());
          } catch (e) {}
        }, fadeMs + 50);
      } catch (e) {}
    }

    updateDevPanelUI();
  }

  function setMuted(muted) {
    isMutedState = !!muted;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_MUTED, String(isMutedState));
      } catch (e) {}
    }

    if (audioCtx && masterGainNode) {
      try {
        const now = audioCtx.currentTime;
        masterGainNode.gain.cancelScheduledValues(now);
        masterGainNode.gain.setValueAtTime(masterGainNode.gain.value, now);
        masterGainNode.gain.linearRampToValueAtTime(isMutedState ? 0.0001 : 1.0, now + 0.05);
      } catch (e) {}
    }

    updateDevPanelUI();
  }

  function isMuted() {
    return isMutedState;
  }

  function setTempoMultiplier(multiplier, options = {}) {
    const target = Math.max(0.5, Math.min(2.5, multiplier));
    const rampMs = options.rampMs !== undefined ? options.rampMs : 0;
    if (rampMs > 0 && typeof performance !== 'undefined') {
      tempoRampStartVal = getCurrentTempoMultiplier();
      tempoRampTargetVal = target;
      tempoRampStartTime = performance.now();
      tempoRampDurationMs = rampMs;
    } else {
      tempoMultiplier = target;
      tempoRampStartVal = target;
      tempoRampTargetVal = target;
      tempoRampDurationMs = 0;
    }
    updateDevPanelUI();
  }

  function getCurrentTempoMultiplier() {
    if (tempoRampDurationMs > 0 && typeof performance !== 'undefined') {
      const elapsed = performance.now() - tempoRampStartTime;
      if (elapsed >= tempoRampDurationMs) {
        tempoMultiplier = tempoRampTargetVal;
        tempoRampDurationMs = 0;
      } else {
        const t = elapsed / tempoRampDurationMs;
        tempoMultiplier = tempoRampStartVal + (tempoRampTargetVal - tempoRampStartVal) * t;
      }
    }
    return tempoMultiplier;
  }

  function getTempoMultiplier() {
    return getCurrentTempoMultiplier();
  }

  function setLayerLevel(level, options = {}) {
    const rampMs = options.rampMs !== undefined ? options.rampMs : 60;
    layerLevel = Math.max(0, Math.min(3, level));

    if (audioCtx && currentLayerGains) {
      const now = audioCtx.currentTime;
      const rampSec = Math.max(0.01, rampMs / 1000.0);
      currentLayerGains.forEach((g, idx) => {
        const targetVal = (idx <= layerLevel) ? 1.0 : 0.0001;
        try {
          g.gain.cancelScheduledValues(now);
          g.gain.setValueAtTime(g.gain.value, now);
          g.gain.linearRampToValueAtTime(targetVal, now + rampSec);
        } catch (_) {}
      });
    }

    updateDevPanelUI();
  }

  function getLayerLevel() {
    return layerLevel;
  }

  /**
   * ============================================================================
   * BATTLE INTENSITY STORE (Single Source of Truth - TASK 1)
   * ============================================================================
   */
  const BattleIntensity = {
    getState() {
      return { ...battleIntensityState };
    },
    subscribe(listener) {
      battleIntensityListeners.add(listener);
      try { listener({ ...battleIntensityState }); } catch (_) {}
      return () => battleIntensityListeners.delete(listener);
    },
    setProgress(p, isHell = false) {
      const clampedP = Math.max(0, Math.min(1, p));
      battleIntensityState.p = clampedP;
      battleIntensityState.isHell = !!isHell;

      // Determine level (0 - 3)
      let targetLevel = 0;
      let targetTempo = 1.00;
      let targetLayer = 0;

      if (battleIntensityState.isHell) {
        if (clampedP < 0.5) {
          targetLevel = 1;
          targetTempo = 1.10;
          targetLayer = 1;
        } else if (clampedP < 0.7) {
          targetLevel = 2;
          targetTempo = 1.18;
          targetLayer = 2;
        } else if (clampedP < 0.9) {
          targetLevel = 3;
          targetTempo = 1.28;
          targetLayer = 3;
        } else {
          targetLevel = 3;
          targetTempo = 1.40;
          targetLayer = 3;
        }
      } else {
        if (clampedP < 0.5) {
          targetLevel = 0;
          targetTempo = 1.00;
          targetLayer = 0;
        } else if (clampedP < 0.7) {
          targetLevel = 1;
          targetTempo = 1.08;
          targetLayer = 1;
        } else if (clampedP < 0.9) {
          targetLevel = 2;
          targetTempo = 1.18;
          targetLayer = 2;
        } else {
          targetLevel = 3;
          targetTempo = 1.30;
          targetLayer = 3;
        }
      }

      battleIntensityState.level = targetLevel;
      if (currentTrack) {
        battleIntensityState.effectiveBpm = (currentTrack.bpm || 100) * targetTempo;
      }

      // Update audio engine tempo & layer smoothly
      setTempoMultiplier(targetTempo, { rampMs: 1500 });
      setLayerLevel(targetLayer, { rampMs: 1500 });

      // Final hit climax trigger (p >= 0.9)
      if (clampedP >= 0.9 && !climaxTriggered) {
        climaxTriggered = true;
        queueClimaxFill();
      }

      // Notify subscribers
      battleIntensityListeners.forEach(cb => {
        try { cb({ ...battleIntensityState }); } catch (_) {}
      });

      updateDevPanelUI();
      return { ...battleIntensityState, tempo: targetTempo, layer: targetLayer };
    },
    setLevel(level) {
      const lvl = Math.max(0, Math.min(3, Math.round(level)));
      battleIntensityState.level = lvl;
      setLayerLevel(lvl, { rampMs: 800 });
      battleIntensityListeners.forEach(cb => {
        try { cb({ ...battleIntensityState }); } catch (_) {}
      });
      updateDevPanelUI();
      return { ...battleIntensityState };
    },
    reset(isHell = false) {
      battleIntensityState.p = 0;
      battleIntensityState.level = isHell ? 1 : 0;
      battleIntensityState.isHell = !!isHell;
      const baselineTempo = isHell ? 1.10 : 1.00;
      const baselineLayer = isHell ? 1 : 0;
      setTempoMultiplier(baselineTempo);
      setLayerLevel(baselineLayer);
      battleIntensityState.effectiveBpm = (currentTrack ? (currentTrack.bpm || 100) : 100) * baselineTempo;
      climaxTriggered = false;
      pendingClimaxFill = false;

      battleIntensityListeners.forEach(cb => {
        try { cb({ ...battleIntensityState }); } catch (_) {}
      });
      updateDevPanelUI();
    }
  };

  /**
   * ============================================================================
   * BEAT CLOCK & SCHEDULER DISPATCH (TASK 1)
   * ============================================================================
   */
  function getBeatPhase() {
    if (!isPlaying || !audioCtx) return 0;
    checkScheduledBeats();
    const bpm = (currentTrack ? (currentTrack.bpm || 100) : 100) * getCurrentTempoMultiplier();
    const secPerBeat = 60.0 / bpm;
    if (secPerBeat <= 0) return 0;

    const t = audioCtx.currentTime;
    if (lastBeatQuarterTime <= 0) return 0;
    const elapsed = t - lastBeatQuarterTime;
    const phase = (elapsed % secPerBeat) / secPerBeat;
    return Math.max(0, Math.min(1, phase));
  }

  function isDownbeat() {
    return isCurrentDownbeat;
  }

  function onBeat(callback) {
    beatListeners.add(callback);
    return () => beatListeners.delete(callback);
  }

  /**
   * ============================================================================
   * BATTLE MUSIC & DYNAMIC INTENSITY CONTROL (TASKS 1, 2, 3)
   * ============================================================================
   */

  function queueClimaxFill() {
    pendingClimaxFill = true;
  }

  function isJinglePlaying() {
    return isEndingJinglePlaying;
  }

  function dismissJingle() {
    isEndingJinglePlaying = false;
    if (jingleTimeout) {
      clearTimeout(jingleTimeout);
      jingleTimeout = null;
    }
  }

  function startBattleMusic(stage, options = {}) {
    const crossfadeMs = options.crossfadeMs !== undefined ? options.crossfadeMs : 1000;
    const world = stage ? (stage.world || 1) : 1;
    const isHell = !!(stage && stage.isHellMix) || (world === 4);

    let trackId = 'battle-vazhgan';
    if (isHell) {
      trackId = 'battle-inferno';
    } else if (world === 2) {
      trackId = 'battle-kenayeh';
    } else if (world === 3) {
      trackId = 'battle-iham';
    } else {
      trackId = 'battle-vazhgan';
    }

    // Reset battle state for new battle
    battleMaxProgress = 0;
    climaxTriggered = false;
    pendingClimaxFill = false;
    dismissJingle();

    BattleIntensity.reset(isHell);

    playTrack(trackId, { crossfadeMs });
    return trackId;
  }

  function updateBattleMusicProgress(enemyHp, enemyMaxHp, isHell = false) {
    const maxHp = (typeof enemyMaxHp === 'number' && enemyMaxHp > 0) ? enemyMaxHp : 10;
    const curHp = (typeof enemyHp === 'number') ? Math.max(0, enemyHp) : 0;
    const rawP = 1.0 - (curHp / maxHp);

    // Wrong answers never lower the level: progress only advances
    battleMaxProgress = Math.max(battleMaxProgress, rawP);
    const p = battleMaxProgress;

    const res = BattleIntensity.setProgress(p, isHell);
    return { p: res.p, tempo: res.tempo, layer: res.layer, level: res.level };
  }

  function handleBattleVictory(options = {}) {
    const fadeMs = options.fadeMs !== undefined ? options.fadeMs : 600;
    stopMusic({ fadeMs });

    isEndingJinglePlaying = true;
    playSfx('victory');

    if (jingleTimeout) clearTimeout(jingleTimeout);
    jingleTimeout = setTimeout(() => {
      isEndingJinglePlaying = false;
      jingleTimeout = null;
    }, 2000);
  }

  function handleBattleDefeat(options = {}) {
    const fadeMs = options.fadeMs !== undefined ? options.fadeMs : 1500;
    // Slow downward tempo drop over 1.5s
    setTempoMultiplier(0.50, { rampMs: fadeMs });
    stopMusic({ fadeMs });

    isEndingJinglePlaying = true;
    playSfx('defeat');

    if (jingleTimeout) clearTimeout(jingleTimeout);
    jingleTimeout = setTimeout(() => {
      isEndingJinglePlaying = false;
      jingleTimeout = null;
    }, 2500);
  }

  function stopBattleMusic(options = {}) {
    const fadeMs = options.fadeMs !== undefined ? options.fadeMs : 800;
    dismissJingle();
    stopMusic({ fadeMs });
  }

  /**
   * Sound Effects (SFX) Subsystem
   */
  function playTone(freq, dur = 0.1, type = 'square') {
    if (isMutedState) return;
    try {
      initAudio();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      osc.connect(gain);
      gain.connect(sfxGainNode || masterGainNode || audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + dur);
    } catch (e) {}
  }

  function playSfx(name) {
    if (isMutedState) return;
    try {
      initAudio();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      const dest = sfxGainNode || masterGainNode || audioCtx.destination;

      switch (name) {
        case 'select':
          playTone(587.33, 0.05, 'square');
          break;

        case 'correct':
          [523.25, 659.25, 783.99, 1046.50].forEach((f, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(f, now + idx * 0.06);
            gain.gain.setValueAtTime(0.12, now + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.12);
            osc.connect(gain);
            gain.connect(dest);
            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.12);
          });
          break;

        case 'wrong': {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(160, now);
          osc.frequency.exponentialRampToValueAtTime(95, now + 0.25);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.connect(gain);
          gain.connect(dest);
          osc.start(now);
          osc.stop(now + 0.25);
          break;
        }

        case 'victory':
          [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((f, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(f, now + idx * 0.1);
            gain.gain.setValueAtTime(0.15, now + idx * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.2);
            osc.connect(gain);
            gain.connect(dest);
            osc.start(now + idx * 0.1);
            osc.stop(now + idx * 0.1 + 0.2);
          });
          break;

        case 'defeat': {
          // Descending mournful dark chiptune motif (G4 -> F4 -> Eb4 -> D4 -> C4 -> G3)
          const defeatPitches = [392.00, 349.23, 311.13, 293.66, 261.63, 196.00];
          defeatPitches.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            const noteStart = now + idx * 0.22;
            osc.frequency.setValueAtTime(freq, noteStart);
            gain.gain.setValueAtTime(0.18, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.35);
            osc.connect(gain);
            gain.connect(dest);
            osc.start(noteStart);
            osc.stop(noteStart + 0.38);
            osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch (_) {} };
          });
          break;
        }

        case 'crash': {
          schedulePercussion(
            (currentTrack && currentTrack.instruments && currentTrack.instruments.drums) || {},
            { type: 'crash', velocity: 0.95 },
            now,
            dest,
            reverbNode
          );
          break;
        }

        case 'chime':
          [220, 277.18, 329.63, 440].forEach((f, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, now + idx * 0.05);
            gain.gain.setValueAtTime(0.12, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.18);
            osc.connect(gain);
            gain.connect(dest);
            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.2);
          });
          break;

        case 'flip': {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(420, now);
          osc.frequency.exponentialRampToValueAtTime(840, now + 0.07);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
          osc.connect(gain);
          gain.connect(dest);
          osc.start(now);
          osc.stop(now + 0.07);
          break;
        }

        default:
          playTone(440, 0.08, 'square');
          break;
      }
    } catch (e) {}
  }

  function isAudioContextRunning() {
    return !!(audioCtx && audioCtx.state === 'running');
  }

  function getCurrentTrackId() {
    return currentTrackId;
  }

  /**
   * ============================================================================
   * DEV AUDITION PANEL (?audioDebug=1)
   * ============================================================================
   * Floating development studio for tuning music tracks, tempo, and layers.
   * Completely omitted in production unless ?audioDebug=1 is in URL query string.
   */
  function mountDevAuditionPanel() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!window.location || !window.location.search || !window.location.search.includes('audioDebug=1')) return;
    if (document.getElementById('devAudioPanel')) return;

    const panel = document.createElement('div');
    panel.id = 'devAudioPanel';
    panel.setAttribute('dir', 'ltr');
    panel.style.cssText = `
      position: fixed;
      bottom: 14px;
      right: 14px;
      width: 330px;
      max-height: 85vh;
      overflow-y: auto;
      background: rgba(15, 13, 11, 0.96);
      border: 1px solid #c9a24d;
      box-shadow: 0 10px 30px rgba(0,0,0,0.85), 0 0 16px rgba(201,162,77,0.25);
      color: #f1e8d4;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      border-radius: 8px;
      z-index: 999999;
      padding: 12px;
      box-sizing: border-box;
      backdrop-filter: blur(10px);
    `;

    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(201,162,77,0.3); padding-bottom:8px; margin-bottom:10px;">
        <span style="font-weight:bold; color:#c9a24d; font-size:12px;">🎛️ Audio Audition Studio</span>
        <div>
          <button id="devAudioMuteBtn" style="background:#221c16; border:1px solid #c9a24d; color:#f1e8d4; padding:2px 8px; border-radius:4px; cursor:pointer; font-size:11px;">
            ${isMutedState ? '🔇 Muted' : '🔊 Mute'}
          </button>
          <button id="devAudioCloseBtn" style="background:transparent; border:none; color:#8c836f; cursor:pointer; margin-left:6px; font-size:14px;">✕</button>
        </div>
      </div>

      <!-- Current Status -->
      <div style="background:#181410; border:1px solid rgba(201,162,77,0.2); padding:6px 10px; border-radius:4px; margin-bottom:10px;">
        <div>Status: <span id="devAudioStatus" style="color:#6fb8a8; font-weight:bold;">${currentTrackId ? 'Playing (' + currentTrackId + ')' : 'Stopped'}</span></div>
      </div>

      <!-- Tempo Multiplier Slider (1.0 to 1.4) -->
      <div style="margin-bottom:10px; background:#181410; padding:8px 10px; border-radius:4px; border:1px solid rgba(201,162,77,0.15);">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>Tempo Multiplier:</span>
          <span id="devTempoVal" style="color:#d9703a; font-weight:bold;">${tempoMultiplier.toFixed(2)}x</span>
        </div>
        <input id="devTempoSlider" type="range" min="1.0" max="1.4" step="0.02" value="${tempoMultiplier}" style="width:100%; accent-color:#c9a24d; cursor:pointer;" />
      </div>

      <!-- Layer Level Selector (0 to 3) -->
      <div style="margin-bottom:10px; background:#181410; padding:8px 10px; border-radius:4px; border:1px solid rgba(201,162,77,0.15);">
        <div style="margin-bottom:6px;">Layer Level: <span id="devLayerVal" style="color:#c9a24d; font-weight:bold;">${layerLevel}</span></div>
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:4px;">
          ${[0, 1, 2, 3].map(lvl => `
            <button class="dev-layer-btn" data-layer="${lvl}" style="background:${layerLevel === lvl ? '#c9a24d' : '#221c16'}; color:${layerLevel === lvl ? '#0f0d0b' : '#f1e8d4'}; border:1px solid #c9a24d; border-radius:4px; padding:4px 0; cursor:pointer; font-weight:bold; font-size:10px;">
              L${lvl}
            </button>
          `).join('')}
        </div>
        <div style="font-size:9px; color:#8c836f; margin-top:4px;">0:Base 1:+Arp 2:+Snare 3:Full</div>
      </div>

      <!-- Battle Intensity Progress Slider (0.0 to 1.0 - TASK 4) -->
      <div style="margin-bottom:10px; background:#181410; padding:8px 10px; border-radius:4px; border:1px solid rgba(201,162,77,0.15);">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>Battle Progress (p):</span>
          <span id="devProgressVal" style="color:#6fb8a8; font-weight:bold;">${battleIntensityState.p.toFixed(2)} (L${battleIntensityState.level})</span>
        </div>
        <input id="devProgressSlider" type="range" min="0.0" max="1.0" step="0.02" value="${battleIntensityState.p}" style="width:100%; accent-color:#6fb8a8; cursor:pointer;" />
        <div style="display:flex; justify-content:space-between; font-size:9px; color:#8c836f; margin-top:2px;">
          <span>0 (L0)</span>
          <span>0.5 (L1)</span>
          <span>0.7 (L2)</span>
          <span>0.9 (L3)</span>
          <span>1.0</span>
        </div>
      </div>

      <!-- Track List -->
      <div style="margin-bottom:10px;">
        <div style="font-weight:bold; margin-bottom:6px; color:#c9a24d;">Tracks:</div>
        <div id="devTracksList" style="display:flex; flex-direction:column; gap:4px;"></div>
      </div>

      <!-- Stop Button -->
      <button id="devAudioStopBtn" style="width:100%; background:#2c1815; border:1px solid #c9777f; color:#c9777f; padding:6px 0; border-radius:4px; cursor:pointer; font-weight:bold;">
        ⏹ Stop All Music
      </button>
    `;

    document.body.appendChild(panel);

    // Event Listeners for Panel Controls
    panel.querySelector('#devAudioCloseBtn').onclick = () => {
      panel.style.display = 'none';
    };

    panel.querySelector('#devAudioMuteBtn').onclick = () => {
      setMuted(!isMutedState);
    };

    const tempoSlider = panel.querySelector('#devTempoSlider');
    tempoSlider.oninput = (e) => {
      const val = parseFloat(e.target.value);
      setTempoMultiplier(val);
    };

    panel.querySelectorAll('.dev-layer-btn').forEach(btn => {
      btn.onclick = () => {
        const lvl = parseInt(btn.dataset.layer, 10);
        setLayerLevel(lvl);
      };
    });

    panel.querySelector('#devAudioStopBtn').onclick = () => {
      stopMusic({ fadeMs: 300 });
    };

    const progressSlider = panel.querySelector('#devProgressSlider');
    if (progressSlider) {
      progressSlider.oninput = (e) => {
        const val = parseFloat(e.target.value);
        BattleIntensity.setProgress(val, battleIntensityState.isHell);
      };
    }

    updateDevPanelUI();
  }

  function updateDevPanelUI() {
    if (typeof document === 'undefined') return;
    const panel = document.getElementById('devAudioPanel');
    if (!panel) return;

    // Status
    const statusEl = panel.querySelector('#devAudioStatus');
    if (statusEl) {
      statusEl.textContent = currentTrackId ? `Playing (${currentTrackId})` : 'Stopped';
      statusEl.style.color = currentTrackId ? '#6fb8a8' : '#8c836f';
    }

    // Mute Button
    const muteBtn = panel.querySelector('#devAudioMuteBtn');
    if (muteBtn) {
      muteBtn.textContent = isMutedState ? '🔇 Muted' : '🔊 Mute';
      muteBtn.style.color = isMutedState ? '#c9777f' : '#f1e8d4';
    }

    // Tempo
    const tempoVal = panel.querySelector('#devTempoVal');
    if (tempoVal) tempoVal.textContent = `${tempoMultiplier.toFixed(2)}x`;
    const tempoSlider = panel.querySelector('#devTempoSlider');
    if (tempoSlider && parseFloat(tempoSlider.value) !== tempoMultiplier) {
      tempoSlider.value = tempoMultiplier;
    }

    // Layer buttons
    const layerVal = panel.querySelector('#devLayerVal');
    if (layerVal) layerVal.textContent = String(layerLevel);
    panel.querySelectorAll('.dev-layer-btn').forEach(btn => {
      const lvl = parseInt(btn.dataset.layer, 10);
      btn.style.background = (layerLevel === lvl) ? '#c9a24d' : '#221c16';
      btn.style.color = (layerLevel === lvl) ? '#0f0d0b' : '#f1e8d4';
    });

    // Battle Progress Slider & Val
    const progressVal = panel.querySelector('#devProgressVal');
    if (progressVal) {
      progressVal.textContent = `${battleIntensityState.p.toFixed(2)} (L${battleIntensityState.level})`;
    }
    const devProgressSlider = panel.querySelector('#devProgressSlider');
    if (devProgressSlider && Math.abs(parseFloat(devProgressSlider.value) - battleIntensityState.p) > 0.001) {
      devProgressSlider.value = battleIntensityState.p;
    }

    // Tracks list
    const listEl = panel.querySelector('#devTracksList');
    if (listEl) {
      const tracks = getAllRegisteredTracks();
      listEl.innerHTML = tracks.map(t => {
        const isActive = (currentTrackId === t.id && isPlaying);
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; background:${isActive ? 'rgba(201,162,77,0.18)' : '#181410'}; border:1px solid ${isActive ? '#c9a24d' : 'rgba(201,162,77,0.15)'}; padding:4px 8px; border-radius:4px;">
            <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;">
              <span style="font-weight:bold; color:${isActive ? '#c9a24d' : '#f1e8d4'};">${t.id}</span>
              <span style="font-size:9px; color:#8c836f; margin-left:4px;">(${t.bpm} BPM)</span>
            </div>
            <div>
              <button class="dev-play-track-btn" data-track="${t.id}" style="background:${isActive ? '#c9a24d' : '#221c16'}; color:${isActive ? '#0f0d0b' : '#f1e8d4'}; border:1px solid #c9a24d; border-radius:3px; padding:2px 6px; cursor:pointer; font-size:10px;">
                ${isActive ? '▶ Active' : 'Play'}
              </button>
            </div>
          </div>
        `;
      }).join('');

      listEl.querySelectorAll('.dev-play-track-btn').forEach(btn => {
        btn.onclick = () => {
          const tid = btn.dataset.track;
          if (currentTrackId === tid && isPlaying) {
            stopMusic({ fadeMs: 300 });
          } else {
            playTrack(tid, { crossfadeMs: 400 });
          }
        };
      });
    }
  }

  // Pre-register any tracks loaded before engine and mount dev panel
  if (typeof window !== 'undefined') {
    window.BattleIntensity = BattleIntensity;

    if (window.AudioTracks) {
      Object.keys(window.AudioTracks).forEach(id => {
        registerTrack(window.AudioTracks[id]);
      });
    }

    // Autoplay unlock on first user gesture
    const unlockAudio = () => {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach(evt => {
      window.addEventListener(evt, unlockAudio, { passive: true });
    });

    // Pause audio on hidden tab, resume when visible
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!audioCtx) return;
        if (document.hidden) {
          if (audioCtx.state === 'running') {
            audioCtx.suspend().catch(() => {});
          }
        } else {
          if (audioCtx.state === 'suspended' && !isMutedState) {
            audioCtx.resume().catch(() => {});
          }
        }
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountDevAuditionPanel);
    } else {
      setTimeout(mountDevAuditionPanel, 100);
    }
  }

  return {
    initAudio,
    registerTrack,
    getTrack,
    getAllRegisteredTracks,
    playTrack,
    stopMusic,
    setMuted,
    isMuted,
    setTempoMultiplier,
    getTempoMultiplier,
    setLayerLevel,
    getLayerLevel,
    playTone,
    playSfx,
    getCurrentTrackId,
    isAudioContextRunning,
    mountDevAuditionPanel,
    // Battle audio APIs
    startBattleMusic,
    updateBattleMusicProgress,
    handleBattleVictory,
    handleBattleDefeat,
    stopBattleMusic,
    isJinglePlaying,
    dismissJingle,
    queueClimaxFill,
    // Beat clock & Battle Intensity APIs
    battleIntensity: BattleIntensity,
    getBeatPhase,
    onBeat,
    isDownbeat
  };
});

/**
 * ============================================================================
 * PROCEDURAL CHIPTUNE & MUSIC ENGINE (Web Audio API)
 * ============================================================================
 * 
 * TRACK CONFIG FORMAT SPECIFICATION:
 * Each track is a standalone config object (e.g. audio/tracks/*.js) with:
 * {
 *   id: string,                 // Unique track identifier (e.g. 'flashcards-chill', 'battle-theme')
 *   title: string,              // Optional human-readable name
 *   bpm: number,                // Base tempo in BPM (e.g. 68 or 128)
 *   root: string|number,        // Key root note name ('D3', 'A2') or MIDI number (50)
 *   scale: number[],            // Scale intervals in semitones relative to root, e.g. Dorian: [0,2,3,5,7,9,10]
 *   loopLengthBars: number,     // Number of bars in full loop (e.g. 16 or 4)
 *   chordProgression: number[], // Array of scale degrees or roots per bar
 *   swing: number,              // Swing factor (0 to 0.5) applied to off-beat 16th notes
 *   reverbSend: number,         // Wet send amount to shared convolution reverb (0.0 to 1.0)
 *   masterGain: number,         // Track ceiling volume (0.0 to 1.0)
 *   instruments: {              // Synthesis definitions per channel
 *     [channelName]: {
 *       oscillator: string|string[], // 'sine'|'triangle'|'sawtooth'|'square'|['triangle','sine']
 *       detune: number|number[],     // Detuning in cents (e.g. [-6, 6] or 0)
 *       envelope: { attack, decay, sustain, release }, // ADSR timings in seconds
 *       filter: { type, cutoff, resonance },           // Biquad filter settings
 *       gain: number,                                  // Channel relative gain multiplier
 *       vibrato?: { rate, depth }                      // Optional subtle pitch LFO
 *     }
 *   },
 *   patterns: {                 // 16th-note step arrays per channel (16 steps/bar)
 *     [channelName]: (NoteEvent | null)[]
 *   },
 *   layers?: {                  // Channel-to-layer mapping for dynamic arrangement (1..n)
 *     [channelName]: number
 *   }
 * }
 * 
 * NoteEvent:
 *   { degree?: number, degrees?: number[], octave?: number, duration?: number, velocity?: number, type?: string }
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
  const LOOKAHEAD_INTERVAL_MS = 25;       // Scheduler tick frequency (~25ms)
  const SCHEDULE_AHEAD_TIME_SEC = 0.100;   // Scheduling lookahead window (~100ms)
  const STORAGE_KEY_MUTED = 'gv_sound_muted';

  // Audio Context & State
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
  let nextTrackGain = null;
  let isPlaying = false;
  let schedulerTimer = null;
  let currentStep = 0;
  let nextNoteTime = 0;
  let tempoMultiplier = 1.0;
  let layerLevel = 3; // 1 = minimal, 2 = normal, 3 = full

  // Active voice nodes for leak-free cleanup
  const activeVoiceNodes = new Set();

  // Noise Buffer Cache (for drums, vinyl, and SFX)
  let cachedNoiseBuffer = null;

  /**
   * Parse note string ('D3', 'A#4', 'Bb2') to MIDI number
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
   * Procedural Convolution Reverb Impulse Response Generator
   * Generates exponentially decaying stereo noise impulse without any external audio file
   */
  function createImpulseResponse(ctx, duration = 1.8, decay = 2.4) {
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
    const length = ctx.sampleRate * 2; // 2 seconds of loopable noise
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
        reverbNode.buffer = createImpulseResponse(audioCtx, 1.8, 2.4);

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

    // Handle tab visibility change (pause on hide, resume on show)
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

      // Optional Filter
      let targetNode = voiceGain;
      if (instrument.filter && instrument.filter.cutoff) {
        const filter = audioCtx.createBiquadFilter();
        filter.type = instrument.filter.type || 'lowpass';
        filter.frequency.setValueAtTime(instrument.filter.cutoff, startTime);
        if (instrument.filter.resonance) {
          filter.Q.setValueAtTime(instrument.filter.resonance, startTime);
        }
        filter.connect(targetNode);
        targetNode = filter;
      }

      // Route to track destination and reverb
      voiceGain.connect(destination);
      if (reverbSendNode) {
        voiceGain.connect(reverbSendNode);
      }

      // Oscillator(s)
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
   * Synthesize percussion and noise events
   */
  function schedulePercussion(drumCfg, event, time, destination, reverbSendNode) {
    if (!audioCtx) return;
    try {
      const startTime = Math.max(time, audioCtx.currentTime);
      const vel = event.velocity || 0.6;
      const type = event.type || 'hat';

      if (type === 'kick' || type === 'kick_and_hat') {
        const kcfg = (drumCfg && drumCfg.kick) || { startFreq: 80, endFreq: 32, decay: 0.12, gain: 0.5 };
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';

        osc.frequency.setValueAtTime(kcfg.startFreq || 80, startTime);
        osc.frequency.exponentialRampToValueAtTime(kcfg.endFreq || 30, startTime + (kcfg.decay || 0.1));

        const kickGain = (kcfg.gain || 0.5) * vel;
        gain.gain.setValueAtTime(kickGain, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + (kcfg.decay || 0.1));

        osc.connect(gain);
        gain.connect(destination);
        osc.start(startTime);
        osc.stop(startTime + (kcfg.decay || 0.1) + 0.02);

        osc.onended = () => {
          try { osc.disconnect(); gain.disconnect(); } catch (e) {}
        };
      }

      if (type === 'hat' || type === 'kick_and_hat' || type === 'snare') {
        const noiseBuf = getNoiseBuffer(audioCtx);
        const noiseSrc = audioCtx.createBufferSource();
        noiseSrc.buffer = noiseBuf;

        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        const isSnare = (type === 'snare');
        const dur = isSnare ? 0.12 : 0.04;
        const cutoff = isSnare ? 3000 : 7000;
        const hatGain = (isSnare ? 0.4 : 0.2) * vel;

        filter.type = isSnare ? 'lowpass' : 'highpass';
        filter.frequency.setValueAtTime(cutoff, startTime);

        gain.gain.setValueAtTime(hatGain, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

        noiseSrc.connect(filter);
        filter.connect(gain);
        gain.connect(destination);
        if (reverbSendNode) gain.connect(reverbSendNode);

        noiseSrc.start(startTime);
        noiseSrc.stop(startTime + dur + 0.02);

        noiseSrc.onended = () => {
          try { noiseSrc.disconnect(); filter.disconnect(); gain.disconnect(); } catch (e) {}
        };
      }

      if (type === 'crackle') {
        // Vinyl crackle click
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2000 + Math.random() * 3000, startTime);
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

    const secondsPerBeat = 60.0 / ((track.bpm || 100) * tempoMultiplier);
    const secondsPer16th = secondsPerBeat / 4.0;
    const rootMidi = noteToMidi(track.root || 'C3');
    const scale = track.scale || [0, 2, 4, 5, 7, 9, 11];

    // Calculate light swing on odd 16th notes (steps 1, 3, 5, 7, 9, 11, 13, 15)
    let noteTime = stepTime;
    if ((stepIndex % 2 === 1) && track.swing) {
      noteTime += secondsPer16th * track.swing;
    }

    const channels = Object.keys(track.patterns);
    for (let c = 0; c < channels.length; c++) {
      const channelName = channels[c];
      const pattern = track.patterns[channelName];
      if (!pattern || pattern.length === 0) continue;

      // Layer filtering
      const requiredLayer = (track.layers && track.layers[channelName]) || 1;
      if (layerLevel < requiredLayer) continue;

      const event = pattern[stepIndex % pattern.length];
      if (!event) continue;

      const instrument = (track.instruments && track.instruments[channelName]) || {};

      // Percussion & Drums channel
      if (channelName === 'drums' || channelName === 'vinyl' || event.type) {
        schedulePercussion(instrument, event, noteTime, trackGainNode, reverbSendNode);
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
          scheduleVoice(instrument, freq, noteTime, durSec, velocity, trackGainNode, reverbSendNode);
        });
      } else if (event.degree !== undefined) {
        // Single scale degree note
        const freq = degreeToFreq(rootMidi, scale, event.degree, event.octave || 0);
        scheduleVoice(instrument, freq, noteTime, durSec, velocity, trackGainNode, reverbSendNode);
      } else if (event.note !== undefined) {
        // Direct note name or MIDI
        const midi = noteToMidi(event.note);
        const freq = midiToFreq(midi);
        scheduleVoice(instrument, freq, noteTime, durSec, velocity, trackGainNode, reverbSendNode);
      }
    }
  }

  /**
   * Main Lookahead Scheduler Loop
   */
  function schedulerTick() {
    if (!isPlaying || !currentTrack || !audioCtx) return;

    try {
      const totalSteps = (currentTrack.loopLengthBars || 4) * 16;

      while (nextNoteTime < audioCtx.currentTime + SCHEDULE_AHEAD_TIME_SEC) {
        // Dynamic BPM check on every step for smooth runtime tempo changes
        const currentBpm = (currentTrack.bpm || 100) * tempoMultiplier;
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
      const targetGain = track.masterGain !== undefined ? track.masterGain : 0.3;
      const crossfadeSec = crossfadeMs / 1000.0;

      // Create new track gain node
      const newTrackGain = audioCtx.createGain();
      newTrackGain.gain.setValueAtTime(0.0001, now);
      newTrackGain.gain.linearRampToValueAtTime(targetGain, now + crossfadeSec);
      newTrackGain.connect(masterGainNode);

      // Fade out previous track gain if active
      if (currentTrackGain && isPlaying) {
        const oldGain = currentTrackGain;
        oldGain.gain.setValueAtTime(oldGain.gain.value, now);
        oldGain.gain.linearRampToValueAtTime(0.0001, now + crossfadeSec);
        setTimeout(() => {
          try { oldGain.disconnect(); } catch (e) {}
        }, crossfadeMs + 100);
      }

      // Switch to new track
      currentTrack = track;
      currentTrackId = id;
      currentTrackGain = newTrackGain;
      currentStep = 0;
      nextNoteTime = audioCtx.currentTime + 0.05;
      isPlaying = true;

      // Ensure strictly one scheduler interval runs
      if (schedulerTimer) {
        clearInterval(schedulerTimer);
        schedulerTimer = null;
      }
      schedulerTimer = setInterval(schedulerTick, LOOKAHEAD_INTERVAL_MS);

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

    if (schedulerTimer) {
      clearInterval(schedulerTimer);
      schedulerTimer = null;
    }

    if (audioCtx && currentTrackGain) {
      try {
        const gainNode = currentTrackGain;
        currentTrackGain = null;
        const now = audioCtx.currentTime;
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeSec);

        setTimeout(() => {
          try { gainNode.disconnect(); } catch (e) {}
        }, fadeMs + 50);
      } catch (e) {}
    }
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
  }

  function isMuted() {
    return isMutedState;
  }

  function setTempoMultiplier(multiplier, options = {}) {
    const rampMs = options.rampMs !== undefined ? options.rampMs : 200;
    tempoMultiplier = Math.max(0.2, Math.min(3.0, multiplier));
  }

  function setLayerLevel(level) {
    layerLevel = Math.max(0, Math.min(5, level));
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
          // Card flip gentle pitch sweep
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

  // Pre-register any tracks that were loaded before engine
  if (typeof window !== 'undefined' && window.AudioTracks) {
    Object.keys(window.AudioTracks).forEach(id => {
      registerTrack(window.AudioTracks[id]);
    });
  }

  return {
    initAudio,
    registerTrack,
    getTrack,
    playTrack,
    stopMusic,
    setMuted,
    isMuted,
    setTempoMultiplier,
    setLayerLevel,
    playTone,
    playSfx,
    getCurrentTrackId,
    isAudioContextRunning
  };
});

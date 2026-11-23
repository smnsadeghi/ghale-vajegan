/**
 * ============================================================================
 * Track Config: "battle-theme"
 * ============================================================================
 * High-energy 8-bit retro dark fantasy battle theme for the Arena / Battle screen.
 * - Key: A Natural Minor / Aeolian
 * - Tempo: 128 BPM
 * - Structure: 4-bar driving chiptune battle loop
 * - Instrumentation:
 *     * Lead: Dual detuned square waves with rapid arpeggiation and chiptune bite
 *     * Arp: Fast 16th-note octave arpeggiator
 *     * Bass: Driving 8-bit sawtooth/square bassline
 *     * Drums: Chiptune kick and punchy noise burst snare
 * - Master Gain: 0.36
 * ============================================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AudioTracks = root.AudioTracks || {};
    root.AudioTracks['battle-theme'] = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // A Natural Minor scale intervals relative to A2: A(0), B(2), C(3), D(5), E(7), F(8), G(10)
  const A_MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

  // 4-bar chord progression: Am (0) -> F (5) -> G (6) -> Em (4)
  const CHORD_PROGRESSION = [0, 5, 6, 4];

  // 4 bars * 16 steps = 64 steps total
  const bassSteps = [];
  const bassRiff = [
    // Bar 1: Am driving 16ths
    0, 0, 7, 0, 0, 0, 3, 0, 0, 0, 7, 0, 3, 0, 2, 0,
    // Bar 2: F
    5, 5, 12, 5, 5, 5, 8, 5, 5, 5, 12, 5, 8, 5, 7, 5,
    // Bar 3: G
    6, 6, 13, 6, 6, 6, 10, 6, 6, 6, 13, 6, 10, 6, 8, 6,
    // Bar 4: Em / E
    4, 4, 11, 4, 4, 4, 7, 4, 7, 8, 10, 8, 7, 5, 3, 2
  ];

  for (let i = 0; i < 64; i++) {
    const deg = bassRiff[i];
    bassSteps.push({
      degree: deg,
      octave: -1,
      duration: 0.22,
      velocity: (i % 4 === 0) ? 0.9 : 0.72
    });
  }

  // Lead 8-bit melody
  const leadSteps = new Array(64).fill(null);
  const leadRiff = [
    // Bar 1
    { step: 0, degree: 7, octave: 1, duration: 0.4, velocity: 0.85 },   // E5
    { step: 3, degree: 3, octave: 1, duration: 0.35, velocity: 0.75 },  // C5
    { step: 6, degree: 5, octave: 1, duration: 0.4, velocity: 0.8 },    // D5
    { step: 10, degree: 7, octave: 1, duration: 0.6, velocity: 0.85 },  // E5
    { step: 14, degree: 8, octave: 1, duration: 0.4, velocity: 0.8 },   // F5
    // Bar 2
    { step: 16, degree: 7, octave: 1, duration: 0.4, velocity: 0.85 },  // E5
    { step: 19, degree: 5, octave: 1, duration: 0.35, velocity: 0.75 },  // D5
    { step: 22, degree: 3, octave: 1, duration: 0.4, velocity: 0.8 },   // C5
    { step: 26, degree: 2, octave: 1, duration: 0.6, velocity: 0.75 },  // B4
    { step: 30, degree: 3, octave: 1, duration: 0.4, velocity: 0.75 },  // C5
    // Bar 3
    { step: 32, degree: 5, octave: 1, duration: 0.4, velocity: 0.85 },  // D5
    { step: 35, degree: 7, octave: 1, duration: 0.35, velocity: 0.8 },  // E5
    { step: 38, degree: 8, octave: 1, duration: 0.4, velocity: 0.85 },  // F5
    { step: 42, degree: 10, octave: 1, duration: 0.6, velocity: 0.9 },  // G5
    { step: 46, degree: 8, octave: 1, duration: 0.4, velocity: 0.8 },   // F5
    // Bar 4
    { step: 48, degree: 7, octave: 1, duration: 0.5, velocity: 0.85 },  // E5
    { step: 52, degree: 5, octave: 1, duration: 0.4, velocity: 0.8 },   // D5
    { step: 56, degree: 3, octave: 1, duration: 0.4, velocity: 0.75 },  // C5
    { step: 60, degree: 2, octave: 1, duration: 0.5, velocity: 0.8 }    // B4
  ];

  leadRiff.forEach(note => {
    leadSteps[note.step] = {
      degree: note.degree,
      octave: note.octave,
      duration: note.duration,
      velocity: note.velocity
    };
  });

  // Arpeggiator (16th-note shimmer)
  const arpSteps = [];
  const arpDegrees = [0, 2, 4, 7, 9, 7, 4, 2];
  for (let i = 0; i < 64; i++) {
    if (i % 2 === 0) {
      const d = arpDegrees[(i / 2) % arpDegrees.length];
      arpSteps.push({ degree: d, octave: 0, duration: 0.2, velocity: 0.55 });
    } else {
      arpSteps.push(null);
    }
  }

  // Chiptune Drums (Kick on 1 & 3, Snare on 2 & 4, Hi-hat on 16ths)
  const drumSteps = [];
  for (let i = 0; i < 64; i++) {
    const s = i % 16;
    const isKick = (s === 0 || s === 8 || s === 14);
    const isSnare = (s === 4 || s === 12);
    const isHat = (s % 2 === 0);

    if (isSnare) {
      drumSteps.push({ type: 'snare', velocity: 0.85 });
    } else if (isKick) {
      drumSteps.push({ type: 'kick', velocity: 0.9 });
    } else if (isHat) {
      drumSteps.push({ type: 'hat', velocity: 0.35 });
    } else {
      drumSteps.push(null);
    }
  }

  return {
    id: 'battle-theme',
    title: 'Retro Battle Arena',
    bpm: 128,
    root: 'A2',
    scale: A_MINOR_SCALE,
    loopLengthBars: 4,
    chordProgression: CHORD_PROGRESSION,
    swing: 0,
    reverbSend: 0.18,
    masterGain: 0.36,

    instruments: {
      lead: {
        oscillator: ['square', 'square'],
        detune: [-7, 7],
        envelope: {
          attack: 0.008,
          decay: 0.22,
          sustain: 0.35,
          release: 0.15
        },
        filter: {
          type: 'lowpass',
          cutoff: 3200,
          resonance: 2.0
        },
        gain: 0.32
      },

      arp: {
        oscillator: 'triangle',
        detune: 0,
        envelope: {
          attack: 0.005,
          decay: 0.12,
          sustain: 0.1,
          release: 0.08
        },
        filter: {
          type: 'lowpass',
          cutoff: 2400,
          resonance: 1.0
        },
        gain: 0.18
      },

      bass: {
        oscillator: 'sawtooth',
        detune: 0,
        envelope: {
          attack: 0.01,
          decay: 0.18,
          sustain: 0.5,
          release: 0.12
        },
        filter: {
          type: 'lowpass',
          cutoff: 600,
          resonance: 1.5
        },
        gain: 0.35
      },

      drums: {
        kick: {
          startFreq: 110,
          endFreq: 35,
          decay: 0.12,
          gain: 0.65
        },
        snare: {
          cutoff: 2800,
          decay: 0.14,
          gain: 0.55
        },
        hat: {
          cutoff: 8000,
          decay: 0.04,
          gain: 0.25
        },
        gain: 0.45
      }
    },

    patterns: {
      lead: leadSteps,
      arp: arpSteps,
      bass: bassSteps,
      drums: drumSteps
    },

    layers: {
      bass: 1,
      drums: 1,
      arp: 2,
      lead: 3
    }
  };
});

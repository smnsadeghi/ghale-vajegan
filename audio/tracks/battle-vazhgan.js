/**
 * ============================================================================
 * Track Config: "battle-vazhgan" (World 1: واژگان - Graveyard Scene)
 * ============================================================================
 * Gothic, dark and heroic battle theme for the Old Graveyard Arena.
 * - Key: A Harmonic Minor [0, 2, 3, 5, 7, 8, 11] (A, B, C, D, E, F, G#)
 * - Tempo: 100 BPM
 * - Structure: 8-bar loop (Am - F - G - E7 - Am - Dm - F - E7)
 * - Instrumentation:
 *     * Lead: Heroic brass-like lead with attack swell and filter envelope
 *     * Bass: Driving 8th-note detuned triangle/sawtooth bass
 *     * Pad: Dark, resonant gothic organ/pad (detuned sawtooths)
 *     * Arp: Menacing gothic arpeggio in harmonic minor
 *     * Counter: Soaring brass counter-melody in upper register
 *     * Drums: Powerful orchestral timpani on beats 1 & 3, snare on 2 & 4
 *     * Fills: Bar-end tom rolls on bar 4 and bar 8, crashes on bar 1 and 5
 * - Layers:
 *     * Layer 0: bass + kick/timpani + pad + lead
 *     * Layer 1: hi-hat 8ths + arp
 *     * Layer 2: snare backbeat + counter-melody
 *     * Layer 3: 16th hi-hats + crash + bar-end fills
 * ============================================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AudioTracks = root.AudioTracks || {};
    root.AudioTracks['battle-vazhgan'] = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // A Harmonic Minor semitones: A(0), B(2), C(3), D(5), E(7), F(8), G#(11)
  const A_HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11];

  // 8-bar chord progression: Am(0) -> F(5) -> G(6) -> E7(4) -> Am(0) -> Dm(3) -> F(5) -> E7(4)
  const CHORD_PROGRESSION = [0, 5, 6, 4, 0, 3, 5, 4];

  // 128 total 16th steps (8 bars * 16 steps)
  const totalSteps = 128;

  // 1. Bass: Driving 8th notes (steps 0, 2, 4, 6, 8, 10, 12, 14 in each bar)
  const bassSteps = new Array(totalSteps).fill(null);
  const bassRoots = [
    // Bar 1: Am
    [0, 0, 7, 0, 3, 0, 7, 0],
    // Bar 2: F
    [5, 5, 12, 5, 8, 5, 7, 5],
    // Bar 3: G
    [6, 6, 13, 6, 10, 6, 8, 6],
    // Bar 4: E7 (Leading tone G# = deg 6)
    [4, 4, 11, 4, 6, 7, 11, 4],
    // Bar 5: Am
    [0, 0, 7, 0, 3, 0, 7, 0],
    // Bar 6: Dm
    [3, 3, 10, 3, 7, 3, 5, 3],
    // Bar 7: F
    [5, 5, 12, 5, 8, 5, 7, 5],
    // Bar 8: E7 Turnaround
    [4, 4, 11, 4, 6, 7, 6, 4]
  ];

  for (let bar = 0; bar < 8; bar++) {
    const riff = bassRoots[bar];
    for (let i = 0; i < 8; i++) {
      const stepIdx = bar * 16 + i * 2;
      bassSteps[stepIdx] = {
        degree: riff[i],
        octave: -1,
        duration: 0.42,
        velocity: (i % 2 === 0) ? 0.92 : 0.78
      };
    }
  }

  // 2. Pad: Dark sustained gothic organ chords per bar
  const padSteps = new Array(totalSteps).fill(null);
  const padVoicings = [
    [0, 2, 4],    // Bar 1: Am (A, C, E)
    [5, 0, 2],    // Bar 2: F (F, A, C)
    [6, 1, 3],    // Bar 3: G (G, B, D)
    [4, 6, 1],    // Bar 4: E7 (E, G#, B)
    [0, 2, 4],    // Bar 5: Am (A, C, E)
    [3, 5, 0],    // Bar 6: Dm (D, F, A)
    [5, 0, 2],    // Bar 7: F (F, A, C)
    [4, 6, 1]     // Bar 8: E7 (E, G#, B)
  ];
  for (let bar = 0; bar < 8; bar++) {
    padSteps[bar * 16] = {
      degrees: padVoicings[bar],
      octave: 0,
      duration: 3.85,
      velocity: 0.68
    };
  }

  // 3. Lead: Heroic, memorable brass-like melody
  const leadSteps = new Array(totalSteps).fill(null);
  const leadRiff = [
    // Bar 1 (Am)
    { bar: 0, step: 0, degree: 7, octave: 1, duration: 0.8, velocity: 0.95 },   // E5
    { bar: 0, step: 6, degree: 5, octave: 1, duration: 0.5, velocity: 0.85 },   // D5
    { bar: 0, step: 10, degree: 7, octave: 1, duration: 0.9, velocity: 0.92 },  // E5
    // Bar 2 (F)
    { bar: 1, step: 0, degree: 8, octave: 1, duration: 1.1, velocity: 0.95 },   // F5
    { bar: 1, step: 8, degree: 7, octave: 1, duration: 0.5, velocity: 0.85 },   // E5
    { bar: 1, step: 12, degree: 5, octave: 1, duration: 0.6, velocity: 0.88 },  // D5
    // Bar 3 (G)
    { bar: 2, step: 0, degree: 6, octave: 1, duration: 0.9, velocity: 0.92 },   // G5
    { bar: 2, step: 6, degree: 5, octave: 1, duration: 0.5, velocity: 0.85 },   // D5
    { bar: 2, step: 10, degree: 4, octave: 1, duration: 0.8, velocity: 0.9 },   // C5
    // Bar 4 (E7 - Climax with G#)
    { bar: 3, step: 0, degree: 6, octave: 1, duration: 1.4, velocity: 0.98 },   // G#5
    { bar: 3, step: 8, degree: 7, octave: 1, duration: 1.2, velocity: 0.9 },    // E5
    // Bar 5 (Am - Call)
    { bar: 4, step: 0, degree: 7, octave: 1, duration: 0.7, velocity: 0.92 },   // E5
    { bar: 4, step: 4, degree: 9, octave: 1, duration: 0.7, velocity: 0.95 },   // A5
    { bar: 4, step: 10, degree: 8, octave: 1, duration: 0.8, velocity: 0.9 },   // F5
    // Bar 6 (Dm)
    { bar: 5, step: 0, degree: 7, octave: 1, duration: 0.7, velocity: 0.88 },   // E5
    { bar: 5, step: 4, degree: 5, octave: 1, duration: 0.7, velocity: 0.85 },   // D5
    { bar: 5, step: 10, degree: 4, octave: 1, duration: 0.8, velocity: 0.88 },  // C5
    // Bar 7 (F)
    { bar: 6, step: 0, degree: 5, octave: 1, duration: 0.8, velocity: 0.9 },    // D5
    { bar: 6, step: 6, degree: 4, octave: 1, duration: 0.5, velocity: 0.85 },   // C5
    { bar: 6, step: 10, degree: 3, octave: 1, duration: 0.7, velocity: 0.88 },  // B4
    // Bar 8 (E7 - Resolving)
    { bar: 7, step: 0, degree: 6, octave: 1, duration: 1.5, velocity: 0.96 },   // G#5
    { bar: 7, step: 8, degree: 7, octave: 1, duration: 1.6, velocity: 0.95 }    // A5
  ];
  leadRiff.forEach(note => {
    const idx = note.bar * 16 + note.step;
    if (idx < totalSteps) {
      leadSteps[idx] = {
        degree: note.degree,
        octave: note.octave,
        duration: note.duration,
        velocity: note.velocity
      };
    }
  });

  // 4. Arpeggiator (Menacing harmonic minor shimmer)
  const arpSteps = new Array(totalSteps).fill(null);
  const arpPattern = [0, 2, 4, 7, 4, 2, 0, 2];
  for (let bar = 0; bar < 8; bar++) {
    const rootDeg = CHORD_PROGRESSION[bar];
    for (let s = 0; s < 16; s++) {
      if (s % 2 === 0) {
        const deg = rootDeg + arpPattern[(s / 2) % arpPattern.length];
        arpSteps[bar * 16 + s] = { degree: deg, octave: 0, duration: 0.22, velocity: 0.58 };
      }
    }
  }

  // 5. Counter-melody / Upper octave response (Layer 2)
  const counterSteps = new Array(totalSteps).fill(null);
  const counterRiff = [
    { bar: 0, step: 8, degree: 11, octave: 1, duration: 0.5, velocity: 0.72 },
    { bar: 0, step: 12, degree: 9, octave: 1, duration: 0.6, velocity: 0.75 },
    { bar: 1, step: 8, degree: 10, octave: 1, duration: 0.8, velocity: 0.75 },
    { bar: 2, step: 8, degree: 9, octave: 1, duration: 0.7, velocity: 0.72 },
    { bar: 3, step: 6, degree: 11, octave: 1, duration: 0.8, velocity: 0.8 },
    { bar: 4, step: 8, degree: 11, octave: 1, duration: 0.6, velocity: 0.75 },
    { bar: 5, step: 8, degree: 9, octave: 1, duration: 0.7, velocity: 0.72 },
    { bar: 6, step: 8, degree: 8, octave: 1, duration: 0.7, velocity: 0.75 },
    { bar: 7, step: 6, degree: 11, octave: 1, duration: 0.9, velocity: 0.82 }
  ];
  counterRiff.forEach(note => {
    counterSteps[note.bar * 16 + note.step] = {
      degree: note.degree,
      octave: note.octave,
      duration: note.duration,
      velocity: note.velocity
    };
  });

  // 6. Drums & Percussion: Timpani/Kick (Layer 0), Snare (Layer 2), Hi-hats (Layers 1 & 3), Crash & Fills (Layer 3)
  const drumSteps = new Array(totalSteps).fill(null);
  const snareSteps = new Array(totalSteps).fill(null);
  const hihatSteps = new Array(totalSteps).fill(null);
  const hihatFastSteps = new Array(totalSteps).fill(null);
  const fillSteps = new Array(totalSteps).fill(null);

  for (let bar = 0; bar < 8; bar++) {
    for (let s = 0; s < 16; s++) {
      const idx = bar * 16 + s;

      // Timpani / Kick on beats 1 and 3 (Layer 0)
      if (s === 0 || s === 8) {
        drumSteps[idx] = { type: 'timpani', startFreq: 135, endFreq: 52, decay: 0.32, velocity: 0.92 };
      } else if (s === 14 && bar % 2 === 1) {
        drumSteps[idx] = { type: 'timpani', startFreq: 120, endFreq: 48, decay: 0.22, velocity: 0.75 };
      }

      // Snare on beats 2 and 4 (Layer 2)
      if (s === 4 || s === 12) {
        snareSteps[idx] = { type: 'snare', velocity: 0.88 };
      }

      // 8th-note Hi-hats (Layer 1)
      if (s % 2 === 0) {
        hihatSteps[idx] = { type: 'hat', velocity: (s % 4 === 2) ? 0.45 : 0.3 };
      }

      // 16th-note Hi-hats (Layer 3)
      if (s % 2 === 1) {
        hihatFastSteps[idx] = { type: 'hat', velocity: 0.22 };
      }

      // Crash Cymbal on Bar 1 & Bar 5 downbeat (Layer 3)
      if ((bar === 0 || bar === 4) && s === 0) {
        fillSteps[idx] = { type: 'crash', velocity: 0.9 };
      }

      // Bar-end fills on Bar 4 and Bar 8 (Layer 3)
      if (bar === 3 && s >= 10) {
        // Tom roll fill on bar 4
        const tomTypes = ['tom_hi', 'tom_mid', 'tom_low', 'snare'];
        fillSteps[idx] = { type: tomTypes[(s - 10) % tomTypes.length], velocity: 0.85 };
      } else if (bar === 7 && s >= 8) {
        // Big climactic turnaround fill on bar 8
        const tomTypes = ['tom_hi', 'tom_hi', 'tom_mid', 'tom_mid', 'tom_low', 'tom_low', 'snare', 'snare'];
        fillSteps[idx] = { type: tomTypes[s - 8], velocity: 0.92 };
      }
    }
  }

  return {
    id: 'battle-vazhgan',
    title: 'نبرد واژگان · گورستان کهن',
    bpm: 100,
    root: 'A2',
    scale: A_HARMONIC_MINOR,
    loopLengthBars: 8,
    chordProgression: CHORD_PROGRESSION,
    swing: 0,
    reverbSend: 0.28,
    masterGain: 0.38,

    instruments: {
      lead: {
        oscillator: ['sawtooth', 'sawtooth'],
        detune: [-5, 5],
        envelope: {
          attack: 0.045,  // Short brass swell
          decay: 0.32,
          sustain: 0.55,
          release: 0.25
        },
        filter: {
          type: 'lowpass',
          cutoff: 2100,
          envAmount: 2200, // Opens up on attack
          resonance: 1.8
        },
        gain: 0.34
      },

      counter: {
        oscillator: 'sawtooth',
        detune: 0,
        envelope: {
          attack: 0.03,
          decay: 0.25,
          sustain: 0.45,
          release: 0.2
        },
        filter: {
          type: 'lowpass',
          cutoff: 2800,
          resonance: 1.2
        },
        gain: 0.22
      },

      pad: {
        oscillator: ['sawtooth', 'sawtooth', 'triangle'],
        detune: [-8, 0, 8],
        envelope: {
          attack: 0.65,
          decay: 0.5,
          sustain: 0.75,
          release: 1.2
        },
        filter: {
          type: 'lowpass',
          cutoff: 620,
          resonance: 1.1
        },
        gain: 0.24
      },

      bass: {
        oscillator: ['sawtooth', 'triangle'],
        detune: [-4, 4],
        envelope: {
          attack: 0.015,
          decay: 0.22,
          sustain: 0.6,
          release: 0.15
        },
        filter: {
          type: 'lowpass',
          cutoff: 480,
          resonance: 1.4
        },
        gain: 0.38
      },

      arp: {
        oscillator: 'triangle',
        detune: 0,
        envelope: {
          attack: 0.008,
          decay: 0.14,
          sustain: 0.2,
          release: 0.1
        },
        filter: {
          type: 'lowpass',
          cutoff: 1900,
          resonance: 1.0
        },
        gain: 0.20
      },

      drums: {
        timpani: {
          startFreq: 135,
          endFreq: 50,
          decay: 0.32,
          gain: 0.75
        },
        snare: {
          cutoff: 3200,
          decay: 0.14,
          gain: 0.65
        },
        hat: {
          cutoff: 7500,
          decay: 0.035,
          gain: 0.24
        },
        crash: {
          cutoff: 4500,
          decay: 1.4,
          gain: 0.45
        },
        gain: 0.45
      }
    },

    patterns: {
      bass: bassSteps,
      drums: drumSteps,
      pad: padSteps,
      lead: leadSteps,
      hihat: hihatSteps,
      arp: arpSteps,
      snare: snareSteps,
      counter: counterSteps,
      hihat_fast: hihatFastSteps,
      fills: fillSteps
    },

    layers: {
      bass: 0,
      drums: 0,
      pad: 0,
      lead: 0,
      hihat: 1,
      arp: 1,
      snare: 2,
      counter: 2,
      hihat_fast: 3,
      fills: 3
    }
  };
});

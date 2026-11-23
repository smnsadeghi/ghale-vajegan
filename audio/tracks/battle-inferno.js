/**
 * ============================================================================
 * Track Config: "battle-inferno" (World 4: دژ جهنمی - Inferno Fortress 2x XP)
 * ============================================================================
 * Heaviest, fastest and climactic final boss battle theme.
 * - Key: F# Phrygian [0, 1, 3, 5, 7, 8, 10] (F#, G, A, B, C#, D, E)
 * - Tempo: 128 BPM
 * - Style: Double-time kick, distorted sawtooth bass and orchestral stabs
 *   using Tritone (C) and Minor-Second (G) dissonance, dark choir-like pad,
 *   relentless snare backbeat, and searing aggressive lead.
 * - Structure: 8-bar climactic loop
 * - Layers:
 *     * Layer 0: bass + double-time kick + choir pad + lead
 *     * Layer 1: hi-hat 8ths + arp
 *     * Layer 2: relentless snare + tritone/minor-second stabs
 *     * Layer 3: 16th hi-hats + crash + apocalyptic fills
 * ============================================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AudioTracks = root.AudioTracks || {};
    root.AudioTracks['battle-inferno'] = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // F# Phrygian scale: F#(0), G(1), A(3), B(5), C#(7), D(8), E(10)
  const FS_PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];

  // 8-bar chord progression with Tritone (C) and Minor-Second (G) tension:
  // Bar 1: F#m(0) -> Bar 2: G(1) -> Bar 3: Cdim/Tritone -> Bar 4: F#m(0) ->
  // Bar 5: Bm(3)  -> Bar 6: G(1) -> Bar 7: Edim        -> Bar 8: F#m Turnaround
  const CHORD_PROGRESSION = [0, 1, 0, 0, 3, 1, 6, 0];

  const totalSteps = 128;

  // 1. Distorted Driving Sawtooth Bass with Tritone (C) & Minor 2nd (G) accents
  const bassSteps = new Array(totalSteps).fill(null);
  const bassRiffs = [
    // Bar 1: F# relentless 16ths
    ['F#2', 'F#2', 'C#3', 'F#2', 'G2', 'F#2', 'C#3', 'F#2'],
    // Bar 2: G (Minor Second) tension
    ['G2', 'G2', 'D3', 'G2', 'G#2', 'G2', 'D3', 'G2'],
    // Bar 3: C (Tritone!) dissonance
    ['C3', 'C3', 'G3', 'C3', 'F#2', 'C3', 'C#3', 'C3'],
    // Bar 4: F# driving resolution
    ['F#2', 'F#2', 'G2', 'F#2', 'C3', 'F#2', 'C#3', 'F#2'],
    // Bar 5: Bm
    ['B2', 'B2', 'F#3', 'B2', 'C3', 'B2', 'F#3', 'B2'],
    // Bar 6: G
    ['G2', 'G2', 'D3', 'G2', 'C3', 'G2', 'D3', 'G2'],
    // Bar 7: Edim / C
    ['E2', 'E2', 'Bb2', 'E2', 'C3', 'E2', 'G2', 'E2'],
    // Bar 8: Climactic Turnaround
    ['F#2', 'G2', 'C3', 'F#2', 'G2', 'F#2', 'C3', 'F#2']
  ];

  for (let bar = 0; bar < 8; bar++) {
    const notes = bassRiffs[bar];
    for (let i = 0; i < 8; i++) {
      const idx = bar * 16 + i * 2;
      bassSteps[idx] = {
        note: notes[i],
        duration: 0.35,
        velocity: (i % 2 === 0) ? 0.98 : 0.85
      };
    }
  }

  // 2. Choir-Like Dark Pad (3 detuned sawtooths with formant-like resonance)
  const padSteps = new Array(totalSteps).fill(null);
  const padVoicings = [
    ['F#3', 'A3', 'C#4'],       // Bar 1: F#m
    ['G3', 'B3', 'D4'],         // Bar 2: G (Minor 2nd)
    ['C4', 'Eb4', 'F#4'],       // Bar 3: Cdim (Tritone!)
    ['F#3', 'A3', 'C#4'],       // Bar 4: F#m
    ['B3', 'D4', 'F#4'],        // Bar 5: Bm
    ['G3', 'B3', 'D4'],         // Bar 6: G
    ['E3', 'G3', 'Bb3'],        // Bar 7: Edim
    ['F#3', 'G3', 'C#4']        // Bar 8: F#sus(b2)
  ];
  for (let bar = 0; bar < 8; bar++) {
    padSteps[bar * 16] = {
      note: padVoicings[bar][0], // root
      degrees: [0, 2, 4],
      duration: 3.9,
      velocity: 0.72
    };
  }

  // 3. Lead: Searing Aggressive Lead Melody (Cutting through full-health arena)
  const leadSteps = new Array(totalSteps).fill(null);
  const leadRiff = [
    // Bar 1 (F#m Attack)
    { bar: 0, step: 0, note: 'C#5', duration: 0.6, velocity: 0.98 },
    { bar: 0, step: 4, note: 'D5', duration: 0.4, velocity: 0.92 },
    { bar: 0, step: 8, note: 'C#5', duration: 0.5, velocity: 0.95 },
    { bar: 0, step: 12, note: 'A4', duration: 0.5, velocity: 0.9 },
    // Bar 2 (G Minor-Second Strike)
    { bar: 1, step: 0, note: 'B4', duration: 0.7, velocity: 0.96 },
    { bar: 1, step: 6, note: 'G4', duration: 0.4, velocity: 0.9 },
    { bar: 1, step: 10, note: 'F#4', duration: 0.8, velocity: 0.94 },
    // Bar 3 (C Tritone Dissonance!)
    { bar: 2, step: 0, note: 'C5', duration: 0.9, velocity: 1.0 },   // TRITONE C!
    { bar: 2, step: 6, note: 'Bb4', duration: 0.4, velocity: 0.92 },
    { bar: 2, step: 10, note: 'A4', duration: 0.7, velocity: 0.95 },
    // Bar 4 (Relentless run)
    { bar: 3, step: 0, note: 'C#5', duration: 0.8, velocity: 0.98 },
    { bar: 3, step: 6, note: 'D5', duration: 0.5, velocity: 0.95 },
    { bar: 3, step: 10, note: 'E5', duration: 0.9, velocity: 1.0 },
    // Bar 5 (Climax High Octave)
    { bar: 4, step: 0, note: 'F#5', duration: 0.9, velocity: 1.0 },
    { bar: 4, step: 6, note: 'E5', duration: 0.4, velocity: 0.92 },
    { bar: 4, step: 10, note: 'D5', duration: 0.7, velocity: 0.95 },
    // Bar 6 (Minor-second G5 snap)
    { bar: 5, step: 0, note: 'G5', duration: 0.8, velocity: 1.0 },   // High G5 minor-second!
    { bar: 5, step: 6, note: 'F#5', duration: 0.5, velocity: 0.95 },
    { bar: 5, step: 10, note: 'D5', duration: 0.7, velocity: 0.92 },
    // Bar 7 (Tritone C5 stab)
    { bar: 6, step: 0, note: 'C5', duration: 0.8, velocity: 0.98 },
    { bar: 6, step: 6, note: 'B4', duration: 0.4, velocity: 0.92 },
    { bar: 6, step: 10, note: 'A#4', duration: 0.7, velocity: 0.95 },
    // Bar 8 (Grand Apocalyptic Cadence)
    { bar: 7, step: 0, note: 'C#5', duration: 0.6, velocity: 1.0 },
    { bar: 7, step: 4, note: 'D5', duration: 0.5, velocity: 0.98 },
    { bar: 7, step: 8, note: 'C5', duration: 0.7, velocity: 1.0 },  // Final Tritone snap
    { bar: 7, step: 12, note: 'F#5', duration: 1.2, velocity: 1.0 }
  ];
  leadRiff.forEach(note => {
    leadSteps[note.bar * 16 + note.step] = {
      note: note.note,
      duration: note.duration,
      velocity: note.velocity
    };
  });

  // 4. Arpeggiator: Searing 16th-note pulse (Layer 1)
  const arpSteps = new Array(totalSteps).fill(null);
  const arpNotes = ['F#3', 'G3', 'C4', 'C#4', 'E4', 'C#4', 'C4', 'G3'];
  for (let bar = 0; bar < 8; bar++) {
    for (let s = 0; s < 16; s++) {
      if (s % 2 === 0) {
        const n = arpNotes[(s / 2) % arpNotes.length];
        arpSteps[bar * 16 + s] = { note: n, duration: 0.18, velocity: 0.62 };
      }
    }
  }

  // 5. Orchestral Stabs: Tritone & Minor-Second Accents (Layer 2)
  const stabSteps = new Array(totalSteps).fill(null);
  const stabs = [
    { bar: 0, step: 4, note: 'C4', duration: 0.22, velocity: 0.85 },   // Tritone
    { bar: 0, step: 12, note: 'G4', duration: 0.22, velocity: 0.88 },  // Minor 2nd
    { bar: 1, step: 4, note: 'C#4', duration: 0.22, velocity: 0.85 },
    { bar: 1, step: 12, note: 'G4', duration: 0.22, velocity: 0.88 },
    { bar: 2, step: 4, note: 'C4', duration: 0.3, velocity: 0.95 },   // Tritone hit
    { bar: 2, step: 12, note: 'C4', duration: 0.3, velocity: 0.95 },
    { bar: 3, step: 4, note: 'G4', duration: 0.25, velocity: 0.9 },
    { bar: 3, step: 12, note: 'F#4', duration: 0.25, velocity: 0.9 },
    { bar: 4, step: 4, note: 'C5', duration: 0.25, velocity: 0.95 },
    { bar: 4, step: 12, note: 'G4', duration: 0.25, velocity: 0.9 },
    { bar: 5, step: 4, note: 'C5', duration: 0.25, velocity: 0.95 },
    { bar: 5, step: 12, note: 'G5', duration: 0.28, velocity: 0.98 },
    { bar: 6, step: 4, note: 'C4', duration: 0.28, velocity: 0.95 },
    { bar: 6, step: 12, note: 'C5', duration: 0.3, velocity: 0.98 },
    { bar: 7, step: 4, note: 'G4', duration: 0.25, velocity: 0.92 },
    { bar: 7, step: 12, note: 'C4', duration: 0.35, velocity: 1.0 }
  ];
  stabs.forEach(st => {
    stabSteps[st.bar * 16 + st.step] = { note: st.note, duration: st.duration, velocity: st.velocity };
  });

  // 6. Drums & Percussion: Double-time kick (Layer 0), Relentless Snare (Layer 2), Hats (Layers 1 & 3), Apocalyptic fills (Layer 3)
  const drumSteps = new Array(totalSteps).fill(null);
  const snareSteps = new Array(totalSteps).fill(null);
  const hihatSteps = new Array(totalSteps).fill(null);
  const hihatFastSteps = new Array(totalSteps).fill(null);
  const fillSteps = new Array(totalSteps).fill(null);

  for (let bar = 0; bar < 8; bar++) {
    for (let s = 0; s < 16; s++) {
      const idx = bar * 16 + s;

      // Double-time kick on 0, 4, 8, 12 + double kick on 14 (Layer 0)
      if (s === 0 || s === 4 || s === 8 || s === 12) {
        drumSteps[idx] = { type: 'kick', startFreq: 130, endFreq: 45, decay: 0.15, velocity: 1.0 };
      } else if (s === 14 || (bar % 2 === 1 && s === 6)) {
        drumSteps[idx] = { type: 'kick', startFreq: 110, endFreq: 40, decay: 0.11, velocity: 0.88 };
      }

      // Relentless snare on 4 and 12 (Layer 2) + ghost snare on 10
      if (s === 4 || s === 12) {
        snareSteps[idx] = { type: 'snare', velocity: 0.98 };
      } else if (s === 10 && bar % 2 === 1) {
        snareSteps[idx] = { type: 'snare', velocity: 0.65 };
      }

      // 8th-note driving Hats (Layer 1)
      if (s % 2 === 0) {
        hihatSteps[idx] = { type: 'hat', velocity: 0.45 };
      }

      // 16th-note relentless Hats (Layer 3)
      if (s % 2 === 1) {
        hihatFastSteps[idx] = { type: 'hat', velocity: 0.32 };
      }

      // Crash on every bar downbeat! (Layer 3 requirement)
      if (s === 0) {
        fillSteps[idx] = { type: 'crash', velocity: (bar === 0 || bar === 4) ? 1.0 : 0.8 };
      }

      // Apocalyptic fills on Bar 4 and Bar 8 (Layer 3)
      if (bar === 3 && s >= 10) {
        const toms = ['tom_hi', 'snare', 'tom_mid', 'snare', 'tom_low', 'crash'];
        fillSteps[idx] = { type: toms[s - 10], velocity: 0.98 };
      } else if (bar === 7 && s >= 8) {
        const toms = ['snare', 'tom_hi', 'snare', 'tom_mid', 'snare', 'tom_low', 'snare', 'crash'];
        fillSteps[idx] = { type: toms[s - 8], velocity: 1.0 };
      }
    }
  }

  return {
    id: 'battle-inferno',
    title: 'دوئل دژ جهنمی · آتش واپسین (2x XP)',
    bpm: 128,
    root: 'F#2',
    scale: FS_PHRYGIAN,
    loopLengthBars: 8,
    chordProgression: CHORD_PROGRESSION,
    swing: 0,
    reverbSend: 0.22,
    masterGain: 0.42,

    instruments: {
      lead: {
        oscillator: ['sawtooth', 'sawtooth'],
        detune: [-8, 8],
        distortion: 26, // Searing distortion bite
        envelope: {
          attack: 0.01,
          decay: 0.25,
          sustain: 0.6,
          release: 0.18
        },
        filter: {
          type: 'lowpass',
          cutoff: 3600,
          envAmount: 2500,
          resonance: 2.2
        },
        gain: 0.36
      },

      stabs: {
        oscillator: ['sawtooth', 'square'],
        detune: [-10, 10],
        distortion: 22,
        envelope: {
          attack: 0.008,
          decay: 0.18,
          sustain: 0.3,
          release: 0.12
        },
        filter: {
          type: 'lowpass',
          cutoff: 3200,
          resonance: 1.8
        },
        gain: 0.32
      },

      pad: {
        oscillator: ['sawtooth', 'sawtooth', 'sawtooth'],
        detune: [-12, 0, 12],
        envelope: {
          attack: 0.5,
          decay: 0.4,
          sustain: 0.8,
          release: 1.0
        },
        filter: {
          type: 'bandpass',
          cutoff: 850,
          resonance: 2.0 // Vocal formant-like choir feel
        },
        gain: 0.26
      },

      bass: {
        oscillator: ['sawtooth', 'sawtooth'],
        detune: [-6, 6],
        distortion: 30, // Heavily distorted bass
        envelope: {
          attack: 0.01,
          decay: 0.22,
          sustain: 0.55,
          release: 0.12
        },
        filter: {
          type: 'lowpass',
          cutoff: 650,
          resonance: 2.0
        },
        gain: 0.44
      },

      arp: {
        oscillator: 'sawtooth',
        detune: 0,
        envelope: {
          attack: 0.005,
          decay: 0.12,
          sustain: 0.1,
          release: 0.06
        },
        filter: {
          type: 'lowpass',
          cutoff: 2400,
          resonance: 1.6
        },
        gain: 0.22
      },

      drums: {
        kick: {
          startFreq: 130,
          endFreq: 42,
          decay: 0.15,
          gain: 0.85
        },
        snare: {
          cutoff: 4200,
          decay: 0.15,
          gain: 0.8
        },
        hat: {
          cutoff: 9000,
          decay: 0.035,
          gain: 0.3
        },
        crash: {
          cutoff: 5000,
          decay: 1.5,
          gain: 0.55
        },
        gain: 0.52
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
      stabs: stabSteps,
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
      stabs: 2,
      hihat_fast: 3,
      fills: 3
    }
  };
});

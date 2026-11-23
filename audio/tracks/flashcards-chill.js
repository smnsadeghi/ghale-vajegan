/**
 * ============================================================================
 * Track Config: "flashcards-chill"
 * ============================================================================
 * Calm, ambient study music designed for the Flashcard / Vocabulary screen.
 * - Key: D Dorian (modal, gentle, contemplative)
 * - Tempo: 68 BPM with light natural swing (0.16)
 * - Structure: 16-bar seamless loop with evolving chords & sparse relaxing lead
 * - Instrumentation:
 *     * Pad: Dual detuned triangle/sine oscillators with warm lowpass & slow attack
 *     * Lead: Electric-piano-style sine with soft decay & subtle pitch vibrato
 *     * Bass: Warm sub-sine bass on downbeats
 *     * Drums: Very quiet kick & soft brushed noise hi-hat with swing
 *     * Vinyl: Low-level atmospheric crackle texture
 * - Master Gain: 0.20 (gentle background volume, non-intrusive)
 * ============================================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AudioTracks = root.AudioTracks || {};
    root.AudioTracks['flashcards-chill'] = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // D Dorian scale semitone intervals relative to root D3
  // D (0), E (2), F (3), G (5), A (7), B (9), C (10)
  const D_DORIAN_SCALE = [0, 2, 3, 5, 7, 9, 10];

  // 16-bar chord progression (scale degrees for pad voicings & bass root)
  // Bars 1-4:   Dm9 -> Em9 -> Gmaj7 -> A7sus4
  // Bars 5-8:   Dm9 -> Em9 -> Bm7   -> A7sus4
  // Bars 9-12:  Fmaj7 -> G7 -> Dm7  -> Am7
  // Bars 13-16: Em9 -> Gmaj7 -> A7sus4 -> Dm9
  const CHORD_PROGRESSION = [
    0, // Bar 1: D
    1, // Bar 2: E
    3, // Bar 3: G
    4, // Bar 4: A
    0, // Bar 5: D
    1, // Bar 6: E
    5, // Bar 7: B
    4, // Bar 8: A
    2, // Bar 9: F
    3, // Bar 10: G
    0, // Bar 11: D
    4, // Bar 12: A
    1, // Bar 13: E
    3, // Bar 14: G
    4, // Bar 15: A
    0  // Bar 16: D (resolves to loop start)
  ];

  // Build 16-bar pad pattern (lush sustained chord voicings per bar)
  // Each bar has 16 16th-note steps. The chord triggers on step 0 and holds.
  const padSteps = [];
  const padVoicings = [
    [0, 2, 4, 6],       // Bar 1: Dm7/Dm9 (D, F, A, C)
    [1, 3, 5, 7],       // Bar 2: Em7 (E, G, B, D)
    [3, 5, 7, 9],       // Bar 3: Gmaj7 (G, B, D, F)
    [4, 0, 3, 4],       // Bar 4: A7sus4 (A, D, G, A)
    [0, 2, 4, 6],       // Bar 5: Dm9
    [1, 3, 5, 7],       // Bar 6: Em9
    [5, 0, 2, 4],       // Bar 7: Bm7 (B, D, F, A)
    [4, 0, 3, 4],       // Bar 8: A7sus4
    [2, 4, 6, 8],       // Bar 9: Fmaj7 (F, A, C, E)
    [3, 5, 7, 9],       // Bar 10: G7 (G, B, D, F)
    [0, 2, 4, 6],       // Bar 11: Dm7
    [4, 6, 8, 10],      // Bar 12: Am7 (A, C, E, G)
    [1, 3, 5, 7],       // Bar 13: Em9
    [3, 5, 7, 9],       // Bar 14: Gmaj7
    [4, 0, 3, 4],       // Bar 15: A7sus4
    [0, 2, 4, 7]        // Bar 16: Dm(add9)
  ];

  for (let bar = 0; bar < 16; bar++) {
    padSteps.push({
      degrees: padVoicings[bar],
      duration: 3.8,     // Sustained for nearly full bar
      velocity: 0.72
    });
    for (let s = 1; s < 16; s++) {
      padSteps.push(null);
    }
  }

  // Build 16-bar bass pattern (soft sine bass on beats 1 and 3)
  const bassSteps = [];
  const bassRoots = [
    0, 1, 3, 4,
    0, 1, 5, 4,
    2, 3, 0, 4,
    1, 3, 4, 0
  ];
  for (let bar = 0; bar < 16; bar++) {
    const rootDeg = bassRoots[bar];
    for (let s = 0; s < 16; s++) {
      if (s === 0) {
        bassSteps.push({ degree: rootDeg, octave: -1, duration: 1.2, velocity: 0.85 });
      } else if (s === 8) {
        // Fifth on beat 3
        bassSteps.push({ degree: (rootDeg + 4) % 7, octave: -1, duration: 0.9, velocity: 0.65 });
      } else if (s === 14 && bar % 2 === 1) {
        // Gentle transition note at end of every 2 bars
        bassSteps.push({ degree: (rootDeg + 2) % 7, octave: -1, duration: 0.4, velocity: 0.5 });
      } else {
        bassSteps.push(null);
      }
    }
  }

  // Build 16-bar sparse relaxing lead melody (Electric-piano style)
  // Spaced out with plenty of silence/breath
  const leadSteps = new Array(256).fill(null);
  const sparseMelody = [
    // Bar 1: Intro phrase
    { bar: 0, step: 4, degree: 4, octave: 1, duration: 1.0, velocity: 0.7 },   // A4
    { bar: 0, step: 10, degree: 6, octave: 1, duration: 0.8, velocity: 0.65 }, // C5
    // Bar 2
    { bar: 1, step: 2, degree: 5, octave: 1, duration: 1.2, velocity: 0.7 },   // B4
    { bar: 1, step: 12, degree: 3, octave: 1, duration: 0.8, velocity: 0.6 },  // G4
    // Bar 3
    { bar: 2, step: 4, degree: 4, octave: 1, duration: 1.4, velocity: 0.75 },  // A4
    // Bar 4
    { bar: 3, step: 0, degree: 3, octave: 1, duration: 0.8, velocity: 0.6 },   // G4
    { bar: 3, step: 6, degree: 2, octave: 1, duration: 1.2, velocity: 0.65 },  // F4
    // Bar 5
    { bar: 4, step: 4, degree: 0, octave: 1, duration: 1.0, velocity: 0.7 },   // D4
    { bar: 4, step: 10, degree: 2, octave: 1, duration: 0.8, velocity: 0.65 }, // F4
    // Bar 6
    { bar: 5, step: 2, degree: 3, octave: 1, duration: 1.2, velocity: 0.7 },   // G4
    { bar: 5, step: 10, degree: 4, octave: 1, duration: 0.9, velocity: 0.7 },  // A4
    // Bar 7
    { bar: 6, step: 4, degree: 6, octave: 1, duration: 1.5, velocity: 0.75 },  // C5
    // Bar 8
    { bar: 7, step: 2, degree: 5, octave: 1, duration: 1.0, velocity: 0.65 },  // B4
    { bar: 7, step: 8, degree: 4, octave: 1, duration: 1.2, velocity: 0.7 },   // A4
    // Bar 9 (Second half: higher register response)
    { bar: 8, step: 4, degree: 7, octave: 1, duration: 1.2, velocity: 0.75 },  // D5
    { bar: 8, step: 12, degree: 6, octave: 1, duration: 0.8, velocity: 0.65 }, // C5
    // Bar 10
    { bar: 9, step: 2, degree: 5, octave: 1, duration: 1.2, velocity: 0.7 },   // B4
    { bar: 9, step: 10, degree: 3, octave: 1, duration: 0.8, velocity: 0.6 },  // G4
    // Bar 11
    { bar: 10, step: 4, degree: 4, octave: 1, duration: 1.4, velocity: 0.7 },  // A4
    // Bar 12
    { bar: 11, step: 2, degree: 3, octave: 1, duration: 0.8, velocity: 0.6 },  // G4
    { bar: 11, step: 8, degree: 2, octave: 1, duration: 1.0, velocity: 0.65 }, // F4
    // Bar 13
    { bar: 12, step: 4, degree: 1, octave: 1, duration: 1.0, velocity: 0.65 }, // E4
    { bar: 12, step: 12, degree: 2, octave: 1, duration: 0.8, velocity: 0.65 },// F4
    // Bar 14
    { bar: 13, step: 4, degree: 3, octave: 1, duration: 1.4, velocity: 0.7 },  // G4
    // Bar 15
    { bar: 14, step: 2, degree: 4, octave: 1, duration: 1.0, velocity: 0.7 },  // A4
    { bar: 14, step: 10, degree: 6, octave: 1, duration: 0.8, velocity: 0.65 },// C5
    // Bar 16 (Resolving)
    { bar: 15, step: 4, degree: 7, octave: 1, duration: 2.0, velocity: 0.75 }  // D5
  ];

  sparseMelody.forEach(item => {
    const idx = item.bar * 16 + item.step;
    if (idx < 256) {
      leadSteps[idx] = {
        degree: item.degree,
        octave: item.octave,
        duration: item.duration,
        velocity: item.velocity
      };
    }
  });

  // Build 16-bar drum pattern (minimal brushed hi-hat & soft muted kick)
  const drumSteps = [];
  for (let bar = 0; bar < 16; bar++) {
    for (let s = 0; s < 16; s++) {
      const isKick = (s === 0 || (bar % 4 === 3 && s === 10));
      // Brushed hi-hat on every 8th note (steps 0, 2, 4, 6, 8, 10, 12, 14)
      const isHat = (s % 2 === 0);
      const isGhostHat = (s % 4 === 3 && bar % 2 === 1);

      if (isKick && isHat) {
        drumSteps.push({ type: 'kick_and_hat', velocity: 0.45 });
      } else if (isKick) {
        drumSteps.push({ type: 'kick', velocity: 0.5 });
      } else if (isHat) {
        // Subtle dynamics: offbeat hats slightly accented
        const vel = (s % 4 === 2) ? 0.35 : 0.22;
        drumSteps.push({ type: 'hat', velocity: vel });
      } else if (isGhostHat) {
        drumSteps.push({ type: 'hat', velocity: 0.12 });
      } else {
        drumSteps.push(null);
      }
    }
  }

  // Faint vinyl crackle layer (intermittent subtle crackle events)
  const vinylSteps = [];
  for (let i = 0; i < 256; i++) {
    // Sparse random crackle clicks
    if (i % 8 === 3 || i % 16 === 11) {
      vinylSteps.push({ type: 'crackle', velocity: 0.18 });
    } else {
      vinylSteps.push(null);
    }
  }

  return {
    id: 'flashcards-chill',
    title: 'Flashcard Chill Study',
    bpm: 68,
    root: 'D3',              // 146.83 Hz base
    scale: D_DORIAN_SCALE,
    loopLengthBars: 16,
    chordProgression: CHORD_PROGRESSION,
    swing: 0.16,             // Light natural swing
    reverbSend: 0.38,        // Spacious, lush reverb
    masterGain: 0.20,        // Quiet, unobtrusive background volume

    instruments: {
      pad: {
        oscillator: ['triangle', 'sine'],
        detune: [-6, 6],
        envelope: {
          attack: 0.75,
          decay: 0.45,
          sustain: 0.75,
          release: 1.1
        },
        filter: {
          type: 'lowpass',
          cutoff: 680,
          resonance: 0.9
        },
        gain: 0.18
      },

      lead: {
        oscillator: 'sine',
        detune: 0,
        envelope: {
          attack: 0.02,
          decay: 0.38,
          sustain: 0.15,
          release: 0.42
        },
        filter: {
          type: 'lowpass',
          cutoff: 1900,
          resonance: 0.7
        },
        vibrato: {
          rate: 5.2,
          depth: 3.5
        },
        gain: 0.22
      },

      bass: {
        oscillator: 'sine',
        detune: 0,
        envelope: {
          attack: 0.04,
          decay: 0.3,
          sustain: 0.65,
          release: 0.35
        },
        filter: {
          type: 'lowpass',
          cutoff: 220,
          resonance: 0.4
        },
        gain: 0.28
      },

      drums: {
        kick: {
          startFreq: 75,
          endFreq: 32,
          decay: 0.11,
          gain: 0.35
        },
        hat: {
          cutoff: 7500,
          decay: 0.038,
          gain: 0.18
        },
        gain: 0.25
      },

      vinyl: {
        cutoff: 4200,
        decay: 0.015,
        gain: 0.04
      }
    },

    patterns: {
      pad: padSteps,
      lead: leadSteps,
      bass: bassSteps,
      drums: drumSteps,
      vinyl: vinylSteps
    },

    layers: {
      pad: 1,
      bass: 1,
      lead: 2,
      drums: 2,
      vinyl: 1
    }
  };
});

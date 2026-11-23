/**
 * ============================================================================
 * Track Config: "battle-kenayeh" (World 2: قلمرو کنایه - Realm of Kenayeh)
 * ============================================================================
 * Sly, rhythmic and playful-but-epic battle theme for the Realm of Kenayeh.
 * - Key: E Dorian [0, 2, 3, 5, 7, 9, 10] (E, F#, G, A, B, C#, D)
 * - Tempo: 112 BPM
 * - Style: Syncopated staccato lead, off-beat bass groove, clever call-and-response
 *   between lead phrases and fast arpeggios, crisp snare backbeat on 2 & 4.
 * - Structure: 8-bar loop (Em7 - D - C#m7b5 - Bm7 - Em7 - A7 - Gmaj7 - B7)
 * - Layers:
 *     * Layer 0: bass + kick + pad + lead
 *     * Layer 1: hi-hat 8ths + arp (answers lead)
 *     * Layer 2: snare backbeat + counter-melody
 *     * Layer 3: 16th hi-hats + crash + bar-end fills
 * ============================================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AudioTracks = root.AudioTracks || {};
    root.AudioTracks['battle-kenayeh'] = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // E Dorian: E(0), F#(2), G(3), A(5), B(7), C#(9), D(10)
  const E_DORIAN = [0, 2, 3, 5, 7, 9, 10];

  // 8-bar chord progression: Em7(0) -> D(6) -> C#dim(5) -> Bm(4) -> Em7(0) -> A7(3) -> Gmaj7(2) -> B7(4)
  const CHORD_PROGRESSION = [0, 6, 5, 4, 0, 3, 2, 4];

  const totalSteps = 128;

  // 1. Bass: Sly OFF-BEAT groove (hits on syncopated off-beats: steps 2, 6, 10, 14)
  const bassSteps = new Array(totalSteps).fill(null);
  const bassRoots = [
    [0, 7, 0, 10],   // Bar 1: Em7 (E, B, E, D)
    [6, 2, 6, 9],    // Bar 2: D (D, A, D, C#)
    [5, 0, 5, 7],    // Bar 3: C#m7b5 (C#, E, C#, B)
    [4, 1, 4, 7],    // Bar 4: Bm7 (B, F#, B, D)
    [0, 7, 0, 10],   // Bar 5: Em7
    [3, 0, 3, 5],    // Bar 6: A7 (A, E, A, C#)
    [2, 6, 2, 9],    // Bar 7: Gmaj7 (G, D, G, F#)
    [4, 1, 4, 11]    // Bar 8: B7 (B, F#, B, D#)
  ];

  for (let bar = 0; bar < 8; bar++) {
    const riff = bassRoots[bar];
    // Off-beat hits: step 2 (and of 1), step 6 (and of 2), step 10 (and of 3), step 14 (and of 4)
    const offbeatSteps = [2, 6, 10, 14];
    for (let i = 0; i < 4; i++) {
      const idx = bar * 16 + offbeatSteps[i];
      bassSteps[idx] = {
        degree: riff[i],
        octave: -1,
        duration: 0.28,
        velocity: (i % 2 === 0) ? 0.94 : 0.82
      };
    }
  }

  // 2. Pad: Staccato brassy pad on downbeats
  const padSteps = new Array(totalSteps).fill(null);
  const padVoicings = [
    [0, 2, 4],  // Bar 1: Em (E, G, B)
    [6, 1, 3],  // Bar 2: D (D, F#, A)
    [5, 0, 2],  // Bar 3: C#m7b5
    [4, 6, 1],  // Bar 4: Bm (B, D, F#)
    [0, 2, 4],  // Bar 5: Em
    [3, 5, 0],  // Bar 6: A (A, C#, E)
    [2, 4, 6],  // Bar 7: G (G, B, D)
    [4, 6, 1]   // Bar 8: B7 (B, D#, F#)
  ];
  for (let bar = 0; bar < 8; bar++) {
    // Punctuating chord on step 0 and step 8
    padSteps[bar * 16] = {
      degrees: padVoicings[bar],
      octave: 0,
      duration: 1.8,
      velocity: 0.65
    };
    padSteps[bar * 16 + 8] = {
      degrees: padVoicings[bar],
      octave: 0,
      duration: 1.4,
      velocity: 0.55
    };
  }

  // 3. Lead: Syncopated staccato sly heroic melody (Call)
  // Leaves space in steps 8-15 for the Arpeggiator Response!
  const leadSteps = new Array(totalSteps).fill(null);
  const leadPhrases = [
    // Bar 1 (Call: steps 0-7)
    { bar: 0, step: 0, degree: 7, octave: 1, duration: 0.2, velocity: 0.95 },  // B5
    { bar: 0, step: 3, degree: 5, octave: 1, duration: 0.18, velocity: 0.9 },  // A5
    { bar: 0, step: 6, degree: 7, octave: 1, duration: 0.25, velocity: 0.92 }, // B5
    // Bar 2 (Call: steps 0-7)
    { bar: 1, step: 0, degree: 9, octave: 1, duration: 0.22, velocity: 0.95 }, // C#6
    { bar: 1, step: 3, degree: 7, octave: 1, duration: 0.18, velocity: 0.88 }, // B5
    { bar: 1, step: 6, degree: 5, octave: 1, duration: 0.25, velocity: 0.9 },  // A5
    // Bar 3 (Call: steps 0-7)
    { bar: 2, step: 0, degree: 5, octave: 1, duration: 0.22, velocity: 0.92 }, // A5
    { bar: 2, step: 3, degree: 3, octave: 1, duration: 0.18, velocity: 0.88 }, // G5
    { bar: 2, step: 6, degree: 5, octave: 1, duration: 0.25, velocity: 0.9 },  // A5
    // Bar 4 (Turnaround: steps 0-7)
    { bar: 3, step: 0, degree: 7, octave: 1, duration: 0.35, velocity: 0.96 }, // B5
    { bar: 3, step: 4, degree: 4, octave: 1, duration: 0.22, velocity: 0.88 }, // F#5
    { bar: 3, step: 6, degree: 2, octave: 1, duration: 0.25, velocity: 0.85 }, // E5
    // Bar 5 (Climax Call: steps 0-7)
    { bar: 4, step: 0, degree: 10, octave: 1, duration: 0.25, velocity: 0.98 },// D6
    { bar: 4, step: 3, degree: 9, octave: 1, duration: 0.18, velocity: 0.9 },  // C#6
    { bar: 4, step: 6, degree: 7, octave: 1, duration: 0.28, velocity: 0.94 }, // B5
    // Bar 6 (Call: steps 0-7)
    { bar: 5, step: 0, degree: 9, octave: 1, duration: 0.22, velocity: 0.92 }, // C#6
    { bar: 5, step: 3, degree: 7, octave: 1, duration: 0.18, velocity: 0.88 }, // B5
    { bar: 5, step: 6, degree: 5, octave: 1, duration: 0.25, velocity: 0.9 },  // A5
    // Bar 7 (Call: steps 0-7)
    { bar: 6, step: 0, degree: 7, octave: 1, duration: 0.22, velocity: 0.9 },  // B5
    { bar: 6, step: 3, degree: 5, octave: 1, duration: 0.18, velocity: 0.86 }, // A5
    { bar: 6, step: 6, degree: 3, octave: 1, duration: 0.25, velocity: 0.88 }, // G5
    // Bar 8 (Grand sly resolution)
    { bar: 7, step: 0, degree: 4, octave: 1, duration: 0.3, velocity: 0.94 },  // F#5
    { bar: 7, step: 4, degree: 2, octave: 1, duration: 0.35, velocity: 0.92 }, // E5
    { bar: 7, step: 6, degree: 0, octave: 1, duration: 0.5, velocity: 0.96 }   // E4
  ];
  leadPhrases.forEach(p => {
    leadSteps[p.bar * 16 + p.step] = {
      degree: p.degree,
      octave: p.octave,
      duration: p.duration,
      velocity: p.velocity
    };
  });

  // 4. Arpeggiator (Response): Answers on steps 8, 10, 12, 14 of each bar! (Layer 1)
  const arpSteps = new Array(totalSteps).fill(null);
  const arpAnswers = [
    [0, 2, 4, 7],   // Bar 1 response (E, G, B, E)
    [6, 1, 3, 6],   // Bar 2 response (D, F#, A, D)
    [5, 0, 2, 5],   // Bar 3 response
    [4, 6, 1, 4],   // Bar 4 response
    [0, 2, 4, 7],   // Bar 5 response
    [3, 5, 0, 3],   // Bar 6 response
    [2, 4, 6, 2],   // Bar 7 response
    [4, 6, 1, 4]    // Bar 8 response
  ];
  for (let bar = 0; bar < 8; bar++) {
    const ans = arpAnswers[bar];
    const respSteps = [8, 10, 12, 14];
    for (let i = 0; i < 4; i++) {
      arpSteps[bar * 16 + respSteps[i]] = {
        degree: ans[i],
        octave: 0,
        duration: 0.16,
        velocity: 0.65
      };
    }
  }

  // 5. Counter-melody / Octave Flourishes (Layer 2)
  const counterSteps = new Array(totalSteps).fill(null);
  for (let bar = 0; bar < 8; bar++) {
    // Upper octave counter response on steps 9, 11, 13
    counterSteps[bar * 16 + 9] = { degree: 7, octave: 1, duration: 0.18, velocity: 0.68 };
    counterSteps[bar * 16 + 11] = { degree: 9, octave: 1, duration: 0.18, velocity: 0.72 };
    counterSteps[bar * 16 + 13] = { degree: 10, octave: 1, duration: 0.22, velocity: 0.75 };
  }

  // 6. Drums & Percussion: Kick (Layer 0), Snare on 2 & 4 (Layer 2), Hats (Layers 1 & 3), Fills (Layer 3)
  const drumSteps = new Array(totalSteps).fill(null);
  const snareSteps = new Array(totalSteps).fill(null);
  const hihatSteps = new Array(totalSteps).fill(null);
  const hihatFastSteps = new Array(totalSteps).fill(null);
  const fillSteps = new Array(totalSteps).fill(null);

  for (let bar = 0; bar < 8; bar++) {
    for (let s = 0; s < 16; s++) {
      const idx = bar * 16 + s;

      // Kick on 0, 8, 10 (Layer 0)
      if (s === 0 || s === 8) {
        drumSteps[idx] = { type: 'kick', startFreq: 110, endFreq: 42, decay: 0.16, velocity: 0.92 };
      } else if (s === 10) {
        drumSteps[idx] = { type: 'kick', startFreq: 95, endFreq: 38, decay: 0.12, velocity: 0.75 };
      }

      // Snare on 4 and 12 (Beats 2 and 4 backbeat - Layer 2)
      if (s === 4 || s === 12) {
        snareSteps[idx] = { type: 'snare', velocity: 0.9 };
      }

      // 8th-note Hi-hats (Layer 1)
      if (s % 2 === 0) {
        hihatSteps[idx] = { type: 'hat', velocity: (s % 4 === 2) ? 0.45 : 0.3 };
      }

      // 16th-note Hi-hats (Layer 3)
      if (s % 2 === 1) {
        hihatFastSteps[idx] = { type: 'hat', velocity: 0.22 };
      }

      // Crash on Bar 1 & Bar 5 (Layer 3)
      if ((bar === 0 || bar === 4) && s === 0) {
        fillSteps[idx] = { type: 'crash', velocity: 0.9 };
      }

      // Bar-end fills on Bar 4 and Bar 8 (Layer 3)
      if (bar === 3 && s >= 10) {
        const toms = ['tom_hi', 'snare', 'tom_mid', 'snare', 'tom_low', 'snare'];
        fillSteps[idx] = { type: toms[s - 10], velocity: 0.85 };
      } else if (bar === 7 && s >= 8) {
        const toms = ['tom_hi', 'tom_hi', 'tom_mid', 'tom_mid', 'tom_low', 'snare', 'snare', 'crash'];
        fillSteps[idx] = { type: toms[s - 8], velocity: 0.92 };
      }
    }
  }

  return {
    id: 'battle-kenayeh',
    title: 'نبرد قلمرو کنایه · طنز و رندی',
    bpm: 112,
    root: 'E2',
    scale: E_DORIAN,
    loopLengthBars: 8,
    chordProgression: CHORD_PROGRESSION,
    swing: 0.05,
    reverbSend: 0.25,
    masterGain: 0.38,

    instruments: {
      lead: {
        oscillator: ['sawtooth', 'square'],
        detune: [-5, 5],
        envelope: {
          attack: 0.008, // Staccato bite
          decay: 0.16,
          sustain: 0.25,
          release: 0.12
        },
        filter: {
          type: 'lowpass',
          cutoff: 2800,
          resonance: 1.6
        },
        gain: 0.36
      },

      counter: {
        oscillator: 'square',
        detune: 0,
        envelope: {
          attack: 0.008,
          decay: 0.14,
          sustain: 0.2,
          release: 0.1
        },
        filter: {
          type: 'lowpass',
          cutoff: 3200,
          resonance: 1.2
        },
        gain: 0.24
      },

      pad: {
        oscillator: ['sawtooth', 'sawtooth'],
        detune: [-6, 6],
        envelope: {
          attack: 0.08,
          decay: 0.3,
          sustain: 0.5,
          release: 0.4
        },
        filter: {
          type: 'lowpass',
          cutoff: 900,
          resonance: 1.3
        },
        gain: 0.24
      },

      bass: {
        oscillator: ['sawtooth', 'square'],
        detune: [-4, 4],
        envelope: {
          attack: 0.012,
          decay: 0.18,
          sustain: 0.4,
          release: 0.12
        },
        filter: {
          type: 'lowpass',
          cutoff: 550,
          resonance: 1.8
        },
        gain: 0.40
      },

      arp: {
        oscillator: 'triangle',
        detune: 0,
        envelope: {
          attack: 0.006,
          decay: 0.12,
          sustain: 0.15,
          release: 0.08
        },
        filter: {
          type: 'lowpass',
          cutoff: 2200,
          resonance: 1.4
        },
        gain: 0.22
      },

      drums: {
        kick: {
          startFreq: 110,
          endFreq: 40,
          decay: 0.16,
          gain: 0.72
        },
        snare: {
          cutoff: 3800,
          decay: 0.13,
          gain: 0.68
        },
        hat: {
          cutoff: 8200,
          decay: 0.035,
          gain: 0.24
        },
        crash: {
          cutoff: 4800,
          decay: 1.2,
          gain: 0.42
        },
        gain: 0.46
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

/**
 * ============================================================================
 * Track Config: "battle-iham" (World 3: بیشه ایهام - Forest of Ambiguity)
 * ============================================================================
 * Mysterious, ambiguous and shifting battle theme for the Forest of Iham.
 * - Key: D Phrygian Dominant [0, 1, 4, 5, 7, 8, 10] (D, Eb, F#, G, A, Bb, C)
 * - Tempo: 104 BPM
 * - Concept: Melody deliberately alternates between Major 3rd (F#) and Minor 3rd (F)
 *   to symbolize "ایهام" (double meaning / two simultaneous perspectives).
 * - Structure: 8-bar loop
 * - Instrumentation:
 *     * Lead: Dual sine/triangle with subtle vibrato, floating between F# and F
 *     * Bass: Syncopated, lighter but relentless driving bass
 *     * Pad: Eerie mystical forest pad with resonant bandpass
 *     * Arp: Register-shifting exotic arpeggio (alternates lower & higher registers)
 *     * Counter: High octave mystery echo
 *     * Drums: Crisp syncopated kick, wooden snappy snare, brushed hats & mystic fills
 * - Layers:
 *     * Layer 0: bass + kick + pad + lead
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
    root.AudioTracks['battle-iham'] = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // D Phrygian Dominant scale: D(0), Eb(1), F#(4), G(5), A(7), Bb(8), C(10)
  const D_PHRYGIAN_DOM = [0, 1, 4, 5, 7, 8, 10];

  // 8-bar chord progression: D(0) -> Eb(1) -> Cm(6) -> D(0) -> Gm(3) -> Eb(1) -> F/A -> D(0)
  const CHORD_PROGRESSION = [0, 1, 6, 0, 3, 1, 6, 0];

  const totalSteps = 128;

  // 1. Bass: Syncopated, lighter but relentlessly driving
  const bassSteps = new Array(totalSteps).fill(null);
  const bassRiffs = [
    // Bar 1: D groove (Root + 5th + octave)
    [0, null, 0, null, 4, null, 0, 1],
    // Bar 2: Eb
    [1, null, 1, null, 5, null, 1, 0],
    // Bar 3: Cm
    [6, null, 6, null, 3, null, 6, 5],
    // Bar 4: D resolution
    [0, null, 0, 4, 0, null, 1, 0],
    // Bar 5: Gm
    [3, null, 3, null, 7, null, 3, 4],
    // Bar 6: Eb
    [1, null, 1, null, 5, null, 1, 0],
    // Bar 7: Cm / F
    [6, null, 6, null, 4, null, 6, 1],
    // Bar 8: D Turnaround
    [0, null, 0, 1, 0, 4, 1, 0]
  ];

  for (let bar = 0; bar < 8; bar++) {
    const riff = bassRiffs[bar];
    for (let i = 0; i < 8; i++) {
      const deg = riff[i];
      if (deg !== null) {
        const stepIdx = bar * 16 + i * 2;
        bassSteps[stepIdx] = {
          degree: deg,
          octave: -1,
          duration: 0.38,
          velocity: (i === 0) ? 0.9 : 0.76
        };
      }
    }
  }

  // 2. Pad: Eerie mystic pad with detuned saw & sine
  const padSteps = new Array(totalSteps).fill(null);
  const padVoicings = [
    [0, 2, 4],    // Bar 1: D (D, F#, A)
    [1, 3, 5],    // Bar 2: Eb (Eb, G, Bb)
    [6, 1, 3],    // Bar 3: Cm (C, Eb, G)
    [0, 2, 4],    // Bar 4: D (D, F#, A)
    [3, 5, 0],    // Bar 5: Gm (G, Bb, D)
    [1, 3, 5],    // Bar 6: Eb (Eb, G, Bb)
    [6, 1, 4],    // Bar 7: Cm/A
    [0, 2, 4]     // Bar 8: D (D, F#, A)
  ];
  for (let bar = 0; bar < 8; bar++) {
    padSteps[bar * 16] = {
      degrees: padVoicings[bar],
      octave: 0,
      duration: 3.8,
      velocity: 0.65
    };
  }

  // 3. Lead: The "Double Meaning" melody alternating between Major 3rd (F#4) and Minor 3rd (F4)
  const leadSteps = new Array(totalSteps).fill(null);
  const leadMelody = [
    // Bar 1: Opens with F#4 (Major 3rd)
    { bar: 0, step: 0, note: 'D4', duration: 0.6, velocity: 0.9 },
    { bar: 0, step: 4, note: 'F#4', duration: 0.8, velocity: 0.92 }, // Major 3rd
    { bar: 0, step: 10, note: 'A4', duration: 0.7, velocity: 0.88 },
    { bar: 0, step: 14, note: 'G4', duration: 0.4, velocity: 0.8 },

    // Bar 2: Shifts ambiguously to F4 (Minor 3rd) over the same implied root!
    { bar: 1, step: 0, note: 'F4', duration: 0.8, velocity: 0.94 },  // Minor 3rd "ایهام"
    { bar: 1, step: 6, note: 'Eb4', duration: 0.5, velocity: 0.85 },
    { bar: 1, step: 10, note: 'D4', duration: 0.9, velocity: 0.9 },

    // Bar 3: Ascending mystery
    { bar: 2, step: 0, note: 'C4', duration: 0.6, velocity: 0.85 },
    { bar: 2, step: 4, note: 'Eb4', duration: 0.6, velocity: 0.88 },
    { bar: 2, step: 8, note: 'G4', duration: 0.8, velocity: 0.9 },
    { bar: 2, step: 12, note: 'Bb4', duration: 0.6, velocity: 0.85 },

    // Bar 4: Contrast returns to F#4 with vibrato
    { bar: 3, step: 0, note: 'A4', duration: 0.9, velocity: 0.92 },
    { bar: 3, step: 6, note: 'F#4', duration: 1.2, velocity: 0.95 }, // Major 3rd
    { bar: 3, step: 12, note: 'D4', duration: 0.6, velocity: 0.85 },

    // Bar 5: Higher octave phrase (Gm)
    { bar: 4, step: 0, note: 'Bb4', duration: 0.7, velocity: 0.9 },
    { bar: 4, step: 4, note: 'D5', duration: 0.8, velocity: 0.95 },
    { bar: 4, step: 10, note: 'C5', duration: 0.7, velocity: 0.88 },

    // Bar 6: F#5 vs F5 dualism in upper octave
    { bar: 5, step: 0, note: 'F#5', duration: 0.7, velocity: 0.94 }, // Upper Major 3rd
    { bar: 5, step: 4, note: 'F5', duration: 0.7, velocity: 0.94 },  // Upper Minor 3rd
    { bar: 5, step: 8, note: 'Eb5', duration: 0.6, velocity: 0.88 },
    { bar: 5, step: 12, note: 'D5', duration: 0.8, velocity: 0.9 },

    // Bar 7: Descending enigmatic scale run
    { bar: 6, step: 0, note: 'C5', duration: 0.5, velocity: 0.85 },
    { bar: 6, step: 4, note: 'Bb4', duration: 0.5, velocity: 0.85 },
    { bar: 6, step: 8, note: 'A4', duration: 0.6, velocity: 0.88 },
    { bar: 6, step: 12, note: 'G4', duration: 0.5, velocity: 0.82 },

    // Bar 8: Final enigmatic resolution (F natural slides to F#)
    { bar: 7, step: 0, note: 'F4', duration: 0.6, velocity: 0.88 },
    { bar: 7, step: 4, note: 'F#4', duration: 1.0, velocity: 0.96 },
    { bar: 7, step: 10, note: 'D4', duration: 1.4, velocity: 0.95 }
  ];

  leadMelody.forEach(m => {
    const idx = m.bar * 16 + m.step;
    leadSteps[idx] = {
      note: m.note,
      duration: m.duration,
      velocity: m.velocity
    };
  });

  // 4. Arp: Register-shifting exotic arpeggio (Layer 1)
  const arpSteps = new Array(totalSteps).fill(null);
  const arpNotes = ['D3', 'Eb3', 'F#3', 'A3', 'D4', 'A3', 'F#3', 'Eb3'];
  const arpHighNotes = ['D4', 'Eb4', 'F#4', 'A4', 'D5', 'A4', 'F#4', 'Eb4'];

  for (let bar = 0; bar < 8; bar++) {
    // Alternates lower register on even bars, higher register on odd bars
    const currentNotes = (bar % 2 === 1) ? arpHighNotes : arpNotes;
    for (let s = 0; s < 16; s++) {
      if (s % 2 === 0) {
        const n = currentNotes[(s / 2) % currentNotes.length];
        arpSteps[bar * 16 + s] = { note: n, duration: 0.22, velocity: 0.52 };
      }
    }
  }

  // 5. Counter / Octave echo (Layer 2)
  const counterSteps = new Array(totalSteps).fill(null);
  const counterEchoes = [
    { bar: 0, step: 8, note: 'A5', duration: 0.5, velocity: 0.68 },
    { bar: 1, step: 8, note: 'F5', duration: 0.6, velocity: 0.72 },
    { bar: 2, step: 8, note: 'G5', duration: 0.5, velocity: 0.68 },
    { bar: 3, step: 8, note: 'F#5', duration: 0.7, velocity: 0.75 },
    { bar: 4, step: 8, note: 'D6', duration: 0.6, velocity: 0.7 },
    { bar: 5, step: 8, note: 'F#5', duration: 0.6, velocity: 0.72 },
    { bar: 6, step: 8, note: 'Eb5', duration: 0.5, velocity: 0.68 },
    { bar: 7, step: 8, note: 'D5', duration: 0.8, velocity: 0.75 }
  ];
  counterEchoes.forEach(e => {
    counterSteps[e.bar * 16 + e.step] = { note: e.note, duration: e.duration, velocity: e.velocity };
  });

  // 6. Drums & Percussion: Syncopated kick (Layer 0), Snare (Layer 2), Hats (Layers 1 & 3), Mystic fills (Layer 3)
  const drumSteps = new Array(totalSteps).fill(null);
  const snareSteps = new Array(totalSteps).fill(null);
  const hihatSteps = new Array(totalSteps).fill(null);
  const hihatFastSteps = new Array(totalSteps).fill(null);
  const fillSteps = new Array(totalSteps).fill(null);

  for (let bar = 0; bar < 8; bar++) {
    for (let s = 0; s < 16; s++) {
      const idx = bar * 16 + s;

      // Syncopated kick (Layer 0) on steps 0, 6, 10
      if (s === 0 || s === 10) {
        drumSteps[idx] = { type: 'kick', startFreq: 95, endFreq: 40, decay: 0.18, velocity: 0.88 };
      } else if (s === 6) {
        drumSteps[idx] = { type: 'kick', startFreq: 85, endFreq: 38, decay: 0.14, velocity: 0.72 };
      }

      // Snare on 4 and 12 (Layer 2)
      if (s === 4 || s === 12) {
        snareSteps[idx] = { type: 'snare', velocity: 0.82 };
      }

      // 8th-note Hi-hats (Layer 1)
      if (s % 2 === 0) {
        hihatSteps[idx] = { type: 'hat', velocity: 0.32 };
      }

      // 16th-note Hi-hats (Layer 3)
      if (s % 2 === 1) {
        hihatFastSteps[idx] = { type: 'hat', velocity: 0.2 };
      }

      // Crash on Bar 1 & Bar 5 (Layer 3)
      if ((bar === 0 || bar === 4) && s === 0) {
        fillSteps[idx] = { type: 'crash', velocity: 0.85 };
      }

      // Mystic percussion fill on Bar 4 and Bar 8 (Layer 3)
      if (bar === 3 && s >= 10) {
        const fills = ['tom_hi', 'tom_mid', 'snare', 'hat'];
        fillSteps[idx] = { type: fills[s - 10], velocity: 0.82 };
      } else if (bar === 7 && s >= 8) {
        const fills = ['tom_hi', 'snare', 'tom_mid', 'snare', 'tom_low', 'snare', 'tom_hi', 'snare'];
        fillSteps[idx] = { type: fills[s - 8], velocity: 0.88 };
      }
    }
  }

  return {
    id: 'battle-iham',
    title: 'نبرد بیشه ایهام · دوگانگی معما',
    bpm: 104,
    root: 'D3',
    scale: D_PHRYGIAN_DOM,
    loopLengthBars: 8,
    chordProgression: CHORD_PROGRESSION,
    swing: 0.08,
    reverbSend: 0.35,
    masterGain: 0.36,

    instruments: {
      lead: {
        oscillator: ['triangle', 'sine'],
        detune: [-4, 4],
        envelope: {
          attack: 0.03,
          decay: 0.38,
          sustain: 0.45,
          release: 0.35
        },
        filter: {
          type: 'lowpass',
          cutoff: 2400,
          resonance: 1.4
        },
        vibrato: {
          rate: 5.8,
          depth: 4.2
        },
        gain: 0.35
      },

      counter: {
        oscillator: 'sine',
        detune: 0,
        envelope: {
          attack: 0.02,
          decay: 0.25,
          sustain: 0.3,
          release: 0.25
        },
        filter: {
          type: 'lowpass',
          cutoff: 3000,
          resonance: 0.8
        },
        gain: 0.22
      },

      pad: {
        oscillator: ['sawtooth', 'triangle', 'sine'],
        detune: [-7, 0, 7],
        envelope: {
          attack: 0.7,
          decay: 0.5,
          sustain: 0.7,
          release: 1.1
        },
        filter: {
          type: 'lowpass',
          cutoff: 750,
          resonance: 1.6
        },
        gain: 0.22
      },

      bass: {
        oscillator: ['sawtooth', 'sine'],
        detune: [-3, 3],
        envelope: {
          attack: 0.02,
          decay: 0.25,
          sustain: 0.5,
          release: 0.18
        },
        filter: {
          type: 'lowpass',
          cutoff: 420,
          resonance: 1.2
        },
        gain: 0.36
      },

      arp: {
        oscillator: 'triangle',
        detune: 0,
        envelope: {
          attack: 0.006,
          decay: 0.16,
          sustain: 0.15,
          release: 0.1
        },
        filter: {
          type: 'bandpass',
          cutoff: 2000,
          resonance: 1.5
        },
        gain: 0.20
      },

      drums: {
        kick: {
          startFreq: 95,
          endFreq: 38,
          decay: 0.18,
          gain: 0.7
        },
        snare: {
          cutoff: 3500,
          decay: 0.12,
          gain: 0.6
        },
        hat: {
          cutoff: 8500,
          decay: 0.03,
          gain: 0.22
        },
        crash: {
          cutoff: 4200,
          decay: 1.3,
          gain: 0.4
        },
        gain: 0.42
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

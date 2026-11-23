import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import track configs and engine in Node environment
const flashcardTrack = (await import('../audio/tracks/flashcards-chill.js')).default;
const battleTrack = (await import('../audio/tracks/battle.js')).default;
const AudioEngine = (await import('../audio/engine.js')).default;

describe('Data-Driven Procedural Audio Engine & Tracks Suite', () => {
  test('1. Track Configs conform to data-driven specification', () => {
    [flashcardTrack, battleTrack].forEach(track => {
      assert.ok(track.id, 'Track must have an id');
      assert.ok(typeof track.bpm === 'number' && track.bpm > 0, 'Track must have positive numeric BPM');
      assert.ok(track.root, 'Track must have a key root note');
      assert.ok(Array.isArray(track.scale) && track.scale.length >= 5, 'Track must have semitone intervals scale');
      assert.ok(typeof track.loopLengthBars === 'number' && track.loopLengthBars > 0, 'Track must have loopLengthBars');
      assert.ok(Array.isArray(track.chordProgression), 'Track must have chordProgression');
      assert.ok(track.instruments && typeof track.instruments === 'object', 'Track must define instruments');
      assert.ok(track.patterns && typeof track.patterns === 'object', 'Track must define channel patterns');
      assert.ok(typeof track.masterGain === 'number', 'Track must specify masterGain');
      assert.ok(typeof track.reverbSend === 'number', 'Track must specify reverbSend');
    });
  });

  test('2. "flashcards-chill" strictly satisfies musical requirements', () => {
    assert.equal(flashcardTrack.id, 'flashcards-chill');
    assert.equal(flashcardTrack.bpm, 68, 'BPM must be ~68');
    assert.equal(flashcardTrack.root, 'D3', 'Root must be D');
    assert.deepEqual(flashcardTrack.scale, [0, 2, 3, 5, 7, 9, 10], 'Scale must be D Dorian');
    assert.equal(flashcardTrack.loopLengthBars, 16, 'Loop length must be 16 bars');
    assert.equal(flashcardTrack.chordProgression.length, 16, 'Chord progression must cover 16 bars');

    // Instrument checks
    const inst = flashcardTrack.instruments;
    assert.ok(inst.pad, 'Must have warm pad instrument');
    assert.ok(Array.isArray(inst.pad.oscillator) && inst.pad.oscillator.includes('triangle'), 'Pad must use detuned triangle/sine');
    assert.ok(inst.pad.filter && inst.pad.filter.type === 'lowpass', 'Pad must use lowpass filter');

    assert.ok(inst.lead, 'Must have electric piano style lead');
    assert.equal(inst.lead.oscillator, 'sine', 'Lead should be sine-based for mellow electric piano tone');
    assert.ok(inst.lead.vibrato, 'Lead must have gentle vibrato');

    assert.ok(inst.bass, 'Must have soft bass');
    assert.equal(inst.bass.oscillator, 'sine', 'Bass must be soft sine');

    assert.ok(inst.drums, 'Must have drums channel with brushed hat and kick');
    assert.ok(inst.vinyl, 'Must have vinyl crackle atmospheric layer');

    // Dynamics checks
    assert.ok(flashcardTrack.masterGain <= 0.25, 'Master gain must be calm and quiet (~0.20)');
    assert.ok(flashcardTrack.swing > 0, 'Must have gentle swing');
  });

  test('3. Engine API methods are defined and callable', () => {
    const methods = [
      'initAudio', 'registerTrack', 'getTrack', 'playTrack',
      'stopMusic', 'setMuted', 'isMuted', 'setTempoMultiplier',
      'setLayerLevel', 'playTone', 'playSfx', 'getCurrentTrackId'
    ];
    methods.forEach(m => {
      assert.equal(typeof AudioEngine[m], 'function', `AudioEngine.${m} must be a function`);
    });
  });

  test('4. Registering and retrieving tracks works dynamically', () => {
    AudioEngine.registerTrack(flashcardTrack);
    AudioEngine.registerTrack(battleTrack);

    assert.equal(AudioEngine.getTrack('flashcards-chill').id, 'flashcards-chill');
    assert.equal(AudioEngine.getTrack('battle-theme').id, 'battle-theme');
  });

  test('5. Dynamic custom track can be registered without engine modification', () => {
    const customTrack = {
      id: 'custom-ambient',
      bpm: 90,
      root: 'C3',
      scale: [0, 2, 4, 5, 7, 9, 11],
      loopLengthBars: 2,
      chordProgression: [0, 4],
      masterGain: 0.25,
      reverbSend: 0.2,
      instruments: {
        chime: {
          oscillator: 'sine',
          envelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 0.5 },
          gain: 0.3
        }
      },
      patterns: {
        chime: [ { degree: 0 }, null, { degree: 2 }, null ]
      }
    };

    AudioEngine.registerTrack(customTrack);
    assert.equal(AudioEngine.getTrack('custom-ambient').id, 'custom-ambient');
  });

  test('6. Mute state persistence and toggling', () => {
    AudioEngine.setMuted(true);
    assert.equal(AudioEngine.isMuted(), true);

    AudioEngine.setMuted(false);
    assert.equal(AudioEngine.isMuted(), false);
  });
});

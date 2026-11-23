import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import all track configs and engine in Node environment
const flashcardTrack = (await import('../audio/tracks/flashcards-chill.js')).default;
const battleTrack = (await import('../audio/tracks/battle.js')).default;
const vazhganTrack = (await import('../audio/tracks/battle-vazhgan.js')).default;
const ihamTrack = (await import('../audio/tracks/battle-iham.js')).default;
const kenayehTrack = (await import('../audio/tracks/battle-kenayeh.js')).default;
const infernoTrack = (await import('../audio/tracks/battle-inferno.js')).default;
const AudioEngine = (await import('../audio/engine.js')).default;

describe('Data-Driven Procedural Audio Engine & Tracks Suite', () => {
  const allTracks = [
    flashcardTrack,
    battleTrack,
    vazhganTrack,
    ihamTrack,
    kenayehTrack,
    infernoTrack
  ];

  test('1. All Track Configs conform to data-driven specification', () => {
    allTracks.forEach(track => {
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

  test('3. "battle-vazhgan" (World 1: Graveyard) satisfies Gothic Heroic requirements', () => {
    assert.equal(vazhganTrack.id, 'battle-vazhgan');
    assert.equal(vazhganTrack.bpm, 100, 'BPM must be 100');
    assert.ok(vazhganTrack.root.startsWith('A'), 'Root must be A');
    assert.deepEqual(vazhganTrack.scale, [0, 2, 3, 5, 7, 8, 11], 'Scale must be A Harmonic Minor');
    assert.equal(vazhganTrack.loopLengthBars, 8, 'Loop length must be 8 bars');
    assert.equal(vazhganTrack.chordProgression.length, 8, 'Chord progression must have 8 bars');

    // Instruments
    const inst = vazhganTrack.instruments;
    assert.ok(inst.lead, 'Must have brass-like lead');
    const leadOsc = Array.isArray(inst.lead.oscillator) ? inst.lead.oscillator : [inst.lead.oscillator];
    assert.ok(leadOsc.includes('sawtooth'), 'Lead oscillator should be or include sawtooth for brass tone');
    assert.ok((inst.lead.filter && inst.lead.filter.envAmount > 0) || inst.lead.filterEnvelope, 'Lead must have filter envelope swell');

    assert.ok(inst.bass, 'Must have bass');
    assert.ok(Array.isArray(inst.bass.oscillator), 'Bass should use detuned oscillators (triangle/saw)');

    assert.ok(inst.pad, 'Must have dark pad');
    assert.ok(Array.isArray(inst.pad.oscillator), 'Pad should use detuned oscillators');

    assert.ok(inst.drums, 'Must have drums');
    assert.ok(inst.counter, 'Must have counter melody');

    // Patterns & Layers
    const pat = vazhganTrack.patterns;
    assert.equal(pat.bass.length, 128, 'Bass pattern must have 128 sixteenth notes (8 bars)');
    assert.equal(pat.lead.length, 128, 'Lead pattern must have 128 sixteenth notes');
    assert.equal(pat.drums.length, 128, 'Drums pattern must have 128 sixteenth notes');

    // Check timpani hits on beats 1 and 3 (steps 0, 8, 16, 24...)
    const timpaniHits = pat.drums.filter(d => d && d.type === 'timpani');
    assert.ok(timpaniHits.length >= 8, 'Must feature timpani on beats 1 and 3');

    // Check bar-end fills and crash
    const crashes = pat.fills ? pat.fills.filter(d => d && d.type === 'crash') : pat.drums.filter(d => d && d.type === 'crash');
    assert.ok(crashes.length > 0, 'Must feature crash cymbals');
    const toms = pat.fills ? pat.fills.filter(d => d && d.type && d.type.startsWith('tom')) : pat.drums.filter(d => d && d.type && d.type.startsWith('tom'));
    assert.ok(toms.length > 0, 'Must feature tom fills at bar ends');
  });

  test('4. "battle-iham" (World 3: Forest of Iham) satisfies Phrygian Dominant & Dual Meaning', () => {
    assert.equal(ihamTrack.id, 'battle-iham');
    assert.equal(ihamTrack.bpm, 104, 'BPM must be 104');
    assert.ok(ihamTrack.root.startsWith('D'), 'Root must be D');
    assert.deepEqual(ihamTrack.scale, [0, 1, 4, 5, 7, 8, 10], 'Scale must be D Phrygian Dominant');
    assert.equal(ihamTrack.loopLengthBars, 8, 'Loop length must be 8 bars');

    // Instruments
    const inst = ihamTrack.instruments;
    assert.ok(inst.lead.vibrato, 'Lead must have vibrato for mysterious shimmer');
    assert.ok(inst.arp && inst.arp.filter && inst.arp.filter.type === 'bandpass', 'Arp must use resonant bandpass filter for eerie forest feel');
    assert.ok(inst.pad && inst.pad.filter, 'Pad must define lowpass/bandpass filter');

    // Dual-meaning melodic check: alternates Major 3rd (F#) and Minor 3rd (F)
    const pat = ihamTrack.patterns;
    const leadNotes = pat.lead.filter(Boolean).map(n => n.note);
    const hasMajor3rd = leadNotes.some(n => n.includes('F#'));
    const hasMinor3rd = leadNotes.some(n => n.includes('F') && !n.includes('F#'));
    assert.ok(hasMajor3rd && hasMinor3rd, 'Melody must alternate Major 3rd (F#) and Minor 3rd (F) for Iham (double meaning)');

    // Register-shifting arpeggio
    assert.ok(pat.arp && pat.arp.length === 128, 'Must have 8-bar arpeggio pattern');
  });

  test('5. "battle-kenayeh" (World 2: Realm of Kenayeh) satisfies E Dorian syncopation', () => {
    assert.equal(kenayehTrack.id, 'battle-kenayeh');
    assert.equal(kenayehTrack.bpm, 112, 'BPM must be 112');
    assert.ok(kenayehTrack.root.startsWith('E'), 'Root must be E');
    assert.deepEqual(kenayehTrack.scale, [0, 2, 3, 5, 7, 9, 10], 'Scale must be E Dorian');
    assert.equal(kenayehTrack.loopLengthBars, 8, 'Loop length must be 8 bars');

    // Check syncopated staccato lead & off-beat bass
    const pat = kenayehTrack.patterns;
    assert.ok(pat.bass && pat.bass.length === 128);
    // Check off-beat bass hits (step index % 4 === 2)
    let offBeatHits = 0;
    pat.bass.forEach((step, idx) => {
      if (step && (idx % 4 === 2)) offBeatHits++;
    });
    assert.ok(offBeatHits > 10, 'Bass must emphasize syncopated off-beats');

    // Call-and-response between lead & arp: verify both exist and have active notes
    const activeLead = pat.lead.filter(Boolean).length;
    const activeArp = pat.arp.filter(Boolean).length;
    assert.ok(activeLead > 0 && activeArp > 0, 'Must have active lead and arpeggio for call-and-response');

    // Snare hits on beats 2 and 4 (steps 4, 12 in every bar of 16 steps)
    const snarePattern = pat.snare || pat.drums;
    const snareHits = snarePattern.filter((d, idx) => d && (d.type === 'snare' || d.type === 'snare_body') && (idx % 8 === 4));
    assert.ok(snareHits.length > 5, 'Snare must hit consistently on backbeats 2 & 4');
  });

  test('6. "battle-inferno" (World 4: Inferno Fortress) satisfies Heavy Climactic Phrygian', () => {
    assert.equal(infernoTrack.id, 'battle-inferno');
    assert.equal(infernoTrack.bpm, 128, 'BPM must be 128 (fastest)');
    assert.ok(infernoTrack.root.startsWith('F#'), 'Root must be F#');
    assert.deepEqual(infernoTrack.scale, [0, 1, 3, 5, 7, 8, 10], 'Scale must be F# Phrygian');
    assert.equal(infernoTrack.loopLengthBars, 8, 'Loop length must be 8 bars');

    // Distortion settings on bass
    const inst = infernoTrack.instruments;
    assert.ok(inst.bass.distortion && inst.bass.distortion > 0, 'Bass must have waveshaper distortion');

    // Dissonance check: Tritone (C) and Minor 2nd (G)
    const pat = infernoTrack.patterns;
    const bassNotes = pat.bass.filter(Boolean).map(b => b.note);
    const hasTritoneC = bassNotes.some(n => n.startsWith('C'));
    const hasMinor2ndG = bassNotes.some(n => n.startsWith('G') && !n.startsWith('G#'));
    assert.ok(hasTritoneC, 'Bass must contain Tritone (C) tension');
    assert.ok(hasMinor2ndG, 'Bass must contain Minor 2nd (G) tension');

    // Double-time kick drum pattern check: lots of kicks
    const kicks = pat.drums.filter(d => d && (d.type === 'kick' || d.type === 'kick_and_hat'));
    assert.ok(kicks.length >= 32, 'Drums must feature heavy double-time kick drum');
  });

  test('7. Engine API methods are defined and callable', () => {
    const methods = [
      'initAudio', 'registerTrack', 'getTrack', 'getAllRegisteredTracks', 'playTrack',
      'stopMusic', 'setMuted', 'isMuted', 'setTempoMultiplier', 'getTempoMultiplier',
      'setLayerLevel', 'getLayerLevel', 'playTone', 'playSfx', 'getCurrentTrackId',
      'mountDevAuditionPanel'
    ];
    methods.forEach(m => {
      assert.equal(typeof AudioEngine[m], 'function', `AudioEngine.${m} must be a function`);
    });
  });

  test('8. Registering and retrieving all 4 epic tracks works dynamically', () => {
    AudioEngine.registerTrack(vazhganTrack);
    AudioEngine.registerTrack(ihamTrack);
    AudioEngine.registerTrack(kenayehTrack);
    AudioEngine.registerTrack(infernoTrack);

    assert.equal(AudioEngine.getTrack('battle-vazhgan').id, 'battle-vazhgan');
    assert.equal(AudioEngine.getTrack('battle-iham').id, 'battle-iham');
    assert.equal(AudioEngine.getTrack('battle-kenayeh').id, 'battle-kenayeh');
    assert.equal(AudioEngine.getTrack('battle-inferno').id, 'battle-inferno');

    const registered = AudioEngine.getAllRegisteredTracks();
    assert.ok(registered.length >= 4, 'Must have at least all 4 epic tracks registered');
  });

  test('9. Dynamic Layer Level (0 - 3) and Tempo Multiplier (1.0 - 1.4) state management', () => {
    // Layer Level
    AudioEngine.setLayerLevel(0);
    assert.equal(AudioEngine.getLayerLevel(), 0);

    AudioEngine.setLayerLevel(2);
    assert.equal(AudioEngine.getLayerLevel(), 2);

    AudioEngine.setLayerLevel(3);
    assert.equal(AudioEngine.getLayerLevel(), 3);

    // Clamping checks
    AudioEngine.setLayerLevel(5);
    assert.equal(AudioEngine.getLayerLevel(), 3, 'Layer level should clamp to 3');
    AudioEngine.setLayerLevel(-1);
    assert.equal(AudioEngine.getLayerLevel(), 0, 'Layer level should clamp to 0');

    // Tempo Multiplier
    AudioEngine.setTempoMultiplier(1.0);
    assert.equal(AudioEngine.getTempoMultiplier(), 1.0);

    AudioEngine.setTempoMultiplier(1.25);
    assert.equal(AudioEngine.getTempoMultiplier(), 1.25);

    AudioEngine.setTempoMultiplier(1.4);
    assert.equal(AudioEngine.getTempoMultiplier(), 1.4);

    // Clamping checks
    AudioEngine.setTempoMultiplier(0.2);
    assert.equal(AudioEngine.getTempoMultiplier(), 0.5, 'Tempo multiplier minimum clamp');
    AudioEngine.setTempoMultiplier(5.0);
    assert.equal(AudioEngine.getTempoMultiplier(), 2.5, 'Tempo multiplier maximum clamp');

    // Reset back to normal 1.0
    AudioEngine.setTempoMultiplier(1.0);
  });

  test('10. Mute state persistence and toggling', () => {
    AudioEngine.setMuted(true);
    assert.equal(AudioEngine.isMuted(), true);

    AudioEngine.setMuted(false);
    assert.equal(AudioEngine.isMuted(), false);
  });

  test('11. Dev Audition Panel mounts only when ?audioDebug=1 is present', () => {
    // 1. Without audioDebug=1 -> must NOT mount
    const mockDoc = {
      getElementById: (id) => null,
      createElement: (tag) => {
        const el = {
          id: '',
          style: {},
          setAttribute: () => {},
          querySelector: () => ({ oninput: null, onclick: null, textContent: '' }),
          querySelectorAll: () => []
        };
        return el;
      },
      body: {
        appendChild: () => {
          assert.fail('Should NOT append panel when audioDebug=1 is absent');
        }
      }
    };

    globalThis.window = { location: { search: '' } };
    globalThis.document = mockDoc;
    AudioEngine.mountDevAuditionPanel();

    // 2. With ?audioDebug=1 -> MUST mount
    let appended = false;
    let appendedId = null;
    mockDoc.body.appendChild = (el) => {
      appended = true;
      appendedId = el.id;
    };
    globalThis.window = { location: { search: '?audioDebug=1' } };
    AudioEngine.mountDevAuditionPanel();

    assert.ok(appended, 'Must append panel to body when ?audioDebug=1 is in URL');
    assert.equal(appendedId, 'devAudioPanel', 'Element must have id="devAudioPanel"');

    // Clean up globals
    delete globalThis.window;
    delete globalThis.document;
  });

  test('12. Track per World routing and baseline configuration (TASK 1)', () => {
    // World 1 (Vazhgan)
    const t1 = AudioEngine.startBattleMusic({ world: 1 });
    assert.equal(t1, 'battle-vazhgan');
    assert.equal(AudioEngine.getTempoMultiplier(), 1.00);
    assert.equal(AudioEngine.getLayerLevel(), 0);

    // World 2 (Kenayeh)
    const t2 = AudioEngine.startBattleMusic({ world: 2 });
    assert.equal(t2, 'battle-kenayeh');
    assert.equal(AudioEngine.getTempoMultiplier(), 1.00);
    assert.equal(AudioEngine.getLayerLevel(), 0);

    // World 3 (Iham)
    const t3 = AudioEngine.startBattleMusic({ world: 3 });
    assert.equal(t3, 'battle-iham');
    assert.equal(AudioEngine.getTempoMultiplier(), 1.00);
    assert.equal(AudioEngine.getLayerLevel(), 0);

    // World 4 (Inferno Fortress)
    const t4 = AudioEngine.startBattleMusic({ world: 4 });
    assert.equal(t4, 'battle-inferno');
    assert.equal(AudioEngine.getTempoMultiplier(), 1.10, 'Inferno baseline tempo is 1.10');
    assert.equal(AudioEngine.getLayerLevel(), 1, 'Inferno baseline layer is 1');

    // Hell Mix stage
    const tHell = AudioEngine.startBattleMusic({ isHellMix: true });
    assert.equal(tHell, 'battle-inferno');
    assert.equal(AudioEngine.getTempoMultiplier(), 1.10);
    assert.equal(AudioEngine.getLayerLevel(), 1);
  });

  test('13. Enemy HP Progress maps to Tempo and Layer ramping (TASK 2)', () => {
    // Normal World (World 1, 2, 3)
    AudioEngine.startBattleMusic({ world: 1 });

    // p < 0.5 (10 remaining of 10 -> p = 0.0)
    let res = AudioEngine.updateBattleMusicProgress(10, 10, false);
    assert.equal(res.p, 0.0);
    assert.equal(res.tempo, 1.00);
    assert.equal(res.layer, 0);

    // p = 0.5 (5 remaining of 10 -> p = 0.5)
    res = AudioEngine.updateBattleMusicProgress(5, 10, false);
    assert.equal(res.p, 0.5);
    assert.equal(res.tempo, 1.08);
    assert.equal(res.layer, 1);

    // p = 0.7 (3 remaining of 10 -> p = 0.7)
    res = AudioEngine.updateBattleMusicProgress(3, 10, false);
    assert.equal(res.p, 0.7);
    assert.equal(res.tempo, 1.18);
    assert.equal(res.layer, 2);

    // p = 0.9 (1 remaining of 10 -> p = 0.9, climax)
    res = AudioEngine.updateBattleMusicProgress(1, 10, false);
    assert.equal(res.p, 0.9);
    assert.equal(res.tempo, 1.30);
    assert.equal(res.layer, 3);

    // Final hit (0 remaining -> p = 1.0)
    res = AudioEngine.updateBattleMusicProgress(0, 10, false);
    assert.equal(res.p, 1.0);
    assert.equal(res.tempo, 1.30);
    assert.equal(res.layer, 3);
  });

  test('14. Inferno Fortress escalates from higher baseline (TASK 2)', () => {
    AudioEngine.startBattleMusic({ world: 4 });

    // Baseline: p < 0.5 -> tempo 1.10, layer 1
    let res = AudioEngine.updateBattleMusicProgress(10, 10, true);
    assert.equal(res.tempo, 1.10);
    assert.equal(res.layer, 1);

    // p >= 0.5 -> tempo 1.18, layer 2
    res = AudioEngine.updateBattleMusicProgress(5, 10, true);
    assert.equal(res.tempo, 1.18);
    assert.equal(res.layer, 2);

    // p >= 0.7 -> tempo 1.28, layer 3
    res = AudioEngine.updateBattleMusicProgress(3, 10, true);
    assert.equal(res.tempo, 1.28);
    assert.equal(res.layer, 3);

    // p >= 0.9 -> tempo 1.40, layer 3
    res = AudioEngine.updateBattleMusicProgress(1, 10, true);
    assert.equal(res.tempo, 1.40);
    assert.equal(res.layer, 3);
  });

  test('15. Wrong answers do not lower level; battle reset restores baseline (TASK 2)', () => {
    AudioEngine.startBattleMusic({ world: 1 });

    // Progress up to p = 0.7 (layer 2, tempo 1.18)
    AudioEngine.updateBattleMusicProgress(3, 10, false);
    assert.equal(AudioEngine.getLayerLevel(), 2);

    // Wrong answer / spaced repetition adds item back (remaining becomes 4 -> rawP = 0.6)
    // Level must NOT drop!
    const res = AudioEngine.updateBattleMusicProgress(4, 10, false);
    assert.equal(res.p, 0.7, 'Progress must remain at maximum reached');
    assert.equal(res.layer, 2, 'Layer must not drop on wrong answer');
    assert.equal(res.tempo, 1.18, 'Tempo must not drop on wrong answer');

    // Starting a new battle must reset to baseline
    AudioEngine.startBattleMusic({ world: 1 });
    assert.equal(AudioEngine.getTempoMultiplier(), 1.00);
    assert.equal(AudioEngine.getLayerLevel(), 0);
  });

  test('16. Victory, Defeat, and Jingle dismissal lifecycle (TASK 3)', () => {
    // Victory handling
    AudioEngine.startBattleMusic({ world: 1 });
    AudioEngine.handleBattleVictory({ fadeMs: 600 });
    assert.equal(AudioEngine.isJinglePlaying(), true);

    // Dismiss jingle on user tap
    AudioEngine.dismissJingle();
    assert.equal(AudioEngine.isJinglePlaying(), false);

    // Defeat handling
    AudioEngine.startBattleMusic({ world: 1 });
    AudioEngine.handleBattleDefeat({ fadeMs: 1500 });
    assert.equal(AudioEngine.isJinglePlaying(), true);

    AudioEngine.dismissJingle();
    assert.equal(AudioEngine.isJinglePlaying(), false);
  });

  test('17. BattleIntensity single source of truth store', () => {
    const BI = AudioEngine.battleIntensity;
    assert.ok(BI, 'AudioEngine exposes battleIntensity');
    assert.equal(typeof BI.getState, 'function');
    assert.equal(typeof BI.subscribe, 'function');
    assert.equal(typeof BI.setProgress, 'function');
    assert.equal(typeof BI.reset, 'function');

    // Subscribe to state updates
    let lastState = null;
    const unsub = BI.subscribe(state => {
      lastState = state;
    });

    // Reset World 1-3 baseline
    BI.reset(false);
    assert.equal(lastState.level, 0);
    assert.equal(lastState.p, 0);
    assert.equal(lastState.isHell, false);

    // Level 1: p = 0.55
    let res = BI.setProgress(0.55, false);
    assert.equal(res.level, 1);
    assert.equal(lastState.level, 1);

    // Level 2: p = 0.75
    res = BI.setProgress(0.75, false);
    assert.equal(res.level, 2);
    assert.equal(lastState.level, 2);

    // Level 3: p = 0.92
    res = BI.setProgress(0.92, false);
    assert.equal(res.level, 3);
    assert.equal(lastState.level, 3);

    // Inferno baseline (Hell Mode starts at Level 1)
    BI.reset(true);
    assert.equal(lastState.level, 1);
    assert.equal(lastState.isHell, true);

    // Inferno Level 2 at p = 0.52
    res = BI.setProgress(0.52, true);
    assert.equal(res.level, 2);

    // Inferno Level 3 at p = 0.72
    res = BI.setProgress(0.72, true);
    assert.equal(res.level, 3);

    unsub();
  });

  test('18. Beat Clock APIs & Mute Persistence (TASK 1)', () => {
    assert.equal(typeof AudioEngine.getBeatPhase, 'function');
    assert.equal(typeof AudioEngine.onBeat, 'function');
    assert.equal(typeof AudioEngine.isDownbeat, 'function');

    // When stopped, phase must return 0
    AudioEngine.stopMusic({ fadeMs: 0 });
    assert.equal(AudioEngine.getBeatPhase(), 0);
    assert.equal(typeof AudioEngine.isDownbeat(), 'boolean');

    // onBeat subscription returns an unsubscribe function
    let beatReceived = false;
    const unsub = AudioEngine.onBeat(() => { beatReceived = true; });
    assert.equal(typeof unsub, 'function');
    unsub();

    // Muted operation continues running
    AudioEngine.setMuted(true);
    assert.equal(AudioEngine.isMuted(), true);
    assert.equal(typeof AudioEngine.getBeatPhase(), 'number');
    AudioEngine.setMuted(false);
  });

  test('19. BattleEffects module and LEVEL_CONFIG mapping (TASK 2 & 3)', async () => {
    const { default: BattleEffects } = await import('../audio/battle_effects.js');
    assert.ok(BattleEffects, 'BattleEffects module loads successfully');
    assert.ok(BattleEffects.LEVEL_CONFIG, 'LEVEL_CONFIG exists');

    const cfg = BattleEffects.LEVEL_CONFIG;

    // Level 0: Baseline, no vignette, no particles, no glow
    assert.equal(cfg[0].vignetteBase, 0.0);
    assert.equal(cfg[0].particlesCount, 0);
    assert.equal(cfg[0].enemyGlow, false);
    assert.equal(cfg[0].downbeatShake, false);

    // Level 1: Breathing vignette (pulse <= 0.12), candle flicker
    assert.ok(cfg[1].vignetteBase > 0);
    assert.ok(cfg[1].vignettePulse <= 0.12, 'Vignette pulse swing must not exceed 0.12 for photosensitivity');
    assert.equal(cfg[1].candleFlicker, true);
    assert.equal(cfg[1].particlesCount, 0);

    // Level 2: 12-20 soul/ember particles, HP beat pulse, ember color shift, enemy glow
    assert.ok(cfg[2].particlesCount >= 12 && cfg[2].particlesCount <= 20, 'Particles capped at 12-20');
    assert.equal(cfg[2].hpPulse, true);
    assert.equal(cfg[2].hpColorShift, true);
    assert.equal(cfg[2].enemyGlow, true);

    // Level 3: Stronger vignette, downbeat shake (80ms), downbeat flicker
    assert.ok(cfg[3].vignetteBase > cfg[2].vignetteBase, 'Level 3 vignette is stronger');
    assert.equal(cfg[3].downbeatShake, true);
    assert.equal(cfg[3].downbeatFlicker, true);
  });

  test('20. BattleEffects Kill Moment & Wrong Pulse triggers', async (t) => {
    const { default: BattleEffects } = await import('../audio/battle_effects.js');

    // Wrong answer pulse callable without error
    assert.doesNotThrow(() => {
      BattleEffects.triggerWrongPulse();
    });

    // Kill moment executes 150ms hit stop callback
    await new Promise((resolve) => {
      const startT = Date.now();
      BattleEffects.triggerKillMoment(() => {
        const elapsed = Date.now() - startT;
        assert.ok(elapsed >= 140, 'Hit-stop must delay death callback by ~150ms');
        resolve();
      });
    });

    BattleEffects.stop();
    assert.equal(BattleEffects.isRunning(), false);
  });
});

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ScorchedCity from '../js/scorched_city.js';
import bankModule from '../data/curriculum_bank.js';

const PROJECT_DIR = path.resolve('.');
const bank = bankModule.default || bankModule || globalThis.CURRICULUM_BANK;
const htmlContent = fs.readFileSync(path.join(PROJECT_DIR, 'index.html'), 'utf8');
const swContent = fs.readFileSync(path.join(PROJECT_DIR, 'sw.js'), 'utf8');

function createInMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k)
  };
}

describe('Scorched City (شهر سوخته) — Step 3 Full 10-Boss Roster & Lazy Sprite Atlas Suite', () => {
  beforeEach(() => {
    ScorchedCity.setStorageBackend(createInMemoryStorage());
    ScorchedCity.resetSimulationTuning();
  });

  describe('1. Canonical 10-Boss Roster Schema, Guardrails & Disk Sprite Assets', () => {
    const EXPECTED_SLUGS = [
      '01_rift_scribe',
      '02_cinder_hourglass',
      '03_ash_twin',
      '04_pact_warden',
      '05_inverted_mirror_lord',
      '06_furnace_tollkeeper',
      '07_smoke_ember_phantom',
      '08_cold_wick_sentinel',
      '09_ruin_architect',
      '10_lord_eternal_pyre'
    ];

    it('registers all 10 canonical bosses covering all 4 Key Families with valid sheets and atlas JSON files', () => {
      const roster = ScorchedCity.getAllCanonicalBosses();
      assert.equal(roster.length, 10);

      const seenIds = new Set();
      const seenFamilies = new Set();

      EXPECTED_SLUGS.forEach((slug) => {
        const boss = ScorchedCity.getBoss(slug);
        assert.ok(boss, `Boss "${slug}" must be registered`);
        assert.equal(seenIds.has(boss.id), false);
        seenIds.add(boss.id);

        assert.ok(ScorchedCity.PACT_FAMILY_IDS.includes(boss.keyFamily), `Boss "${slug}" must use canonical Key Family`);
        seenFamilies.add(boss.keyFamily);

        assert.equal(boss.autoActivatePacts, false);
        assert.equal(boss.canRemoveCandleDirectly, false);
        assert.equal(boss.canDeleteMistakes, false);
        assert.equal(boss.allowBypassWeakItems, false);

        const cfg = ScorchedCity.getBossSpriteConfig(slug);
        assert.equal(cfg.slug, slug);
        const sheetAbs = path.join(PROJECT_DIR, cfg.sheetPath);
        const atlasAbs = path.join(PROJECT_DIR, cfg.atlasPath);
        assert.ok(fs.existsSync(sheetAbs), `Sprite sheet missing: ${cfg.sheetPath}`);
        assert.ok(fs.existsSync(atlasAbs), `Atlas JSON missing: ${cfg.atlasPath}`);

        const atlas = JSON.parse(fs.readFileSync(atlasAbs, 'utf8'));
        assert.deepEqual(atlas.frame_size, [512, 512]);
        assert.deepEqual(atlas.animations.idle, [0, 1, 2, 3]);
        assert.deepEqual(atlas.animations.attack, [4, 5, 6, 7]);
        assert.deepEqual(atlas.animations.hit, [8, 9, 10, 11]);
        assert.deepEqual(atlas.animations.death, [12, 13, 14, 15]);
        assert.equal(atlas.frames.length, 16);
      });

      assert.equal(seenFamilies.size, 4, 'All 4 pact families must appear as Boss Key Families across roster');
    });

    it('cycles deterministically across all 10 unique bosses for a Daily Run seed before repeating', () => {
      const dailySeed = ScorchedCity.createDailyRunSeed('2026-11-25', '10');
      const cycle1To10 = [];
      for (let c = 1; c <= 10; c++) {
        cycle1To10.push(ScorchedCity.selectBossForCycle(dailySeed, c).id);
      }
      assert.equal(new Set(cycle1To10).size, 10, 'First 10 cycles must span all 10 distinct bosses');
      assert.equal(ScorchedCity.selectBossForCycle(dailySeed, 1).id, cycle1To10[0]);
    });

    it('declares sprite quirk metadata cleanly for 05_inverted_mirror_lord and 02_cinder_hourglass', () => {
      const mirrorCfg = ScorchedCity.getBossSpriteConfig('05_inverted_mirror_lord');
      assert.deepEqual(mirrorCfg.quirks.attackFrameOverlay, { targetStep: 2, underlayStep: 1 });

      const glassCfg = ScorchedCity.getBossSpriteConfig('02_cinder_hourglass');
      assert.equal(glassCfg.quirks.preserveOpaqueGreenGlass, true);
    });
  });

  describe('2. Boss Mechanics, Pure Knowledge Clearability & Survival Immunity Guardrails', () => {
    it('supports clearing Room 5 (1500 target) cleanly with zero active pacts against EVERY boss', () => {
      ScorchedCity.getAllCanonicalBosses().forEach((boss) => {
        ScorchedCity.setStorageBackend(createInMemoryStorage());
        const run = ScorchedCity.startNewRun({
          studentCode: `pure_${boss.id}`,
          grade: '10',
          mode: 'standard',
          seed: `seed_${boss.id}`,
          curriculumBank: bank
        });
        run.telegraphedBoss = ScorchedCity.getBoss(boss.id);
        ScorchedCity.enterRoom(5);

        assert.equal(run.activePacts.length, 0);
        assert.equal(run.roomTargetScore, 1500);

        for (let q = 0; q < 8; q++) {
          ScorchedCity.presentQuestion(run.roomQueue[0]);
          ScorchedCity.recordCorrectAnswer({
            card: run.roomQueue[0],
            answerDurationSec: 4.0
          });
        }
        const evalRes = ScorchedCity.completeRoom();
        assert.equal(evalRes.passed, true, `Pure-knowledge 8-answer streak must beat boss "${boss.id}"`);
        assert.equal(evalRes.bossCycleCompleted, true);
      });
    });

    it('enforces boss-specific mechanics (Mirror option flip, Hourglass tempo, Pact Warden seal with Threshold Guardian immunity)', () => {
      // 05_inverted_mirror_lord: reverseOptions + retry bonus
      const run = ScorchedCity.startNewRun({ studentCode: 'm_test', grade: '10', mode: 'standard', curriculumBank: bank });
      run.telegraphedBoss = ScorchedCity.getBoss('05_inverted_mirror_lord');
      ScorchedCity.enterRoom(5);
      const retryCard = { ...run.roomQueue[0], isPracticeRetry: true };
      const pres = ScorchedCity.presentQuestion(retryCard);
      assert.equal(pres.presentation.reverseOptions, true);
      const ans = ScorchedCity.recordCorrectAnswer({ card: retryCard, basePoints: 100 });
      assert.equal(ans.bossBonusPoints, 35);

      // 04_pact_warden seals greed, NEVER locks once-per-run survival pacts!
      ScorchedCity.selectDraftCard('golden_quill'); // greed (sealed)
      ScorchedCity.selectDraftCard('threshold_guardian'); // survival (protected)
      run.telegraphedBoss = ScorchedCity.getBoss('04_pact_warden');
      ScorchedCity.enterRoom(5);
      assert.equal(ScorchedCity.isPactLockedForRun(run, 'golden_quill'), true);
      assert.equal(ScorchedCity.isPactLockedForRun(run, 'threshold_guardian'), false);

      // 02_cinder_hourglass: fast < 5s vs slow >= 9s
      run.telegraphedBoss = ScorchedCity.getBoss('02_cinder_hourglass');
      ScorchedCity.enterRoom(5);
      const fast = ScorchedCity.recordCorrectAnswer({ basePoints: 100, answerDurationSec: 3.0 });
      assert.equal(fast.bossBonusPoints, 25);
      const slow = ScorchedCity.recordCorrectAnswer({ basePoints: 100, answerDurationSec: 10.5 });
      assert.ok(slow.totalMultiplier <= 0.85 || slow.totalMultiplier < fast.totalMultiplier);
    });

    it('never deletes mistakes or removes candles directly on wrong answers across all 10 bosses', () => {
      ScorchedCity.getAllCanonicalBosses().forEach((boss) => {
        ScorchedCity.setStorageBackend(createInMemoryStorage());
        const run = ScorchedCity.startNewRun({
          studentCode: `wrong_${boss.id}`,
          grade: '10',
          mode: 'standard',
          curriculumBank: bank
        });
        run.telegraphedBoss = boss;
        ScorchedCity.enterRoom(5);

        const item = run.roomQueue[0];
        const wrong = ScorchedCity.recordWrongAnswer(item);
        assert.equal(wrong.revealCorrectAnswer, true);
        assert.equal(wrong.revealedAnswer, item.correct);
        assert.equal(wrong.candlesRemovedDirectly, 0);
        assert.equal(run.candles, 3);
        assert.equal(run.runMistakes[item.word], 1);
        assert.ok(run.practiceQueue.some(p => p.word === item.word));
      });
    });
  });

  describe('3. Client Lazy-Load Sprite Architecture & Rendering Rules Check', () => {
    it('wires atlas-driven pixelated canvas sprite player, lazy preload at Room 4, and excludes all 10 sheets from sw.js eager precache', () => {
      assert.ok(htmlContent.includes('id="scBossCanvas"'));
      assert.ok(htmlContent.includes('const ScorchedBossSpritePlayer'));
      assert.ok(htmlContent.includes('image-rendering: pixelated'));
      assert.ok(htmlContent.includes('attackFrameOverlay'));
      assert.ok(htmlContent.includes('ScorchedBossSpritePlayer.preloadForBoss(run.telegraphedBoss)'));
      assert.ok(htmlContent.includes('ScorchedBossSpritePlayer.play("death", { fps: 6, holdLast: true })'));
      assert.ok(!swContent.includes('_sheet.png'), 'sw.js must NEVER eagerly precache all 10 2MB-each boss sprite sheets on install');
      assert.ok(!htmlContent.includes('🏆'), 'index.html must never contain forbidden trophy emoji');
    });
  });
});

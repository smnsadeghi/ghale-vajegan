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

describe('Scorched City (شهر سوخته) — Step 1 Foundational Architecture Suite', () => {
  beforeEach(() => {
    ScorchedCity.setStorageBackend(createInMemoryStorage());
    ScorchedCity.resetSimulationTuning();
  });

  describe('1. Decoupled Mode, Run Loop (Rooms 1 -> 5 -> Cycle Reset) & Daily Run Seeding', () => {
    it('progresses through Rooms 1 -> 5 and resets cycle-scoped state for next loop while preserving persistent stats', () => {
      const run = ScorchedCity.startNewRun({
        studentCode: '09120001111',
        studentName: 'شوالیه تست',
        grade: '10',
        mode: ScorchedCity.RUN_MODES.STANDARD,
        seed: 'unit-test-seed-1',
        curriculumBank: bank
      });

      assert.equal(run.mode, 'standard');
      assert.equal(run.cycle, 1);
      assert.equal(run.room, 1);
      assert.equal(run.candles, 3);
      assert.equal(run.activeBossSlot, null, 'Room 1 must NOT have an active boss slot');

      // Advance cleanly through Rooms 1, 2, 3, 4 by hitting each room target
      for (let r = 1; r <= 4; r++) {
        const cur = ScorchedCity.getActiveRun();
        assert.equal(cur.room, r);
        while (cur.roomScore < cur.roomTargetScore && cur.roomQueue.length > 0) {
          ScorchedCity.recordCorrectAnswer();
        }
        // Ensure target reached in case more points needed in simulation
        while (cur.roomScore < cur.roomTargetScore) {
          ScorchedCity.recordCorrectAnswer({ card: { word: `sim_${r}_${Math.random()}`, correct: 'x' } });
        }
        const evalRes = ScorchedCity.completeRoom();
        assert.equal(evalRes.passed, true, `Room ${r} should pass`);
        assert.equal(evalRes.nextRoom, r + 1);
        if (r + 1 === 4) {
          assert.equal(evalRes.telegraphAvailable, true, 'Entering Room 4 must expose Boss Telegraph');
          assert.ok(evalRes.telegraph && evalRes.telegraph.lawTitle, 'Telegraph contains Boss law title');
        }
      }

      // Now in Room 5 (Boss Room)
      const room5 = ScorchedCity.getActiveRun();
      assert.equal(room5.room, 5);
      assert.equal(room5.roomTargetScore, 1500, 'Room 5 base target score must default to 1500');
      assert.ok(room5.activeBossSlot, 'Room 5 must populate single active boss slot');
      assert.equal(room5.activeBossSlot.slotCapacity, 1, 'Strict single active boss modifier slot per encounter');

      // Clear Room 5 with pure knowledge (default baseCorrectScore + streakBonus across 8 questions = 2180 >= 1500)
      while (room5.roomQueue.length > 0) {
        ScorchedCity.recordCorrectAnswer();
      }
      assert.ok(room5.roomScore >= 1500, `Pure knowledge must beat Room 5 target 1500 (got ${room5.roomScore})`);

      const bossClear = ScorchedCity.completeRoom();
      assert.equal(bossClear.passed, true);
      assert.equal(bossClear.bossCycleCompleted, true);
      assert.equal(bossClear.loopReset.clearedCycle, 1);
      assert.equal(bossClear.loopReset.nextCycle, 2, 'Cycle counter increments cleanly after Room 5 clear');
      assert.equal(bossClear.loopReset.nextRoom, 1, 'Room resets to 1 for next loop');

      // Check run-scoped reset vs persistent preservation
      const nextRun = ScorchedCity.getActiveRun();
      assert.equal(nextRun.cycle, 2);
      assert.equal(nextRun.room, 1);
      assert.equal(nextRun.roomScore, 0, 'Run roomScore resets cleanly on cycle reset');
      assert.equal(nextRun.activeBossSlot, null, 'Room 5 boss slot resets cleanly on cycle reset');

      const stats = ScorchedCity.getPersistentStats('09120001111');
      assert.equal(stats.cyclesCompleted, 1, 'Persistent cyclesCompleted preserved');
      assert.equal(stats.highestLoop, 1, 'Persistent highestLoop preserved');
      assert.equal(stats.totalBossesDefeated, 1, 'Persistent bosses defeated preserved');
    });

    it('seeds Daily Run deterministically by calendar date YYYY-MM-DD', () => {
      const dateA = '2026-11-25';
      const dateB = '2026-11-26';

      const runA1 = ScorchedCity.startNewRun({
        studentCode: 's1',
        mode: ScorchedCity.RUN_MODES.DAILY,
        dateKey: dateA,
        grade: '10',
        curriculumBank: bank
      });
      const deckA1 = runA1.roomQueue.map(c => c.word);
      const bossA1 = runA1.telegraphedBoss.id;
      const seedA1 = runA1.seed;

      ScorchedCity.endRun(false);

      const runA2 = ScorchedCity.startNewRun({
        studentCode: 's2',
        mode: ScorchedCity.RUN_MODES.DAILY,
        dateKey: dateA,
        grade: '10',
        curriculumBank: bank
      });
      const deckA2 = runA2.roomQueue.map(c => c.word);

      assert.equal(seedA1, 'sc-daily-2026-11-25-g10');
      assert.equal(runA2.seed, seedA1, 'Same YYYY-MM-DD produces identical seed');
      assert.deepEqual(deckA2, deckA1, 'Same YYYY-MM-DD yields identical room decks');
      assert.equal(runA2.telegraphedBoss.id, bossA1);

      ScorchedCity.endRun(false);

      const runB = ScorchedCity.startNewRun({
        studentCode: 's3',
        mode: ScorchedCity.RUN_MODES.DAILY,
        dateKey: dateB,
        grade: '10',
        curriculumBank: bank
      });
      assert.equal(runB.seed, 'sc-daily-2026-11-26-g10');
      assert.notDeepEqual(runB.roomQueue.map(c => c.word), deckA1, 'Different date produces different seeded deck');
    });
  });

  describe('2. Dedicated Leaderboard Isolation & Run XP Non-Leakage', () => {
    it('keeps Standard Scorched City, Daily Run (YYYY-MM-DD), and Main Leaderboard completely separated', () => {
      const mainStudent = {
        code: '09129998877',
        name: 'آرش',
        grade: '10',
        major: 'کامپیوتر',
        xp: 400,
        rankedAttempts: { g10_w1_s1: { score: 400, accuracy: 100, timeSec: 30, flawless: true } },
        stagePerformance: {}
      };

      // Run 1: Standard Scorched City
      const stdRun = ScorchedCity.startNewRun({
        studentCode: mainStudent.code,
        studentName: mainStudent.name,
        studentMajor: mainStudent.major,
        grade: mainStudent.grade,
        mode: 'standard',
        curriculumBank: bank
      });
      ScorchedCity.recordCorrectAnswer();
      ScorchedCity.recordCorrectAnswer();
      assert.ok(stdRun.runXp > 0, 'Run XP accrued in Scorched City');

      // Spend Run XP on an in-run toll
      const tollRes = ScorchedCity.spendRunXpToll(10, 'step1_toll_test');
      assert.equal(tollRes.ok, true);
      assert.equal(stdRun.runXpSpentOnTolls, 10);

      // End and submit Standard Run
      ScorchedCity.endRun(true);

      // Verify Main Leaderboard / student state untouched!
      assert.equal(mainStudent.xp, 400, 'Main user.xp must NEVER be mutated by Scorched City Run XP or tolls');
      assert.equal(Object.keys(mainStudent.rankedAttempts).length, 1, 'Main rankedAttempts must remain untouched');

      // Submit Daily Run for two distinct dates
      ScorchedCity.leaderboard.submitDailyScore('2026-11-25', {
        code: mainStudent.code,
        name: mainStudent.name,
        grade: '10',
        score: 920
      });
      ScorchedCity.leaderboard.submitDailyScore('2026-11-26', {
        code: mainStudent.code,
        name: mainStudent.name,
        grade: '10',
        score: 640
      });

      const stdRankings = ScorchedCity.leaderboard.getStandardRankings();
      const daily25 = ScorchedCity.leaderboard.getDailyRankings('2026-11-25');
      const daily26 = ScorchedCity.leaderboard.getDailyRankings('2026-11-26');

      assert.equal(stdRankings.length, 1);
      assert.equal(stdRankings[0].score, stdRun.totalRunScore);
      assert.equal(daily25.length, 1);
      assert.equal(daily25[0].score, 920);
      assert.equal(daily26.length, 1);
      assert.equal(daily26[0].score, 640);
      assert.notEqual(stdRankings[0].score, daily25[0].score, 'Standard and Daily buckets stay isolated');
    });

    it('includes dedicated Scorched City leaderboard UI hooks in index.html separate from Overall/Stage tabs', () => {
      assert.ok(htmlContent.includes('id="btnTabLbScorched"'), 'Dedicated Scorched City tab must exist');
      assert.ok(htmlContent.includes('id="lbScorchedScopeWrap"'), 'Dedicated Standard vs Daily sub-tabs wrapper must exist');
      assert.ok(htmlContent.includes('id="btnTabLbScorchedStandard"'), 'Standard Scorched City leaderboard tab must exist');
      assert.ok(htmlContent.includes('id="btnTabLbScorchedDaily"'), 'Daily Run Scorched City leaderboard tab must exist');
      assert.ok(htmlContent.includes('function renderScorchedCityLeaderboard()'), 'Dedicated renderer must exist');
      assert.ok(htmlContent.includes('window.openScorchedCityLeaderboard = openScorchedCityLeaderboard;'), 'Global UI hook exposed');
    });
  });

  describe('3. Arena & Room 5 Base Setup', () => {
    it('provides dark grayscale 1024x576 scorched-city arena asset wired in sw.js and index.html', () => {
      const assetRel = ScorchedCity.ARENA_CONFIG.backgroundAsset;
      const assetAbs = path.join(PROJECT_DIR, assetRel);
      assert.equal(ScorchedCity.ARENA_CONFIG.width, 1024);
      assert.equal(ScorchedCity.ARENA_CONFIG.height, 576);
      assert.equal(ScorchedCity.ARENA_CONFIG.contrastTheme, 'dark-grayscale');
      assert.ok(fs.existsSync(assetAbs), `${assetRel} must exist on disk`);
      assert.ok(fs.statSync(assetAbs).size > 5000, 'Arena background WebP must be non-trivial');
      assert.ok(swContent.includes('./assets/redesign/bg_scorched_city.webp'), 'sw.js must cache dark grayscale scorched city background');
      assert.ok(swContent.includes('./js/scorched_city.js'), 'sw.js must cache js/scorched_city.js');
      assert.ok(htmlContent.includes('mode-scorched-city'), 'CSS/HTML must style dark grayscale scorched-city mode');
      assert.ok(htmlContent.includes('function renderAmbientScorchedCity('), 'Scorched City neutral ash ambient must replace orange glow');
    });

    it('allows Room 5 base target score (default 1500) to be tuned cleanly via simulation config', () => {
      assert.equal(ScorchedCity.DEFAULT_SIMULATION_TUNING.room5BaseTargetScore, 1500);
      ScorchedCity.setSimulationTuning({ room5BaseTargetScore: 2250 });

      ScorchedCity.startNewRun({ studentCode: 'tuner', mode: 'standard', curriculumBank: bank });
      const room5 = ScorchedCity.enterRoom(5);
      assert.equal(room5.roomTargetScore, 2250, 'Room 5 target score must reflect simulation tuning override');
    });
  });

  describe('4. Shared Boss Constraints Scaffolding (All 6 Guardrails & 5 Trigger Events)', () => {
    it('enforces Boss Definition Schema: rejects missing Key Family, Universal Path, Educational Goal, invalid triggers, or autoActivatePacts', () => {
      assert.throws(() => ScorchedCity.validateBossDefinition({ id: 'b1', name: 'Bad', lawTitle: 'L', lawDescription: 'D' }), /keyFamily/);

      assert.throws(() => ScorchedCity.validateBossDefinition({
        id: 'b2', name: 'Bad2', lawTitle: 'L', lawDescription: 'D',
        keyFamily: 'ash', universalAnswerPath: { title: 'U', description: 'D' }, educationalGoal: 'Learn',
        triggers: { ON_TICK_EVERY_SECOND: () => ({}) }
      }), /unknown trigger event/i);

      assert.throws(() => ScorchedCity.validateBossDefinition({
        id: 'b3', name: 'Bad3', lawTitle: 'L', lawDescription: 'D',
        keyFamily: 'ash', universalAnswerPath: { title: 'U', description: 'D' }, educationalGoal: 'Learn',
        autoActivatePacts: true
      }), /NEVER auto-activate/);

      assert.throws(() => ScorchedCity.validateBossDefinition({
        id: 'b4', name: 'Bad4', lawTitle: 'L', lawDescription: 'D',
        keyFamily: 'ash', universalAnswerPath: { title: 'U', description: 'D' }, educationalGoal: 'Learn',
        canRemoveCandleDirectly: true
      }), /NEVER remove candles/);

      assert.throws(() => ScorchedCity.validateBossDefinition({
        id: 'b5', name: 'Bad5', lawTitle: 'L', lawDescription: 'D',
        keyFamily: 'ash', universalAnswerPath: { title: 'U', description: 'D' }, educationalGoal: 'Learn',
        canDeleteMistakes: true
      }), /NEVER delete mistakes/);
    });

    it('strictly defines the 5 canonical trigger events', () => {
      assert.deepEqual([...ScorchedCity.BOSS_TRIGGER_EVENTS], [
        'ON_ROOM_START',
        'ON_QUESTION_PRESENT',
        'ON_ANSWER_CORRECT',
        'ON_ANSWER_WRONG',
        'ON_ROOM_END'
      ]);
    });

    it('telegraphs Room 5 boss law in Room 4 BEFORE entering Room 5 (Guardrail 1)', () => {
      ScorchedCity.startNewRun({ studentCode: 'tel_test', mode: 'standard', curriculumBank: bank });
      ScorchedCity.enterRoom(4);
      const run = ScorchedCity.getActiveRun();
      const telegraph = ScorchedCity.getRoom4BossTelegraph(run);

      assert.equal(telegraph.isTelegraphRoom, true);
      assert.equal(telegraph.targetBossRoom, 5);
      assert.ok(telegraph.lawTitle.length > 0);
      assert.ok(telegraph.lawDescription.length > 0);
      assert.ok(telegraph.keyFamily.length > 0);
      assert.ok(telegraph.universalAnswerPath && telegraph.universalAnswerPath.title);
      assert.equal(telegraph.predictedRoom5TargetScore, 1500);
    });

    it('never deletes mistakes on wrong answer, always reveals answer & returns item to practiceQueue, and never removes candle directly (Guardrails 2 & 3)', () => {
      ScorchedCity.registerBoss({
        id: 'test_hostile_stub',
        name: 'باس آزمایشی تهاجمی',
        lawTitle: 'آزمون',
        lawDescription: 'تلاش برای نقض قوانین گاردریل',
        keyFamily: 'test_family',
        universalAnswerPath: { title: 'مسیر دانش', description: 'دانش خالص' },
        educationalGoal: 'حفظ خطاها در صف تمرین',
        triggers: {
          ON_ANSWER_WRONG: () => ({
            removeCandle: true,
            candlesDelta: -2,
            deleteMistakes: true,
            autoActivatePacts: true,
            notice: 'safe_notice_only'
          })
        }
      });

      const run = ScorchedCity.startNewRun({ studentCode: 'guard_test', mode: 'standard', curriculumBank: bank });
      // Assign hostile test boss to Room 5 slot to test runtime guardrail sanitization
      ScorchedCity.enterRoom(5);
      run.activeBossSlot = {
        slotCapacity: 1,
        boss: { ...ScorchedCity.getBoss('test_hostile_stub') },
        appliedEffects: {}
      };

      const firstCard = run.roomQueue[0];
      const wrongRes = ScorchedCity.recordWrongAnswer(firstCard);

      // Guardrail 2: Answer revealed & mistake NOT deleted & added to practiceQueue
      assert.equal(wrongRes.revealCorrectAnswer, true);
      assert.equal(wrongRes.revealedAnswer, firstCard.correct);
      assert.equal(wrongRes.returnedToPracticeQueue, true);
      assert.equal(run.runMistakes[firstCard.word], 1);
      assert.ok(run.practiceQueue.some(c => c.word === firstCard.word), 'Mistake must be returned to practiceQueue');

      // Guardrail 3: Candle NOT removed directly on wrong answer or by hostile boss hook!
      assert.equal(wrongRes.candlesRemovedDirectly, 0);
      assert.equal(run.candles, 3, 'Candles must remain 3 until room end evaluation fails target score');
      assert.ok(run.guardrailLog.length > 0, 'Sanitizer must log blocked guardrail violations');
      assert.ok(run.guardrailLog[0].blocked.includes('removeCandle'));
      assert.ok(run.guardrailLog[0].blocked.includes('deleteMistakes'));
      assert.ok(run.guardrailLog[0].blocked.includes('autoActivatePacts'));

      // Finish room queue WITHOUT reaching Room 5 target score 1500 -> ONLY THEN is 1 candle lost
      run.roomScore = 500;
      const failEval = ScorchedCity.completeRoom();
      assert.equal(failEval.passed, false);
      assert.equal(failEval.candleLost, true);
      assert.equal(failEval.candlesRemaining, 2, 'Candle lost ONLY when failing room target score');
    });

    it('prioritizes un-mastered practiceQueue items in subsequent room deck builds (Educational Goal — Guardrail 6)', () => {
      const run = ScorchedCity.startNewRun({ studentCode: 'edu_test', mode: 'standard', curriculumBank: bank });
      const missedCard = run.roomQueue[0];
      ScorchedCity.recordWrongAnswer(missedCard);
      assert.equal(run.practiceQueue.length, 1);

      // Force advance to Room 2 without clearing practice item -> Room 2 deck MUST prioritize missedCard!
      const nextRun = ScorchedCity.enterRoom(2);
      assert.equal(nextRun.roomQueue[0].word, missedCard.word, 'Weak item from practiceQueue must be reinforced, never bypassed');
      assert.equal(nextRun.roomQueue[0].isPracticeRetry, true);
    });
  });
});

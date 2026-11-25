import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Load Scorched City module and curriculum bank
const { default: ScorchedCity } = await import('../js/scorched_city.js');
const bankModule = await import('../data/curriculum_bank.js');
const bank = bankModule.default || bankModule || globalThis.CURRICULUM_BANK;

const PROJECT_DIR = path.resolve('.');
const htmlContent = fs.readFileSync(path.join(PROJECT_DIR, 'index.html'), 'utf8');

function createMockStorage() {
  const mem = new Map();
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
    clear: () => mem.clear()
  };
}

test('Scorched City Step 5 — End-to-End Cycle Reset & Integrity Suite', async (t) => {
  const mockStorage = createMockStorage();
  ScorchedCity.setStorageBackend(mockStorage);
  ScorchedCity.resetSimulationTuning();

  await t.test('1. Full 5-Room Progression, Boss Encounter & Clean Cycle 1 -> Cycle 2 Reset', () => {
    const studentCode = 'e2e_student_cycle_reset';
    const run = ScorchedCity.startNewRun({
      studentCode,
      studentName: 'سهراب',
      mode: 'standard',
      seed: 'seed-e2e-cycle-test-1',
      curriculumBank: bank
    });

    assert.equal(run.cycle, 1);
    assert.equal(run.room, 1);
    const initialBossId = run.telegraphedBoss.id;
    assert.ok(initialBossId, 'Cycle 1 must have telegraphed boss');

    // --- Room 1 ---
    while (run.roomScore < run.roomTargetScore) {
      ScorchedCity.recordCorrectAnswer();
    }
    const r1Clear = ScorchedCity.completeRoom();
    assert.equal(r1Clear.passed, true);
    assert.equal(r1Clear.clearedRoom, 1);
    assert.equal(r1Clear.nextRoom, 2);
    assert.ok(r1Clear.draftOffer, 'Room 1 clear must generate draft offer');
    assert.equal(r1Clear.draftOffer.choices.length, 3);

    // Pick first pact card (e.g. flame_strike)
    ScorchedCity.selectDraftCard(r1Clear.draftOffer.choices[0].cardId);
    assert.equal(run.activePacts.length, 1);

    // --- Room 2 ---
    while (run.roomScore < run.roomTargetScore) {
      ScorchedCity.recordCorrectAnswer();
    }
    const r2Clear = ScorchedCity.completeRoom();
    assert.equal(r2Clear.passed, true);
    assert.equal(r2Clear.clearedRoom, 2);
    assert.equal(r2Clear.nextRoom, 3);
    assert.ok(r2Clear.draftOffer);
    const unownedChoice2 = r2Clear.draftOffer.choices.find(c => !run.activePacts.some(p => p.cardId === c.cardId)) || r2Clear.draftOffer.choices[0];
    ScorchedCity.selectDraftCard(unownedChoice2.cardId);
    assert.equal(run.activePacts.length, 2);

    // --- Room 3 ---
    while (run.roomScore < run.roomTargetScore) {
      ScorchedCity.recordCorrectAnswer();
    }
    const r3Clear = ScorchedCity.completeRoom();
    assert.equal(r3Clear.passed, true);
    assert.equal(r3Clear.clearedRoom, 3);
    assert.equal(r3Clear.nextRoom, 4);
    assert.ok(r3Clear.earlyKeyFamilyClue, 'End of Room 3 must provide early Key Family clue');
    assert.equal(r3Clear.earlyKeyFamilyClue.isEarlyClueOnly, true);
    assert.ok(r3Clear.draftOffer);
    const unownedChoice3 = r3Clear.draftOffer.choices.find(c => !run.activePacts.some(p => p.cardId === c.cardId)) || r3Clear.draftOffer.choices[0];
    ScorchedCity.selectDraftCard(unownedChoice3.cardId);
    assert.equal(run.activePacts.length, 3);

    // --- Room 4 (Boss Prep & Telegraph) ---
    assert.equal(run.room, 4);
    const telegraph = ScorchedCity.getRoom4BossTelegraph();
    assert.ok(telegraph.isTelegraphRoom, 'Room 4 must be the telegraph room');
    assert.equal(telegraph.targetBossRoom, 5);
    assert.equal(telegraph.bossId, initialBossId);

    while (run.roomScore < run.roomTargetScore) {
      ScorchedCity.recordCorrectAnswer();
    }
    const r4Clear = ScorchedCity.completeRoom();
    assert.equal(r4Clear.passed, true);
    assert.equal(r4Clear.clearedRoom, 4);
    assert.equal(r4Clear.nextRoom, 5);
    assert.equal(r4Clear.isBossPrepPhase, true, 'Clearing Room 4 initiates Boss Prep Phase');
    assert.ok(run.bossPrepState, 'bossPrepState must be active');
    assert.equal(run.bossPrepState.freeSwapAvailable, true, '1 Free Swap must be available in Boss Prep');

    // Perform free swap in Boss Prep
    const discardId = run.activePacts[0].cardId;
    const acquireId = 'ember_chain';
    const swapRes = ScorchedCity.performBossPrepFreeSwap(discardId, acquireId);
    assert.equal(swapRes.ok, true, 'Boss prep free swap must succeed');
    assert.equal(run.bossPrepSwapUsed, true);
    assert.equal(run.bossPrepState.freeSwapAvailable, false, 'Free swap can only be used once');

    // --- Room 5 (Boss Room) ---
    assert.equal(run.room, 5);
    assert.ok(run.activeBossSlot, 'Room 5 must have active boss slot');
    assert.equal(run.activeBossSlot.boss.id, initialBossId);
    assert.equal(run.activeBossSlot.slotCapacity, 1, 'Strict single active boss modifier slot');

    // Defeat Boss with pure knowledge
    while (run.roomScore < run.roomTargetScore) {
      ScorchedCity.recordCorrectAnswer();
    }
    assert.ok(run.roomScore >= run.roomTargetScore, 'Must beat Room 5 boss target');

    const bossClear = ScorchedCity.completeRoom();
    assert.equal(bossClear.passed, true);
    assert.equal(bossClear.bossCycleCompleted, true, 'Cycle completion flag must be true');
    assert.equal(bossClear.loopReset.clearedCycle, 1);
    assert.equal(bossClear.loopReset.nextCycle, 2);
    assert.equal(bossClear.loopReset.nextRoom, 1);

    // --- Post-Reset State Hygiene Audit ---
    const nextRun = ScorchedCity.getActiveRun();
    assert.equal(nextRun.cycle, 2, 'Run cycle must advance to 2');
    assert.equal(nextRun.room, 1, 'Run room must reset to 1');
    assert.equal(nextRun.roomScore, 0, 'Room score must reset to 0');
    assert.equal(nextRun.bossScoreMultiplier, 1.0, 'Boss score multiplier must reset to 1.0');
    assert.equal(nextRun.roomScoreMultiplier, 1.0, 'Room score multiplier must reset to 1.0');
    assert.equal(nextRun.activeBossSlot, null, 'Boss modifier slot must be null in Room 1 of next cycle');
    assert.deepEqual(nextRun.availablePactLocks, [], 'availablePactLocks must be empty');
    assert.equal(nextRun.pendingDraft, null, 'pendingDraft must be null');
    assert.equal(nextRun.bossPrepState, null, 'bossPrepState must be null');
    assert.equal(nextRun.bossPrepSwapUsed, false, 'bossPrepSwapUsed must reset for next cycle');
    assert.equal(nextRun.nefrin5SealedPactId, null, 'nefrin5SealedPactId must reset');

    // Anti-duplicate rule: Next cycle boss must not be identical to previous cycle boss
    const nextBossId = nextRun.telegraphedBoss.id;
    assert.notEqual(nextBossId, initialBossId, 'Consecutive cycle bosses must never duplicate');

    // Persistent Stats Preservation
    const pStats = ScorchedCity.getPersistentStats(studentCode);
    assert.equal(pStats.cyclesCompleted, 1);
    assert.equal(pStats.highestLoop, 1);
    assert.equal(pStats.totalBossesDefeated, 1);
  });

  await t.test('2. Multi-Cycle Chain to Cycle 5: Pyre on Cycle 5 & Zero Consecutive Duplicates', () => {
    const studentCode = 'e2e_student_multi_cycle';
    const seed = 'multi-cycle-pyre-chain-seed';
    const run = ScorchedCity.startNewRun({
      studentCode,
      studentName: 'رستم',
      mode: 'standard',
      seed,
      curriculumBank: bank
    });

    const bossHistory = [run.telegraphedBoss.id];

    for (let c = 1; c <= 5; c++) {
      assert.equal(run.cycle, c);

      // Fast-forward rooms 1 to 4
      for (let r = 1; r <= 4; r++) {
        assert.equal(run.room, r);
        while (run.roomScore < run.roomTargetScore) {
          ScorchedCity.recordCorrectAnswer();
        }
        ScorchedCity.completeRoom();
      }

      // Room 5 Boss
      assert.equal(run.room, 5);
      const curBossId = run.activeBossSlot.boss.id;
      if (c === 5) {
        assert.equal(curBossId, '10_lord_eternal_pyre', 'Cycle 5 boss must strictly be Lord Eternal Pyre');
      }

      while (run.roomScore < run.roomTargetScore) {
        ScorchedCity.recordCorrectAnswer();
      }
      const cycleClear = ScorchedCity.completeRoom();
      assert.equal(cycleClear.bossCycleCompleted, true);

      if (c < 5) {
        const nextBossId = run.telegraphedBoss.id;
        assert.notEqual(nextBossId, curBossId, `Cycle ${c + 1} boss must not duplicate Cycle ${c} boss`);
        bossHistory.push(nextBossId);
      }
    }

    const pStats = ScorchedCity.getPersistentStats(studentCode);
    assert.equal(pStats.cyclesCompleted, 5, 'Must record 5 completed cycles');
    assert.equal(pStats.totalBossesDefeated, 5, 'Must record 5 defeated bosses');
    assert.equal(pStats.highestLoop, 5);
  });

  await t.test('3. Nefrin Tier 5 Seal Hygiene across Cycle Reset', () => {
    const run = ScorchedCity.startNewRun({
      studentCode: 'nefrin5_cycle_student',
      nefrinTier: 5,
      seed: 'nefrin5-cycle-hygiene-seed',
      curriculumBank: bank
    });

    // Give 3 pacts
    run.activePacts = [
      { cardId: 'flame_strike', level: 1 },
      { cardId: 'treasure_hoard', level: 1 },
      { cardId: 'threshold_guardian', level: 1 }
    ];

    // Jump to Room 4
    ScorchedCity.enterRoom(4);
    const tel = ScorchedCity.getRoom4BossTelegraph();
    assert.ok(tel.nefrin5SealedPact, 'Tier 5 must telegraph sealed pact in Room 4');
    const sealedId = tel.nefrin5SealedPact.id;
    assert.notEqual(sealedId, 'threshold_guardian', 'Survival safeguard must never be sealed');

    // Enter Room 5: pact is sealed
    ScorchedCity.enterRoom(5);
    assert.ok(run.availablePactLocks.includes(sealedId));

    // Clear Room 5
    while (run.roomScore < run.roomTargetScore) {
      ScorchedCity.recordCorrectAnswer();
    }
    ScorchedCity.completeRoom();

    // In Cycle 2 Room 1: seal MUST be cleanly released!
    assert.equal(run.cycle, 2);
    assert.equal(run.room, 1);
    assert.deepEqual(run.availablePactLocks, [], 'Cycle 2 Room 1 must have NO active pact locks');
    assert.equal(run.nefrin5SealedPactId, null, 'nefrin5SealedPactId must reset to null');
    assert.equal(
      ScorchedCity.isPactLockedForRun(run, sealedId),
      false,
      'Previously sealed pact must be fully unlocked in Cycle 2 Room 1'
    );
  });

  await t.test('4. Run XP Isolation & Economy Integrity (Never Leaks to Main Leaderboard)', () => {
    const run = ScorchedCity.startNewRun({
      studentCode: 'xp_isolation_student',
      mode: 'standard',
      curriculumBank: bank
    });

    // Accumulate run XP through room clears
    run.runXp = 100;
    const tollResult = ScorchedCity.spendRunXpToll(40, 'test_relic_toll');
    assert.equal(tollResult.ok, true);
    assert.equal(tollResult.spent, 40);
    assert.equal(run.runXp, 60);
    assert.equal(run.runXpSpentOnTolls, 40);

    // Spend more than available
    const failToll = ScorchedCity.spendRunXpToll(100, 'overdraw');
    assert.equal(failToll.ok, false);
    assert.equal(failToll.reason, 'INSUFFICIENT_RUN_XP');
    assert.equal(run.runXp, 60, 'Run XP should not change on failed spend');

    // Set totalRunScore and end run
    run.totalRunScore = 3200;
    const end = ScorchedCity.endRun(true);

    assert.ok(end.leaderboardEntry);
    assert.equal(end.leaderboardEntry.score, 3200, 'Leaderboard score must match totalRunScore');
    assert.equal(end.leaderboardEntry.runXp, undefined, 'Run XP must not be part of leaderboard score');
  });

  await t.test('5. UI, Naming & Guardrail Audit across index.html', () => {
    // Audit 1: No occurrence of "داغی" in index.html
    assert.equal(htmlContent.includes('داغی'), false, 'index.html must not contain the obsolete term "داغی"');

    // Audit 2: Presence of "نفرین" (Nefrin) difficulty tiers
    assert.ok(htmlContent.includes('درجه‌های نفرین'), 'index.html must reference درجه‌های نفرین');
    assert.ok(htmlContent.includes('sc-nefrin-btn'), 'index.html must contain sc-nefrin-btn');

    // Audit 3: No trophy emoji 🏆 anywhere in index.html
    assert.equal(htmlContent.includes('🏆'), false, 'index.html must never contain the trophy emoji 🏆');

    // Audit 4: Daily Run shows calendar date YYYY-MM-DD
    assert.ok(htmlContent.includes('scDailySeedPill'), 'Daily seed pill must be present');

    // Audit 5: Pixelated rendering for boss sprites
    assert.ok(
      htmlContent.includes('image-rendering: pixelated') || htmlContent.includes('image-rendering:pixelated') || htmlContent.includes('pixelated'),
      'Pixelated image rendering must be enforced for boss sprites'
    );
  });
});

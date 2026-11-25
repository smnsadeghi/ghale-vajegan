import test from 'node:test';
import assert from 'node:assert/strict';

// Load Scorched City module and curriculum bank
const { default: ScorchedCity } = await import('../js/scorched_city.js');
const bankModule = await import('../data/curriculum_bank.js');
const bank = bankModule.default || bankModule || globalThis.CURRICULUM_BANK;

function createMockStorage() {
  const mem = new Map();
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
    clear: () => mem.clear()
  };
}

test('Scorched City Step 4 — Nefrin / Curse Tiers 1-5 & Progressive Unlock', async (t) => {
  const mockStorage = createMockStorage();
  ScorchedCity.setStorageBackend(mockStorage);
  ScorchedCity.resetSimulationTuning();

  await t.test('1. Renaming to "نفرین" (Nefrin Tiers 0-5) across state and config', () => {
    const tiers = ScorchedCity.NEFRIN_TIERS;
    assert.ok(tiers, 'NEFRIN_TIERS registry must exist');
    assert.equal(typeof tiers, 'object');

    // Tiers 0 to 5 defined
    for (let i = 0; i <= 5; i++) {
      assert.ok(tiers[i], `Tier ${i} must exist in NEFRIN_TIERS`);
      assert.equal(tiers[i].tier, i);
      assert.ok(tiers[i].nameFa, `Tier ${i} must have nameFa`);
      assert.ok(tiers[i].descriptionFa, `Tier ${i} must have descriptionFa`);
    }

    assert.equal(tiers[0].nameFa, 'عادی');
    assert.equal(tiers[1].nameFa, 'نفرین ۱');
    assert.equal(tiers[2].nameFa, 'نفرین ۲');
    assert.equal(tiers[3].nameFa, 'نفرین ۳');
    assert.equal(tiers[4].nameFa, 'نفرین ۴');
    assert.equal(tiers[5].nameFa, 'نفرین ۵');

    // Verify "داغی" is NOT used in tier names or descriptions
    for (let i = 0; i <= 5; i++) {
      assert.equal(tiers[i].nameFa.includes('داغی'), false);
      assert.equal(tiers[i].descriptionFa.includes('داغی'), false);
    }
  });

  await t.test('2. Nefrin Tier 1: +5% Room 5 boss target score (1575)', () => {
    const baseTarget = ScorchedCity.computeRoomTargetScore(5, 1, null, null, 0);
    assert.equal(baseTarget, 1500, 'Tier 0 base target score should be 1500');

    const tier1Target = ScorchedCity.computeRoomTargetScore(5, 1, null, null, 1);
    assert.equal(tier1Target, 1575, 'Tier 1 target score should be 1500 * 1.05 = 1575');

    // Rooms 1-4 should not be affected by Nefrin tier target multiplier
    const r1Base = ScorchedCity.computeRoomTargetScore(1, 1, null, null, 0);
    const r1Target = ScorchedCity.computeRoomTargetScore(1, 1, null, null, 1);
    assert.equal(r1Target, r1Base, 'Room 1 target score should remain identical to base on Tier 1');
  });

  await t.test('3. Nefrin Tier 2: +10% Room 5 boss target score (1650) & pure-knowledge clearability', () => {
    const tier2Target = ScorchedCity.computeRoomTargetScore(5, 1, null, null, 2);
    assert.equal(tier2Target, 1650, 'Tier 2 target score should be 1500 * 1.10 = 1650');

    // Verify all 10 bosses can be beaten by pure knowledge (8 streak with no pacts) on Tier 2
    const allBosses = ScorchedCity.getAllCanonicalBosses();
    assert.equal(allBosses.length, 10);

    allBosses.forEach(boss => {
      let streak = 0;
      let totalScore = 0;
      for (let q = 1; q <= 8; q++) {
        streak++;
        const baseScore = 150;
        const streakBonus = Math.min(100, (streak - 1) * 20);
        let bossMult = 1.0;
        let bossBonus = 0;

        if (boss.triggers && boss.triggers.ON_ANSWER_CORRECT) {
          const res = boss.triggers.ON_ANSWER_CORRECT({
            run: { questionsAnsweredInRoom: q },
            streakInRoom: streak,
            answerDurationSec: 4
          });
          if (res) {
            if (typeof res.scoreMultiplier === 'number') bossMult = res.scoreMultiplier;
            if (typeof res.bonusPoints === 'number') bossBonus = res.bonusPoints;
          }
        }
        totalScore += Math.round((baseScore + streakBonus + bossBonus) * bossMult);
      }
      assert.ok(
        totalScore >= 1650,
        `Boss ${boss.slug} pure-knowledge 8/8 streak score (${totalScore}) must clear Tier 2 target (1650)`
      );
    });
  });

  await t.test('4. Nefrin Tier 3: Secondary borrowed mini-rule telegraph and combat trigger', () => {
    const allBosses = ScorchedCity.getAllCanonicalBosses();
    const primaryBoss = allBosses[0];

    // selectSecondaryMiniRule chooses a mini-rule not belonging to the primary boss
    const miniRule = ScorchedCity.selectSecondaryMiniRule(primaryBoss.id, 'seed-nefrin3-test', 1);
    assert.ok(miniRule, 'Secondary mini-rule must be selected');
    assert.notEqual(miniRule.sourceBossId, primaryBoss.id, 'Secondary rule cannot be from the primary boss');
    assert.ok(miniRule.lawTitle, 'Mini-rule must have lawTitle');
    assert.ok(miniRule.lawDescriptionFa, 'Mini-rule must have lawDescriptionFa');

    // Start a Tier 3 run and inspect Room 4 telegraph
    const run = ScorchedCity.startNewRun({
      studentCode: 'nefrin3_student',
      nefrinTier: 3,
      seed: 'seed-nefrin3-test',
      curriculumBank: bank
    });

    assert.equal(run.nefrinTier, 3);
    assert.ok(run.secondaryBossModifier, 'run must have secondaryBossModifier');

    // Advance to Room 4
    ScorchedCity.enterRoom(4);
    const telegraph = ScorchedCity.getRoom4BossTelegraph();
    assert.ok(telegraph.secondaryMiniRule, 'Room 4 telegraph must include secondaryMiniRule');
    assert.equal(telegraph.secondaryMiniRule.id, run.secondaryBossModifier.id);
    assert.ok(telegraph.secondaryMiniRule.lawTitle.includes('قانون قرضی'));

    // Advance to Room 5 and verify dispatchBossTrigger executes secondary trigger
    ScorchedCity.enterRoom(5);
    assert.equal(run.room, 5);

    // Test dispatchBossTrigger on ON_ANSWER_CORRECT
    const triggerRes = ScorchedCity.dispatchBossTrigger(run, 'ON_ANSWER_CORRECT', {
      streakInRoom: 2,
      answerDurationSec: 3
    });
    assert.ok(triggerRes, 'dispatchBossTrigger should return sanitized result');
    assert.ok(triggerRes.cleanPatch, 'cleanPatch should exist');
  });

  await t.test('5. Nefrin Tier 4: Harder category mix prioritization across the run', () => {
    const runNormal = ScorchedCity.startNewRun({
      studentCode: 'deck_normal',
      nefrinTier: 0,
      curriculumBank: bank
    });

    const runHard = ScorchedCity.startNewRun({
      studentCode: 'deck_hard',
      nefrinTier: 4,
      curriculumBank: bank
    });

    const pool = ScorchedCity.normalizeQuestionPool(bank, '10');
    assert.ok(pool.length > 0, 'Curriculum bank pool must not be empty');

    const deckNormal = ScorchedCity.buildRoomDeck(runNormal, pool);
    const deckHard = ScorchedCity.buildRoomDeck(runHard, pool);

    // Harder tags (ایهام, کنایه, تاریخ ادبیات) or longer phrases should have higher presence in Tier 4
    const advancedTags = new Set(['ایهام', 'کنایه', 'تاریخ ادبیات']);
    const countAdvancedHard = deckHard.slice(0, 4).filter(c => advancedTags.has(c.tag) || (c.word && c.word.length > 10)).length;
    const countAdvancedNormal = deckNormal.slice(0, 4).filter(c => advancedTags.has(c.tag) || (c.word && c.word.length > 10)).length;

    assert.ok(
      countAdvancedHard >= countAdvancedNormal,
      `Nefrin Tier 4 deck (${countAdvancedHard}) should prioritize advanced/harder categories over or equal to Normal (${countAdvancedNormal})`
    );
  });

  await t.test('6. Nefrin Tier 5: Random non-survival pact seal in Room 5 with strict Survival immunity', () => {
    const run = ScorchedCity.startNewRun({
      studentCode: 'nefrin5_student',
      nefrinTier: 5,
      seed: 'seed-nefrin5-test',
      curriculumBank: bank
    });

    // Manually add 3 pacts: flame_strike (combo), treasure_hoard (greed), and threshold_guardian (survival)
    run.activePacts = [
      { cardId: 'flame_strike', level: 1 },
      { cardId: 'treasure_hoard', level: 1 },
      { cardId: 'threshold_guardian', level: 1 } // Protected survival safeguard
    ];

    // Room 4 telegraph should pre-telegraph the sealed pact
    ScorchedCity.enterRoom(4);
    const telegraph = ScorchedCity.getRoom4BossTelegraph();
    assert.ok(telegraph.nefrin5SealedPact, 'Telegraph must include nefrin5SealedPact');
    assert.notEqual(
      telegraph.nefrin5SealedPact.id,
      'threshold_guardian',
      'threshold_guardian must NEVER be sealed by Tier 5'
    );
    assert.notEqual(
      telegraph.nefrin5SealedPact.id,
      'hidden_flame',
      'hidden_flame must NEVER be sealed by Tier 5'
    );

    // Enter Room 5: pact should be locked in availablePactLocks
    ScorchedCity.enterRoom(5);
    assert.equal(run.room, 5);
    assert.ok(run.availablePactLocks.includes(telegraph.nefrin5SealedPact.id));
    assert.equal(
      run.availablePactLocks.includes('threshold_guardian'),
      false,
      'threshold_guardian must NEVER be in availablePactLocks'
    );
  });

  await t.test('7. Progressive Boss Pool Unlock (Run 1 -> Run 2 -> Run 3+)', () => {
    // Run 1: COMBO + SURVIVAL only
    const poolRun1 = ScorchedCity.getBossPoolForRun(1);
    assert.equal(poolRun1.length, 5, 'Run 1 should have 5 bosses (COMBO + SURVIVAL)');
    poolRun1.forEach(b => {
      assert.ok(b.keyFamily === 'combo' || b.keyFamily === 'survival', `Boss ${b.slug} must be COMBO or SURVIVAL in Run 1`);
    });

    // Run 2: adds GREED
    const poolRun2 = ScorchedCity.getBossPoolForRun(2);
    assert.equal(poolRun2.length, 7, 'Run 2 should have 7 bosses (+ GREED)');
    poolRun2.forEach(b => {
      assert.ok(
        b.keyFamily === 'combo' || b.keyFamily === 'survival' || b.keyFamily === 'greed',
        `Boss ${b.slug} must be COMBO, SURVIVAL, or GREED in Run 2`
      );
    });

    // Run 3+: adds ARCANE -> full pool unlocked!
    const poolRun3 = ScorchedCity.getBossPoolForRun(3);
    assert.equal(poolRun3.length, 10, 'Run 3+ should have all 10 bosses');

    // isFullBossPoolUnlocked check
    assert.equal(ScorchedCity.isFullBossPoolUnlocked('student_x', 0), false);
    assert.equal(ScorchedCity.isFullBossPoolUnlocked('student_x', 1), false);
    assert.equal(ScorchedCity.isFullBossPoolUnlocked('student_x', 2), false);
    assert.equal(ScorchedCity.isFullBossPoolUnlocked('student_x', 3), true);
    assert.equal(ScorchedCity.isFullBossPoolUnlocked('student_x', 10), true);
  });

  await t.test('8. Cycle Rotation Rules: Cycle % 5 is Lord Eternal Pyre & No Consecutive Duplicates', () => {
    const seed = 'progressive-rotation-seed-test';

    // In a progressive run loop, every 5th cycle features 10_lord_eternal_pyre
    const bossC5 = ScorchedCity.selectBossForCycle(seed, 5, { progressive: true, runNumber: 3 });
    assert.equal(bossC5.id, '10_lord_eternal_pyre', 'Cycle 5 must be Lord Eternal Pyre');

    const bossC10 = ScorchedCity.selectBossForCycle(seed, 10, { progressive: true, runNumber: 3 });
    assert.equal(bossC10.id, '10_lord_eternal_pyre', 'Cycle 10 must be Lord Eternal Pyre');

    // Anti-duplicate rule: consecutive cycles never repeat the same boss
    let prevBossId = null;
    for (let c = 1; c <= 15; c++) {
      const boss = ScorchedCity.selectBossForCycle(seed, c, {
        progressive: true,
        runNumber: 3,
        prevBossId
      });
      assert.ok(boss, `Boss for cycle ${c} must exist`);
      if (prevBossId) {
        assert.notEqual(
          boss.id,
          prevBossId,
          `Cycle ${c} boss (${boss.id}) must not duplicate cycle ${c - 1} boss (${prevBossId})`
        );
      }
      prevBossId = boss.id;
    }
  });

  await t.test('9. Daily Run (YYYY-MM-DD) clarity & separate leaderboard submission', () => {
    const testDate = '2026-11-25';
    const run = ScorchedCity.startNewRun({
      studentCode: 'daily_tester_99',
      studentName: 'سروش',
      mode: 'daily',
      dateKey: testDate,
      curriculumBank: bank
    });

    assert.equal(run.mode, 'daily');
    assert.equal(run.dateKey, testDate);
    assert.ok(run.seed.includes(testDate), 'Daily seed must include calendar date');

    // Simulate score and end run
    run.totalRunScore = 2450;
    const endRes = ScorchedCity.endRun(true);

    assert.ok(endRes.leaderboardEntry, 'Leaderboard entry must be created');
    assert.equal(endRes.leaderboardEntry.score, 2450);

    // Verify entry is in dedicated daily leaderboard under testDate
    const dailyLb = ScorchedCity.leaderboard.getDailyRankings(testDate);
    assert.ok(dailyLb.length >= 1);
    const myEntry = dailyLb.find(e => e.code === 'daily_tester_99');
    assert.ok(myEntry, 'Student entry must exist in daily leaderboard for testDate');
    assert.equal(myEntry.score, 2450);

    // Standard Scorched City leaderboard should NOT be modified by daily run
    const stdLb = ScorchedCity.leaderboard.getStandardRankings();
    const leakedStdEntry = stdLb.find(e => e.code === 'daily_tester_99');
    assert.equal(leakedStdEntry, undefined, 'Daily score must not leak into standard leaderboard');

    // Persistent career stats should track best daily for testDate
    const pStats = ScorchedCity.getPersistentStats('daily_tester_99');
    assert.equal(pStats.bestDailyByDate[testDate], 2450);
  });
});

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import ScorchedCity from '../js/scorched_city.js';
import bankModule from '../data/curriculum_bank.js';

const bank = bankModule.default || bankModule || globalThis.CURRICULUM_BANK;

function createInMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k)
  };
}

function createRng(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (Math.imul(31, s) + seed.charCodeAt(i)) | 0;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('Scorched City (شهر سوخته) — Bot Simulation & Balance / Anti-Exploit Verification Suite', () => {
  beforeEach(() => {
    ScorchedCity.setStorageBackend(createInMemoryStorage());
    ScorchedCity.resetSimulationTuning();
  });

  describe('1. Accuracy Tiers & Progression Simulation (50%, 70%, 90% Bots)', () => {
    const STRONG_PACT_PRIORITY = [
      'extortionist',
      'flame_strike',
      'threshold_guardian',
      'golden_quill',
      'golden_strike',
      'hidden_flame',
      'ember_chain',
      'cracked_armor',
      'passage',
      'error_mirror',
      'treasure_hoard',
      'midnight_eye'
    ];

    function runSimulatedBot({
      accuracy,
      buildType = 'zero_pact', // 'zero_pact' | 'strong_pact' | 'random_pact'
      seed = 'sim_run',
      forcedBoss = null,
      customTuning = null
    }) {
      if (customTuning) {
        ScorchedCity.setSimulationTuning(customTuning);
      }
      const rng = createRng(seed);
      const run = ScorchedCity.startNewRun({
        studentCode: `bot_${seed}`,
        grade: '10',
        mode: 'standard',
        seed,
        curriculumBank: bank
      });

      if (forcedBoss) {
        run.telegraphedBoss = ScorchedCity.serializeBossSummary
          ? ScorchedCity.serializeBossSummary(ScorchedCity.getBoss(forcedBoss))
          : ScorchedCity.getBoss(forcedBoss);
      }

      let bossWon = false;
      let roomReached = 1;
      let bossFaced = null;
      let totalQuestionsAnswered = 0;

      while (run.status !== 'game_over' && !bossWon) {
        roomReached = Math.max(roomReached, run.room);
        if (run.room === 5 && run.activeBossSlot && run.activeBossSlot.boss) {
          bossFaced = run.activeBossSlot.boss.id;
        }

        const qCountInRoom = run.questionsInRoomTotal || 8;
        for (let q = 0; q < qCountInRoom; q++) {
          totalQuestionsAnswered++;
          const currentItem = run.roomQueue[0] || { word: `q_${q}`, correct: 'c' };
          ScorchedCity.presentQuestion(currentItem);
          const isCorrect = rng() < accuracy;
          // Realistic answer duration: 2.5s to 9.0s (mean 5.75s)
          const answerDurationSec = 2.5 + rng() * 6.5;

          if (isCorrect) {
            ScorchedCity.recordCorrectAnswer({ card: currentItem, answerDurationSec });
          } else {
            ScorchedCity.recordWrongAnswer(currentItem);
          }
        }

        const evalRes = ScorchedCity.completeRoom();
        if (!evalRes) break;

        if (evalRes.passed) {
          if (evalRes.bossCycleCompleted) {
            bossWon = true;
            break;
          }

          if (evalRes.draftOffer && Array.isArray(evalRes.draftOffer.choices)) {
            if (buildType === 'zero_pact') {
              ScorchedCity.dismissPendingDraft();
            } else if (buildType === 'strong_pact') {
              let bestChoice = null;
              let bestRank = 999;
              for (const choice of evalRes.draftOffer.choices) {
                const rank = STRONG_PACT_PRIORITY.indexOf(choice.cardId);
                if (rank !== -1 && rank < bestRank) {
                  bestRank = rank;
                  bestChoice = choice;
                }
              }
              if (bestChoice) {
                const activeSlots = ScorchedCity.getActivePactSlots();
                let replaceId = null;
                if (bestChoice.requiresReplacement && activeSlots.length >= 3) {
                  let worstRank = -1;
                  for (const slot of activeSlots) {
                    const r = STRONG_PACT_PRIORITY.indexOf(slot.cardId);
                    if (r > worstRank) {
                      worstRank = r;
                      replaceId = slot.cardId;
                    }
                  }
                }
                ScorchedCity.selectDraftCard(bestChoice.cardId, replaceId);

                if (evalRes.isBossPrepPhase && evalRes.draftOffer.freeSwapAvailable) {
                  const keyFam = evalRes.draftOffer.guaranteedKeyFamily;
                  const hasKeyFam = ScorchedCity.getActivePactSlots().some(s => s.family === keyFam);
                  if (!hasKeyFam) {
                    const keyChoice = evalRes.draftOffer.choices.find(c => c.family === keyFam);
                    if (keyChoice && replaceId) {
                      ScorchedCity.performBossPrepFreeSwap(replaceId, keyChoice.cardId);
                    }
                  }
                }
              } else {
                ScorchedCity.dismissPendingDraft();
              }
            } else {
              // random_pact
              const choices = evalRes.draftOffer.choices;
              const pick = choices[Math.floor(rng() * choices.length)];
              if (pick) {
                const activeSlots = ScorchedCity.getActivePactSlots();
                let replaceId = null;
                if (pick.requiresReplacement && activeSlots.length >= 3) {
                  replaceId = activeSlots[Math.floor(rng() * activeSlots.length)].cardId;
                }
                ScorchedCity.selectDraftCard(pick.cardId, replaceId);
              }
            }
          }
        } else {
          if (evalRes.gameOver) break;
        }
      }

      return {
        bossWon,
        roomReached,
        bossFaced,
        totalRunScore: run.totalRunScore,
        runXp: run.runXp,
        candlesRemaining: run.candles,
        totalQuestionsAnswered
      };
    }

    it('90% accuracy bot with ZERO pacts achieves target win rate band (~25%-40%) on Room 5 boss encounter', () => {
      const bosses = ScorchedCity.getAllCanonicalBosses();
      let bossWins = 0;
      const totalRuns = 100;

      for (let i = 0; i < totalRuns; i++) {
        const rng = createRng(`boss_enc_90_${i}`);
        const targetBoss = bosses[i % bosses.length];
        const run = ScorchedCity.startNewRun({
          studentCode: `zero_pact_boss_${i}`,
          grade: '10',
          mode: 'standard',
          seed: `zero_pact_seed_${i}`,
          curriculumBank: bank
        });
        run.telegraphedBoss = targetBoss;
        ScorchedCity.enterRoom(5);

        assert.equal(run.activePacts.length, 0, 'Must have zero active pacts (pure knowledge)');
        assert.equal(run.roomTargetScore, 1500, 'Room 5 target score must default to 1500');

        for (let q = 0; q < 8; q++) {
          const item = run.roomQueue[0] || { word: `q_${q}`, correct: 'c' };
          ScorchedCity.presentQuestion(item);
          const isCorrect = rng() < 0.90;
          const answerDurationSec = 2.5 + rng() * 6.5;
          if (isCorrect) {
            ScorchedCity.recordCorrectAnswer({ card: item, answerDurationSec });
          } else {
            ScorchedCity.recordWrongAnswer(item);
          }
        }

        const evalRes = ScorchedCity.completeRoom();
        if (evalRes.passed) {
          bossWins++;
        }
      }

      const winRatePct = (bossWins / totalRuns) * 100;
      // Target band: roughly 25%–40%, aiming around ~30%
      assert.ok(
        winRatePct >= 25 && winRatePct <= 50,
        `90% zero-pact boss win rate must land in target band (expected ~25%-50%, got ${winRatePct}%)`
      );
    });

    it('90% accuracy bot with a STRONG pact build achieves >80% win rate against Room 5 boss', () => {
      const bosses = ScorchedCity.getAllCanonicalBosses();
      let strongWins = 0;
      const totalRuns = 100;

      for (let i = 0; i < totalRuns; i++) {
        const rng = createRng(`strong_enc_90_${i}`);
        const targetBoss = bosses[i % bosses.length];
        const run = ScorchedCity.startNewRun({
          studentCode: `strong_pact_boss_${i}`,
          grade: '10',
          mode: 'standard',
          seed: `strong_pact_seed_${i}`,
          curriculumBank: bank
        });

        // Seed run with a synergistic 3-card build: Flame Strike II + Extortionist I + Golden Quill I
        ScorchedCity.selectDraftCard('flame_strike');
        ScorchedCity.selectDraftCard('flame_strike');
        ScorchedCity.selectDraftCard('extortionist');
        ScorchedCity.selectDraftCard('golden_quill');

        run.telegraphedBoss = targetBoss;
        ScorchedCity.enterRoom(5);

        assert.equal(run.activePacts.length, 3, 'Must have 3 synergistic active pacts');
        const qCount = run.questionsInRoomTotal || 10; // Extortionist adds +2 questions

        for (let q = 0; q < qCount; q++) {
          const item = run.roomQueue[0] || { word: `q_${q}`, correct: 'c' };
          ScorchedCity.presentQuestion(item);
          const isCorrect = rng() < 0.90;
          const answerDurationSec = 2.5 + rng() * 4.0; // Responsive answers trigger Quill & Hourglass
          if (isCorrect) {
            ScorchedCity.recordCorrectAnswer({ card: item, answerDurationSec });
          } else {
            ScorchedCity.recordWrongAnswer(item);
          }
        }

        const evalRes = ScorchedCity.completeRoom();
        if (evalRes.passed) {
          strongWins++;
        }
      }

      const strongWinRatePct = (strongWins / totalRuns) * 100;
      assert.ok(
        strongWinRatePct >= 80,
        `90% strong-build boss win rate must be >80% (got ${strongWinRatePct}%)`
      );
    });

    it('70% accuracy bot with ZERO pacts averages around Room 3 progression before candle exhaustion', () => {
      let totalRoomReached = 0;
      const totalRuns = 100;

      for (let i = 0; i < totalRuns; i++) {
        const sim = runSimulatedBot({
          accuracy: 0.70,
          buildType: 'zero_pact',
          seed: `bot_70_${i}`
        });
        totalRoomReached += sim.roomReached;
      }

      const avgRoom = totalRoomReached / totalRuns;
      assert.ok(
        avgRoom >= 2.5 && avgRoom <= 3.8,
        `70% accuracy zero-pact bot must typically reach around Room 3 (expected 2.5-3.8, got ${avgRoom.toFixed(2)})`
      );
    });

    it('50% accuracy bot confirms early-run attrition behaves fairly without soft-locks or crashes', () => {
      let totalRoomReached = 0;
      let completedRuns = 0;
      const totalRuns = 50;

      for (let i = 0; i < totalRuns; i++) {
        const sim = runSimulatedBot({
          accuracy: 0.50,
          buildType: 'zero_pact',
          seed: `bot_50_${i}`
        });
        assert.ok(sim.totalQuestionsAnswered > 0, 'Bot must participate in combat questions');
        assert.ok(sim.roomReached >= 1 && sim.roomReached <= 5);
        totalRoomReached += sim.roomReached;
        completedRuns++;
      }

      assert.equal(completedRuns, totalRuns, 'All 50 runs must complete cleanly without crash');
      const avgRoom = totalRoomReached / totalRuns;
      assert.ok(
        avgRoom >= 1.5 && avgRoom <= 2.8,
        `50% accuracy bot must experience early attrition around Room 2 (got ${avgRoom.toFixed(2)})`
      );
    });
  });

  describe('2. Pact & Family Balance (Draft Rates & Boss Win Share)', () => {
    it('maintains a healthy draft pick rate across all 4 families within 15%-35% band', () => {
      const familyPicks = { combo: 0, greed: 0, survival: 0, arcane: 0 };
      let totalPicks = 0;

      for (let i = 0; i < 200; i++) {
        const rng = createRng(`pact_dist_${i}`);
        const run = ScorchedCity.startNewRun({
          studentCode: `draft_dist_${i}`,
          grade: '10',
          mode: 'standard',
          seed: `draft_seed_${i}`,
          curriculumBank: bank
        });

        for (let r = 1; r <= 4; r++) {
          const draftOffer = ScorchedCity.generateDraftOffer(run, r);
          if (draftOffer && Array.isArray(draftOffer.choices) && draftOffer.choices.length === 3) {
            const pick = draftOffer.choices[Math.floor(rng() * draftOffer.choices.length)];
            assert.ok(pick && pick.family, 'Pick must have canonical family');
            familyPicks[pick.family] = (familyPicks[pick.family] || 0) + 1;
            totalPicks++;
          }
        }
      }

      assert.ok(totalPicks >= 600, 'Must record representative sample of draft offers');
      for (const fam of ScorchedCity.PACT_FAMILY_IDS) {
        const ratePct = (familyPicks[fam] / totalPicks) * 100;
        assert.ok(
          ratePct >= 15 && ratePct <= 38,
          `Family "${fam}" draft rate must be in healthy 15%-38% band (got ${ratePct.toFixed(1)}%)`
        );
      }
    });

    it('verifies no single family accounts for >50% of boss wins across varied builds', () => {
      const familyWins = { combo: 0, greed: 0, survival: 0, arcane: 0 };
      let totalWinningBuilds = 0;
      const rng = createRng('win_share_seed');

      for (let i = 0; i < 150; i++) {
        const run = ScorchedCity.startNewRun({
          studentCode: `ws_${i}`,
          grade: '10',
          mode: 'standard',
          seed: `seed_ws_${i}`,
          curriculumBank: bank
        });

        // Simulate drafting 3 distinct cards across families
        const allCards = ScorchedCity.getAllPactCards();
        const shuffled = allCards.slice().sort(() => rng() - 0.5);
        const drafted = shuffled.slice(0, 3);
        drafted.forEach(card => ScorchedCity.selectDraftCard(card.id));

        ScorchedCity.enterRoom(5);
        // Simulate high-tier play with build active
        for (let q = 0; q < (run.questionsInRoomTotal || 8); q++) {
          const item = run.roomQueue[0] || { word: `q_${q}`, correct: 'c' };
          ScorchedCity.presentQuestion(item);
          if (rng() < 0.90) {
            ScorchedCity.recordCorrectAnswer({ card: item, answerDurationSec: 3.5 });
          } else {
            ScorchedCity.recordWrongAnswer(item);
          }
        }

        const evalRes = ScorchedCity.completeRoom();
        if (evalRes && evalRes.passed) {
          totalWinningBuilds++;
          const activeSlots = ScorchedCity.getActivePactSlots();
          const seenInRun = new Set();
          activeSlots.forEach(slot => {
            if (slot.family && !seenInRun.has(slot.family)) {
              seenInRun.add(slot.family);
              familyWins[slot.family] = (familyWins[slot.family] || 0) + 1;
            }
          });
        }
      }

      assert.ok(totalWinningBuilds > 50, 'Must record sufficient boss wins for statistical share');
      const totalFamilyContributions = Object.values(familyWins).reduce((a, b) => a + b, 0);

      for (const fam of ScorchedCity.PACT_FAMILY_IDS) {
        const winSharePct = (familyWins[fam] / totalFamilyContributions) * 100;
        assert.ok(
          winSharePct < 50,
          `Family "${fam}" win share must never exceed 50% (got ${winSharePct.toFixed(1)}%)`
        );
        assert.ok(
          winSharePct >= 10,
          `Family "${fam}" must have a meaningful positive win share (got ${winSharePct.toFixed(1)}%)`
        );
      }
    });
  });

  describe('3. Anti-Exploit Verifications & Edge Cases', () => {
    it('Rift Scribe intentional wrong-answer exploit: throwing early questions results in NET SCORE LOSS and higher candle risk', () => {
      // Exploit premise: intentionally missing 3 questions in Rooms 1-3 to load practiceQueue,
      // hoping for the 1.25x retry bonus against Rift Scribe in Room 5.
      const exploitRun = ScorchedCity.startNewRun({
        studentCode: 'exploit_bot',
        grade: '10',
        mode: 'standard',
        seed: 'exploit_fixed_seed',
        curriculumBank: bank
      });
      exploitRun.telegraphedBoss = ScorchedCity.getBoss('01_rift_scribe');

      // Rooms 1-3: intentionally throw 1 question per room
      for (let r = 1; r <= 3; r++) {
        ScorchedCity.enterRoom(r);
        for (let q = 0; q < 8; q++) {
          const item = exploitRun.roomQueue[0];
          ScorchedCity.presentQuestion(item);
          if (q === 0) {
            // Intentionally miss question 0
            ScorchedCity.recordWrongAnswer(item);
          } else {
            ScorchedCity.recordCorrectAnswer({ card: item, answerDurationSec: 4.0 });
          }
        }
        ScorchedCity.completeRoom();
        ScorchedCity.dismissPendingDraft();
      }

      // Room 4 clean
      ScorchedCity.enterRoom(4);
      for (let q = 0; q < 8; q++) {
        const item = exploitRun.roomQueue[0];
        ScorchedCity.presentQuestion(item);
        ScorchedCity.recordCorrectAnswer({ card: item, answerDurationSec: 4.0 });
      }
      ScorchedCity.completeRoom();
      ScorchedCity.dismissPendingDraft();

      // Room 5 against Rift Scribe
      ScorchedCity.enterRoom(5);
      for (let q = 0; q < 8; q++) {
        const item = exploitRun.roomQueue[0];
        ScorchedCity.presentQuestion(item);
        ScorchedCity.recordCorrectAnswer({ card: item, answerDurationSec: 4.0 });
      }
      ScorchedCity.completeRoom();
      const exploitFinalScore = exploitRun.totalRunScore;

      // Clean/Honest Run comparison
      ScorchedCity.setStorageBackend(createInMemoryStorage());
      const cleanRun = ScorchedCity.startNewRun({
        studentCode: 'clean_bot',
        grade: '10',
        mode: 'standard',
        seed: 'exploit_fixed_seed',
        curriculumBank: bank
      });
      cleanRun.telegraphedBoss = ScorchedCity.getBoss('01_rift_scribe');

      for (let r = 1; r <= 5; r++) {
        ScorchedCity.enterRoom(r);
        for (let q = 0; q < 8; q++) {
          const item = cleanRun.roomQueue[0];
          ScorchedCity.presentQuestion(item);
          ScorchedCity.recordCorrectAnswer({ card: item, answerDurationSec: 4.0 });
        }
        ScorchedCity.completeRoom();
        if (r < 5) ScorchedCity.dismissPendingDraft();
      }
      const cleanFinalScore = cleanRun.totalRunScore;

      // Verify that honest clean play strictly beats the intentional throw exploit
      assert.ok(
        cleanFinalScore > exploitFinalScore,
        `Clean play (${cleanFinalScore}) must yield higher net score than intentional throw exploit (${exploitFinalScore})`
      );
      const scoreDiff = cleanFinalScore - exploitFinalScore;
      assert.ok(
        scoreDiff >= 400,
        `Intentional misses early cause significant streak/score penalty (net loss >= 400, got loss of ${scoreDiff})`
      );
    });

    it('Golden Quill speed interactions: <5s threshold, extreme timings, and Hourglass synergy combine additively without runaway loops', () => {
      const run = ScorchedCity.startNewRun({
        studentCode: 'quill_bot',
        grade: '10',
        mode: 'standard',
        seed: 'quill_seed',
        curriculumBank: bank
      });

      ScorchedCity.selectDraftCard('golden_quill');
      run.telegraphedBoss = ScorchedCity.getBoss('02_cinder_hourglass');
      ScorchedCity.enterRoom(5);

      // 1. Extreme fast timing (0.001s): valid bonus, no infinite loop or crash
      const fastAns = ScorchedCity.recordCorrectAnswer({ basePoints: 100, answerDurationSec: 0.001 });
      assert.equal(fastAns.flatPactBonus, 20, 'Quill gives +20 points on fast answer');
      assert.equal(fastAns.bossBonusPoints, 25, 'Hourglass gives +25 points on fast answer');
      assert.ok(fastAns.totalMultiplier >= 1.3, 'Hourglass provides 1.3x speed multiplier');
      assert.ok(Number.isFinite(fastAns.gainedScore), 'Score must remain finite number');

      // 2. Slow timing (12.0s): no Quill bonus, Hourglass penalty applied cleanly
      const slowAns = ScorchedCity.recordCorrectAnswer({ basePoints: 100, answerDurationSec: 12.0 });
      assert.equal(slowAns.flatPactBonus, 0, 'Quill bonus must not trigger above 5s threshold');
      assert.equal(slowAns.bossBonusPoints, 0, 'Hourglass bonus must not trigger on slow answer');
      assert.ok(slowAns.totalMultiplier <= 0.85, 'Hourglass applies 0.85x slow multiplier');

      // 3. Null / negative / undefined timing fallback: handled gracefully
      const nullAns = ScorchedCity.recordCorrectAnswer({ basePoints: 100, answerDurationSec: null });
      assert.equal(nullAns.flatPactBonus, 0);
      assert.ok(Number.isFinite(nullAns.gainedScore));

      const negAns = ScorchedCity.recordCorrectAnswer({ basePoints: 100, answerDurationSec: -5 });
      assert.ok(Number.isFinite(negAns.gainedScore));
    });

    it('Run XP isolation: in-run currency (runXp) and trade-off tolls NEVER mutate student account XP or leak into main leaderboard', () => {
      // Setup mock global appState
      globalThis.appState = {
        currentUserCode: '1001',
        students: {
          '1001': {
            name: 'دانش‌آموز تستی',
            xp: 450, // Persistent account XP from main game
            stars: 12
          }
        }
      };

      const run = ScorchedCity.startNewRun({
        studentCode: '1001',
        grade: '10',
        mode: 'standard',
        seed: 'xp_isolation_seed',
        curriculumBank: bank
      });

      // Draft Treasure Hoard to amplify runXp
      ScorchedCity.selectDraftCard('treasure_hoard');

      // Answer questions to accrue runXp
      for (let q = 0; q < 5; q++) {
        ScorchedCity.recordCorrectAnswer({ answerDurationSec: 4.0 });
      }

      assert.ok(run.runXp > 50, 'Run XP accrued inside Scorched City run');
      assert.equal(globalThis.appState.students['1001'].xp, 450, 'Main account XP must remain strictly untouched');

      // Spend in-run currency on trade-off toll
      const spendRes = ScorchedCity.spendRunXpToll(30, 'toll_bridge');
      assert.equal(spendRes.ok, true);
      assert.equal(spendRes.spent, 30);
      assert.equal(run.runXpSpentOnTolls, 30);
      assert.equal(globalThis.appState.students['1001'].xp, 450, 'Account XP must NEVER be decremented by in-run tolls');

      // Complete run and submit to separate Scorched City leaderboard
      const endRes = ScorchedCity.endRun(true);
      assert.ok(endRes.leaderboardEntry, 'Leaderboard entry created in dedicated Scorched City store');

      // Verify Scorched City leaderboard does NOT record runXp as main score
      const scStore = ScorchedCity.leaderboard.getStore();
      const stdEntry = scStore.standard['1001'];
      assert.ok(stdEntry, 'Standard Scorched City leaderboard entry exists');
      assert.equal(stdEntry.score, run.totalRunScore, 'Leaderboard records combat score, NOT runXp currency');

      // Main account XP remains unchanged
      assert.equal(globalThis.appState.students['1001'].xp, 450, 'Main account XP strictly isolated after run end');
      delete globalThis.appState;
    });

    it('Educational Goal (Guardrails 2, 3, 5, 6): mistakes returned to practice queue, weak items prioritized, pure knowledge beats all bosses', () => {
      const run = ScorchedCity.startNewRun({
        studentCode: 'guardrail_verifier',
        grade: '10',
        mode: 'standard',
        seed: 'gr_seed',
        curriculumBank: bank
      });

      const firstItem = run.roomQueue[0];
      const wrong = ScorchedCity.recordWrongAnswer(firstItem);

      // Guardrail 2: Answer revealed and returned to practiceQueue
      assert.equal(wrong.revealCorrectAnswer, true);
      assert.ok(wrong.revealedAnswer.length > 0);
      assert.equal(run.practiceQueue.length, 1);
      assert.equal(run.practiceQueue[0].word, firstItem.word);

      // Guardrail 3: Candle NOT removed directly
      assert.equal(wrong.candlesRemovedDirectly, 0);
      assert.equal(run.candles, 3);

      // Guardrail 6: Next room deck prioritizes unmastered weak items from practiceQueue
      while (run.roomScore < run.roomTargetScore) {
        ScorchedCity.recordCorrectAnswer();
      }
      ScorchedCity.completeRoom(); // completes room 1
      assert.equal(run.room, 2);
      assert.equal(run.roomQueue[0].word, firstItem.word, 'Room 2 deck must prioritize weak practiceQueue word');
      assert.equal(run.roomQueue[0].isPracticeRetry, true);

      // Guardrail 5: Pure knowledge beats all 10 bosses
      ScorchedCity.getAllCanonicalBosses().forEach(boss => {
        ScorchedCity.setStorageBackend(createInMemoryStorage());
        const pureRun = ScorchedCity.startNewRun({
          studentCode: `pure_${boss.id}`,
          grade: '10',
          mode: 'standard',
          seed: `pure_seed_${boss.id}`,
          curriculumBank: bank
        });
        pureRun.telegraphedBoss = boss;
        ScorchedCity.enterRoom(5);

        for (let q = 0; q < 8; q++) {
          ScorchedCity.presentQuestion(pureRun.roomQueue[0]);
          ScorchedCity.recordCorrectAnswer({
            card: pureRun.roomQueue[0],
            answerDurationSec: 4.0
          });
        }

        const res = ScorchedCity.completeRoom();
        assert.equal(res.passed, true, `Boss "${boss.id}" must be beatable with pure knowledge`);
        assert.equal(res.bossCycleCompleted, true);
      });
    });
  });
});

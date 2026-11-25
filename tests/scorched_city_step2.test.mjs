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

function clearCurrentRoomWithAnswers(count = 4) {
  for (let i = 0; i < count; i++) {
    ScorchedCity.recordCorrectAnswer({ basePoints: 500 });
  }
}

describe('Scorched City (شهر سوخته) — Step 2 Pacts, Draft Cadence & Boss Prep Suite', () => {
  beforeEach(() => {
    ScorchedCity.setStorageBackend(createInMemoryStorage());
    ScorchedCity.resetSimulationTuning();
  });

  describe('1. Canonical 12-Card Registry & Disk Image Assets (l1, l2, l3)', () => {
    it('registers exactly 12 cards across 4 families (3 cards each) with exact Persian names and existing .jpg assets', () => {
      const cards = ScorchedCity.getAllPactCards();
      assert.equal(cards.length, 12);

      const expected = {
        combo: [
          ['flame_strike', 'ضربه شعله'],
          ['golden_strike', 'ضربه طلایی'],
          ['ember_chain', 'زنجیره اخگر']
        ],
        greed: [
          ['treasure_hoard', 'طمع گنج'],
          ['extortionist', 'باجگیر'],
          ['golden_quill', 'قلم زر']
        ],
        survival: [
          ['threshold_guardian', 'نگهبان آستانه'],
          ['hidden_flame', 'شعل پنهان'],
          ['cracked_armor', 'زره ترکخورده']
        ],
        arcane: [
          ['passage', 'گذر'],
          ['error_mirror', 'آیینه خطا'],
          ['midnight_eye', 'چشم نیمهشب']
        ]
      };

      for (const [family, pairs] of Object.entries(expected)) {
        const famCards = ScorchedCity.getPactCardsByFamily(family);
        assert.equal(famCards.length, 3, `Family "${family}" must have 3 cards`);
        for (const [cardId, titleFa] of pairs) {
          const card = ScorchedCity.getPactCard(cardId);
          assert.ok(card, `Card "${cardId}" must be registered`);
          assert.equal(card.family, family);
          assert.equal(card.titleFa, titleFa);

          for (const lvl of [1, 2, 3]) {
            const relPath = ScorchedCity.getPactCardAssetPath(cardId, lvl);
            assert.equal(relPath, `assets/scorched_city_cards_final/card_${family}_${cardId}_l${lvl}.jpg`);
            assert.ok(fs.existsSync(path.join(PROJECT_DIR, relPath)), `Asset must exist on disk: ${relPath}`);
            assert.ok(swContent.includes(relPath), `Service worker must precache asset: ${relPath}`);
          }
        }
      }
    });
  });

  describe('2. Active Pact Cap (3), Level Upgrades (I -> II -> III) & Slot Replacement', () => {
    it('enforces max 3 active pacts, upgrades duplicate picks I -> II -> III, and requires replacement when full', () => {
      ScorchedCity.startNewRun({
        studentCode: '09123334444',
        grade: '10',
        mode: 'standard',
        seed: 'cap-upgrade-test',
        curriculumBank: bank
      });

      assert.equal(ScorchedCity.getActivePactSlots().length, 0);

      // Acquire 3 distinct pacts
      assert.equal(ScorchedCity.selectDraftCard('flame_strike').level, 1);
      assert.equal(ScorchedCity.selectDraftCard('golden_quill').level, 1);
      assert.equal(ScorchedCity.selectDraftCard('threshold_guardian').level, 1);
      assert.equal(ScorchedCity.getActivePactSlots().length, 3);

      // Upgrade duplicate pick: I -> II -> III -> blocked at MAX
      const up2 = ScorchedCity.selectDraftCard('flame_strike');
      assert.equal(up2.ok, true);
      assert.equal(up2.action, 'upgrade');
      assert.equal(up2.level, 2);

      const up3 = ScorchedCity.selectDraftCard('flame_strike');
      assert.equal(up3.ok, true);
      assert.equal(up3.level, 3);

      const upMax = ScorchedCity.selectDraftCard('flame_strike');
      assert.equal(upMax.ok, false);
      assert.equal(upMax.reason, 'ALREADY_MAX_LEVEL');

      // 4th unique card when 3 slots full returns needsReplacement: true
      const fullRes = ScorchedCity.selectDraftCard('extortionist');
      assert.equal(fullRes.ok, false);
      assert.equal(fullRes.needsReplacement, true);
      assert.equal(fullRes.activeSlots.length, 3);

      // Passing replaceCardId swaps slot cleanly
      const repRes = ScorchedCity.selectDraftCard('extortionist', 'golden_quill');
      assert.equal(repRes.ok, true);
      assert.equal(repRes.action, 'replace');
      assert.equal(ScorchedCity.getActivePactSlots().length, 3);
      assert.equal(ScorchedCity.hasActivePact('extortionist'), true);
      assert.equal(ScorchedCity.hasActivePact('golden_quill'), false);
    });
  });

  describe('3. Run Draft Cadence, Room 3 Early Clue, Room 4 Boss Prep & Daily Determinism', () => {
    it('starts Room 1 cleanly, drafts after Rooms 1-3, shows ONLY Key Family at Room 3 end, and runs Boss Prep after Room 4', () => {
      const run = ScorchedCity.startNewRun({
        studentCode: '09125556666',
        grade: '10',
        mode: 'daily',
        dateKey: '2026-11-25',
        curriculumBank: bank
      });

      // Room 1 clean start: no pending draft, no pre-run cards
      assert.equal(run.room, 1);
      assert.equal(run.pendingDraft, null);
      assert.equal(run.activePacts.length, 0);

      // Clear Room 1 -> Non-timed 1 of 3 draft offered
      clearCurrentRoomWithAnswers();
      const r1 = ScorchedCity.completeRoom();
      assert.equal(r1.passed, true);
      assert.equal(r1.clearedRoom, 1);
      assert.equal(r1.nextRoom, 2);
      assert.equal(r1.draftOffer.timed, false);
      assert.equal(r1.draftOffer.choices.length, 3);
      assert.equal(r1.earlyKeyFamilyClue, null);
      assert.equal(r1.isBossPrepPhase, false);

      ScorchedCity.selectDraftCard(r1.draftOffer.choices[0].cardId);

      // Clear Room 2 -> Standard draft offered
      clearCurrentRoomWithAnswers();
      const r2 = ScorchedCity.completeRoom();
      assert.equal(r2.clearedRoom, 2);
      assert.equal(r2.draftOffer.choices.length, 3);
      assert.equal(r2.earlyKeyFamilyClue, null);
      ScorchedCity.selectDraftCard(r2.draftOffer.choices[0].cardId);

      // Clear Room 3 -> End of Room 3 reveals ONLY upcoming Boss Key Family clue badge!
      clearCurrentRoomWithAnswers();
      const r3 = ScorchedCity.completeRoom();
      assert.equal(r3.clearedRoom, 3);
      assert.ok(r3.earlyKeyFamilyClue, 'Room 3 completion must surface earlyKeyFamilyClue');
      assert.equal(r3.earlyKeyFamilyClue.isEarlyClueOnly, true);
      assert.equal(r3.earlyKeyFamilyClue.family, run.telegraphedBoss.keyFamily);
      assert.equal(r3.draftOffer.bossTelegraph, null, 'Room 3 draft must NOT expose full Room 4 boss telegraph');
      ScorchedCity.selectDraftCard(r3.draftOffer.choices[0].cardId);

      // Clear Room 4 -> Enter Boss Prep Phase before Room 5
      clearCurrentRoomWithAnswers();
      const r4 = ScorchedCity.completeRoom();
      assert.equal(r4.clearedRoom, 4);
      assert.equal(r4.nextRoom, 5);
      assert.equal(r4.isBossPrepPhase, true);
      assert.ok(r4.draftOffer.bossTelegraph, 'Room 4 Boss Prep must show full boss telegraph');
      assert.equal(r4.draftOffer.guaranteedKeyFamily, run.telegraphedBoss.keyFamily);

      // Guarantee: at least 1 of the 3 offered cards matches the boss Key Family!
      const hasKeyFamilyOffer = r4.draftOffer.choices.some(
        ch => ch.family === run.telegraphedBoss.keyFamily && ch.isBossKeyFamily === true
      );
      assert.equal(hasKeyFamilyOffer, true, 'Room 4 Boss Prep draft must guarantee >= 1 Key Family card');

      // 1 Free active-pact swap works once and blocks a second swap
      assert.equal(r4.draftOffer.freeSwapAvailable, true);
      const ownedId = ScorchedCity.getActivePactSlots()[0].cardId;
      const replacementId = ownedId === 'midnight_eye' ? 'passage' : 'midnight_eye';
      const swap1 = ScorchedCity.performBossPrepFreeSwap(ownedId, replacementId);
      assert.equal(swap1.ok, true);
      assert.equal(swap1.freeSwapUsed, true);
      assert.equal(ScorchedCity.hasActivePact(replacementId), true);

      const swap2 = ScorchedCity.performBossPrepFreeSwap(replacementId, 'cracked_armor');
      assert.equal(swap2.ok, false);
      assert.equal(swap2.reason, 'FREE_SWAP_ALREADY_USED');
    });

    it('produces identical deterministic draft offers for two Daily Runs on the same calendar date YYYY-MM-DD', () => {
      const pickAndCollect = () => {
        ScorchedCity.setStorageBackend(createInMemoryStorage());
        ScorchedCity.startNewRun({
          studentCode: '09129990001',
          grade: '10',
          mode: 'daily',
          dateKey: '2026-12-01',
          curriculumBank: bank
        });
        const snapshots = [];
        for (let r = 1; r <= 4; r++) {
          clearCurrentRoomWithAnswers();
          const res = ScorchedCity.completeRoom();
          snapshots.push(res.draftOffer.choices.map(c => c.cardId));
          ScorchedCity.selectDraftCard(res.draftOffer.choices[0].cardId);
        }
        return snapshots;
      };

      const runA = pickAndCollect();
      const runB = pickAndCollect();
      assert.deepEqual(runA, runB);
    });
  });

  describe('4. Specific Card Mechanics, 5 Trigger Events & Core Guardrails', () => {
    it('Extortionist (باجگیر) applies +2 questions, +15% target score, and x1.5 multiplier on ON_ROOM_START', () => {
      ScorchedCity.startNewRun({
        studentCode: '09127770001',
        grade: '10',
        mode: 'standard',
        seed: 'extortionist-seed',
        curriculumBank: bank
      });

      const baseTargetR2 = ScorchedCity.computeRoomTargetScore(2, 1, null);
      clearCurrentRoomWithAnswers();
      ScorchedCity.completeRoom();

      // Room 2 baseline before picking extortionist: 8 questions, baseTargetR2
      const beforeRun = ScorchedCity.getActiveRun();
      assert.equal(beforeRun.room, 2);
      assert.equal(beforeRun.questionsInRoomTotal, 8);
      assert.equal(beforeRun.roomTargetScore, baseTargetR2);

      // Select Extortionist (Lv I) -> immediately updates Room 2 ON_ROOM_START parameters
      const pick = ScorchedCity.selectDraftCard('extortionist');
      assert.equal(pick.ok, true);
      assert.equal(pick.questionsInRoomTotal, 10, '+2 extra questions (8 -> 10)');
      assert.equal(pick.roomTargetScore, Math.round(baseTargetR2 * 1.15), '+15% room target score');
      assert.equal(pick.roomScoreMultiplier, 1.5, 'x1.5 room score multiplier');

      const ans = ScorchedCity.recordCorrectAnswer({ basePoints: 100 });
      assert.equal(ans.totalMultiplier, 1.5);
      assert.equal(ans.gainedScore, 150);
    });

    it('Golden Quill (قلم زر) grants +20 bonus points under 5s and 0 bonus at >= 5s', () => {
      ScorchedCity.startNewRun({
        studentCode: '09127770002',
        grade: '10',
        mode: 'standard',
        seed: 'quill-seed',
        curriculumBank: bank
      });

      ScorchedCity.selectDraftCard('golden_quill');

      const fast = ScorchedCity.recordCorrectAnswer({ basePoints: 100, answerDurationSec: 3.2 });
      assert.equal(fast.flatPactBonus, 20);
      assert.equal(fast.gainedScore, 120);
      assert.ok(fast.firedPacts.some(p => p.cardId === 'golden_quill' && p.bonusPoints === 20));

      const slow = ScorchedCity.recordCorrectAnswer({ basePoints: 100, answerDurationSec: 5.4 });
      assert.equal(slow.flatPactBonus, 0);
      assert.ok(!slow.firedPacts.some(p => p.cardId === 'golden_quill'));
    });

    it('Threshold Guardian saves candle once per run on failed target AND is immune to boss pact-sealing', () => {
      // Custom boss attempting to seal survival family
      const sealerBoss = ScorchedCity.registerBoss({
        id: 'test_survival_sealer',
        name: 'مهارگر بقا',
        lawTitle: 'مهر کردن پیمان بقا',
        lawDescription: 'باس تلاش می‌کند خانواده بقا را مهر کند.',
        keyFamily: 'combo',
        keyFamilyLabel: 'کمبو',
        universalAnswerPath: { title: 'دانش خالص', description: 'مسیر علمی استاندارد' },
        educationalGoal: 'آزمون مصونیت پیمان‌های نجات یک‌بار در ران.',
        allowedEffects: ['pact_availability'],
        triggers: {
          ON_ROOM_START: () => ({ lockedPactFamilies: ['survival', 'threshold_guardian', 'hidden_flame'] })
        }
      });

      ScorchedCity.startNewRun({
        studentCode: '09127770003',
        grade: '10',
        mode: 'standard',
        seed: 'guardian-seed',
        curriculumBank: bank
      });

      ScorchedCity.selectDraftCard('threshold_guardian');
      ScorchedCity.selectDraftCard('hidden_flame');
      ScorchedCity.selectDraftCard('golden_quill');

      // Enter Room 5 with sealing boss manually set
      const run = ScorchedCity.getActiveRun();
      run.telegraphedBoss = sealerBoss;
      ScorchedCity.enterRoom(5);

      // Guardrail check: threshold_guardian & hidden_flame remain unlocked despite boss trying to seal 'survival'!
      assert.equal(ScorchedCity.isPactLockedForRun(ScorchedCity.getActiveRun(), 'threshold_guardian'), false);
      assert.equal(ScorchedCity.isPactLockedForRun(ScorchedCity.getActiveRun(), 'hidden_flame'), false);

      // Fail Room 5 target score first time -> Threshold Guardian prevents candle loss ONCE!
      const saveRes = ScorchedCity.completeRoom();
      assert.equal(saveRes.passed, false);
      assert.equal(saveRes.candleLost, false);
      assert.equal(saveRes.preventedCandleLossBy, 'threshold_guardian');
      assert.equal(saveRes.candlesRemaining, 3);

      // Fail Room 5 target score a second time in same run -> candle IS lost
      const secondFail = ScorchedCity.completeRoom();
      assert.equal(secondFail.passed, false);
      assert.equal(secondFail.candleLost, true);
      assert.equal(secondFail.candlesRemaining, 2);
    });

    it('Error Mirror stacks additively with multipliers and NEVER deletes mistakes; Passage preserves practiceQueue', () => {
      ScorchedCity.startNewRun({
        studentCode: '09127770004',
        grade: '10',
        mode: 'standard',
        seed: 'mirror-passage-seed',
        curriculumBank: bank
      });

      ScorchedCity.selectDraftCard('extortionist'); // +0.50 additive
      ScorchedCity.selectDraftCard('error_mirror'); // +0.25 additive on missed retry word
      ScorchedCity.selectDraftCard('passage');      // +45 room-end transit bonus + reroute

      const run = ScorchedCity.getActiveRun();
      const firstCard = { ...run.roomQueue[0] };

      // Wrong answer reveals answer, returns word to practiceQueue, keeps mistake record
      const wrong = ScorchedCity.recordWrongAnswer(firstCard);
      assert.equal(wrong.revealCorrectAnswer, true);
      assert.ok(wrong.revealedAnswer.length > 0);
      assert.equal(wrong.candlesRemovedDirectly, 0);
      assert.equal(run.practiceQueue.some(p => p.word === firstCard.word), true);

      // Use Passage reroute -> must preserve practiceQueue!
      const passRes = ScorchedCity.usePassageTransit(run.roomQueue[0]);
      assert.equal(passRes.ok, true);
      assert.equal(passRes.practiceQueuePreserved, true);
      assert.equal(run.practiceQueue.some(p => p.word === firstCard.word), true);

      // Answering missed retry word correctly -> additive multiplier 1.0 + 0.50 + 0.25 = 1.75 (NOT multiplicative 1.875)
      const retryCard = run.practiceQueue.find(p => p.word === firstCard.word);
      const ans = ScorchedCity.recordCorrectAnswer({ card: retryCard, basePoints: 100 });
      assert.equal(ans.totalMultiplier, 1.75);
      assert.equal(ans.gainedScore, Math.round(100 * 1.75) + 25); // 175 + 25 mirrorBonusPoints = 200
      // Mistake log permanently preserved (never erased!)
      assert.equal(run.runMistakes[firstCard.word], 1);
      assert.equal(run.revealedMistakeLog.length, 1);

      // ON_QUESTION_PRESENT never auto-activates pacts
      const pres = ScorchedCity.presentQuestion(run.roomQueue[0]);
      assert.equal(pres.autoActivatedPacts, false);
    });

    it('Index HTML wires Step 2 Draft Overlay and Active Pacts UI cleanly without forbidden trophy emoji', () => {
      assert.ok(!htmlContent.includes('🏆'), 'index.html must never contain forbidden trophy emoji');
      assert.ok(htmlContent.includes('id="scDraftOverlay"'));
      assert.ok(htmlContent.includes('id="scArenaPactsStrip"'));
      assert.ok(htmlContent.includes('openScorchedCityDraftOverlay'));
      assert.ok(htmlContent.includes('performBossPrepFreeSwap'));
    });

    it('Provides canonical Persian descriptions and trade-offs for all 12 cards across levels I-III', () => {
      const allCards = ScorchedCity.getAllPactCards();
      assert.equal(allCards.length, 12);
      for (const card of allCards) {
        for (let lvl = 1; lvl <= 3; lvl++) {
          const desc = ScorchedCity.getPactDescription(card.id, lvl);
          const tradeOff = ScorchedCity.getPactTradeOffs(card.id, lvl);
          assert.ok(desc && typeof desc === 'string' && desc.length > 10, `Card ${card.id} lvl ${lvl} must have rich description`);
          assert.ok(tradeOff && typeof tradeOff === 'string' && tradeOff.length > 5, `Card ${card.id} lvl ${lvl} must have trade-offs`);
        }
      }
    });

    it('Draft offer serialization surfaces description, tradeOffs, and visual assets', () => {
      const run = ScorchedCity.startNewRun({
        studentCode: '09125556666',
        grade: '10',
        mode: 'standard',
        curriculumBank: bank
      });
      const offer = ScorchedCity.generateDraftOffer(run, 1);
      assert.ok(offer && offer.choices.length === 3);
      for (const choice of offer.choices) {
        assert.ok(choice.description && choice.description.length > 10, 'Choice must have rich description');
        assert.ok(choice.tradeOffs && choice.tradeOffs.length > 5, 'Choice must have trade-offs');
        assert.ok(choice.assetPath && choice.assetPath.endsWith('.jpg'), 'Choice must have canonical assetPath');
        assert.ok(choice.nextLevelRoman.match(/^(I|II|III)$/), 'Choice must have nextLevelRoman');
      }
    });

    it('Index HTML implements seamless card framing (no gray box), dedicated description panel, and bladed blood-seal feedback', () => {
      // 1. Seamless card framing
      assert.ok(htmlContent.includes('sc-draft-cards-row'), 'Must use 3-card horizontal grid .sc-draft-cards-row');
      assert.ok(htmlContent.includes('sc-card-art-cropper'), 'Must frame artwork in .sc-card-art-cropper');
      assert.ok(htmlContent.includes('transform: scale(1.44)'), 'Must scale artwork by 1.44 to crop outer gray borders');
      assert.ok(htmlContent.includes('image-rendering: pixelated'), 'Must use crisp pixelated image rendering');
      assert.ok(htmlContent.includes('sc-card-vignette'), 'Must use .sc-card-vignette for dark gothic edge blending');

      // 2. Clear title below artwork + dedicated description panel on tap
      assert.ok(htmlContent.includes('sc-draft-card-title'), 'Title must be placed below artwork');
      assert.ok(htmlContent.includes('id="scPactDescriptionPanel"'), 'Must provide dedicated #scPactDescriptionPanel');
      assert.ok(htmlContent.includes('sc-pact-desc-effect'), 'Panel must include .sc-pact-desc-effect');
      assert.ok(htmlContent.includes('sc-pact-desc-lore'), 'Panel must include .sc-pact-desc-lore');
      assert.ok(htmlContent.includes('sc-pact-desc-tradeoff'), 'Panel must include .sc-pact-desc-tradeoff');

      // 3. Subtle animations & Gothic bladed blood-seal feedback
      assert.ok(htmlContent.includes('btn-seal-pact'), 'Must style gothic bladed button .btn-seal-pact');
      assert.ok(htmlContent.includes('clip-path: polygon'), 'Bladed button must use beveled clip-path');
      assert.ok(htmlContent.includes('scBladeFlash'), 'Must define blade slash animation scBladeFlash');
      assert.ok(htmlContent.includes('scBloodSpread'), 'Must define crimson blood spread animation scBloodSpread');
      assert.ok(htmlContent.includes('sc-slash-blade'), 'Must define .sc-slash-blade overlay class');
      assert.ok(htmlContent.includes('sc-blood-splat'), 'Must define .sc-blood-splat overlay class');
      assert.ok(htmlContent.includes('selectedDraftCardId'), 'Draft overlay must track selectedDraftCardId on tap');
    });
  });
});

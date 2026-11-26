/**
 * ============================================================================
 * SCORCHED CITY (شهر سوخته) — STANDALONE ROGUELITE RUN ENGINE (STEP 1 & STEP 2)
 * ============================================================================
 * Dedicated, fully decoupled mode module for Scorched City:
 *   - Isolated run state (Rooms 1 -> 5 -> Cycle Reset -> Loop N)
 *   - Deterministic Daily Run seeded by local calendar date (YYYY-MM-DD)
 *   - Separate Leaderboard service (Standard vs Daily vs Main 3-World Leaderboard)
 *   - Run XP currency strictly isolated from main leaderboard scores
 *   - Dark Grayscale 1024x576 Arena config + Room 5 base setup (1500 target)
 *   - Shared Boss Constraints Scaffolding (6 Core Guardrails & 5 Trigger Events)
 *   - Canonical 12 Pacts/Cards (4 families x 3 cards, levels I-III), Draft Cadence,
 *     Room 3 Early Clue, and Room 4 Boss Prep Phase
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root && typeof root === 'object') {
    root.ScorchedCity = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MODE_ID = 'scorched_city';
  const MODE_TITLE = 'شهر سوخته';

  const RUN_MODES = Object.freeze({
    STANDARD: 'standard',
    DAILY: 'daily'
  });

  const ROOMS_PER_CYCLE = 5;
  const TELEGRAPH_ROOM = 4;
  const BOSS_ROOM = 5;
  const MAX_ACTIVE_BOSS_MODIFIERS = 1;

  // Guardrail 4: Boss rules strictly use 5 canonical trigger events and never auto-activate pacts
  const BOSS_TRIGGER_EVENTS = Object.freeze([
    'ON_ROOM_START',
    'ON_QUESTION_PRESENT',
    'ON_ANSWER_CORRECT',
    'ON_ANSWER_WRONG',
    'ON_ROOM_END'
  ]);

  // Guardrail 3: Bosses only modify allowed gameplay parameters (never remove candles directly)
  const ALLOWED_BOSS_EFFECTS = Object.freeze([
    'target_score',
    'score_multiplier',
    'question_presentation',
    'pact_availability'
  ]);

  // Prohibited boss effect keys blocked at validation and runtime
  const PROHIBITED_BOSS_KEYS = Object.freeze([
    'removeCandle',
    'removeCandles',
    'damageCandles',
    'candlesDelta',
    'setCandles',
    'deleteMistakes',
    'clearMistakes',
    'eraseMistakes',
    'erasePracticeQueue',
    'clearPracticeQueue',
    'autoActivatePacts',
    'bypassWeakItems'
  ]);

  // Step 1 Arena spec: 1024x576 dark grayscale scorched ruins with horizontal stone combat floor
  const ARENA_CONFIG = Object.freeze({
    backgroundAsset: 'assets/redesign/bg_scorched_city.webp',
    width: 1024,
    height: 576,
    aspectRatio: '16 / 9',
    contrastTheme: 'dark-grayscale',
    combatFloorYRatio: 0.72,
    combatFloorBottomPct: 28,
    characterSlots: Object.freeze({
      hero: Object.freeze({ side: 'right', groundAnchorPct: 28 }),
      enemy: Object.freeze({ side: 'left', groundAnchorPct: 28 })
    })
  });

  const STORAGE_KEYS = Object.freeze({
    RUN_STATE: 'gv_scorched_city_run_v1',
    PERSISTENT_STATS: 'gv_scorched_city_stats_v1',
    LEADERBOARD: 'gv_scorched_city_leaderboard_v1',
    TUNING: 'gv_scorched_city_tuning_v1'
  });

  const DEFAULT_SIMULATION_TUNING = Object.freeze({
    room5BaseTargetScore: 1500,
    roomBaseTargetScores: Object.freeze({
      1: 375,
      2: 700,
      3: 1050,
      4: 1350,
      5: 1500
    }),
    loopTargetScaleStep: 0.25,
    startingCandles: 3,
    maxCandles: 3,
    questionsPerRoom: 8,
    baseCorrectScore: 100,
    streakStepBonus: 25,
    baseCorrectRunXp: 15,
    roomClearRunXpBonus: 25
  });

  // ==========================================================================
  // STEP 2: CANONICAL 12 PACTS/CARDS ACROSS 4 FAMILIES (I, II, III)
  // ==========================================================================

  const MAX_ACTIVE_PACTS = 3;
  const CARD_ASSETS_DIR = 'assets/scorched_city_cards_final';

  const PACT_FAMILIES = Object.freeze({
    COMBO: Object.freeze({
      id: 'combo',
      nameFa: 'کمبو',
      labelFa: 'خانواده کمبو',
      badgeGlyph: 'کمبو',
      accentHex: '#ef4444'
    }),
    GREED: Object.freeze({
      id: 'greed',
      nameFa: 'طمع',
      labelFa: 'خانواده طمع',
      badgeGlyph: 'طمع',
      accentHex: '#f59e0b'
    }),
    SURVIVAL: Object.freeze({
      id: 'survival',
      nameFa: 'بقا',
      labelFa: 'خانواده بقا',
      badgeGlyph: 'بقا',
      accentHex: '#10b981'
    }),
    ARCANE: Object.freeze({
      id: 'arcane',
      nameFa: 'آرکان',
      labelFa: 'خانواده آرکان',
      badgeGlyph: 'راز',
      accentHex: '#a855f7'
    })
  });

  const PACT_FAMILY_IDS = Object.freeze(['combo', 'greed', 'survival', 'arcane']);
  const LEVEL_ROMAN = Object.freeze({ 1: 'I', 2: 'II', 3: 'III' });

  function toFaDigits(val) {
    if (val == null) return '';
    const faDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(val)
      .replace(/[0-9]/g, d => faDigits[+d])
      .replace(/\./g, '٫');
  }

  function getPactCardAssetPath(cardId, level = 1) {
    const card = PACT_CARD_MAP.get(cardId);
    const lvl = Math.max(1, Math.min(3, Math.round(Number(level) || 1)));
    const family = card ? card.family : 'combo';
    const slug = card ? card.slug : String(cardId || 'flame_strike');
    return `${CARD_ASSETS_DIR}/card_${family}_${slug}_l${lvl}.jpg`;
  }

  function getPactLevelRoman(level = 1) {
    const lvl = Math.max(1, Math.min(3, Math.round(Number(level) || 1)));
    return LEVEL_ROMAN[lvl] || 'I';
  }

  const RAW_PACT_CARDS = [
    // --- COMBO (3 cards) ---
    {
      id: 'flame_strike',
      slug: 'flame_strike',
      family: 'combo',
      titleFa: 'ضربه شعله',
      shortEffectByLevel: {
        1: 'در کمبو ۲+ هر پاسخ درست +۱۵ امتیاز؛ در کمبو ۳+ ضریب +۰.۱۰',
        2: 'در کمبو ۲+ هر پاسخ درست +۲۵ امتیاز؛ در کمبو ۳+ ضریب +۰.۱۸',
        3: 'در کمبو ۲+ هر پاسخ درست +۴۰ امتیاز؛ در کمبو ۳+ ضریب +۰.۲۵'
      },
      triggers: ['ON_ANSWER_CORRECT'],
      levels: {
        1: { minStreak: 2, bonusPoints: 15, multStreak: 3, additiveMult: 0.10 },
        2: { minStreak: 2, bonusPoints: 25, multStreak: 3, additiveMult: 0.18 },
        3: { minStreak: 2, bonusPoints: 40, multStreak: 3, additiveMult: 0.25 }
      }
    },
    {
      id: 'golden_strike',
      slug: 'golden_strike',
      family: 'combo',
      titleFa: 'ضربه طلایی',
      shortEffectByLevel: {
        1: 'هر سومین پاسخ درست پیاپی +۶۰ امتیاز و +۸ تجربهٔ ران می‌دهد',
        2: 'هر سومین پاسخ درست پیاپی +۹۵ امتیاز و +۱۲ تجربهٔ ران می‌دهد',
        3: 'هر سومین پاسخ درست پیاپی +۱۴۰ امتیاز و +۱۸ تجربهٔ ران می‌دهد'
      },
      triggers: ['ON_ANSWER_CORRECT'],
      levels: {
        1: { cadence: 3, bonusPoints: 60, bonusRunXp: 8 },
        2: { cadence: 3, bonusPoints: 95, bonusRunXp: 12 },
        3: { cadence: 3, bonusPoints: 140, bonusRunXp: 18 }
      }
    },
    {
      id: 'ember_chain',
      slug: 'ember_chain',
      family: 'combo',
      titleFa: 'زنجیره اخگر',
      shortEffectByLevel: {
        1: 'پلهٔ کمبو +۱۵ امتیاز بیشتر و ذخیره ۱ کمبو هنگام ورود به اتاق بعد',
        2: 'پلهٔ کمبو +۲۵ امتیاز بیشتر و ذخیره ۱ کمبو هنگام ورود به اتاق بعد',
        3: 'پلهٔ کمبو +۳۵ امتیاز بیشتر و ذخیره ۲ کمبو هنگام ورود به اتاق بعد'
      },
      triggers: ['ON_ROOM_START', 'ON_ANSWER_CORRECT'],
      levels: {
        1: { streakStepBonus: 15, carryStreak: 1 },
        2: { streakStepBonus: 25, carryStreak: 1 },
        3: { streakStepBonus: 35, carryStreak: 2 }
      }
    },

    // --- GREED (3 cards) ---
    {
      id: 'treasure_hoard',
      slug: 'treasure_hoard',
      family: 'greed',
      titleFa: 'طمع گنج',
      shortEffectByLevel: {
        1: 'هر پاسخ درست +۶ تجربهٔ ران و پایان اتاق +۷۰ امتیاز جایزه',
        2: 'هر پاسخ درست +۱۰ تجربهٔ ران و پایان اتاق +۱۱۰ امتیاز جایزه',
        3: 'هر پاسخ درست +۱۵ تجربهٔ ران و پایان اتاق +۱۶۰ امتیاز جایزه'
      },
      triggers: ['ON_ANSWER_CORRECT', 'ON_ROOM_END'],
      levels: {
        1: { bonusRunXpPerCorrect: 6, roomEndBonusScore: 70, roomEndBonusXp: 10 },
        2: { bonusRunXpPerCorrect: 10, roomEndBonusScore: 110, roomEndBonusXp: 16 },
        3: { bonusRunXpPerCorrect: 15, roomEndBonusScore: 160, roomEndBonusXp: 24 }
      }
    },
    {
      id: 'extortionist',
      slug: 'extortionist',
      family: 'greed',
      titleFa: 'باجگیر',
      shortEffectByLevel: {
        1: '+۲ پرسش اضافه، +۱۵٪ امتیاز هدف و ضریب امتیاز x۱.۵ در اتاق',
        2: '+۲ پرسش اضافه، +۱۵٪ امتیاز هدف و ضریب امتیاز x۱.۶۵ در اتاق',
        3: '+۲ پرسش اضافه، +۱۵٪ امتیاز هدف و ضریب امتیاز x۱.۸ در اتاق'
      },
      triggers: ['ON_ROOM_START', 'ON_ANSWER_CORRECT'],
      levels: {
        1: { extraQuestions: 2, targetScorePercent: 0.15, roomScoreMultiplier: 1.5, additiveMult: 0.50 },
        2: { extraQuestions: 2, targetScorePercent: 0.15, roomScoreMultiplier: 1.65, additiveMult: 0.65 },
        3: { extraQuestions: 2, targetScorePercent: 0.15, roomScoreMultiplier: 1.80, additiveMult: 0.80 }
      }
    },
    {
      id: 'golden_quill',
      slug: 'golden_quill',
      family: 'greed',
      titleFa: 'قلم زر',
      shortEffectByLevel: {
        1: 'پاسخ درست زیر ۵ ثانیه +۲۰ امتیاز اضافه می‌آورد',
        2: 'پاسخ درست زیر ۵ ثانیه +۳۵ امتیاز اضافه می‌آورد',
        3: 'پاسخ درست زیر ۵ ثانیه +۵۰ امتیاز اضافه می‌آورد'
      },
      triggers: ['ON_ANSWER_CORRECT'],
      levels: {
        1: { thresholdSeconds: 5, bonusPoints: 20 },
        2: { thresholdSeconds: 5, bonusPoints: 35 },
        3: { thresholdSeconds: 5, bonusPoints: 50 }
      }
    },

    // --- SURVIVAL (3 cards) ---
    {
      id: 'threshold_guardian',
      slug: 'threshold_guardian',
      family: 'survival',
      titleFa: 'نگهبان آستانه',
      immuneToBossSeal: true,
      oncePerRun: true,
      shortEffectByLevel: {
        1: 'یک بار در ران جلوی از دست رفتن شمع را هنگام نرسیدن به هدف می‌گیرد',
        2: 'یک بار در ران شمع را حفظ و +۹۰ امتیاز شروع به تلاش دوباره می‌دهد',
        3: 'یک بار در ران شمع را حفظ، +۱۵۰ امتیاز و +۲۰ تجربهٔ ران می‌دهد'
      },
      triggers: ['ON_ROOM_END'],
      levels: {
        1: { savesCandleOncePerRun: true, retryHeadstartScore: 0, retryRunXp: 0 },
        2: { savesCandleOncePerRun: true, retryHeadstartScore: 90, retryRunXp: 10 },
        3: { savesCandleOncePerRun: true, retryHeadstartScore: 150, retryRunXp: 20 }
      }
    },
    {
      id: 'hidden_flame',
      slug: 'hidden_flame',
      family: 'survival',
      titleFa: 'شعل پنهان',
      immuneToBossSeal: true,
      shortEffectByLevel: {
        1: 'نخستین خطا در هر اتاق نیمی از کمبو و سپر شعله پنهان را نگه می‌دارد',
        2: 'نخستین خطا در هر اتاق کل کمبو را برای ادامه نبرد حفظ می‌کند',
        3: 'نخستین خطا در اتاق کل کمبو را حفظ و +۲۰ امتیاز پایداری می‌دهد'
      },
      triggers: ['ON_ANSWER_WRONG', 'ON_ANSWER_CORRECT'],
      levels: {
        1: { streakRetainRatio: 0.5, shelterBonus: 0 },
        2: { streakRetainRatio: 1.0, shelterBonus: 10 },
        3: { streakRetainRatio: 1.0, shelterBonus: 20 }
      }
    },
    {
      id: 'cracked_armor',
      slug: 'cracked_armor',
      family: 'survival',
      titleFa: 'زره ترکخورده',
      shortEffectByLevel: {
        1: 'پس از خطا، پاسخ درست بعدی +۳۰ امتیاز جبران و +۶ تجربهٔ ران دارد',
        2: 'پس از خطا، پاسخ درست بعدی +۵۰ امتیاز جبران و +۱۰ تجربهٔ ران دارد',
        3: 'پس از خطا، پاسخ درست بعدی +۷۵ امتیاز جبران و +۱۵ تجربهٔ ران دارد'
      },
      triggers: ['ON_ANSWER_WRONG', 'ON_ANSWER_CORRECT'],
      levels: {
        1: { recoveryScore: 30, recoveryRunXp: 6 },
        2: { recoveryScore: 50, recoveryRunXp: 10 },
        3: { recoveryScore: 75, recoveryRunXp: 15 }
      }
    },

    // --- ARCANE (3 cards) ---
    {
      id: 'passage',
      slug: 'passage',
      family: 'arcane',
      titleFa: 'گذر',
      shortEffectByLevel: {
        1: 'امکان جابه‌جایی ۱ پرسش بدون جریمه در اتاق و +۴۵ امتیاز عبور',
        2: 'امکان جابه‌جایی ۱ پرسش بدون جریمه در اتاق و +۷۵ امتیاز عبور',
        3: 'امکان جابه‌جایی ۲ پرسش بدون جریمه در اتاق و +۱۱۰ امتیاز عبور'
      },
      triggers: ['ON_QUESTION_PRESENT', 'ON_ROOM_END'],
      levels: {
        1: { reroutesPerRoom: 1, roomEndTransitBonus: 45 },
        2: { reroutesPerRoom: 1, roomEndTransitBonus: 75 },
        3: { reroutesPerRoom: 2, roomEndTransitBonus: 110 }
      }
    },
    {
      id: 'error_mirror',
      slug: 'error_mirror',
      family: 'arcane',
      titleFa: 'آیینه خطا',
      shortEffectByLevel: {
        1: 'بازپاسخ درست به واژهٔ اشتباه +۲۵ امتیاز و +۰.۲۵ ضریب جمعی می‌دهد',
        2: 'بازپاسخ درست به واژهٔ اشتباه +۴۰ امتیاز و +۰.۴۰ ضریب جمعی می‌دهد',
        3: 'بازپاسخ درست به واژهٔ اشتباه +۶۰ امتیاز و +۰.۵۵ ضریب جمعی می‌دهد'
      },
      triggers: ['ON_ANSWER_WRONG', 'ON_ANSWER_CORRECT'],
      levels: {
        1: { mirrorBonusPoints: 25, additiveMult: 0.25 },
        2: { mirrorBonusPoints: 40, additiveMult: 0.40 },
        3: { mirrorBonusPoints: 60, additiveMult: 0.55 }
      }
    },
    {
      id: 'midnight_eye',
      slug: 'midnight_eye',
      family: 'arcane',
      titleFa: 'چشم نیمهشب',
      shortEffectByLevel: {
        1: 'یک گزینهٔ انحرافی را در پرسش‌های اول و بازتمرین حذف می‌کند',
        2: 'یک گزینهٔ انحرافی را در نیمی از پرسش‌ها و همه بازتمرین‌ها حذف می‌کند',
        3: 'در تمام پرسش‌ها ۱ گزینهٔ انحرافی حذف و سرنخ موضوعی نمایش می‌دهد'
      },
      triggers: ['ON_QUESTION_PRESENT'],
      levels: {
        1: { eliminateCount: 1, scope: 'retry_or_early' },
        2: { eliminateCount: 1, scope: 'retry_and_half' },
        3: { eliminateCount: 1, scope: 'all_with_clue' }
      }
    }
  ];

  const PACT_CARD_MAP = new Map();
  const PACT_CARDS = Object.freeze(RAW_PACT_CARDS.map(def => {
    const assets = Object.freeze({
      1: `${CARD_ASSETS_DIR}/card_${def.family}_${def.slug}_l1.jpg`,
      2: `${CARD_ASSETS_DIR}/card_${def.family}_${def.slug}_l2.jpg`,
      3: `${CARD_ASSETS_DIR}/card_${def.family}_${def.slug}_l3.jpg`
    });
    const frozen = Object.freeze({
      ...def,
      familyInfo: PACT_FAMILIES[def.family.toUpperCase()],
      immuneToBossSeal: Boolean(def.immuneToBossSeal),
      oncePerRun: Boolean(def.oncePerRun),
      assets,
      levels: Object.freeze({
        1: Object.freeze({ ...def.levels[1] }),
        2: Object.freeze({ ...def.levels[2] }),
        3: Object.freeze({ ...def.levels[3] })
      }),
      shortEffectByLevel: Object.freeze({ ...def.shortEffectByLevel })
    });
    PACT_CARD_MAP.set(frozen.id, frozen);
    return frozen;
  }));

  function getPactCard(cardId) {
    return PACT_CARD_MAP.get(cardId) || null;
  }

  function getAllPactCards() {
    return PACT_CARDS.slice();
  }

  function getPactCardsByFamily(familyId) {
    return PACT_CARDS.filter(c => c.family === familyId);
  }

  const SC_COPY = Object.freeze({
    toFaDigits,

    hub: Object.freeze({
      title: 'شهر سوخته',
      subtitle: '۵ اتاق، یک باس. جدا از ۳ جهان دیگر.',
      standardMode: 'نبرد استاندارد',
      dailyChallenge: 'چالش روزانه',
      startBattle: 'شروع نبرد',
      resumeBattle: (n) => `ادامه نبرد (اتاق ${toFaDigits(n)} از ۵)`,
      leaderboard: 'لیدربورد',
      nefrinLockNotice: (n) => `درجه‌های نفرین پس از ۳ ران باز می‌شوند (${toFaDigits(n)} از ۳).`
    }),

    draft: Object.freeze({
      title: 'انتخاب پیمان',
      subtitle: (n) => `پس از اتاق ${toFaDigits(n)}`,
      skip: 'ادامه بدون پیمان',
      bossPrepTitle: 'آماده‌سازی باس',
      freeSwap: 'تعویض رایگان',
      replacePrompt: 'کدام پیمان جایگزین شود؟',
      pickBtn: (name) => `انتخاب ${name}`,
      upgradeBtn: (name, roman) => `ارتقای ${name} به ${roman}`,
      replaceBtn: 'جایگزین‌کردن…',
      badges: Object.freeze({
        new: 'جدید',
        upgrade: 'ارتقا',
        replace: 'جایگزینی',
        immune: 'مصون از مهر باس',
        bossKey: 'کلید باس'
      })
    }),

    battle: Object.freeze({
      roomCounter: (n) => `اتاق ${toFaDigits(n)}/۵`,
      cycleCounter: (n) => `دور ${toFaDigits(n)}`,
      practiceReveal: (x) => `پاسخ درست: ${x} • به صف تمرین رفت.`,
      pactReceipt: (name, n) => `${name} +${toFaDigits(n)}`,
      currency: 'XP'
    }),

    result: Object.freeze({
      roomCleared: (n) => `اتاق ${toFaDigits(n)} پاک شد.`,
      bossDefeated: (n) => `باس شکست خورد. دور ${toFaDigits(n)} شروع شد.`,
      runFailed: (a, b) => `امتیاز ${toFaDigits(a)} از هدف ${toFaDigits(b)} کمتر بود. شمع‌ها خاموش شدند.`,
      guardianSaved: 'نگهبان آستانه یک شمع را نجات داد.'
    }),

    nefrin: Object.freeze({
      0: 'بدون چالش اضافه.',
      1: 'هدف امتیاز باس ۵٪ بیشتر.',
      2: 'هدف امتیاز باس ۱۰٪ بیشتر.',
      3: 'هدف باس ۱۰٪ بیشتر؛ باس یک قانون کمکی از باس دیگر قرض می‌گیرد.',
      4: 'همهٔ موارد نفرین ۳ + سوال‌های سخت‌تر (کنایه، ایهام، تاریخ ادبیات).',
      5: 'همهٔ موارد نفرین ۴ + مهر یک پیمان غیربقا در اتاق ۵.'
    }),

    bossLaws: Object.freeze({
      '01_rift_scribe': 'واژه‌های بازتمرین اولویت دارند و پاسخ درستشان ۲۵٪ امتیاز بیشتر می‌گیرد.',
      '02_cinder_hourglass': 'پاسخ زیر ۵ ثانیه ×۱٫۳ و +۲۵ امتیاز؛ بالای ۹ ثانیه ×۰٫۸۵.',
      '03_ash_twin': 'کمبوی زوج ×۱٫۳۵؛ کمبوی فرد ×۰٫۹۰.',
      '04_pact_warden': 'پیمان‌های طمع مهر می‌شوند؛ همهٔ پاسخ‌ها ×۱٫۱.',
      '05_inverted_mirror_lord': 'ترتیب گزینه‌ها وارونه است؛ جواب درست به خطای قبلی +۳۵ امتیاز؛ کمبو ۵+ ×۱٫۱۸.',
      '06_furnace_tollkeeper': '۲ پاسخ اول ×۰٫۸۵؛ از کمبو ۳ به بعد ×۱٫۳.',
      '07_smoke_ember_phantom': 'اولین پاسخ درست بعد از خطا ×۰٫۸۵؛ با کمبو ۳+ ×۱٫۲۵.',
      '08_cold_wick_sentinel': 'پیمان‌های کمبو مهر می‌شوند؛ همهٔ پاسخ‌ها ×۱٫۱.',
      '09_ruin_architect': 'هر پاسخ درست چهارم: +۴۰ امتیاز و ×۱٫۲۵.',
      '10_lord_eternal_pyre': '۳ پاسخ اول ×۰٫۹۵؛ از کمبو ۴ به بعد ×۱٫۳۵ و +۲۰ امتیاز.'
    }),

    getPactDescription: (cardId, level = 1) => {
      const card = getPactCard(cardId);
      if (!card) return '';
      const lvl = Math.max(1, Math.min(3, Math.round(Number(level) || 1)));
      const l = (card.levels && card.levels[lvl]) || {};
      switch (cardId) {
        case 'flame_strike':
          return `کمبو ۲+: ${toFaDigits(l.bonusPoints)} امتیاز بیشتر. کمبو ۳+: ضریب +${toFaDigits(l.additiveMult)}.`;
        case 'golden_strike':
          return `هر ۳ پاسخ درست پشت‌سرهم: ${toFaDigits(l.bonusPoints)} امتیاز و ${toFaDigits(l.bonusRunXp)} XP.`;
        case 'ember_chain':
          return `هر پله کمبو ${toFaDigits(l.streakStepBonus)} امتیاز می‌دهد؛ ${toFaDigits(l.carryStreak)} کمبو به اتاق بعد می‌ماند.`;
        case 'treasure_hoard':
          return `هر پاسخ درست ${toFaDigits(l.bonusRunXpPerCorrect)} XP؛ پایان اتاق ${toFaDigits(l.roomEndBonusScore)} امتیاز و ${toFaDigits(l.roomEndBonusXp)} XP.`;
        case 'extortionist':
          return `۲ سوال بیشتر و ۱۵٪ هدف بیشتر؛ امتیاز اتاق ×${toFaDigits(l.roomScoreMultiplier)}.`;
        case 'golden_quill':
          return `پاسخ درست زیر ۵ ثانیه: ${toFaDigits(l.bonusPoints)} امتیاز.`;
        case 'threshold_guardian':
          if (l.retryHeadstartScore > 0 || l.retryRunXp > 0) {
            return `یک بار در ران، شمع را نجات می‌دهد؛ ${toFaDigits(l.retryHeadstartScore)} امتیاز و ${toFaDigits(l.retryRunXp)} XP.`;
          }
          return 'یک بار در ران، شمع را از شکست نجات می‌دهد.';
        case 'hidden_flame': {
          const pct = toFaDigits(Math.round((l.streakRetainRatio || 0) * 100));
          if (l.shelterBonus > 0) {
            return `اولین خطای هر اتاق: ${pct}٪ کمبو می‌ماند و ${toFaDigits(l.shelterBonus)} امتیاز.`;
          }
          return `اولین خطای هر اتاق: ${pct}٪ کمبو می‌ماند.`;
        }
        case 'cracked_armor':
          return `اولین پاسخ درست بعد از خطا: ${toFaDigits(l.recoveryScore)} امتیاز و ${toFaDigits(l.recoveryRunXp)} XP.`;
        case 'passage':
          return `هر اتاق ${toFaDigits(l.reroutesPerRoom)} بار سوال سخت را بدون جریمه رد کن؛ پایان اتاق ${toFaDigits(l.roomEndTransitBonus)} امتیاز.`;
        case 'error_mirror':
          return `جواب درست به واژهٔ غلط قبلی: ${toFaDigits(l.mirrorBonusPoints)} امتیاز و ضریب +${toFaDigits(l.additiveMult)}.`;
        case 'midnight_eye': {
          const scopeMap = {
            retry_or_early: 'سوال‌های اول و بازتمرین‌ها',
            retry_and_half: 'نیمی از سوال‌ها و بازتمرین‌ها',
            all_with_clue: 'همه سوال‌ها + سرنخ دسته'
          };
          const scopeText = scopeMap[l.scope] || l.scope || '';
          return `یک گزینهٔ غلط حذف می‌شود: ${scopeText}.`;
        }
        default:
          return card.shortEffectByLevel[lvl] || '';
      }
    },

    getPactTradeOffs: () => ''
  });

  function getPactShortEffect(cardId, level = 1) {
    return SC_COPY.getPactDescription(cardId, level);
  }

  const PACT_LORE_AND_DETAILS = Object.freeze({});

  function getPactDescription(cardId, level = 1) {
    return SC_COPY.getPactDescription(cardId, level);
  }

  function getPactTradeOffs(cardId, level = 1) {
    return SC_COPY.getPactTradeOffs(cardId, level);
  }

  function isPactProtectedFromSeal(cardId) {
    const card = getPactCard(cardId);
    return Boolean(card && card.immuneToBossSeal);
  }

  function isPactLockedForRun(run, cardId) {
    if (!run || !Array.isArray(run.availablePactLocks) || run.availablePactLocks.length === 0) return false;
    const card = getPactCard(cardId);
    if (!card) return false;
    // Hard Guardrail: once-per-run / sheltered survival pacts NEVER get sealed by boss rules!
    if (card.immuneToBossSeal) return false;
    return run.availablePactLocks.includes(card.family) || run.availablePactLocks.includes(card.id);
  }

  function getActivePactSlots(run = currentRun) {
    if (!run || !Array.isArray(run.activePacts)) return [];
    return run.activePacts
      .filter(slot => slot && slot.cardId && PACT_CARD_MAP.has(slot.cardId))
      .slice(0, MAX_ACTIVE_PACTS)
      .map(slot => {
        const card = getPactCard(slot.cardId);
        const level = Math.max(1, Math.min(3, Number(slot.level) || 1));
        const sealed = isPactLockedForRun(run, card.id);
        return {
          cardId: card.id,
          level,
          levelRoman: getPactLevelRoman(level),
          family: card.family,
          familyInfo: card.familyInfo,
          titleFa: card.titleFa,
          shortEffect: getPactShortEffect(card.id, level),
          assetPath: getPactCardAssetPath(card.id, level),
          immuneToBossSeal: card.immuneToBossSeal,
          oncePerRun: card.oncePerRun,
          sealed,
          spentThisRun: card.id === 'threshold_guardian' ? Boolean(run.thresholdGuardianUsed) : false,
          stats: card.levels[level]
        };
      });
  }

  function findActivePactEntry(run, cardId, includeSealed = false) {
    if (!run || !Array.isArray(run.activePacts)) return null;
    const entry = run.activePacts.find(p => p && p.cardId === cardId);
    if (!entry) return null;
    if (!includeSealed && isPactLockedForRun(run, cardId)) return null;
    const card = getPactCard(cardId);
    if (!card) return null;
    const level = Math.max(1, Math.min(3, Number(entry.level) || 1));
    return {
      card,
      level,
      stats: card.levels[level]
    };
  }

  function getActivePactLevel(cardId, run = currentRun) {
    const found = findActivePactEntry(run, cardId, true);
    return found ? found.level : 0;
  }

  function hasActivePact(cardId, run = currentRun) {
    return getActivePactLevel(cardId, run) > 0;
  }

  function getFamilyInfo(familyId) {
    const upper = String(familyId || '').toUpperCase();
    return PACT_FAMILIES[upper] || {
      id: String(familyId || 'combo'),
      nameFa: String(familyId || 'پیمان'),
      labelFa: String(familyId || 'پیمان'),
      badgeGlyph: 'نشان',
      accentHex: '#f59e0b'
    };
  }

  // Fallback storage for non-browser / Node test execution
  const memoryStorage = new Map();
  let customStorageBackend = null;

  function setStorageBackend(storageObj) {
    customStorageBackend = storageObj || null;
  }

  function readStorage(key, fallbackValue) {
    try {
      if (customStorageBackend && typeof customStorageBackend.getItem === 'function') {
        const raw = customStorageBackend.getItem(key);
        return raw ? JSON.parse(raw) : fallbackValue;
      }
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallbackValue;
      }
      if (memoryStorage.has(key)) {
        return JSON.parse(memoryStorage.get(key));
      }
    } catch (_) {}
    return fallbackValue;
  }

  function writeStorage(key, value) {
    try {
      const serialized = JSON.stringify(value);
      if (customStorageBackend && typeof customStorageBackend.setItem === 'function') {
        customStorageBackend.setItem(key, serialized);
        return;
      }
      if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        localStorage.setItem(key, serialized);
        return;
      }
      memoryStorage.set(key, serialized);
    } catch (_) {}
  }

  function removeStorage(key) {
    try {
      if (customStorageBackend && typeof customStorageBackend.removeItem === 'function') {
        customStorageBackend.removeItem(key);
        return;
      }
      if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
        localStorage.removeItem(key);
        return;
      }
      memoryStorage.delete(key);
    } catch (_) {}
  }

  // ==========================================================================
  // DETERMINISTIC DATE & SEEDED PRNG HELPERS (Daily Run: YYYY-MM-DD)
  // ==========================================================================

  function getCalendarDateKey(dateInput) {
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
      return dateInput.trim();
    }
    const d = dateInput instanceof Date ? dateInput : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function hashSeedString(seedStr) {
    const str = String(seedStr || 'scorched-city');
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function createSeededRng(seedStr) {
    let a = hashSeedString(seedStr) || 1;
    return function nextRandom() {
      let t = (a += 0x6D2B79F5) >>> 0;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createDailyRunSeed(dateKey, grade = '10') {
    const normalizedDate = getCalendarDateKey(dateKey);
    const normalizedGrade = (grade === '11' || grade === 11) ? '11' : '10';
    return `sc-daily-${normalizedDate}-g${normalizedGrade}`;
  }

  function seededShuffle(list, rng) {
    const arr = Array.isArray(list) ? list.slice() : [];
    const rand = typeof rng === 'function' ? rng : Math.random;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  // ==========================================================================
  // SIMULATION TUNING (Configurable Room 5 base target score, default 1500)
  // ==========================================================================

  let activeTuning = {
    ...DEFAULT_SIMULATION_TUNING,
    roomBaseTargetScores: { ...DEFAULT_SIMULATION_TUNING.roomBaseTargetScores }
  };

  function getSimulationTuning() {
    return {
      ...activeTuning,
      roomBaseTargetScores: { ...activeTuning.roomBaseTargetScores }
    };
  }

  function setSimulationTuning(patch = {}) {
    if (!patch || typeof patch !== 'object') return getSimulationTuning();
    const nextRoomBase = { ...activeTuning.roomBaseTargetScores };
    if (patch.roomBaseTargetScores && typeof patch.roomBaseTargetScores === 'object') {
      [1, 2, 3, 4, 5].forEach(r => {
        if (typeof patch.roomBaseTargetScores[r] === 'number' && patch.roomBaseTargetScores[r] > 0) {
          nextRoomBase[r] = Math.round(patch.roomBaseTargetScores[r]);
        }
      });
    }
    if (typeof patch.room5BaseTargetScore === 'number' && patch.room5BaseTargetScore > 0) {
      nextRoomBase[5] = Math.round(patch.room5BaseTargetScore);
      activeTuning.room5BaseTargetScore = Math.round(patch.room5BaseTargetScore);
    } else {
      activeTuning.room5BaseTargetScore = nextRoomBase[5];
    }

    ['loopTargetScaleStep', 'startingCandles', 'maxCandles', 'questionsPerRoom', 'baseCorrectScore', 'streakStepBonus', 'baseCorrectRunXp', 'roomClearRunXpBonus'].forEach(k => {
      if (typeof patch[k] === 'number' && patch[k] >= 0) {
        activeTuning[k] = patch[k];
      }
    });

    activeTuning.roomBaseTargetScores = nextRoomBase;
    return getSimulationTuning();
  }

  function resetSimulationTuning() {
    activeTuning = {
      ...DEFAULT_SIMULATION_TUNING,
      roomBaseTargetScores: { ...DEFAULT_SIMULATION_TUNING.roomBaseTargetScores }
    };
    return getSimulationTuning();
  }

  function computeRoomTargetScore(room, cycle = 1, bossModifier = null, tuningOverride = null, nefrinTier = 0) {
    const t = tuningOverride || activeTuning;
    const clampedRoom = Math.max(1, Math.min(ROOMS_PER_CYCLE, Number(room) || 1));
    const safeCycle = Math.max(1, Number(cycle) || 1);
    const baseForRoom = clampedRoom === BOSS_ROOM
      ? (Number(t.room5BaseTargetScore) || Number(t.roomBaseTargetScores[5]) || 1500)
      : (Number(t.roomBaseTargetScores[clampedRoom]) || 300);

    const loopMult = 1 + ((safeCycle - 1) * (Number(t.loopTargetScaleStep) || 0));
    const bossMult = (clampedRoom === BOSS_ROOM && bossModifier && typeof bossModifier.targetScoreMultiplier === 'number' && bossModifier.targetScoreMultiplier > 0)
      ? bossModifier.targetScoreMultiplier
      : 1.0;
    const bossDelta = (clampedRoom === BOSS_ROOM && bossModifier && typeof bossModifier.targetScoreDelta === 'number')
      ? bossModifier.targetScoreDelta
      : 0;

    let nefrinMult = 1.0;
    if (clampedRoom === BOSS_ROOM) {
      const tier = Math.max(0, Math.min(5, Number(nefrinTier) || 0));
      if (tier === 1) nefrinMult = 1.05; // Tier 1 (نفرین ۱): +5% Room 5 boss target score
      else if (tier >= 2) nefrinMult = 1.10; // Tier 2+ (نفرین ۲): +10% Room 5 boss target score
    }

    return Math.max(50, Math.round(baseForRoom * loopMult * bossMult * nefrinMult + bossDelta));
  }

  // ==========================================================================
  // SHARED BOSS CONSTRAINTS SCAFFOLDING (6 Core Guardrails & 5 Trigger Events)
  // ==========================================================================

  function validateBossDefinition(def) {
    if (!def || typeof def !== 'object') {
      throw new Error('ScorchedCity Boss definition must be a non-null object.');
    }
    if (!def.id || typeof def.id !== 'string') {
      throw new Error('ScorchedCity Boss definition requires string id.');
    }
    if (!def.name || typeof def.name !== 'string') {
      throw new Error(`Boss "${def.id}" requires name.`);
    }
    if (!def.lawTitle || typeof def.lawTitle !== 'string' || !def.lawDescription || typeof def.lawDescription !== 'string') {
      throw new Error(`Boss "${def.id}" requires lawTitle and lawDescription for Room 4 telegraph.`);
    }
    if (!def.keyFamily || typeof def.keyFamily !== 'string') {
      throw new Error(`Boss "${def.id}" violates Guardrail 5: missing keyFamily.`);
    }
    if (!def.universalAnswerPath || typeof def.universalAnswerPath !== 'object' || !def.universalAnswerPath.title || !def.universalAnswerPath.description) {
      throw new Error(`Boss "${def.id}" violates Guardrail 5: missing universalAnswerPath (pure knowledge path).`);
    }
    if (!def.educationalGoal || typeof def.educationalGoal !== 'string') {
      throw new Error(`Boss "${def.id}" violates Guardrail 6: missing educationalGoal.`);
    }
    if (def.autoActivatePacts === true) {
      throw new Error(`Boss "${def.id}" violates Guardrail 4: bosses may NEVER auto-activate player pacts.`);
    }
    if (def.canRemoveCandleDirectly === true) {
      throw new Error(`Boss "${def.id}" violates Guardrail 3: bosses may NEVER remove candles directly.`);
    }
    if (def.canDeleteMistakes === true) {
      throw new Error(`Boss "${def.id}" violates Guardrail 2: bosses may NEVER delete mistakes.`);
    }
    if (def.allowBypassWeakItems === true) {
      throw new Error(`Boss "${def.id}" violates Guardrail 6: bosses may NEVER bypass weak items.`);
    }

    const allowedEffects = Array.isArray(def.allowedEffects) && def.allowedEffects.length > 0
      ? def.allowedEffects
      : ['target_score', 'score_multiplier'];

    allowedEffects.forEach(effect => {
      if (!ALLOWED_BOSS_EFFECTS.includes(effect)) {
        throw new Error(`Boss "${def.id}" violates Guardrail 3: disallowed effect "${effect}".`);
      }
    });

    const rawTriggers = def.triggers && typeof def.triggers === 'object' ? def.triggers : {};
    const sanitizedTriggers = {};
    Object.keys(rawTriggers).forEach(evt => {
      if (!BOSS_TRIGGER_EVENTS.includes(evt)) {
        throw new Error(`Boss "${def.id}" violates Guardrail 4: unknown trigger event "${evt}". Allowed: ${BOSS_TRIGGER_EVENTS.join(', ')}`);
      }
      if (typeof rawTriggers[evt] !== 'function') {
        throw new Error(`Boss "${def.id}" trigger "${evt}" must be a function.`);
      }
      sanitizedTriggers[evt] = rawTriggers[evt];
    });

    return Object.freeze({
      id: def.id,
      slug: def.slug || def.id,
      name: def.name,
      title: def.title || def.name,
      lawTitle: def.lawTitle,
      lawDescription: def.lawDescription,
      lawShortFa: def.lawShortFa || (SC_COPY && SC_COPY.bossLaws && SC_COPY.bossLaws[def.id]) || def.lawDescription,
      keyFamily: def.keyFamily,
      keyFamilyLabel: def.keyFamilyLabel || def.keyFamily,
      universalAnswerPath: Object.freeze({ ...def.universalAnswerPath }),
      educationalGoal: def.educationalGoal,
      allowedEffects: Object.freeze([...allowedEffects]),
      triggers: Object.freeze(sanitizedTriggers),
      targetScoreMultiplier: (typeof def.targetScoreMultiplier === 'number' && def.targetScoreMultiplier > 0) ? def.targetScoreMultiplier : 1.0,
      targetScoreDelta: (typeof def.targetScoreDelta === 'number') ? def.targetScoreDelta : 0,
      spriteQuirks: def.spriteQuirks ? Object.freeze({ ...def.spriteQuirks }) : Object.freeze({}),
      telegraphRoom: TELEGRAPH_ROOM,
      // Hard-locked guardrail invariants
      maxActiveModifiers: MAX_ACTIVE_BOSS_MODIFIERS,
      autoActivatePacts: false,
      canRemoveCandleDirectly: false,
      canDeleteMistakes: false,
      allowBypassWeakItems: false
    });
  }

  function sanitizeBossHookResult(rawPatch) {
    if (!rawPatch || typeof rawPatch !== 'object') {
      return { cleanPatch: {}, blockedViolations: [] };
    }
    const cleanPatch = {};
    const blockedViolations = [];

    Object.keys(rawPatch).forEach(key => {
      if (PROHIBITED_BOSS_KEYS.includes(key)) {
        blockedViolations.push(key);
        return;
      }
      cleanPatch[key] = rawPatch[key];
    });

    // Restrict allowed patch keys strictly to the 4 permitted domains
    const safeOutput = {};
    if (typeof cleanPatch.targetScoreDelta === 'number') safeOutput.targetScoreDelta = cleanPatch.targetScoreDelta;
    if (typeof cleanPatch.targetScoreMultiplier === 'number' && cleanPatch.targetScoreMultiplier > 0) {
      safeOutput.targetScoreMultiplier = cleanPatch.targetScoreMultiplier;
    }
    if (typeof cleanPatch.scoreMultiplier === 'number' && cleanPatch.scoreMultiplier > 0) {
      safeOutput.scoreMultiplier = cleanPatch.scoreMultiplier;
    }
    if (typeof cleanPatch.bonusPoints === 'number') {
      safeOutput.bonusPoints = cleanPatch.bonusPoints;
    }
    if (cleanPatch.questionPresentation && typeof cleanPatch.questionPresentation === 'object') {
      safeOutput.questionPresentation = { ...cleanPatch.questionPresentation };
    }
    if (Array.isArray(cleanPatch.lockedPactFamilies)) {
      safeOutput.lockedPactFamilies = [...cleanPatch.lockedPactFamilies];
    }
    if (typeof cleanPatch.pactCostMultiplier === 'number' && cleanPatch.pactCostMultiplier > 0) {
      safeOutput.pactCostMultiplier = cleanPatch.pactCostMultiplier;
    }
    if (typeof cleanPatch.notice === 'string') {
      safeOutput.notice = cleanPatch.notice;
    }

    return { cleanPatch: safeOutput, blockedViolations };
  }

  // Internal Boss Registry (Step 1 contains single base Room 5 boss scaffolding; Step 3 registers all 10 bosses)
  const bossRegistry = new Map();

  function registerBoss(def) {
    const validated = validateBossDefinition(def);
    bossRegistry.set(validated.id, validated);
    return validated;
  }

  function getBoss(bossId) {
    return bossRegistry.get(bossId) || null;
  }

  function getRegisteredBosses() {
    return Array.from(bossRegistry.values());
  }

  // ==========================================================================
  // STEP 3: CANONICAL 10-BOSS ROSTER & LAZY SPRITE ATLAS CONFIG
  // ==========================================================================

  const BOSS_SPRITES_DIR = 'assets/boss_sprites';
  const BOSS_ANIM_FPS = Object.freeze({
    idle: 4,
    attack: 10,
    hit: 10,
    death: 6
  });

  const BOSS_SPRITE_SLUGS = Object.freeze([
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
  ]);

  function getBossSpriteConfig(bossIdOrSlug) {
    const rawSlug = String(bossIdOrSlug || '01_rift_scribe');
    const slug = BOSS_SPRITE_SLUGS.includes(rawSlug) ? rawSlug : '01_rift_scribe';
    const quirks = {};
    if (slug === '05_inverted_mirror_lord') {
      // Attack frame 3 (0-indexed step 2) is a standalone slash effect; composite over step 1
      quirks.attackFrameOverlay = Object.freeze({ targetStep: 2, underlayStep: 1 });
    }
    if (slug === '02_cinder_hourglass') {
      // Hourglass glass is intentionally green and opaque; never apply green chroma-keying
      quirks.preserveOpaqueGreenGlass = true;
    }
    return Object.freeze({
      slug,
      sheetPath: `${BOSS_SPRITES_DIR}/${slug}_sheet.png`,
      atlasPath: `${BOSS_SPRITES_DIR}/${slug}_atlas.json`,
      quirks: Object.freeze(quirks)
    });
  }

  // Step 1 Base Room 5 Boss Scaffolding (retained for backward compatibility)
  const BASE_STEP1_BOSS_STUB = registerBoss({
    id: 'sc_warden_base',
    slug: '01_rift_scribe',
    name: 'سایه‌ی خاکستر (باس پایه)',
    lawTitle: 'آزمون استواری خاکستر',
    lawDescription: 'در اتاق پنجم امتیاز هدف بر پایه ۱۵۰۰ تنظیم می‌شود. پاسخ اشتباه معنای درست را آشکار می‌کند و واژه را به صف تمرین بازمی‌گرداند.',
    keyFamily: 'combo',
    keyFamilyLabel: 'شعله و کمبو',
    universalAnswerPath: {
      title: 'مسیر دانش خالص',
      description: 'پاسخ‌گویی دقیق و متوالی به واژگان و مفاهیم ادبی، بدون نیاز به هیچ پیمانی امتیاز ۱۵۰۰ اتاق پنجم را تأمین می‌کند.'
    },
    educationalGoal: 'تقویت یادگیری و تثبیت واژگان ضعیف از طریق آشکارسازی فوری پاسخ و بازگشت حتمی به صف تمرین.',
    allowedEffects: ['target_score', 'score_multiplier', 'question_presentation', 'pact_availability'],
    targetScoreMultiplier: 1.0,
    triggers: {
      ON_ROOM_START: (ctx) => ({
        notice: `قانون باس فعال شد: هدف امتیاز ${ctx.roomTargetScore}`,
        scoreMultiplier: 1.0
      }),
      ON_QUESTION_PRESENT: () => ({
        questionPresentation: { prioritizeWeakPracticeItems: true }
      }),
      ON_ANSWER_CORRECT: (ctx) => ({
        scoreMultiplier: ctx.streakInRoom >= 4 ? 1.1 : 1.0
      }),
      ON_ANSWER_WRONG: () => ({
        notice: 'پاسخ صحیح نمایش داده شد و کارت به صف تمرین بازگشت.'
      }),
      ON_ROOM_END: () => ({})
    }
  });

  const RAW_SCORCHED_CITY_BOSSES = [
    {
      id: '01_rift_scribe',
      slug: '01_rift_scribe',
      name: 'کاتب شکاف',
      lawTitle: 'حاشیهٔ کتاب شکاف',
      lawDescription: 'کاتب شکاف واژه‌های بازتمرینی را در اولویت قرار می‌دهد و پاسخ درست روی آن‌ها را با ضریب ۱.۲۵ پاداش می‌دهد.',
      keyFamily: 'arcane',
      keyFamilyLabel: 'خانواده آرکان',
      universalAnswerPath: {
        title: 'مرور دقیق خطاها',
        description: 'با تمرکز بر واژگان بازگشتی و پاسخ پیوسته، بدون پیمان هم امتیاز ۱۵۰۰ به‌سادگی به دست می‌آید.'
      },
      educationalGoal: 'تبدیل واژگان دشوار و خطاهای پیشین به امتیاز بالاتر هنگام بازیابی.',
      allowedEffects: ['target_score', 'score_multiplier', 'question_presentation'],
      triggers: {
        ON_ROOM_START: () => ({ scoreMultiplier: 1.0, notice: 'کاتب شکاف طومار بازتمرین را گشود.' }),
        ON_QUESTION_PRESENT: (ctx) => ({
          questionPresentation: {
            prioritizeWeakPracticeItems: true,
            scribeRetryHighlight: Boolean(ctx.question && ctx.question.isPracticeRetry)
          }
        }),
        ON_ANSWER_CORRECT: (ctx) => ({
          scoreMultiplier: (ctx.card && ctx.card.isPracticeRetry) ? 1.25 : (ctx.streakInRoom >= 5 ? 1.18 : 1.0)
        }),
        ON_ANSWER_WRONG: () => ({ notice: 'کاتب شکاف واژه را در صف بازتمرین ثبت کرد و معنا آشکار شد.' }),
        ON_ROOM_END: () => ({})
      }
    },
    {
      id: '02_cinder_hourglass',
      slug: '02_cinder_hourglass',
      name: 'ساعت‌شنی اخگر',
      lawTitle: 'شتاب شن‌های داغ',
      lawDescription: 'پاسخ درست زیر ۵ ثانیه ضریب ۱.۳ و +۲۵ امتیاز می‌گیرد؛ پاسخ بسیار کند بالای ۹ ثانیه با ضریب ۰.۸۵ ثبت می‌شود.',
      keyFamily: 'greed',
      keyFamilyLabel: 'خانواده طمع',
      universalAnswerPath: {
        title: 'آهنگ پیوسته پاسخ‌ها',
        description: 'پاسخ‌گویی عادی در زمان معمول ضریب ۱.۰ را حفظ کرده و با کمبوی متوالی امتیاز ۱۵۰۰ را پر می‌کند.'
      },
      educationalGoal: 'تقویت یادآوری سریع واژگان در کنار آزادی زمان کافی هنگام تردید.',
      allowedEffects: ['target_score', 'score_multiplier', 'question_presentation'],
      spriteQuirks: { preserveOpaqueGreenGlass: true },
      triggers: {
        ON_ROOM_START: () => ({ scoreMultiplier: 1.0, notice: 'شن‌های سبز ساعت‌شنی به جریان افتادند.' }),
        ON_QUESTION_PRESENT: () => ({ questionPresentation: { prioritizeWeakPracticeItems: true } }),
        ON_ANSWER_CORRECT: (ctx) => {
          const sec = typeof ctx.answerDurationSec === 'number' ? ctx.answerDurationSec : 5;
          if (sec < 5) return { scoreMultiplier: 1.3, bonusPoints: 25 };
          if (sec >= 9) return { scoreMultiplier: 0.85 };
          return { scoreMultiplier: 1.0 };
        },
        ON_ANSWER_WRONG: () => ({ notice: 'ریزش شن متوقف نشد؛ معنای صحیح نمایان گردید.' }),
        ON_ROOM_END: () => ({})
      }
    },
    {
      id: '03_ash_twin',
      slug: '03_ash_twin',
      name: 'همزاد خاکستر',
      lawTitle: 'انعکاس دوگانه',
      lawDescription: 'پاسخ‌های زوج کمبو (۲، ۴، ۶...) با ضریب ۱.۳۵ و پاسخ‌های فرد با ضریب ۰.۹ محاسبه می‌شوند.',
      keyFamily: 'combo',
      keyFamilyLabel: 'خانواده کمبو',
      universalAnswerPath: {
        title: 'حفظ زنجیره بدون گسست',
        description: 'هر پاسخ درست متوالی پلهٔ کمبو را بالا می‌برد تا میانگین ضریب از ۱ فراتر رفته و هدف کامل شود.'
      },
      educationalGoal: 'تشویق تداوم پاسخ‌های درست متوالی برای هم‌افزایی کمبو.',
      allowedEffects: ['target_score', 'score_multiplier', 'question_presentation'],
      triggers: {
        ON_ROOM_START: () => ({ scoreMultiplier: 1.0, notice: 'دو همزاد سایه در آستانه ایستادند.' }),
        ON_QUESTION_PRESENT: () => ({ questionPresentation: { prioritizeWeakPracticeItems: true } }),
        ON_ANSWER_CORRECT: (ctx) => ({
          scoreMultiplier: (ctx.streakInRoom > 0 && ctx.streakInRoom % 2 === 0) ? 1.35 : 0.9
        }),
        ON_ANSWER_WRONG: () => ({ notice: 'پاسخ صحیح نمایش داده شد؛ کارت به صف تمرین بازگشت.' }),
        ON_ROOM_END: () => ({})
      }
    },
    {
      id: '04_pact_warden',
      slug: '04_pact_warden',
      name: 'نگهبان پیمان',
      lawTitle: 'مهر طمع و پاداش پایداری',
      lawDescription: 'خانواده «طمع» در اتاق ۵ مهر می‌شود، اما پیمان‌های یک‌باردرران بقا و مسیر دانش آزادند و ضریب پایه ۱.۱ فعال است.',
      keyFamily: 'survival',
      keyFamilyLabel: 'خانواده بقا',
      universalAnswerPath: {
        title: 'استواری بدون طمع',
        description: 'با اتکا بر دانش خالص یا پیمان‌های بقا، از ضریب پایه ۱.۱ برای شکست آسان هدف بهره ببرید.'
      },
      educationalGoal: 'آشنایی با سازگاری استراتژیک هنگام محدود شدن یک شاخه پیمان.',
      allowedEffects: ['target_score', 'score_multiplier', 'pact_availability'],
      triggers: {
        ON_ROOM_START: () => ({
          lockedPactFamilies: ['greed'],
          scoreMultiplier: 1.1,
          notice: 'نگهبان پیمان شاخه طمع را مهر کرد؛ دانش خالص ۱.۱x پاداش می‌گیرد.'
        }),
        ON_QUESTION_PRESENT: () => ({ questionPresentation: { prioritizeWeakPracticeItems: true } }),
        ON_ANSWER_CORRECT: () => ({ scoreMultiplier: 1.1 }),
        ON_ANSWER_WRONG: () => ({ notice: 'معنای درست آشکار شد و پیمان‌های محافظتی دست‌نخورده ماندند.' }),
        ON_ROOM_END: () => ({})
      }
    },
    {
      id: '05_inverted_mirror_lord',
      slug: '05_inverted_mirror_lord',
      name: 'امیر آیینهٔ وارون',
      lawTitle: 'چینش آیینه‌ای گزینه‌ها',
      lawDescription: 'ترتیب نمایش ۴ گزینه در این نبرد وارونه می‌شود؛ پاسخ درست به واژه‌های بازتمرینی +۳۵ امتیاز آیینه‌ای دارد.',
      keyFamily: 'arcane',
      keyFamilyLabel: 'خانواده آرکان',
      universalAnswerPath: {
        title: 'خواندن دقیق گزینه‌ها',
        description: 'شناخت معنای دقیق واژه بدون تکیه به جایگاه گزینه، پیروزی کامل در برابر آیینه را تضمین می‌کند.'
      },
      educationalGoal: 'حذف عادت‌های جایگاهی و تقویت درک معنایی واقعی واژه.',
      allowedEffects: ['target_score', 'score_multiplier', 'question_presentation'],
      spriteQuirks: { attackFrameOverlay: { targetStep: 2, underlayStep: 1 } },
      triggers: {
        ON_ROOM_START: () => ({ scoreMultiplier: 1.0, notice: 'آیینه وارون ترتیب گزینه‌ها را برگرداند.' }),
        ON_QUESTION_PRESENT: () => ({
          questionPresentation: { prioritizeWeakPracticeItems: true, reverseOptions: true }
        }),
        ON_ANSWER_CORRECT: (ctx) => ({
          scoreMultiplier: ctx.streakInRoom >= 5 ? 1.18 : 1.0,
          bonusPoints: (ctx.card && ctx.card.isPracticeRetry) ? 35 : 0
        }),
        ON_ANSWER_WRONG: () => ({ notice: 'در آیینهٔ خطا، پاسخ صحیح نمایان و واژه به صف تمرین برگشت.' }),
        ON_ROOM_END: () => ({})
      }
    },
    {
      id: '06_furnace_tollkeeper',
      slug: '06_furnace_tollkeeper',
      name: 'باج‌گیر کوره',
      lawTitle: 'باج شعلهٔ نخستین',
      lawDescription: 'دو پاسخ نخست اتاق ۵ با ضریب ۰.۸۵ ثبت می‌شوند، اما از کمبوی ۳ به بعد کوره با ضریب ۱.۳ زبانه می‌کشد.',
      keyFamily: 'greed',
      keyFamilyLabel: 'خانواده طمع',
      universalAnswerPath: {
        title: 'گذر از گرم‌شدن اولیه',
        description: 'با پاسخ درست به پرسش‌های میانی و پایانی، ضریب ۱.۳ امتیاز کل را فراتر از ۱۵۰۰ می‌برد.'
      },
      educationalGoal: 'تقویت تمرکز فزاینده از میانهٔ نبرد تا پایان اتاق.',
      allowedEffects: ['target_score', 'score_multiplier', 'question_presentation'],
      triggers: {
        ON_ROOM_START: () => ({ scoreMultiplier: 0.85, notice: 'باج‌گیر کوره عوارض ۲ پرسش اول را طلب کرد.' }),
        ON_QUESTION_PRESENT: () => ({ questionPresentation: { prioritizeWeakPracticeItems: true } }),
        ON_ANSWER_CORRECT: (ctx) => {
          const answered = ctx.run ? ctx.run.questionsAnsweredInRoom : 1;
          if (answered <= 2) return { scoreMultiplier: 0.85 };
          if (ctx.streakInRoom >= 3) return { scoreMultiplier: 1.3 };
          return { scoreMultiplier: 1.05 };
        },
        ON_ANSWER_WRONG: () => ({ notice: 'پاسخ درست آشکار شد و واژه برای مرور دوباره حفظ گردید.' }),
        ON_ROOM_END: () => ({})
      }
    },
    {
      id: '07_smoke_ember_phantom',
      slug: '07_smoke_ember_phantom',
      name: 'شبح دود و اخگر',
      lawTitle: 'مهِ پس از لغزش',
      lawDescription: 'پس از هر خطا، اولین پاسخ بعدی در دود با ضریب ۰.۸۵ ثبت می‌شود؛ کمبوی ۳+ دود را شکافته و ضریب ۱.۲۵ می‌دهد.',
      keyFamily: 'combo',
      keyFamilyLabel: 'خانواده کمبو',
      universalAnswerPath: {
        title: 'بازیابی کمبو در مه',
        description: 'حتی پس از یک اشتباه، پاسخ درست متوالی فوراً مه را کنار می‌زند و با کمبو امتیاز کامل می‌سازد.'
      },
      educationalGoal: 'آموزش بازیابی آرامش و پیوستگی پس از خطا بدون از دست رفتن انگیزه.',
      allowedEffects: ['target_score', 'score_multiplier', 'question_presentation'],
      triggers: {
        ON_ROOM_START: () => ({ scoreMultiplier: 1.0, notice: 'مه خاکستری اطراف میدان نبرد حلقه زد.' }),
        ON_QUESTION_PRESENT: () => ({ questionPresentation: { prioritizeWeakPracticeItems: true } }),
        ON_ANSWER_CORRECT: (ctx) => {
          if (ctx.streakInRoom === 1 && ctx.run && ctx.run.wrongInRoom > 0) {
            return { scoreMultiplier: 0.85 };
          }
          return { scoreMultiplier: ctx.streakInRoom >= 3 ? 1.25 : 1.0 };
        },
        ON_ANSWER_WRONG: () => ({ notice: 'پاسخ صحیح نمایش داده شد؛ کارت برای جبران به صف تمرین رفت.' }),
        ON_ROOM_END: () => ({})
      }
    },
    {
      id: '08_cold_wick_sentinel',
      slug: '08_cold_wick_sentinel',
      name: 'پاسدار فتیلهٔ سرد',
      lawTitle: 'مهر کمبو در سرمای فتیله',
      lawDescription: 'خانواده «کمبو» در اتاق ۵ مهر می‌شود (پیمان‌های حفاظتی بقا دست‌نخورده می‌مانند) و پاسخ‌ها ضریب ۱.۱۰ می‌گیرند.',
      keyFamily: 'survival',
      keyFamilyLabel: 'خانواده بقا',
      universalAnswerPath: {
        title: 'ثبات دانش و استقامت',
        description: 'با ضریب ثابت ۱.۱۰ و دقت پاسخ‌گویی، بدون نیاز به پیمان‌های کمبو امتیاز هدف به‌دست می‌آید.'
      },
      educationalGoal: 'تکیه بر دقت فردی و پایداری در شرایط محدودشدن امتیازهای انفجاری.',
      allowedEffects: ['target_score', 'score_multiplier', 'pact_availability'],
      triggers: {
        ON_ROOM_START: () => ({
          lockedPactFamilies: ['combo'],
          scoreMultiplier: 1.1,
          notice: 'فتیلهٔ سرد خانواده کمبو را مهر کرد؛ پیمان‌های بقا مصون ماندند.'
        }),
        ON_QUESTION_PRESENT: () => ({ questionPresentation: { prioritizeWeakPracticeItems: true } }),
        ON_ANSWER_CORRECT: () => ({ scoreMultiplier: 1.1 }),
        ON_ANSWER_WRONG: () => ({ notice: 'شمع به‌طور مستقیم کم نشد و پاسخ صحیح نمایش داده شد.' }),
        ON_ROOM_END: () => ({})
      }
    },
    {
      id: '09_ruin_architect',
      slug: '09_ruin_architect',
      name: 'معمار ویرانه',
      lawTitle: 'سنگ‌بنای هر چهارم',
      lawDescription: 'هر چهارمین پاسخ درست در اتاق +۴۰ امتیاز معماری و ضریب ۱.۲۵ می‌گیرد؛ واژگان ضعیف در صف مقدم قرار دارند.',
      keyFamily: 'arcane',
      keyFamilyLabel: 'خانواده آرکان',
      universalAnswerPath: {
        title: 'آجر به آجر دانش',
        description: 'پاسخ دقیق به هر پرسش پایهٔ ستون را می‌سازد و در پرسش چهارم و هشتم امتیاز سازه‌ای اضافه می‌آورد.'
      },
      educationalGoal: 'تقویت پایداری ریتم مطالعه و تمرکز بر مرور منظم واژگان.',
      allowedEffects: ['target_score', 'score_multiplier', 'question_presentation'],
      triggers: {
        ON_ROOM_START: () => ({ scoreMultiplier: 1.0, notice: 'نقشهٔ سنگ‌چین معمار ویرانه بر زمین کشیده شد.' }),
        ON_QUESTION_PRESENT: () => ({ questionPresentation: { prioritizeWeakPracticeItems: true } }),
        ON_ANSWER_CORRECT: (ctx) => {
          const correctCount = ctx.run ? ctx.run.correctInRoom : 0;
          if (correctCount > 0 && correctCount % 4 === 0) {
            return { scoreMultiplier: 1.25, bonusPoints: 40 };
          }
          return { scoreMultiplier: 1.0 };
        },
        ON_ANSWER_WRONG: () => ({ notice: 'ستون ترک برداشت اما پابرجا ماند؛ معنا نمایش داده شد.' }),
        ON_ROOM_END: () => ({})
      }
    },
    {
      id: '10_lord_eternal_pyre',
      slug: '10_lord_eternal_pyre',
      name: 'ارباب آتش جاویدان',
      lawTitle: 'آزمون تاج شعله',
      lawDescription: 'در سه پاسخ اول ضریب ۰.۹۵ و از کمبوی ۴ به بعد ضریب ۱.۳۵ با +۲۰ امتیاز شعله فعال می‌شود.',
      keyFamily: 'combo',
      keyFamilyLabel: 'خانواده کمبو',
      universalAnswerPath: {
        title: 'تسلط کامل بر واژگان',
        description: 'پاسخ‌گویی دقیق و متوالی شعلهٔ کمبوی ۴+ را برمی‌افروزد و ارباب آتش جاویدان را بدون پیمان می‌شکند.'
      },
      educationalGoal: 'جمع‌بندی مهارتی و سنجش تسلط جامع بازیکن بر کل بانک واژگان.',
      allowedEffects: ['target_score', 'score_multiplier', 'question_presentation'],
      triggers: {
        ON_ROOM_START: () => ({ scoreMultiplier: 0.95, notice: 'ارباب آتش جاویدان تاج شعله را بر افروخت.' }),
        ON_QUESTION_PRESENT: () => ({ questionPresentation: { prioritizeWeakPracticeItems: true } }),
        ON_ANSWER_CORRECT: (ctx) => {
          if (ctx.streakInRoom >= 4) return { scoreMultiplier: 1.35, bonusPoints: 20 };
          return { scoreMultiplier: 0.95 };
        },
        ON_ANSWER_WRONG: () => ({ notice: 'خطا ثبت شد، معنا آشکار گردید و کارت به صف تمرین بازگشت.' }),
        ON_ROOM_END: () => ({})
      }
    }
  ];

  const SCORCHED_CITY_BOSSES = Object.freeze(RAW_SCORCHED_CITY_BOSSES.map(def => registerBoss(def)));

  function getAllCanonicalBosses() {
    return SCORCHED_CITY_BOSSES.slice();
  }

  // ==========================================================================
  // STEP 4: NEFRIN / CURSE TIERS (نفرین ۱ تا ۵), SECONDARY RULES & POOL UNLOCK
  // ==========================================================================

  const NEFRIN_TIERS = Object.freeze({
    0: Object.freeze({
      tier: 0,
      nameFa: 'عادی',
      labelFa: 'بدون نفرین (عادی)',
      descriptionFa: SC_COPY.nefrin[0],
      badgeGlyph: 'عادی',
      bossTargetScoreMultiplier: 1.0
    }),
    1: Object.freeze({
      tier: 1,
      nameFa: 'نفرین ۱',
      labelFa: 'نفرین ۱: آزمون سرسختی',
      descriptionFa: SC_COPY.nefrin[1],
      badgeGlyph: 'نفرین ۱',
      bossTargetScoreMultiplier: 1.05
    }),
    2: Object.freeze({
      tier: 2,
      nameFa: 'نفرین ۲',
      labelFa: 'نفرین ۲: آستانه شعله',
      descriptionFa: SC_COPY.nefrin[2],
      badgeGlyph: 'نفرین ۲',
      bossTargetScoreMultiplier: 1.10
    }),
    3: Object.freeze({
      tier: 3,
      nameFa: 'نفرین ۳',
      labelFa: 'نفرین ۳: هم‌نشینی سایه‌ها',
      descriptionFa: SC_COPY.nefrin[3],
      badgeGlyph: 'نفرین ۳',
      bossTargetScoreMultiplier: 1.10,
      hasSecondaryMiniRule: true
    }),
    4: Object.freeze({
      tier: 4,
      nameFa: 'نفرین ۴',
      labelFa: 'نفرین ۴: آشوب واژگان',
      descriptionFa: SC_COPY.nefrin[4],
      badgeGlyph: 'نفرین ۴',
      bossTargetScoreMultiplier: 1.10,
      hasSecondaryMiniRule: true,
      harderCategoryMix: true
    }),
    5: Object.freeze({
      tier: 5,
      nameFa: 'نفرین ۵',
      labelFa: 'نفرین ۵: مهر سیاه',
      descriptionFa: SC_COPY.nefrin[5],
      badgeGlyph: 'نفرین ۵',
      bossTargetScoreMultiplier: 1.10,
      hasSecondaryMiniRule: true,
      harderCategoryMix: true,
      sealsRandomNonSurvivalPactInRoom5: true
    })
  });

  const SECONDARY_MINI_RULES = Object.freeze([
    Object.freeze({
      id: 'mini_tempo',
      sourceBossId: '02_cinder_hourglass',
      nameFa: 'شتاب شن‌های داغ',
      lawTitle: 'شتاب شن‌های داغ (قانون قرضی)',
      lawDescriptionFa: 'پاسخ درست زیر ۵ ثانیه +۱۵ امتیاز جایزه؛ پاسخ بالای ۹ ثانیه با ضریب ۰.۹۰ محاسبه می‌شود.',
      triggers: Object.freeze({
        ON_ANSWER_CORRECT: (ctx) => {
          const sec = typeof ctx.answerDurationSec === 'number' ? ctx.answerDurationSec : 5;
          if (sec < 5) return { bonusPoints: 15 };
          if (sec >= 9) return { scoreMultiplier: 0.90 };
          return {};
        }
      })
    }),
    Object.freeze({
      id: 'mini_ash_reflection',
      sourceBossId: '03_ash_twin',
      nameFa: 'انعکاس دوگانه',
      lawTitle: 'انعکاس دوگانه (قانون قرضی)',
      lawDescriptionFa: 'پاسخ‌های زوج کمبو با ضریب ۱.۱۵ و پاسخ‌های فرد با ضریب ۰.۹۵ محاسبه می‌شوند.',
      triggers: Object.freeze({
        ON_ANSWER_CORRECT: (ctx) => ({
          scoreMultiplier: (ctx.streakInRoom > 0 && ctx.streakInRoom % 2 === 0) ? 1.15 : 0.95
        })
      })
    }),
    Object.freeze({
      id: 'mini_mirror_flip',
      sourceBossId: '05_inverted_mirror_lord',
      nameFa: 'وارونگی گزینه‌ها',
      lawTitle: 'وارونگی گزینه‌ها (قانون قرضی)',
      lawDescriptionFa: 'ترتیب گزینه‌های چهارگانه در نبرد به شکل معکوس چیده می‌شود.',
      triggers: Object.freeze({
        ON_QUESTION_PRESENT: () => ({
          questionPresentation: { reverseOptions: true }
        })
      })
    }),
    Object.freeze({
      id: 'mini_smoke',
      sourceBossId: '07_smoke_ember_phantom',
      nameFa: 'مهِ پس از لغزش',
      lawTitle: 'مهِ پس از لغزش (قانون قرضی)',
      lawDescriptionFa: 'پس از هر خطا در اتاق ۵، نخستین پاسخ درست بعدی با ضریب ۰.۹۰ ثبت می‌شود.',
      triggers: Object.freeze({
        ON_ANSWER_CORRECT: (ctx) => {
          if (ctx.streakInRoom === 1 && ctx.run && ctx.run.wrongInRoom > 0) {
            return { scoreMultiplier: 0.90 };
          }
          return {};
        }
      })
    }),
    Object.freeze({
      id: 'mini_keystone',
      sourceBossId: '09_ruin_architect',
      nameFa: 'سنگ‌بنای معماری',
      lawTitle: 'سنگ‌بنای معماری (قانون قرضی)',
      lawDescriptionFa: 'هر چهارمین پاسخ درست در نبرد +۲۵ امتیاز سازه‌ای به همراه دارد.',
      triggers: Object.freeze({
        ON_ANSWER_CORRECT: (ctx) => {
          const c = ctx.run ? ctx.run.correctInRoom : 0;
          if (c > 0 && c % 4 === 0) return { bonusPoints: 25 };
          return {};
        }
      })
    })
  ]);

  function selectSecondaryMiniRule(primaryBossId, seed, cycle = 1) {
    const candidates = SECONDARY_MINI_RULES.filter(r => r.sourceBossId !== primaryBossId);
    const rng = createSeededRng(`${seed}-c${cycle}-nefrin-sec`);
    const idx = Math.floor(rng() * candidates.length);
    return candidates[idx] || SECONDARY_MINI_RULES[0];
  }

  function getBossPoolForRun(runNumber = 1) {
    const num = Math.max(1, Number(runNumber) || 1);
    if (num === 1) {
      // Run 1: COMBO + SURVIVAL open
      return SCORCHED_CITY_BOSSES.filter(b => b.keyFamily === 'combo' || b.keyFamily === 'survival');
    }
    if (num === 2) {
      // Run 2: adds GREED
      return SCORCHED_CITY_BOSSES.filter(b => b.keyFamily === 'combo' || b.keyFamily === 'survival' || b.keyFamily === 'greed');
    }
    // Run 3+: adds ARCANE -> Full pool unlocked!
    return SCORCHED_CITY_BOSSES.slice();
  }

  function isFullBossPoolUnlocked(studentCode, totalRunsOverride = null) {
    if (totalRunsOverride != null) return Number(totalRunsOverride) >= 3;
    const stats = getPersistentStats(studentCode);
    return (stats.totalRuns || 0) >= 3 || (stats.highestLoop || 0) >= 2 || (stats.cyclesCompleted || 0) >= 1;
  }

  function selectBossForCycle(seed, cycle = 1, options = {}) {
    const safeCycle = Math.max(1, Math.round(Number(cycle) || 1));
    const isDaily = (options && options.mode === 'daily') || String(seed).includes('sc-daily');

    // Rule: Every 5th cycle features 10_lord_eternal_pyre (when progressive is engaged)
    if (options && (options.progressive || options.forceEveryFifthPyre) && safeCycle % 5 === 0) {
      return getBoss('10_lord_eternal_pyre') || SCORCHED_CITY_BOSSES[0];
    }

    // Determine allowed pool based on runNumber if progressive, else full roster
    let pool = SCORCHED_CITY_BOSSES;
    if (options && options.runNumber && !isDaily) {
      pool = getBossPoolForRun(options.runNumber);
    }

    // When progressive, avoid picking Pyre in the cycle immediately prior to a 5th cycle
    if (options && (options.progressive || options.forceEveryFifthPyre) && (safeCycle + 1) % 5 === 0) {
      const nonPyre = pool.filter(b => b.id !== '10_lord_eternal_pyre');
      if (nonPyre.length > 0) pool = nonPyre;
    }

    const rng = createSeededRng(`${seed}-boss-roster`);
    const shuffled = seededShuffle(pool, rng);

    let picked = shuffled[(safeCycle - 1) % shuffled.length];

    // Progressive Rule: Prevent back-to-back duplicate bosses across consecutive cycles
    if (options && options.prevBossId && picked.id === options.prevBossId && shuffled.length > 1) {
      const remaining = shuffled.filter(b => b.id !== options.prevBossId);
      if (remaining.length > 0) {
        picked = remaining[(safeCycle - 1) % remaining.length];
      }
    }

    return picked;
  }

  // ==========================================================================
  // PERSISTENT SCORCHED CITY STATS (Isolated from 3-world stats & main XP)
  // ==========================================================================

  function createEmptyPersistentStats() {
    return {
      cyclesCompleted: 0,
      highestLoop: 0,
      totalRuns: 0,
      totalBossesDefeated: 0,
      bestStandardScore: 0,
      bestDailyByDate: {},
      runMistakeStats: {}
    };
  }

  function getPersistentStats(studentCode) {
    const store = readStorage(STORAGE_KEYS.PERSISTENT_STATS, {});
    const key = String(studentCode || 'default');
    const existing = store[key];
    return existing ? { ...createEmptyPersistentStats(), ...existing } : createEmptyPersistentStats();
  }

  function savePersistentStats(studentCode, stats) {
    const store = readStorage(STORAGE_KEYS.PERSISTENT_STATS, {});
    const key = String(studentCode || 'default');
    store[key] = { ...createEmptyPersistentStats(), ...stats };
    writeStorage(STORAGE_KEYS.PERSISTENT_STATS, store);
    return store[key];
  }

  // ==========================================================================
  // DEDICATED SCORCHED CITY LEADERBOARD SERVICE
  // (Standard Scorched City vs Daily Run YYYY-MM-DD — Strictly Separate from Main)
  // ==========================================================================

  function createEmptyLeaderboardStore() {
    return {
      standard: {},
      daily: {}
    };
  }

  function compareScorchedEntries(a, b) {
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    if ((b.cyclesCleared || 0) !== (a.cyclesCleared || 0)) return (b.cyclesCleared || 0) - (a.cyclesCleared || 0);
    if ((b.bestLoop || 1) !== (a.bestLoop || 1)) return (b.bestLoop || 1) - (a.bestLoop || 1);
    return (a.timestamp || 0) - (b.timestamp || 0);
  }

  const leaderboard = {
    getStore() {
      const data = readStorage(STORAGE_KEYS.LEADERBOARD, null);
      if (!data || typeof data !== 'object') return createEmptyLeaderboardStore();
      return {
        standard: (data.standard && typeof data.standard === 'object') ? data.standard : {},
        daily: (data.daily && typeof data.daily === 'object') ? data.daily : {}
      };
    },

    saveStore(store) {
      writeStorage(STORAGE_KEYS.LEADERBOARD, store);
    },

    submitStandardScore(entry) {
      if (!entry || !entry.code) return null;
      const store = this.getStore();
      const code = String(entry.code);
      const existing = store.standard[code];
      const nextScore = Math.max(0, Math.round(Number(entry.score) || 0));
      const candidate = {
        code,
        name: entry.name || 'شوالیه',
        major: entry.major || '',
        grade: entry.grade || '10',
        score: nextScore,
        cyclesCleared: Number(entry.cyclesCleared) || 0,
        bestLoop: Math.max(1, Number(entry.bestLoop) || 1),
        roomReached: Math.max(1, Number(entry.roomReached) || 1),
        bossesDefeated: Number(entry.bossesDefeated) || 0,
        seed: entry.seed || '',
        timestamp: Number(entry.timestamp) || Date.now()
      };

      const shouldReplace = !existing ||
        candidate.score > (existing.score || 0) ||
        (candidate.score === existing.score && candidate.cyclesCleared > (existing.cyclesCleared || 0));

      if (shouldReplace) {
        store.standard[code] = candidate;
        this.saveStore(store);
      }
      return store.standard[code];
    },

    submitDailyScore(dateKey, entry) {
      if (!entry || !entry.code) return null;
      const day = getCalendarDateKey(dateKey);
      const store = this.getStore();
      if (!store.daily[day]) store.daily[day] = {};
      const code = String(entry.code);
      const existing = store.daily[day][code];
      const nextScore = Math.max(0, Math.round(Number(entry.score) || 0));
      const candidate = {
        code,
        name: entry.name || 'شوالیه',
        major: entry.major || '',
        grade: entry.grade || '10',
        dateKey: day,
        score: nextScore,
        cyclesCleared: Number(entry.cyclesCleared) || 0,
        bestLoop: Math.max(1, Number(entry.bestLoop) || 1),
        roomReached: Math.max(1, Number(entry.roomReached) || 1),
        bossesDefeated: Number(entry.bossesDefeated) || 0,
        seed: entry.seed || createDailyRunSeed(day, entry.grade),
        timestamp: Number(entry.timestamp) || Date.now()
      };

      const shouldReplace = !existing ||
        candidate.score > (existing.score || 0) ||
        (candidate.score === existing.score && candidate.cyclesCleared > (existing.cyclesCleared || 0));

      if (shouldReplace) {
        store.daily[day][code] = candidate;
        this.saveStore(store);
      }
      return store.daily[day][code];
    },

    getStandardRankings(options = {}) {
      const store = this.getStore();
      let entries = Object.values(store.standard || {});
      if (options.gradeFilter) {
        entries = entries.filter(e => String(e.grade) === String(options.gradeFilter));
      }
      if (options.majorFilter) {
        entries = entries.filter(e => e.major === options.majorFilter);
      }
      return entries.sort(compareScorchedEntries);
    },

    getDailyRankings(dateKey, options = {}) {
      const day = getCalendarDateKey(dateKey);
      const store = this.getStore();
      let entries = Object.values((store.daily && store.daily[day]) || {});
      if (options.gradeFilter) {
        entries = entries.filter(e => String(e.grade) === String(options.gradeFilter));
      }
      if (options.majorFilter) {
        entries = entries.filter(e => e.major === options.majorFilter);
      }
      return entries.sort(compareScorchedEntries);
    },

    getPlayerStandardBest(studentCode) {
      const store = this.getStore();
      return store.standard[String(studentCode)] || null;
    },

    getPlayerDailyEntry(studentCode, dateKey) {
      const day = getCalendarDateKey(dateKey);
      const store = this.getStore();
      return (store.daily[day] && store.daily[day][String(studentCode)]) || null;
    },

    clearAllForTesting() {
      this.saveStore(createEmptyLeaderboardStore());
    }
  };

  // ==========================================================================
  // SCORCHED CITY QUESTION DECK & PRACTICE QUEUE BUILDER
  // (Standalone pool normalization — never unlocks/mutates 3-world stages)
  // ==========================================================================

  function normalizeQuestionPool(curriculumBank, grade = '10') {
    const g = (grade === '11' || grade === 11) ? '11' : '10';
    const bank = curriculumBank || (typeof globalThis !== 'undefined' && globalThis.CURRICULUM_BANK) || {};
    const data = bank[g] || bank['10'] || {};

    const toCard = (c, categoryTag) => ({
      id: `${g}_${categoryTag}_${c.word}`,
      word: c.word,
      correct: c.correct || (Array.isArray(c.meanings) && c.meanings[0]) || '',
      meanings: Array.isArray(c.meanings) ? [...c.meanings] : [c.correct || ''],
      distractors: Array.isArray(c.distractors) ? [...c.distractors] : null,
      hint: c.hint || '',
      tag: c.tag || categoryTag,
      category: categoryTag
    });

    return [
      ...(data.world1_vocab || []).map(c => toCard(c, 'واژه')),
      ...(data.world2_kenayeh_iham || []).map(c => toCard(c, c.tag || 'کنایه')),
      ...(data.world3_history || []).map(c => toCard(c, 'تاریخ ادبیات'))
    ].filter(c => c.word && c.correct);
  }

  function getRoomQuestionCountWithPacts(run) {
    const baseCount = Math.max(1, Number(activeTuning.questionsPerRoom) || 8);
    const extortionist = findActivePactEntry(run, 'extortionist');
    const extra = extortionist ? (extortionist.stats.extraQuestions || 0) : 0;
    return Math.max(1, baseCount + extra);
  }

  function buildRoomDeck(run, pool = []) {
    const count = getRoomQuestionCountWithPacts(run);
    const basePool = Array.isArray(pool) && pool.length > 0 ? pool : [];
    if (basePool.length === 0) return [];

    // Educational Goal (Constraint 6): Prioritize un-mastered practiceQueue items first, never bypass weak items!
    const practiceItems = Array.isArray(run.practiceQueue) ? run.practiceQueue.slice() : [];
    const seenWords = new Set();
    const deck = [];

    practiceItems.forEach(item => {
      if (deck.length < count && item && item.word && !seenWords.has(item.word)) {
        seenWords.add(item.word);
        deck.push({ ...item, isPracticeRetry: true });
      }
    });

    const rng = createSeededRng(`${run.seed}-cycle${run.cycle}-room${run.room}`);
    let shuffled = seededShuffle(basePool, rng);

    // Tier 4 (نفرین ۴): Harder category mix / higher weight on mixed or harder items across the run
    if (run && run.nefrinTier >= 4) {
      shuffled.sort((a, b) => {
        const isAdvancedTagA = (a.tag === 'ایهام' || a.tag === 'کنایه' || a.tag === 'تاریخ ادبیات') ? 3 : 0;
        const isAdvancedTagB = (b.tag === 'ایهام' || b.tag === 'کنایه' || b.tag === 'تاریخ ادبیات') ? 3 : 0;
        const lengthWeightA = (a.word && a.word.length > 10) ? 2 : 0;
        const lengthWeightB = (b.word && b.word.length > 10) ? 2 : 0;
        const mistakeWeightA = (run.runMistakes && run.runMistakes[a.word]) ? 4 : 0;
        const mistakeWeightB = (run.runMistakes && run.runMistakes[b.word]) ? 4 : 0;
        return (isAdvancedTagB + lengthWeightB + mistakeWeightB) - (isAdvancedTagA + lengthWeightA + mistakeWeightA);
      });
    }

    for (let i = 0; i < shuffled.length && deck.length < count; i++) {
      const card = shuffled[i];
      if (!seenWords.has(card.word)) {
        seenWords.add(card.word);
        deck.push({ ...card, isPracticeRetry: false });
      }
    }

    return deck;
  }

  function getRoomQuestionOptions(card, allPool, rng = null) {
    if (!card) return [];
    const correctChoice = (card.correct || (card.meanings && card.meanings[0]) || '').trim();
    const rand = typeof rng === 'function' ? rng : Math.random;

    if (Array.isArray(card.distractors) && card.distractors.length >= 3) {
      const valid = card.distractors.map(d => String(d).trim()).filter(d => d && d !== correctChoice).slice(0, 3);
      if (valid.length === 3) {
        return seededShuffle([correctChoice, ...valid], rand);
      }
    }

    const sameTagCandidates = [];
    const fallbackCandidates = [];
    const seen = new Set([correctChoice]);

    (allPool || []).forEach(other => {
      const ans = (other.correct || (other.meanings && other.meanings[0]) || '').trim();
      if (!ans || seen.has(ans) || other.word === card.word) return;
      seen.add(ans);
      if ((other.tag || '') === (card.tag || '')) {
        sameTagCandidates.push(ans);
      } else {
        fallbackCandidates.push(ans);
      }
    });

    const combined = [
      ...seededShuffle(sameTagCandidates, rand),
      ...seededShuffle(fallbackCandidates, rand)
    ].slice(0, 3);

    return seededShuffle([correctChoice, ...combined], rand);
  }

  // ==========================================================================
  // SCORCHED CITY RUN ENGINE (Rooms 1 -> 5 -> Cycle Reset)
  // ==========================================================================

  let currentRun = null;

  function serializeBossSummary(boss) {
    if (!boss) return null;
    const slug = boss.slug || boss.id || '01_rift_scribe';
    return {
      id: boss.id,
      slug,
      name: boss.name,
      title: boss.title || boss.name,
      lawTitle: boss.lawTitle,
      lawDescription: boss.lawDescription,
      lawShortFa: boss.lawShortFa || boss.lawDescription,
      keyFamily: boss.keyFamily,
      keyFamilyLabel: boss.keyFamilyLabel,
      universalAnswerPath: { ...boss.universalAnswerPath },
      educationalGoal: boss.educationalGoal,
      targetScoreMultiplier: boss.targetScoreMultiplier || 1.0,
      targetScoreDelta: boss.targetScoreDelta || 0,
      spriteConfig: getBossSpriteConfig(slug)
    };
  }

  function persistRunState() {
    if (currentRun) {
      const serializable = {
        ...currentRun,
        poolSnapshot: undefined,
        telegraphedBossId: currentRun.telegraphedBoss ? currentRun.telegraphedBoss.id : null,
        activeBossId: (currentRun.activeBossSlot && currentRun.activeBossSlot.boss) ? currentRun.activeBossSlot.boss.id : null
      };
      writeStorage(STORAGE_KEYS.RUN_STATE, serializable);
    } else {
      removeStorage(STORAGE_KEYS.RUN_STATE);
    }
  }

  function loadSavedRun(curriculumBank = null) {
    const saved = readStorage(STORAGE_KEYS.RUN_STATE, null);
    if (!saved || typeof saved !== 'object' || saved.status === 'game_over') {
      currentRun = null;
      return null;
    }
    const tBoss = saved.telegraphedBossId ? (getBoss(saved.telegraphedBossId) || BASE_STEP1_BOSS_STUB) : BASE_STEP1_BOSS_STUB;
    const aBoss = saved.activeBossId ? (getBoss(saved.activeBossId) || BASE_STEP1_BOSS_STUB) : null;
    const hydratedPool = normalizeQuestionPool(curriculumBank, saved.grade || '10');
    currentRun = {
      ...saved,
      poolSnapshot: hydratedPool,
      telegraphedBoss: serializeBossSummary(tBoss),
      activeBossSlot: aBoss ? { slotCapacity: MAX_ACTIVE_BOSS_MODIFIERS, boss: serializeBossSummary(aBoss), appliedEffects: saved.activeBossSlot?.appliedEffects || {} } : null
    };
    return currentRun;
  }

  function getActiveRun() {
    return currentRun;
  }

  function dispatchBossTrigger(run, eventName, payload = {}) {
    if (!BOSS_TRIGGER_EVENTS.includes(eventName)) {
      throw new Error(`Invalid boss trigger event "${eventName}". Must be one of: ${BOSS_TRIGGER_EVENTS.join(', ')}`);
    }
    if (!run || run.room !== BOSS_ROOM || !run.activeBossSlot || !run.activeBossSlot.boss) {
      return { cleanPatch: {}, blockedViolations: [] };
    }

    const ctx = {
      run,
      room: run.room,
      cycle: run.cycle,
      roomScore: run.roomScore,
      roomTargetScore: run.roomTargetScore,
      streakInRoom: run.streakInRoom,
      ...payload
    };

    const bossObj = getBoss(run.activeBossSlot.boss.id) || BASE_STEP1_BOSS_STUB;
    const primaryHandler = bossObj.triggers && bossObj.triggers[eventName];
    const secondaryHandler = (run.nefrinTier >= 3 && run.secondaryBossModifier && run.secondaryBossModifier.triggers)
      ? run.secondaryBossModifier.triggers[eventName]
      : null;

    if (typeof primaryHandler !== 'function' && typeof secondaryHandler !== 'function') {
      return { cleanPatch: {}, blockedViolations: [] };
    }

    const mergedPatch = {};
    const allViolations = [];

    if (typeof primaryHandler === 'function') {
      const raw1 = primaryHandler(ctx);
      const sanitized1 = sanitizeBossHookResult(raw1);
      if (sanitized1.blockedViolations.length > 0) {
        allViolations.push(...sanitized1.blockedViolations);
      }
      Object.assign(mergedPatch, sanitized1.cleanPatch);
    }

    if (typeof secondaryHandler === 'function') {
      const raw2 = secondaryHandler(ctx);
      const sanitized2 = sanitizeBossHookResult(raw2);
      if (sanitized2.blockedViolations.length > 0) {
        allViolations.push(...sanitized2.blockedViolations);
      }
      const secPatch = sanitized2.cleanPatch;
      if (typeof secPatch.bonusPoints === 'number') {
        mergedPatch.bonusPoints = (mergedPatch.bonusPoints || 0) + secPatch.bonusPoints;
      }
      if (typeof secPatch.scoreMultiplier === 'number') {
        mergedPatch.scoreMultiplier = (typeof mergedPatch.scoreMultiplier === 'number' ? mergedPatch.scoreMultiplier : 1.0) * secPatch.scoreMultiplier;
      }
      if (typeof secPatch.targetScoreMultiplier === 'number') {
        mergedPatch.targetScoreMultiplier = (typeof mergedPatch.targetScoreMultiplier === 'number' ? mergedPatch.targetScoreMultiplier : 1.0) * secPatch.targetScoreMultiplier;
      }
      if (typeof secPatch.targetScoreDelta === 'number') {
        mergedPatch.targetScoreDelta = (mergedPatch.targetScoreDelta || 0) + secPatch.targetScoreDelta;
      }
      if (secPatch.questionPresentation) {
        mergedPatch.questionPresentation = { ...(mergedPatch.questionPresentation || {}), ...secPatch.questionPresentation };
      }
      if (Array.isArray(secPatch.lockedPactFamilies)) {
        mergedPatch.lockedPactFamilies = [...(mergedPatch.lockedPactFamilies || []), ...secPatch.lockedPactFamilies];
      }
    }

    if (allViolations.length > 0) {
      run.guardrailLog = run.guardrailLog || [];
      run.guardrailLog.push({
        event: eventName,
        blocked: allViolations,
        timestamp: Date.now()
      });
    }

    // Apply safe, permitted effects only
    const patch = mergedPatch;
    if (eventName === 'ON_ROOM_START' && run.room === BOSS_ROOM) {
      if (typeof patch.targetScoreMultiplier === 'number' && patch.targetScoreMultiplier > 0) {
        run.roomTargetScore = Math.max(50, Math.round(run.roomTargetScore * patch.targetScoreMultiplier));
      }
      if (typeof patch.targetScoreDelta === 'number') {
        run.roomTargetScore = Math.max(50, Math.round(run.roomTargetScore + patch.targetScoreDelta));
      }
    }
    if (typeof patch.scoreMultiplier === 'number') {
      run.bossScoreMultiplier = patch.scoreMultiplier;
      run.roomScoreMultiplier = computeAdditiveMultiplierTotal(run).totalMultiplier;
    }
    if (Array.isArray(patch.lockedPactFamilies)) {
      // Guardrail: once-per-run / sheltered survival pacts can NEVER be sealed directly by ID
      run.availablePactLocks = patch.lockedPactFamilies.filter(lockKey => !isPactProtectedFromSeal(lockKey));
    }

    return { cleanPatch: mergedPatch, blockedViolations: allViolations };
  }

  function computeAdditiveMultiplierTotal(run) {
    const bossMult = (run && typeof run.bossScoreMultiplier === 'number' && run.bossScoreMultiplier > 0)
      ? run.bossScoreMultiplier
      : 1.0;

    const terms = [];
    // Active unlocked room-level additive multipliers stack strictly additively!
    const extortionist = findActivePactEntry(run, 'extortionist');
    if (extortionist) {
      terms.push({ source: 'extortionist', delta: extortionist.stats.additiveMult });
    }

    const flameStrike = findActivePactEntry(run, 'flame_strike');
    if (flameStrike && (run.streakInRoom || 0) >= flameStrike.stats.multStreak) {
      terms.push({ source: 'flame_strike', delta: flameStrike.stats.additiveMult });
    }

    const additiveBonus = terms.reduce((sum, item) => sum + item.delta, 0);
    const totalMultiplier = Number((bossMult + additiveBonus).toFixed(4));
    return { bossMult, additiveBonus, terms, totalMultiplier };
  }

  function applyRoomStartPactsAndTarget(run, poolOverride = null) {
    if (!run) return null;
    const room = run.room;
    const boss = room === BOSS_ROOM
      ? ((run.telegraphedBoss && getBoss(run.telegraphedBoss.id)) || BASE_STEP1_BOSS_STUB)
      : null;

    let target = computeRoomTargetScore(room, run.cycle, boss, null, run.nefrinTier || 0);
    const extortionist = findActivePactEntry(run, 'extortionist');
    if (extortionist && extortionist.stats.targetScorePercent) {
      target = Math.max(50, Math.round(target * (1 + extortionist.stats.targetScorePercent)));
    }
    run.roomTargetScore = target;

    const pool = poolOverride || run.poolSnapshot || [];
    if ((run.questionsAnsweredInRoom || 0) === 0 && pool.length > 0) {
      run.roomQueue = buildRoomDeck(run, pool);
      run.questionsInRoomTotal = run.roomQueue.length || getRoomQuestionCountWithPacts(run);
    } else if ((run.questionsAnsweredInRoom || 0) === 0) {
      run.questionsInRoomTotal = getRoomQuestionCountWithPacts(run);
    }

    run.bossScoreMultiplier = 1.0;
    if (room === BOSS_ROOM) {
      run.activeBossSlot = {
        slotCapacity: MAX_ACTIVE_BOSS_MODIFIERS,
        boss: serializeBossSummary(boss),
        appliedEffects: {}
      };

      // Tier 5 (نفرین ۵): Random non-survival pact starts temporarily sealed in Room 5
      if (run.nefrinTier >= 5) {
        if (!run.nefrin5SealedPactId && Array.isArray(run.activePacts) && run.activePacts.length > 0) {
          const eligible = run.activePacts.filter(p => !isPactProtectedFromSeal(p.cardId || p.id));
          if (eligible.length > 0) {
            const rng = createSeededRng(`${run.seed}-c${run.cycle}-nefrin5-seal`);
            const chosen = eligible[Math.floor(rng() * eligible.length)];
            run.nefrin5SealedPactId = chosen.cardId || chosen.id;
          }
        }
        if (run.nefrin5SealedPactId && !run.availablePactLocks.includes(run.nefrin5SealedPactId)) {
          run.availablePactLocks.push(run.nefrin5SealedPactId);
        }
      }

      dispatchBossTrigger(run, 'ON_ROOM_START', {});
    } else {
      run.activeBossSlot = null;
    }

    run.roomScoreMultiplier = computeAdditiveMultiplierTotal(run).totalMultiplier;
    return run;
  }

  function startNewRun(options = {}) {
    const mode = options.mode === RUN_MODES.DAILY ? RUN_MODES.DAILY : RUN_MODES.STANDARD;
    const grade = (options.grade === '11' || options.grade === 11) ? '11' : '10';
    const dateKey = getCalendarDateKey(options.dateKey);
    const seed = mode === RUN_MODES.DAILY
      ? createDailyRunSeed(dateKey, grade)
      : (options.seed || `sc-std-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);

    const studentCode = String(options.studentCode || 'guest');
    const pool = normalizeQuestionPool(options.curriculumBank, grade);

    const pStats = getPersistentStats(studentCode);
    pStats.totalRuns = (pStats.totalRuns || 0) + 1;
    savePersistentStats(studentCode, pStats);

    const runNumber = Math.max(1, Number(options.runNumber) || pStats.totalRuns || 1);
    const requestedNefrin = Math.max(0, Math.min(5, Number(options.nefrinTier ?? options.curseTier ?? 0)));
    const nefrinTier = requestedNefrin;
    const nefrinInfo = NEFRIN_TIERS[nefrinTier] || NEFRIN_TIERS[0];

    const bossForCycle = selectBossForCycle(seed, 1, {
      progressive: true,
      runNumber
    });

    const secondaryBossModifier = (nefrinTier >= 3)
      ? selectSecondaryMiniRule(bossForCycle.id, seed, 1)
      : null;

    currentRun = {
      runId: `${mode}_${dateKey}_${Date.now()}`,
      studentCode,
      studentName: options.studentName || 'شوالیه',
      studentMajor: options.studentMajor || '',
      grade,
      mode,
      dateKey,
      seed,
      runNumber,
      nefrinTier,
      nefrinInfo,
      secondaryBossModifier,
      nefrin5SealedPactId: null,
      cycle: 1,
      room: 1,
      status: 'in_room',
      candles: activeTuning.startingCandles,
      maxCandles: activeTuning.maxCandles,
      runXp: 0, // Isolated in-run XP for trade-offs/tolls ONLY!
      runXpSpentOnTolls: 0,
      totalRunScore: 0,
      roomScore: 0,
      roomTargetScore: computeRoomTargetScore(1, 1, null),
      bossScoreMultiplier: 1.0,
      roomScoreMultiplier: 1.0,
      questionsInRoomTotal: activeTuning.questionsPerRoom,
      questionsAnsweredInRoom: 0,
      correctInRoom: 0,
      wrongInRoom: 0,
      streakInRoom: 0,
      lastRoomEndedStreak: 0,
      roomQueue: [],
      practiceQueue: [],
      runMistakes: {},
      revealedMistakeLog: [],
      errorMirrorWords: {},
      activePacts: [],
      availablePactLocks: [],
      draftHistory: [],
      pendingDraft: null,
      bossPrepState: null,
      bossPrepSwapUsed: false,
      thresholdGuardianUsed: false,
      hiddenFlameUsedThisRoom: false,
      crackedArmorArmed: false,
      passageUsedInRoom: 0,
      pactTriggerLog: [],
      telegraphedBoss: serializeBossSummary(bossForCycle),
      activeBossSlot: null, // Empty until Room 5! Single modifier slot strictly.
      guardrailLog: [],
      cyclesClearedThisRun: 0,
      bossesDefeatedThisRun: 0,
      poolSnapshot: pool,
      startedAt: Date.now(),
      updatedAt: Date.now()
    };

    // Room 1 starts cleanly (no pre-run draft)
    enterRoom(1, pool);
    return currentRun;
  }

  function enterRoom(roomNum, poolOverride = null) {
    if (!currentRun) return null;
    const room = Math.max(1, Math.min(ROOMS_PER_CYCLE, Number(roomNum) || 1));
    currentRun.room = room;
    currentRun.status = 'in_room';
    currentRun.roomScore = 0;
    currentRun.bossScoreMultiplier = 1.0;
    currentRun.roomScoreMultiplier = 1.0;
    currentRun.questionsAnsweredInRoom = 0;
    currentRun.correctInRoom = 0;
    currentRun.wrongInRoom = 0;
    currentRun.hiddenFlameUsedThisRoom = false;
    currentRun.passageUsedInRoom = 0;
    currentRun.availablePactLocks = [];

    // Ember Chain pact carries up to 1-2 streak embers between cleared rooms
    const emberChain = findActivePactEntry(currentRun, 'ember_chain');
    if (emberChain && (currentRun.lastRoomEndedStreak || 0) > 0) {
      currentRun.streakInRoom = Math.min(currentRun.lastRoomEndedStreak, emberChain.stats.carryStreak || 0);
    } else {
      currentRun.streakInRoom = 0;
    }

    applyRoomStartPactsAndTarget(currentRun, poolOverride);

    currentRun.updatedAt = Date.now();
    persistRunState();
    return currentRun;
  }

  // Guardrail 1: Boss law/rule is telegraphed/shown ONE room prior (Room 4)
  function getRoom4BossTelegraph(run = currentRun) {
    if (!run || !run.telegraphedBoss) return null;
    const boss = run.telegraphedBoss;
    const slug = boss.slug || boss.id || '01_rift_scribe';

    let sealedPact = null;
    if (run.nefrinTier >= 5) {
      if (!run.nefrin5SealedPactId && Array.isArray(run.activePacts) && run.activePacts.length > 0) {
        const eligible = run.activePacts.filter(p => !isPactProtectedFromSeal(p.cardId || p.id));
        if (eligible.length > 0) {
          const rng = createSeededRng(`${run.seed}-c${run.cycle}-nefrin5-seal`);
          const chosen = eligible[Math.floor(rng() * eligible.length)];
          run.nefrin5SealedPactId = chosen.cardId || chosen.id;
        }
      }
      if (run.nefrin5SealedPactId) {
        sealedPact = getPactCard(run.nefrin5SealedPactId) || { id: run.nefrin5SealedPactId, titleFa: run.nefrin5SealedPactId };
      }
    }

    return {
      isTelegraphRoom: run.room === TELEGRAPH_ROOM,
      currentRoom: run.room,
      targetBossRoom: BOSS_ROOM,
      cycle: run.cycle,
      bossId: boss.id,
      bossSlug: slug,
      bossName: boss.name,
      lawTitle: boss.lawTitle,
      lawDescription: boss.lawDescription,
      lawShortFa: boss.lawShortFa || boss.lawDescription,
      keyFamily: boss.keyFamily,
      keyFamilyLabel: boss.keyFamilyLabel,
      universalAnswerPath: { ...boss.universalAnswerPath },
      educationalGoal: boss.educationalGoal,
      spriteConfig: boss.spriteConfig || getBossSpriteConfig(slug),
      predictedRoom5TargetScore: computeRoomTargetScore(BOSS_ROOM, run.cycle, boss, null, run.nefrinTier || 0),
      nefrinTier: run.nefrinTier || 0,
      nefrinInfo: run.nefrinInfo || NEFRIN_TIERS[run.nefrinTier || 0],
      secondaryMiniRule: (run.nefrinTier >= 3 && run.secondaryBossModifier) ? {
        id: run.secondaryBossModifier.id,
        sourceBossId: run.secondaryBossModifier.sourceBossId,
        nameFa: run.secondaryBossModifier.nameFa,
        lawTitle: run.secondaryBossModifier.lawTitle,
        lawDescriptionFa: run.secondaryBossModifier.lawDescriptionFa
      } : null,
      nefrin5SealedPact: sealedPact
    };
  }

  // ==========================================================================
  // STEP 2: DRAFT CADENCE, ROOM 3 EARLY CLUE & ROOM 4 BOSS PREP
  // ==========================================================================

  function getRoom3KeyFamilyClue(run = currentRun) {
    if (!run || !run.telegraphedBoss) return null;
    const fam = getFamilyInfo(run.telegraphedBoss.keyFamily);
    return {
      family: fam.id,
      nameFa: fam.nameFa,
      labelFa: fam.labelFa,
      badgeGlyph: fam.badgeGlyph,
      accentHex: fam.accentHex,
      isEarlyClueOnly: true
    };
  }

  function serializeDraftChoice(card, run, bossKeyFamily) {
    const ownedLevel = getActivePactLevel(card.id, run);
    const nextLevel = Math.min(3, ownedLevel + 1);
    const activeCount = Array.isArray(run && run.activePacts) ? run.activePacts.length : 0;
    return {
      cardId: card.id,
      titleFa: card.titleFa,
      family: card.family,
      familyInfo: card.familyInfo,
      currentOwnedLevel: ownedLevel,
      nextLevel,
      nextLevelRoman: getPactLevelRoman(nextLevel),
      action: ownedLevel > 0 ? 'upgrade' : (activeCount >= MAX_ACTIVE_PACTS ? 'replace' : 'acquire'),
      requiresReplacement: ownedLevel === 0 && activeCount >= MAX_ACTIVE_PACTS,
      assetPath: getPactCardAssetPath(card.id, nextLevel),
      shortEffect: getPactShortEffect(card.id, nextLevel),
      description: getPactDescription(card.id, nextLevel),
      tradeOffs: getPactTradeOffs(card.id, nextLevel),
      immuneToBossSeal: card.immuneToBossSeal,
      isBossKeyFamily: Boolean(bossKeyFamily && card.family === bossKeyFamily)
    };
  }

  function generateDraftOffer(run = currentRun, clearedRoomOverride = null) {
    if (!run) return null;
    const clearedRoom = clearedRoomOverride != null ? Number(clearedRoomOverride) : Number(run.room);
    if (clearedRoom < 1 || clearedRoom >= BOSS_ROOM) return null;

    const isBossPrep = clearedRoom === TELEGRAPH_ROOM;
    const isEndOfRoom3 = clearedRoom === 3;
    const boss = run.telegraphedBoss || null;
    const bossKeyFamily = boss ? boss.keyFamily : null;

    // Exclude already max-leveled cards (III)
    const eligible = PACT_CARDS.filter(card => getActivePactLevel(card.id, run) < 3);
    const pool = eligible.length >= 3 ? eligible : PACT_CARDS.slice();

    const rng = createSeededRng(`${run.seed}-cycle${run.cycle}-draft-after-room${clearedRoom}`);
    let selectedCards = [];

    if (isBossPrep && bossKeyFamily && PACT_FAMILY_IDS.includes(bossKeyFamily)) {
      const keyPool = seededShuffle(pool.filter(c => c.family === bossKeyFamily), rng);
      if (keyPool.length > 0) {
        selectedCards.push(keyPool[0]);
      }
    }

    const pickedIds = new Set(selectedCards.map(c => c.id));
    const remainingShuffled = seededShuffle(pool.filter(c => !pickedIds.has(c.id)), rng);
    for (let i = 0; i < remainingShuffled.length && selectedCards.length < 3; i++) {
      selectedCards.push(remainingShuffled[i]);
      pickedIds.add(remainingShuffled[i].id);
    }

    selectedCards = seededShuffle(selectedCards, rng);
    const choices = selectedCards.map(card => serializeDraftChoice(card, run, bossKeyFamily));

    return {
      draftId: `cycle${run.cycle}_after${clearedRoom}`,
      cycle: run.cycle,
      afterRoom: clearedRoom,
      nextRoom: clearedRoom + 1,
      timed: false,
      isBossPrep,
      earlyKeyFamilyClue: isEndOfRoom3 ? getRoom3KeyFamilyClue(run) : null,
      bossTelegraph: isBossPrep ? getRoom4BossTelegraph(run) : null,
      guaranteedKeyFamily: isBossPrep ? bossKeyFamily : null,
      freeSwapAvailable: isBossPrep && (run.activePacts || []).length > 0 && !run.bossPrepSwapUsed,
      freeSwapUsed: Boolean(run.bossPrepSwapUsed),
      activeSlots: getActivePactSlots(run),
      maxSlots: MAX_ACTIVE_PACTS,
      pickedCardId: null,
      resolved: false,
      choices
    };
  }

  function getPendingDraft(run = currentRun) {
    return (run && run.pendingDraft) ? run.pendingDraft : null;
  }

  function getBossPrepState(run = currentRun) {
    return (run && run.bossPrepState) ? run.bossPrepState : null;
  }

  function selectDraftCard(cardId, replaceCardId = null) {
    if (!currentRun) return { ok: false, reason: 'NO_ACTIVE_RUN' };
    const card = getPactCard(cardId);
    if (!card) return { ok: false, reason: 'INVALID_CARD' };

    const active = Array.isArray(currentRun.activePacts) ? currentRun.activePacts : [];
    currentRun.activePacts = active;
    const existingIdx = active.findIndex(p => p && p.cardId === cardId);

    let action = 'acquire';
    let resultingLevel = 1;

    if (existingIdx >= 0) {
      const currentLvl = Math.max(1, Math.min(3, Number(active[existingIdx].level) || 1));
      if (currentLvl >= 3) {
        return { ok: false, reason: 'ALREADY_MAX_LEVEL', cardId, level: 3 };
      }
      resultingLevel = currentLvl + 1;
      active[existingIdx] = {
        ...active[existingIdx],
        level: resultingLevel,
        upgradedCycle: currentRun.cycle,
        upgradedRoom: currentRun.room
      };
      action = 'upgrade';
    } else if (active.length < MAX_ACTIVE_PACTS) {
      active.push({
        cardId,
        level: 1,
        acquiredCycle: currentRun.cycle,
        acquiredRoom: currentRun.room
      });
      action = 'acquire';
      resultingLevel = 1;
    } else {
      if (!replaceCardId) {
        return {
          ok: false,
          needsReplacement: true,
          reason: 'SLOTS_FULL',
          activeSlots: getActivePactSlots(currentRun),
          maxSlots: MAX_ACTIVE_PACTS
        };
      }
      const repIdx = active.findIndex(p => p && p.cardId === replaceCardId);
      if (repIdx < 0) {
        return { ok: false, reason: 'REPLACE_TARGET_NOT_FOUND', replaceCardId };
      }
      active[repIdx] = {
        cardId,
        level: 1,
        acquiredCycle: currentRun.cycle,
        acquiredRoom: currentRun.room
      };
      action = 'replace';
      resultingLevel = 1;
    }

    currentRun.draftHistory = currentRun.draftHistory || [];
    currentRun.draftHistory.push({
      cycle: currentRun.cycle,
      afterRoom: currentRun.pendingDraft ? currentRun.pendingDraft.afterRoom : Math.max(1, currentRun.room - 1),
      pickedCardId: cardId,
      replacedCardId: replaceCardId || null,
      action,
      resultingLevel,
      timestamp: Date.now()
    });

    if (currentRun.pendingDraft) {
      currentRun.pendingDraft.pickedCardId = cardId;
      currentRun.pendingDraft.resolved = true;
      currentRun.pendingDraft.activeSlots = getActivePactSlots(currentRun);
      if (!currentRun.pendingDraft.isBossPrep || !currentRun.pendingDraft.freeSwapAvailable) {
        currentRun.pendingDraft = null;
      }
    }

    if ((currentRun.questionsAnsweredInRoom || 0) === 0) {
      applyRoomStartPactsAndTarget(currentRun);
    }

    currentRun.updatedAt = Date.now();
    persistRunState();

    return {
      ok: true,
      action,
      cardId,
      level: resultingLevel,
      replacedCardId: replaceCardId || null,
      activeSlots: getActivePactSlots(currentRun),
      roomTargetScore: currentRun.roomTargetScore,
      questionsInRoomTotal: currentRun.questionsInRoomTotal,
      roomScoreMultiplier: currentRun.roomScoreMultiplier
    };
  }

  function performBossPrepFreeSwap(discardCardId, newCardId) {
    if (!currentRun) return { ok: false, reason: 'NO_ACTIVE_RUN' };
    const prep = currentRun.bossPrepState;
    const inBossPrepWindow = Boolean(
      (prep && prep.active) ||
      (currentRun.pendingDraft && currentRun.pendingDraft.isBossPrep) ||
      (currentRun.room === BOSS_ROOM && (currentRun.questionsAnsweredInRoom || 0) === 0)
    );
    if (!inBossPrepWindow) {
      return { ok: false, reason: 'NOT_IN_BOSS_PREP' };
    }
    if (currentRun.bossPrepSwapUsed) {
      return { ok: false, reason: 'FREE_SWAP_ALREADY_USED' };
    }
    const newCard = getPactCard(newCardId);
    if (!newCard) {
      return { ok: false, reason: 'INVALID_NEW_CARD' };
    }

    const active = currentRun.activePacts || [];
    const oldIdx = active.findIndex(p => p && p.cardId === discardCardId);
    if (oldIdx < 0) {
      return { ok: false, reason: 'DISCARD_PACT_NOT_OWNED' };
    }
    if (discardCardId === newCardId) {
      return { ok: false, reason: 'CANNOT_SWAP_SAME_CARD' };
    }

    const existingNewIdx = active.findIndex(p => p && p.cardId === newCardId);
    let resultingLevel = 1;
    if (existingNewIdx >= 0) {
      const nextLvl = Math.min(3, (Number(active[existingNewIdx].level) || 1) + 1);
      active[existingNewIdx] = { ...active[existingNewIdx], level: nextLvl };
      active.splice(oldIdx, 1);
      resultingLevel = nextLvl;
    } else {
      active[oldIdx] = {
        cardId: newCardId,
        level: 1,
        acquiredCycle: currentRun.cycle,
        acquiredRoom: currentRun.room,
        viaBossPrepSwap: true
      };
    }

    currentRun.bossPrepSwapUsed = true;
    if (currentRun.bossPrepState) {
      currentRun.bossPrepState.freeSwapUsed = true;
      currentRun.bossPrepState.freeSwapAvailable = false;
    }
    if (currentRun.pendingDraft) {
      currentRun.pendingDraft.freeSwapUsed = true;
      currentRun.pendingDraft.freeSwapAvailable = false;
      currentRun.pendingDraft.activeSlots = getActivePactSlots(currentRun);
    }

    if ((currentRun.questionsAnsweredInRoom || 0) === 0) {
      applyRoomStartPactsAndTarget(currentRun);
    }

    currentRun.draftHistory = currentRun.draftHistory || [];
    currentRun.draftHistory.push({
      cycle: currentRun.cycle,
      afterRoom: TELEGRAPH_ROOM,
      pickedCardId: newCardId,
      replacedCardId: discardCardId,
      action: 'boss_prep_free_swap',
      resultingLevel,
      timestamp: Date.now()
    });

    currentRun.updatedAt = Date.now();
    persistRunState();

    return {
      ok: true,
      discardedCardId: discardCardId,
      acquiredCardId: newCardId,
      level: resultingLevel,
      freeSwapUsed: true,
      activeSlots: getActivePactSlots(currentRun),
      roomTargetScore: currentRun.roomTargetScore,
      questionsInRoomTotal: currentRun.questionsInRoomTotal,
      roomScoreMultiplier: currentRun.roomScoreMultiplier
    };
  }

  function dismissPendingDraft() {
    if (!currentRun) return null;
    currentRun.pendingDraft = null;
    if (currentRun.bossPrepState) {
      currentRun.bossPrepState.active = false;
    }
    currentRun.updatedAt = Date.now();
    persistRunState();
    return {
      ok: true,
      activeSlots: getActivePactSlots(currentRun)
    };
  }

  function presentQuestion(questionObj) {
    if (!currentRun) return null;
    const item = questionObj || (currentRun.roomQueue && currentRun.roomQueue[0]) || null;
    let triggerOut = { cleanPatch: {}, blockedViolations: [] };
    if (currentRun.room === BOSS_ROOM) {
      triggerOut = dispatchBossTrigger(currentRun, 'ON_QUESTION_PRESENT', { question: item });
    }

    const basePresentation = triggerOut.cleanPatch.questionPresentation
      ? { ...triggerOut.cleanPatch.questionPresentation }
      : {};

    // Active Pacts: ON_QUESTION_PRESENT hooks (Midnight Eye, Passage)
    const pactEffects = [];
    const midnightEye = findActivePactEntry(currentRun, 'midnight_eye');
    if (midnightEye && item) {
      const qIdx = currentRun.questionsAnsweredInRoom || 0;
      const isRetry = Boolean(item.isPracticeRetry);
      let shouldEliminate = false;
      if (midnightEye.level === 1) {
        shouldEliminate = isRetry || qIdx < 3;
      } else if (midnightEye.level === 2) {
        shouldEliminate = isRetry || qIdx % 2 === 0;
      } else {
        shouldEliminate = true;
      }
      if (shouldEliminate) {
        basePresentation.eliminateWrongOptions = midnightEye.stats.eliminateCount || 1;
        pactEffects.push({
          cardId: 'midnight_eye',
          level: midnightEye.level,
          effect: 'eliminate_distractor',
          count: midnightEye.stats.eliminateCount || 1
        });
      }
      if (midnightEye.level >= 3 && (item.tag || item.category)) {
        basePresentation.categoryClue = item.tag || item.category;
      }
    }

    const passage = findActivePactEntry(currentRun, 'passage');
    if (passage) {
      const used = currentRun.passageUsedInRoom || 0;
      const limit = passage.stats.reroutesPerRoom || 0;
      const canReroute = used < limit && (currentRun.roomQueue && currentRun.roomQueue.length > 1);
      basePresentation.canUsePassageReroute = canReroute;
      basePresentation.passageReroutesRemaining = Math.max(0, limit - used);
      if (canReroute) {
        pactEffects.push({
          cardId: 'passage',
          level: passage.level,
          effect: 'reroute_available',
          remaining: basePresentation.passageReroutesRemaining
        });
      }
    }

    basePresentation.crackedArmorArmed = Boolean(currentRun.crackedArmorArmed && findActivePactEntry(currentRun, 'cracked_armor'));
    basePresentation.goldenQuillThresholdSec = findActivePactEntry(currentRun, 'golden_quill')
      ? findActivePactEntry(currentRun, 'golden_quill').stats.thresholdSeconds
      : null;

    return {
      question: item,
      presentation: basePresentation,
      pactEffects,
      autoActivatedPacts: false // Hard guarantee
    };
  }

  // Controlled Arcane reroute (Passage): moves current question to back or skips non-critical draw safely
  // NEVER deletes items from practiceQueue!
  function usePassageTransit(cardOverride = null) {
    if (!currentRun) return { ok: false, reason: 'NO_ACTIVE_RUN' };
    const passage = findActivePactEntry(currentRun, 'passage');
    if (!passage) return { ok: false, reason: 'PASSAGE_NOT_ACTIVE' };

    const used = currentRun.passageUsedInRoom || 0;
    const limit = passage.stats.reroutesPerRoom || 0;
    if (used >= limit) {
      return { ok: false, reason: 'PASSAGE_USES_EXHAUSTED', remaining: 0 };
    }
    if (!currentRun.roomQueue || currentRun.roomQueue.length <= 1) {
      return { ok: false, reason: 'NO_OTHER_QUESTION_IN_DECK' };
    }

    const idx = (cardOverride && cardOverride.word)
      ? Math.max(0, currentRun.roomQueue.findIndex(q => q && q.word === cardOverride.word))
      : 0;
    const [rerouted] = currentRun.roomQueue.splice(idx, 1);
    currentRun.roomQueue.push(rerouted);
    currentRun.passageUsedInRoom = used + 1;

    currentRun.pactTriggerLog = currentRun.pactTriggerLog || [];
    currentRun.pactTriggerLog.push({
      event: 'ON_QUESTION_PRESENT',
      cardId: 'passage',
      action: 'reroute',
      word: rerouted ? rerouted.word : null,
      room: currentRun.room
    });

    currentRun.updatedAt = Date.now();
    persistRunState();

    return {
      ok: true,
      reroutedWord: rerouted ? rerouted.word : null,
      nextQuestion: currentRun.roomQueue[0] || null,
      remainingUses: Math.max(0, limit - currentRun.passageUsedInRoom),
      practiceQueuePreserved: true
    };
  }

  function recordCorrectAnswer(options = {}) {
    if (!currentRun) return null;
    const card = options.card || (currentRun.roomQueue && currentRun.roomQueue[0]) || null;
    const answerDurationSec = typeof options.answerDurationSec === 'number'
      ? Math.max(0, options.answerDurationSec)
      : (typeof options.durationMs === 'number' ? Math.max(0, options.durationMs / 1000) : null);

    currentRun.questionsAnsweredInRoom += 1;
    currentRun.correctInRoom += 1;
    currentRun.streakInRoom += 1;

    let bossBonusPoints = 0;
    if (currentRun.room === BOSS_ROOM) {
      const bossOut = dispatchBossTrigger(currentRun, 'ON_ANSWER_CORRECT', { card, answerDurationSec });
      if (bossOut && bossOut.cleanPatch && typeof bossOut.cleanPatch.bonusPoints === 'number') {
        bossBonusPoints = bossOut.cleanPatch.bonusPoints;
      }
    }

    const base = typeof options.basePoints === 'number' ? options.basePoints : activeTuning.baseCorrectScore;
    const emberChain = findActivePactEntry(currentRun, 'ember_chain');
    const streakStep = activeTuning.streakStepBonus + (emberChain ? (emberChain.stats.streakStepBonus || 0) : 0);
    const streakBonus = Math.max(0, currentRun.streakInRoom - 1) * streakStep;

    let flatPactBonus = 0;
    let gainedRunXp = activeTuning.baseCorrectRunXp;
    const firedPacts = [];

    // Compute additive multiplier terms (never compounding multiplicatively!)
    const multEval = computeAdditiveMultiplierTotal(currentRun);
    let additivePactMultBonus = multEval.additiveBonus;
    const additiveMultBreakdown = [...multEval.terms];

    // Golden Quill: +20 (+35 / +50) bonus points when answering correctly under 5 seconds
    const goldenQuill = findActivePactEntry(currentRun, 'golden_quill');
    if (goldenQuill && answerDurationSec !== null && answerDurationSec < goldenQuill.stats.thresholdSeconds) {
      flatPactBonus += goldenQuill.stats.bonusPoints;
      firedPacts.push({ cardId: 'golden_quill', bonusPoints: goldenQuill.stats.bonusPoints });
    }

    // Flame Strike: combo >= 2 bonus points (+ additive mult already included in multEval)
    const flameStrike = findActivePactEntry(currentRun, 'flame_strike');
    if (flameStrike && currentRun.streakInRoom >= flameStrike.stats.minStreak) {
      flatPactBonus += flameStrike.stats.bonusPoints;
      firedPacts.push({ cardId: 'flame_strike', bonusPoints: flameStrike.stats.bonusPoints });
    }

    // Golden Strike: every 3rd consecutive answer
    const goldenStrike = findActivePactEntry(currentRun, 'golden_strike');
    if (goldenStrike && currentRun.streakInRoom > 0 && currentRun.streakInRoom % goldenStrike.stats.cadence === 0) {
      flatPactBonus += goldenStrike.stats.bonusPoints;
      gainedRunXp += goldenStrike.stats.bonusRunXp;
      firedPacts.push({ cardId: 'golden_strike', bonusPoints: goldenStrike.stats.bonusPoints, bonusRunXp: goldenStrike.stats.bonusRunXp });
    }

    // Treasure Hoard: Greed Run XP per correct answer
    const treasureHoard = findActivePactEntry(currentRun, 'treasure_hoard');
    if (treasureHoard) {
      gainedRunXp += treasureHoard.stats.bonusRunXpPerCorrect;
      firedPacts.push({ cardId: 'treasure_hoard', bonusRunXp: treasureHoard.stats.bonusRunXpPerCorrect });
    }

    // Cracked Armor: consume armed setback recovery charge on next correct answer
    const crackedArmor = findActivePactEntry(currentRun, 'cracked_armor');
    if (crackedArmor && currentRun.crackedArmorArmed) {
      flatPactBonus += crackedArmor.stats.recoveryScore;
      gainedRunXp += crackedArmor.stats.recoveryRunXp;
      currentRun.crackedArmorArmed = false;
      firedPacts.push({ cardId: 'cracked_armor', bonusPoints: crackedArmor.stats.recoveryScore, bonusRunXp: crackedArmor.stats.recoveryRunXp });
    }

    // Error Mirror: additive reflection bonus when mastering a previously-missed word
    const errorMirror = findActivePactEntry(currentRun, 'error_mirror');
    const cardWord = card && card.word ? card.word : null;
    const isMirrorTarget = Boolean(
      card && (card.isPracticeRetry || (cardWord && currentRun.errorMirrorWords && currentRun.errorMirrorWords[cardWord] > 0))
    );
    if (errorMirror && isMirrorTarget) {
      flatPactBonus += errorMirror.stats.mirrorBonusPoints;
      additivePactMultBonus += errorMirror.stats.additiveMult;
      additiveMultBreakdown.push({ source: 'error_mirror', delta: errorMirror.stats.additiveMult });
      if (cardWord && currentRun.errorMirrorWords) {
        delete currentRun.errorMirrorWords[cardWord];
      }
      firedPacts.push({
        cardId: 'error_mirror',
        bonusPoints: errorMirror.stats.mirrorBonusPoints,
        additiveMult: errorMirror.stats.additiveMult
      });
    }

    const totalMultiplier = Number((multEval.bossMult + additivePactMultBonus).toFixed(4));
    currentRun.roomScoreMultiplier = totalMultiplier;

    const corePoints = base + streakBonus;
    const gainedScore = Math.round(corePoints * totalMultiplier) + flatPactBonus + bossBonusPoints;

    currentRun.roomScore += gainedScore;
    currentRun.totalRunScore += gainedScore;
    currentRun.runXp += gainedRunXp;

    if (firedPacts.length > 0) {
      currentRun.pactTriggerLog = currentRun.pactTriggerLog || [];
      currentRun.pactTriggerLog.push({
        event: 'ON_ANSWER_CORRECT',
        room: currentRun.room,
        cycle: currentRun.cycle,
        firedPacts
      });
    }

    // Remove mastered item from active room queue AND practice queue (mastered!)
    if (currentRun.roomQueue && currentRun.roomQueue.length > 0) {
      const idx = (card && card.word)
        ? currentRun.roomQueue.findIndex(q => q && q.word === card.word)
        : 0;
      const answered = idx >= 0
        ? currentRun.roomQueue.splice(idx, 1)[0]
        : (!options.card ? currentRun.roomQueue.shift() : card);
      if (answered && answered.word) {
        currentRun.practiceQueue = currentRun.practiceQueue.filter(p => p.word !== answered.word);
      }
    } else if (card && card.word) {
      currentRun.practiceQueue = currentRun.practiceQueue.filter(p => p.word !== card.word);
    }

    currentRun.updatedAt = Date.now();
    persistRunState();

    return {
      gainedScore,
      gainedRunXp,
      flatPactBonus,
      bossBonusPoints,
      totalMultiplier,
      additiveMultiplierBreakdown: additiveMultBreakdown,
      firedPacts,
      roomScore: currentRun.roomScore,
      totalRunScore: currentRun.totalRunScore,
      runXp: currentRun.runXp,
      streakInRoom: currentRun.streakInRoom
    };
  }

  function recordWrongAnswer(cardOverride = null) {
    if (!currentRun) return null;
    const currentItem = cardOverride || (currentRun.roomQueue && currentRun.roomQueue[0]) || null;
    const prevStreak = currentRun.streakInRoom || 0;

    currentRun.questionsAnsweredInRoom += 1;
    currentRun.wrongInRoom += 1;

    const firedPacts = [];

    // Hidden Flame (immune to boss pact-sealing): shelters streak on first mistake per room
    const hiddenFlame = findActivePactEntry(currentRun, 'hidden_flame');
    if (hiddenFlame && !currentRun.hiddenFlameUsedThisRoom && prevStreak > 0) {
      const retained = Math.floor(prevStreak * hiddenFlame.stats.streakRetainRatio);
      currentRun.streakInRoom = retained;
      currentRun.hiddenFlameUsedThisRoom = true;
      if (hiddenFlame.stats.shelterBonus > 0) {
        currentRun.roomScore += hiddenFlame.stats.shelterBonus;
        currentRun.totalRunScore += hiddenFlame.stats.shelterBonus;
      }
      firedPacts.push({
        cardId: 'hidden_flame',
        retainedStreak: retained,
        shelterBonus: hiddenFlame.stats.shelterBonus
      });
    } else {
      currentRun.streakInRoom = 0;
    }

    // Cracked Armor: arms recovery compensation for next correct answer
    const crackedArmor = findActivePactEntry(currentRun, 'cracked_armor');
    if (crackedArmor) {
      currentRun.crackedArmorArmed = true;
      firedPacts.push({ cardId: 'cracked_armor', armed: true });
    }

    // Error Mirror: marks word for reflection multiplier & bonus when subsequently answered right
    const errorMirror = findActivePactEntry(currentRun, 'error_mirror');

    // Guardrail 2: NEVER delete or erase mistakes; ALWAYS reveal correct meaning & return to practice queue
    let revealedAnswer = '';
    if (currentItem && currentItem.word) {
      revealedAnswer = currentItem.correct || (Array.isArray(currentItem.meanings) && currentItem.meanings[0]) || '';
      currentRun.runMistakes[currentItem.word] = (currentRun.runMistakes[currentItem.word] || 0) + 1;
      currentRun.revealedMistakeLog.push({
        word: currentItem.word,
        revealedAnswer,
        room: currentRun.room,
        cycle: currentRun.cycle,
        timestamp: Date.now()
      });

      if (errorMirror) {
        currentRun.errorMirrorWords = currentRun.errorMirrorWords || {};
        currentRun.errorMirrorWords[currentItem.word] = (currentRun.errorMirrorWords[currentItem.word] || 0) + 1;
        firedPacts.push({ cardId: 'error_mirror', markedWord: currentItem.word });
      }

      const alreadyQueued = currentRun.practiceQueue.some(p => p.word === currentItem.word);
      const retryCard = {
        ...currentItem,
        isPracticeRetry: true,
        failedCount: currentRun.runMistakes[currentItem.word]
      };
      if (!alreadyQueued) {
        currentRun.practiceQueue.push(retryCard);
      }

      if (currentRun.roomQueue && currentRun.roomQueue.length > 0) {
        const idx = currentRun.roomQueue.findIndex(q => q && q.word === currentItem.word);
        if (idx >= 0) {
          currentRun.roomQueue.splice(idx, 1);
        } else if (!cardOverride) {
          currentRun.roomQueue.shift();
        }
        currentRun.roomQueue.push(retryCard);
      }
    }

    if (firedPacts.length > 0) {
      currentRun.pactTriggerLog = currentRun.pactTriggerLog || [];
      currentRun.pactTriggerLog.push({
        event: 'ON_ANSWER_WRONG',
        room: currentRun.room,
        cycle: currentRun.cycle,
        firedPacts
      });
    }

    // Dispatch boss trigger while strictly preventing candle removal or mistake erasure
    if (currentRun.room === BOSS_ROOM) {
      dispatchBossTrigger(currentRun, 'ON_ANSWER_WRONG', { card: currentItem, revealedAnswer });
    }

    currentRun.updatedAt = Date.now();
    persistRunState();

    return {
      revealedAnswer,
      revealCorrectAnswer: true,
      returnedToPracticeQueue: Boolean(currentItem && currentItem.word),
      practiceQueueLength: currentRun.practiceQueue.length,
      streakInRoom: currentRun.streakInRoom,
      firedPacts,
      candlesRemaining: currentRun.candles,
      candlesRemovedDirectly: 0 // Guardrail 3: wrong answer / boss NEVER removes candle directly!
    };
  }

  // In-run economy hook (Run XP for trade-offs/tolls — completely isolated from main leaderboard!)
  function spendRunXpToll(amount, reason = 'toll') {
    if (!currentRun) return { ok: false, reason: 'NO_ACTIVE_RUN', remainingRunXp: 0 };
    const cost = Math.max(0, Math.round(Number(amount) || 0));
    if (currentRun.runXp < cost) {
      return { ok: false, reason: 'INSUFFICIENT_RUN_XP', remainingRunXp: currentRun.runXp };
    }
    currentRun.runXp -= cost;
    currentRun.runXpSpentOnTolls = (currentRun.runXpSpentOnTolls || 0) + cost;
    currentRun.updatedAt = Date.now();
    persistRunState();
    return {
      ok: true,
      spent: cost,
      reason,
      remainingRunXp: currentRun.runXp
    };
  }

  function submitCurrentRunToScorchedLeaderboard(run = currentRun) {
    if (!run) return null;
    const payload = {
      code: run.studentCode,
      name: run.studentName,
      major: run.studentMajor,
      grade: run.grade,
      score: run.totalRunScore,
      cyclesCleared: run.cyclesClearedThisRun,
      bestLoop: run.cycle,
      roomReached: run.room,
      bossesDefeated: run.bossesDefeatedThisRun,
      seed: run.seed
    };

    const pStats = getPersistentStats(run.studentCode);
    if (run.mode === RUN_MODES.DAILY) {
      const saved = leaderboard.submitDailyScore(run.dateKey, payload);
      const prevDailyBest = Number((pStats.bestDailyByDate && pStats.bestDailyByDate[run.dateKey]) || 0);
      if (!pStats.bestDailyByDate) pStats.bestDailyByDate = {};
      pStats.bestDailyByDate[run.dateKey] = Math.max(prevDailyBest, run.totalRunScore);
      savePersistentStats(run.studentCode, pStats);
      return saved;
    } else {
      const saved = leaderboard.submitStandardScore(payload);
      pStats.bestStandardScore = Math.max(pStats.bestStandardScore || 0, run.totalRunScore);
      savePersistentStats(run.studentCode, pStats);
      return saved;
    }
  }

  function completeCycleAndResetForNextLoop() {
    if (!currentRun) return null;
    const clearedCycle = currentRun.cycle;
    currentRun.cyclesClearedThisRun += 1;
    currentRun.bossesDefeatedThisRun += 1;

    // Preserve persistent stats BEFORE resetting cycle-scoped state
    const pStats = getPersistentStats(currentRun.studentCode);
    pStats.cyclesCompleted = (pStats.cyclesCompleted || 0) + 1;
    pStats.totalBossesDefeated = (pStats.totalBossesDefeated || 0) + 1;
    pStats.highestLoop = Math.max(pStats.highestLoop || 0, clearedCycle);
    savePersistentStats(currentRun.studentCode, pStats);

    // Record cycle clear to separate Scorched City Leaderboard
    submitCurrentRunToScorchedLeaderboard(currentRun);

    // Reset cycle/room-scoped run state cleanly for the next loop
    currentRun.cycle = clearedCycle + 1;
    currentRun.room = 1;
    currentRun.roomScore = 0;
    currentRun.bossScoreMultiplier = 1.0;
    currentRun.roomScoreMultiplier = 1.0;
    currentRun.questionsAnsweredInRoom = 0;
    currentRun.correctInRoom = 0;
    currentRun.wrongInRoom = 0;
    currentRun.streakInRoom = 0;
    currentRun.lastRoomEndedStreak = 0;
    currentRun.activeBossSlot = null;
    currentRun.availablePactLocks = [];
    currentRun.pendingDraft = null;
    currentRun.bossPrepState = null;
    currentRun.bossPrepSwapUsed = false;
    currentRun.nefrin5SealedPactId = null;

    const prevBossId = currentRun.telegraphedBoss ? currentRun.telegraphedBoss.id : null;
    const nextBoss = selectBossForCycle(currentRun.seed, currentRun.cycle, {
      progressive: true,
      runNumber: currentRun.runNumber || 1,
      prevBossId
    });
    currentRun.telegraphedBoss = serializeBossSummary(nextBoss);

    if (currentRun.nefrinTier >= 3) {
      currentRun.secondaryBossModifier = selectSecondaryMiniRule(nextBoss.id, currentRun.seed, currentRun.cycle);
    }

    enterRoom(1);

    return {
      clearedCycle,
      nextCycle: currentRun.cycle,
      nextRoom: currentRun.room,
      telegraphedBossForNextCycle: currentRun.telegraphedBoss,
      persistentStats: getPersistentStats(currentRun.studentCode)
    };
  }

  function completeRoom() {
    if (!currentRun) return null;
    if (currentRun.room === BOSS_ROOM) {
      dispatchBossTrigger(currentRun, 'ON_ROOM_END', {});
    }

    // Active Pacts ON_ROOM_END bonuses (Passage transit score, Treasure Hoard clear bonus)
    let roomEndBonusScore = 0;
    let roomEndBonusRunXp = 0;
    const roomEndFired = [];

    const passage = findActivePactEntry(currentRun, 'passage');
    if (passage && passage.stats.roomEndTransitBonus > 0) {
      roomEndBonusScore += passage.stats.roomEndTransitBonus;
      roomEndFired.push({ cardId: 'passage', bonusPoints: passage.stats.roomEndTransitBonus });
    }

    const treasureHoard = findActivePactEntry(currentRun, 'treasure_hoard');
    if (treasureHoard) {
      roomEndBonusScore += treasureHoard.stats.roomEndBonusScore || 0;
      roomEndBonusRunXp += treasureHoard.stats.roomEndBonusXp || 0;
      roomEndFired.push({
        cardId: 'treasure_hoard',
        bonusPoints: treasureHoard.stats.roomEndBonusScore || 0,
        bonusRunXp: treasureHoard.stats.roomEndBonusXp || 0
      });
    }

    if (roomEndBonusScore > 0) {
      currentRun.roomScore += roomEndBonusScore;
      currentRun.totalRunScore += roomEndBonusScore;
    }

    const reachedTarget = currentRun.roomScore >= currentRun.roomTargetScore;

    if (!reachedTarget) {
      // Threshold Guardian (immune to boss pact-sealing!): once per run prevents candle loss!
      const thresholdGuardian = findActivePactEntry(currentRun, 'threshold_guardian', true);
      if (thresholdGuardian && !currentRun.thresholdGuardianUsed) {
        currentRun.thresholdGuardianUsed = true;
        const headstart = thresholdGuardian.stats.retryHeadstartScore || 0;
        const retryXp = thresholdGuardian.stats.retryRunXp || 0;
        currentRun.runXp += retryXp;
        currentRun.pactTriggerLog = currentRun.pactTriggerLog || [];
        currentRun.pactTriggerLog.push({
          event: 'ON_ROOM_END',
          cardId: 'threshold_guardian',
          room: currentRun.room,
          preventedCandleLoss: true,
          headstartScore: headstart
        });

        const failedRoom = currentRun.room;
        const failedScore = currentRun.roomScore;
        const failedTarget = currentRun.roomTargetScore;

        enterRoom(failedRoom);
        if (headstart > 0) {
          currentRun.roomScore += headstart;
          currentRun.totalRunScore += headstart;
        }
        persistRunState();

        return {
          passed: false,
          room: failedRoom,
          cycle: currentRun.cycle,
          roomScore: failedScore,
          roomTargetScore: failedTarget,
          candleLost: false,
          preventedCandleLossBy: 'threshold_guardian',
          retryHeadstartScore: headstart,
          retryRunXp: retryXp,
          candlesRemaining: currentRun.candles,
          gameOver: false,
          canRetryRoom: true
        };
      }

      // Guardrail 3: Candle is ONLY lost by failing to reach a room's target score!
      currentRun.candles = Math.max(0, currentRun.candles - 1);
      const isGameOver = currentRun.candles <= 0;

      if (isGameOver) {
        currentRun.status = 'game_over';
        const lbEntry = submitCurrentRunToScorchedLeaderboard(currentRun);
        persistRunState();
        return {
          passed: false,
          room: currentRun.room,
          cycle: currentRun.cycle,
          roomScore: currentRun.roomScore,
          roomTargetScore: currentRun.roomTargetScore,
          candleLost: true,
          candlesRemaining: 0,
          gameOver: true,
          leaderboardEntry: lbEntry
        };
      }

      // Reset current room progress for retry with 1 fewer candle
      enterRoom(currentRun.room);
      return {
        passed: false,
        room: currentRun.room,
        cycle: currentRun.cycle,
        roomScore: 0,
        roomTargetScore: currentRun.roomTargetScore,
        candleLost: true,
        candlesRemaining: currentRun.candles,
        gameOver: false,
        canRetryRoom: true
      };
    }

    // Room cleared!
    currentRun.runXp += activeTuning.roomClearRunXpBonus + roomEndBonusRunXp;
    currentRun.lastRoomEndedStreak = currentRun.streakInRoom || 0;
    const clearedRoom = currentRun.room;

    if (clearedRoom < BOSS_ROOM) {
      const nextRoom = clearedRoom + 1;
      // Generate deterministic draft / Room 4 Boss Prep BEFORE entering nextRoom
      const draftOffer = generateDraftOffer(currentRun, clearedRoom);
      currentRun.pendingDraft = draftOffer;
      if (clearedRoom === TELEGRAPH_ROOM) {
        currentRun.bossPrepState = {
          active: true,
          cycle: currentRun.cycle,
          freeSwapAvailable: (currentRun.activePacts || []).length > 0 && !currentRun.bossPrepSwapUsed,
          freeSwapUsed: Boolean(currentRun.bossPrepSwapUsed)
        };
      } else {
        currentRun.bossPrepState = null;
      }

      enterRoom(nextRoom);
      return {
        passed: true,
        clearedRoom,
        nextRoom,
        cycle: currentRun.cycle,
        bossCycleCompleted: false,
        telegraphAvailable: nextRoom === TELEGRAPH_ROOM,
        telegraph: nextRoom === TELEGRAPH_ROOM ? getRoom4BossTelegraph(currentRun) : null,
        earlyKeyFamilyClue: clearedRoom === 3 ? getRoom3KeyFamilyClue(currentRun) : null,
        isBossPrepPhase: clearedRoom === TELEGRAPH_ROOM,
        draftOffer,
        roomEndFired,
        runXp: currentRun.runXp,
        totalRunScore: currentRun.totalRunScore
      };
    }

    // Room 5 Boss cleared -> Complete cycle and reset cleanly for next loop!
    const loopReset = completeCycleAndResetForNextLoop();
    return {
      passed: true,
      clearedRoom: BOSS_ROOM,
      nextRoom: 1,
      cycle: loopReset.nextCycle,
      bossCycleCompleted: true,
      loopReset,
      roomEndFired,
      runXp: currentRun.runXp,
      totalRunScore: currentRun.totalRunScore
    };
  }

  function endRun(submitToLeaderboard = true) {
    if (!currentRun) return null;
    const finalSnapshot = { ...currentRun, status: 'ended' };
    let lbEntry = null;
    if (submitToLeaderboard && finalSnapshot.totalRunScore > 0) {
      lbEntry = submitCurrentRunToScorchedLeaderboard(finalSnapshot);
    }
    const stats = getPersistentStats(finalSnapshot.studentCode);
    currentRun = null;
    removeStorage(STORAGE_KEYS.RUN_STATE);
    return {
      endedRun: finalSnapshot,
      leaderboardEntry: lbEntry,
      persistentStats: stats
    };
  }

  return {
    MODE_ID,
    MODE_TITLE,
    RUN_MODES,
    ROOMS_PER_CYCLE,
    TELEGRAPH_ROOM,
    BOSS_ROOM,
    MAX_ACTIVE_BOSS_MODIFIERS,
    BOSS_TRIGGER_EVENTS,
    ALLOWED_BOSS_EFFECTS,
    PROHIBITED_BOSS_KEYS,
    ARENA_CONFIG,
    STORAGE_KEYS,
    DEFAULT_SIMULATION_TUNING,
    // Step 2: 12-Card Registry & Pact Helpers
    MAX_ACTIVE_PACTS,
    CARD_ASSETS_DIR,
    PACT_FAMILIES,
    PACT_FAMILY_IDS,
    PACT_CARDS,
    toFaDigits,
    SC_COPY,
    getPactCard,
    getAllPactCards,
    getPactCardsByFamily,
    getPactCardAssetPath,
    getPactLevelRoman,
    getPactShortEffect,
    getPactDescription,
    getPactTradeOffs,
    isPactProtectedFromSeal,
    isPactLockedForRun,
    getActivePactSlots,
    hasActivePact,
    getActivePactLevel,
    getFamilyInfo,
    // Step 2: Draft Cadence & Room 4 Boss Prep
    generateDraftOffer,
    getPendingDraft,
    getBossPrepState,
    getRoom3KeyFamilyClue,
    selectDraftCard,
    performBossPrepFreeSwap,
    dismissPendingDraft,
    usePassageTransit,
    // Storage override hook for testing
    setStorageBackend,
    // Seed & Date Helpers
    getCalendarDateKey,
    hashSeedString,
    createSeededRng,
    createDailyRunSeed,
    seededShuffle,
    // Simulation Tuning
    getSimulationTuning,
    setSimulationTuning,
    resetSimulationTuning,
    computeRoomTargetScore,
    // Step 4: Nefrin Tiers, Secondary Rules & Progressive Pool Unlock
    NEFRIN_TIERS,
    SECONDARY_MINI_RULES,
    selectSecondaryMiniRule,
    getBossPoolForRun,
    isFullBossPoolUnlocked,
    // Boss Scaffolding & Canonical 10-Boss Roster + Sprites
    BOSS_SPRITES_DIR,
    BOSS_ANIM_FPS,
    BOSS_SPRITE_SLUGS,
    SCORCHED_CITY_BOSSES,
    getAllCanonicalBosses,
    getBossSpriteConfig,
    validateBossDefinition,
    sanitizeBossHookResult,
    registerBoss,
    getBoss,
    getRegisteredBosses,
    selectBossForCycle,
    dispatchBossTrigger,
    getRoom4BossTelegraph,
    BASE_STEP1_BOSS_STUB,
    // Persistent Career Stats
    getPersistentStats,
    savePersistentStats,
    // Dedicated Leaderboard Service
    leaderboard,
    // Pool & Deck Builders
    normalizeQuestionPool,
    buildRoomDeck,
    getRoomQuestionOptions,
    // Run State Machine
    startNewRun,
    loadSavedRun,
    getActiveRun,
    enterRoom,
    presentQuestion,
    recordCorrectAnswer,
    recordWrongAnswer,
    spendRunXpToll,
    completeRoom,
    completeCycleAndResetForNextLoop,
    endRun
  };
});

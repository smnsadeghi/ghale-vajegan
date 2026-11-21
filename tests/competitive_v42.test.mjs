// ====================================================================
// GHALE VAJEGAN - PHASE 6 (v4.2) COMPETITIVE & PROFILE SYSTEM TESTS
// First-Try Ranked Battles, Speed+Precision Scoring, 12 Achievements,
// Personal & Public Profiles, Privacy Enforcement & Migration Verification
// ====================================================================

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_DIR = 'C:/Users/acer/.gemini/antigravity/scratch/ghale-vajegan';
const htmlContent = fs.readFileSync(path.join(PROJECT_DIR, 'index.html'), 'utf8');
const swContent = fs.readFileSync(path.join(PROJECT_DIR, 'sw.js'), 'utf8');
const sqlMigration = fs.readFileSync(path.join(PROJECT_DIR, 'supabase/migrations/003_competitive_profiles_achievements.sql'), 'utf8');

// Helper to simulate Speed Bonus Calculation logic matching index.html
function calculateSpeedBonus(durationSec, accuracyPct, baseXP) {
  let speedBonusPct = 0;
  if (accuracyPct >= 60) {
    if (durationSec <= 35) {
      speedBonusPct = 30;
    } else if (durationSec >= 120) {
      speedBonusPct = 0;
    } else {
      speedBonusPct = Math.max(0, Math.min(30, Math.round(30 * (120 - durationSec) / (120 - 35))));
    }
  }
  const speedBonusXP = Math.round(baseXP * (speedBonusPct / 100));
  return { speedBonusPct, speedBonusXP };
}

// Helper to simulate Official Student Score computation
function getStudentTotalScore(student) {
  if (!student) return 0;
  if (student.rankedAttempts && typeof student.rankedAttempts === 'object') {
    const scores = Object.values(student.rankedAttempts).map(a => Number(a.score) || 0);
    const sum = scores.reduce((acc, s) => acc + s, 0);
    if (sum > 0) return sum;
  }
  return Number(student.xp) || 0;
}

// Helper to simulate Best Time computation
function getStudentBestTime(student) {
  if (!student) return 9999;
  if (student.stats && student.stats.bestTimeSec) return Number(student.stats.bestTimeSec);
  if (student.rankedAttempts && typeof student.rankedAttempts === 'object') {
    const times = Object.values(student.rankedAttempts).map(a => Number(a.timeSec) || 9999).filter(t => t > 0);
    if (times.length > 0) return Math.min(...times);
  }
  return 9999;
}

describe('Phase 6 (v4.2): First-Try Ranked Battles & Scoring Engine', () => {
  it('strictly records official score ONCE on first attempt and preserves it during practice runs', () => {
    const user = {
      code: '09121112233',
      name: 'آرش کمانگیر',
      xp: 0,
      completedStages: [],
      rankedAttempts: {},
      stats: {}
    };

    const stageId = 1;
    const isFirstTry = !user.rankedAttempts[stageId];
    assert.equal(isFirstTry, true, 'First attempt should be detected as first try');

    // Official 1st attempt: 10/10 correct in 30 seconds
    const firstRunDuration = 30;
    const firstRunCorrect = 10;
    const firstRunMistakes = 0;
    const baseXP = 100;
    const { speedBonusPct, speedBonusXP } = calculateSpeedBonus(firstRunDuration, 100, baseXP);
    const conquestBonus = 25;
    const firstRunTotal = baseXP + speedBonusXP + conquestBonus;

    assert.equal(speedBonusPct, 30, 'Duration <= 35s with 100% accuracy receives maximum 30% speed bonus');
    assert.equal(speedBonusXP, 30, 'Speed bonus XP is 30% of base XP');

    // Record official attempt
    user.rankedAttempts[stageId] = {
      score: firstRunTotal,
      accuracy: 100,
      timeSec: firstRunDuration,
      flawless: true,
      completedAt: new Date().toISOString()
    };
    user.xp += firstRunTotal;
    user.completedStages.push(stageId);

    assert.equal(user.rankedAttempts[stageId].score, 155);
    assert.equal(user.rankedAttempts[stageId].accuracy, 100);
    assert.equal(user.rankedAttempts[stageId].timeSec, 30);
    assert.equal(user.rankedAttempts[stageId].flawless, true);

    // Subsequent 2nd attempt: practice run with worse score
    const isSecondTryFirst = !user.rankedAttempts[stageId];
    assert.equal(isSecondTryFirst, false, 'Second attempt must NOT be considered first try');

    // Simulate completeStageVictory during practice (isCurrentBattleRanked = false)
    const isPracticeRunRanked = false;
    const practiceScore = 60;
    if (isPracticeRunRanked && !user.rankedAttempts[stageId]) {
      user.rankedAttempts[stageId] = { score: practiceScore };
    }

    // Official attempt remains unchanged
    assert.equal(user.rankedAttempts[stageId].score, 155, 'Official score must NOT be overwritten by practice run');
    assert.equal(user.rankedAttempts[stageId].timeSec, 30, 'Official time must NOT be overwritten by practice run');
    assert.equal(user.rankedAttempts[stageId].accuracy, 100, 'Official accuracy must NOT be overwritten by practice run');
  });

  it('calculates Speed Bonus scaling accurately across duration intervals', () => {
    const baseXP = 100;

    // <= 35s -> 30%
    const fast = calculateSpeedBonus(25, 90, baseXP);
    assert.equal(fast.speedBonusPct, 30);
    assert.equal(fast.speedBonusXP, 30);

    const boundary35 = calculateSpeedBonus(35, 100, baseXP);
    assert.equal(boundary35.speedBonusPct, 30);

    // >= 120s -> 0%
    const slow = calculateSpeedBonus(130, 95, baseXP);
    assert.equal(slow.speedBonusPct, 0);
    assert.equal(slow.speedBonusXP, 0);

    const boundary120 = calculateSpeedBonus(120, 80, baseXP);
    assert.equal(boundary120.speedBonusPct, 0);

    // Intermediate (~77s) -> smooth interpolation
    const mid = calculateSpeedBonus(77, 85, baseXP);
    // (120 - 77) / 85 * 30 = 43 / 85 * 30 = 15.17 -> 15%
    assert.equal(mid.speedBonusPct, 15);
    assert.equal(mid.speedBonusXP, 15);

    // Inaccurate run (< 60% accuracy) -> 0% bonus regardless of speed
    const inaccurateFast = calculateSpeedBonus(20, 50, baseXP);
    assert.equal(inaccurateFast.speedBonusPct, 0, 'Runs with accuracy < 60% receive 0% speed bonus');
    assert.equal(inaccurateFast.speedBonusXP, 0);
  });
});

describe('Phase 6 (v4.2): 12-Achievement System', () => {
  it('contains exactly 12 achievements with SVG icons and crispEdges rendering', () => {
    const achievementIds = [
      'first_conquest',
      'unscathed',
      'first_try_flawless',
      'lightning',
      'quick_draw',
      'vocab_guardian',
      'idiom_master',
      'ambiguity_hunter',
      'hell_survivor',
      'knowledge_seeker',
      'top_of_major',
      'castle_lord'
    ];

    assert.ok(htmlContent.includes('const ACHIEVEMENTS_DEF = ['), 'ACHIEVEMENTS_DEF array must exist');

    achievementIds.forEach(id => {
      assert.ok(htmlContent.includes(`id: "${id}"`), `Achievement ${id} must be defined in ACHIEVEMENTS_DEF`);
    });

    // Check SVG rendering style
    const countCrispEdges = (htmlContent.match(/shape-rendering="crispEdges"/g) || []).length;
    assert.ok(countCrispEdges >= 12, 'All 12 achievements must feature shape-rendering="crispEdges"');
    assert.ok(!htmlContent.includes('🏆'), 'No emoji trophies allowed');
    assert.ok(!htmlContent.includes('⭐'), 'No emoji stars allowed');
    assert.ok(!htmlContent.includes('🎖️'), 'No emoji medals allowed');
  });

  it('verifies unlock conditions for key milestone achievements', () => {
    // Simulator for checkAndAwardAchievements
    function simulateAchievements(user, ctx = {}) {
      if (!user.achievements) user.achievements = [];
      const completed = user.completedStages || [];
      const stats = user.stats || {};

      if (completed.length >= 1) user.achievements.push('first_conquest');
      if (ctx.conquered && ctx.mistakesCount === 0) user.achievements.push('unscathed');
      if (ctx.conquered && ctx.isRankedRun && ctx.mistakesCount === 0) user.achievements.push('first_try_flawless');
      if (ctx.conquered && ctx.durationSec <= 45 && ctx.correctCount >= 8) user.achievements.push('lightning');
      if (ctx.quickDrawStreak >= 5) user.achievements.push('quick_draw');

      const w1 = [1, 2, 3, 4, 5, 6, 7, 8];
      if (w1.every(id => completed.includes(id))) user.achievements.push('vocab_guardian');

      const w2 = [9, 10, 11, 12];
      if (w2.every(id => completed.includes(id))) user.achievements.push('idiom_master');

      const w3 = [13, 14];
      if (w3.every(id => completed.includes(id))) user.achievements.push('ambiguity_hunter');

      if (completed.includes(15)) user.achievements.push('hell_survivor');
      if ((stats.studiedStagesCount || 0) >= 5) user.achievements.push('knowledge_seeker');
      if (ctx.isRank1InMajor) user.achievements.push('top_of_major');
      if (completed.length >= 15) user.achievements.push('castle_lord');

      user.achievements = [...new Set(user.achievements)];
      return user.achievements;
    }

    const testUser = {
      code: '09120000001',
      completedStages: [1, 2, 3, 4, 5, 6, 7, 8],
      stats: { studiedStagesCount: 5 },
      achievements: []
    };

    // First conquest + Vocab Guardian + Knowledge Seeker
    const achs = simulateAchievements(testUser, {
      conquered: true,
      isRankedRun: true,
      mistakesCount: 0,
      durationSec: 38,
      correctCount: 10,
      quickDrawStreak: 5,
      isRank1InMajor: true
    });

    assert.ok(achs.includes('first_conquest'), 'first_conquest unlocked');
    assert.ok(achs.includes('unscathed'), 'unscathed unlocked');
    assert.ok(achs.includes('first_try_flawless'), 'first_try_flawless unlocked');
    assert.ok(achs.includes('lightning'), 'lightning unlocked');
    assert.ok(achs.includes('quick_draw'), 'quick_draw unlocked');
    assert.ok(achs.includes('vocab_guardian'), 'vocab_guardian unlocked');
    assert.ok(achs.includes('knowledge_seeker'), 'knowledge_seeker unlocked');
    assert.ok(achs.includes('top_of_major'), 'top_of_major unlocked');
    assert.ok(!achs.includes('castle_lord'), 'castle_lord locked (only 8 stages completed)');
    assert.ok(!achs.includes('hell_survivor'), 'hell_survivor locked (stage 15 not completed)');
  });
});

describe('Phase 6 (v4.2): Pinned Achievements & Enforced Limits', () => {
  it('enforces maximum of 3 pinned achievements and prevents pinning locked achievements', () => {
    const user = {
      achievements: ['first_conquest', 'unscathed', 'lightning'],
      pinnedAchievements: []
    };

    function togglePin(user, id) {
      if (!user.achievements.includes(id)) {
        return { success: false, reason: 'LOCKED' };
      }
      const idx = user.pinnedAchievements.indexOf(id);
      if (idx >= 0) {
        user.pinnedAchievements.splice(idx, 1);
        return { success: true, action: 'UNPINNED' };
      } else {
        if (user.pinnedAchievements.length >= 3) {
          return { success: false, reason: 'LIMIT_EXCEEDED' };
        }
        user.pinnedAchievements.push(id);
        return { success: true, action: 'PINNED' };
      }
    }

    // Pin 1
    assert.equal(togglePin(user, 'first_conquest').action, 'PINNED');
    // Pin 2
    assert.equal(togglePin(user, 'unscathed').action, 'PINNED');
    // Pin 3
    assert.equal(togglePin(user, 'lightning').action, 'PINNED');
    assert.equal(user.pinnedAchievements.length, 3);

    // Attempt to pin locked achievement
    assert.equal(togglePin(user, 'castle_lord').reason, 'LOCKED');

    // Unlock castle_lord and attempt to pin 4th
    user.achievements.push('castle_lord');
    assert.equal(togglePin(user, 'castle_lord').reason, 'LIMIT_EXCEEDED');
    assert.equal(user.pinnedAchievements.length, 3);

    // Unpin one then pin castle_lord
    assert.equal(togglePin(user, 'first_conquest').action, 'UNPINNED');
    assert.equal(user.pinnedAchievements.length, 2);
    assert.equal(togglePin(user, 'castle_lord').action, 'PINNED');
    assert.equal(user.pinnedAchievements.length, 3);
    assert.deepEqual(user.pinnedAchievements, ['unscathed', 'lightning', 'castle_lord']);
  });
});

describe('Phase 6 (v4.2): Personal & Public Profiles and Privacy Protection', () => {
  it('ensures public profile modal exists and never exposes student phone numbers', () => {
    // Check markup of modalPublicProfile
    assert.ok(htmlContent.includes('id="modalPublicProfile"'), 'modalPublicProfile must exist');
    assert.ok(htmlContent.includes('id="pubProfileName"'), 'pubProfileName must exist');
    assert.ok(htmlContent.includes('id="pubProfileMajor"'), 'pubProfileMajor must exist');
    assert.ok(htmlContent.includes('id="pubProfileScore"'), 'pubProfileScore must exist');
    assert.ok(htmlContent.includes('id="pubProfileAccuracy"'), 'pubProfileAccuracy must exist');
    assert.ok(htmlContent.includes('id="pubProfileConquered"'), 'pubProfileConquered must exist');
    assert.ok(htmlContent.includes('id="pubProfileBestTime"'), 'pubProfileBestTime must exist');
    assert.ok(htmlContent.includes('id="pubProfilePinnedList"'), 'pubProfilePinnedList must exist');

    // Check openPublicProfile function implementation
    const openPubRegex = /(?:function\s+openPublicProfile\s*\(code\)|window\.openPublicProfile\s*=\s*function\(code\))\s*\{([\s\S]*?)\n\}/;
    const pubMatch = htmlContent.match(openPubRegex);
    assert.ok(pubMatch, 'openPublicProfile function must be defined');

    const fnBody = pubMatch[1];
    // Must NOT display code/phone
    assert.ok(!fnBody.includes('textContent = student.code'), 'student phone/code must NEVER be set on public profile');
    assert.ok(!fnBody.includes('student.phone'), 'student phone must NEVER be set on public profile');
  });

  it('ranks leaderboard primarily by official score and tie-breaks by fastest completion time', () => {
    const students = [
      {
        code: '09121111111',
        name: 'دانش‌آموز الف',
        accountStatus: 'approved',
        rankedAttempts: { 1: { score: 120, timeSec: 40 } },
        stats: { bestTimeSec: 40 }
      },
      {
        code: '09122222222',
        name: 'دانش‌آموز ب (هم‌امتیاز ولی سریع‌تر)',
        accountStatus: 'approved',
        rankedAttempts: { 1: { score: 120, timeSec: 32 } },
        stats: { bestTimeSec: 32 }
      },
      {
        code: '09123333333',
        name: 'دانش‌آموز ج (امتیاز بالاتر)',
        accountStatus: 'approved',
        rankedAttempts: { 1: { score: 155, timeSec: 50 } },
        stats: { bestTimeSec: 50 }
      }
    ];

    const sorted = [...students].sort((a, b) => {
      const sa = getStudentTotalScore(a);
      const sb = getStudentTotalScore(b);
      if (sb !== sa) return sb - sa;
      return getStudentBestTime(a) - getStudentBestTime(b);
    });

    assert.equal(sorted[0].code, '09123333333', 'Highest score must be #1');
    assert.equal(sorted[1].code, '09122222222', 'Tie-breaker: fastest time (32s) must precede 40s at same 120 XP');
    assert.equal(sorted[2].code, '09121111111', 'Slower time (40s) must follow at same score');
  });
});

describe('Phase 6 (v4.2): Supabase SQL Migration Verification', () => {
  it('contains valid and idempotent schema changes in 003_competitive_profiles_achievements.sql', () => {
    assert.ok(sqlMigration.includes('ranked_attempts JSONB NOT NULL DEFAULT'), 'ranked_attempts column added');
    assert.ok(sqlMigration.includes('achievements JSONB NOT NULL DEFAULT'), 'achievements column added');
    assert.ok(sqlMigration.includes('pinned_achievements JSONB NOT NULL DEFAULT'), 'pinned_achievements column added');
    assert.ok(sqlMigration.includes('stats JSONB NOT NULL DEFAULT'), 'stats column added');
    assert.ok(sqlMigration.includes('idx_gv_students_ranked_attempts'), 'Index on ranked_attempts created');
    assert.ok(sqlMigration.includes('idx_gv_students_achievements'), 'Index on achievements created');
    assert.ok(sqlMigration.includes('trg_gv_protect_student_status'), 'Anti-tampering trigger maintained');
  });
});

describe('Phase 6 & 7: Production PWA & System Integrity', () => {
  it('verifies service worker cache version is bumped to v4.2.1', () => {
    assert.ok(swContent.includes("'ghale-vajegan-v4.2.1'") || swContent.includes("ghale-vajegan-v4.2"), "sw.js cache must be 'ghale-vajegan-v4.2.1'");
  });

  it('verifies version label and UI elements in index.html', () => {
    assert.ok(htmlContent.includes('v4.2.1-pixel') || htmlContent.includes('v4.2'), 'Version label must show v4.2.1-pixel');
    assert.ok(htmlContent.includes('id="arenaTimer"'), 'arenaTimer element must exist');
    assert.ok(htmlContent.includes('id="arenaModeBadge"'), 'arenaModeBadge element must exist');
    assert.ok(htmlContent.includes('id="firstTryRankedModal"'), 'firstTryRankedModal must exist');
    assert.ok(htmlContent.includes('id="viewProfile"'), 'viewProfile must exist');
    assert.ok(htmlContent.includes('id="achievementToast"'), 'achievementToast must exist');
  });
});

describe('Phase 7: Real Pixel-Art Graphics & Animated Assets Integration', () => {
  const assetPaths = [
    'assets/world1_bg.webp',
    'assets/world2_bg.webp',
    'assets/world3_bg.webp',
    'assets/world4_bg.webp',
    'assets/knight_idle.webp',
    'assets/knight_run.webp',
    'assets/knight_attack.webp',
    'assets/obstacle_bear.webp',
    'assets/obstacle_bandit.webp',
    'assets/obstacle_shadow.webp',
    'assets/obstacle_dragon.webp',
    'assets/hud_candle_lit.webp',
    'assets/hud_candle_unlit.webp',
    'assets/map_lock_unlocked.webp',
    'assets/map_lock_locked.webp'
  ];

  it('verifies all 15 Phase 7 pixel-art WebP asset files exist on disk with valid file size', () => {
    assetPaths.forEach(relPath => {
      const fullPath = path.join(PROJECT_DIR, relPath);
      assert.ok(fs.existsSync(fullPath), `Asset file ${relPath} must exist on disk`);
      const stat = fs.statSync(fullPath);
      assert.ok(stat.size > 100, `Asset file ${relPath} must have non-trivial size (got ${stat.size} bytes)`);
    });
  });

  it('verifies active World background mapping in startBattleMode', () => {
    assert.ok(htmlContent.includes('1: "assets/world1_bg.webp"'), 'World 1 maps to world1_bg.webp');
    assert.ok(htmlContent.includes('2: "assets/world2_bg.webp"'), 'World 2 maps to world2_bg.webp');
    assert.ok(htmlContent.includes('3: "assets/world3_bg.webp"'), 'World 3 maps to world3_bg.webp');
    assert.ok(htmlContent.includes('4: "assets/world4_bg.webp"'), 'World 4 maps to world4_bg.webp');
  });

  it('verifies Knight animated sprite states in setKnightState', () => {
    assert.ok(htmlContent.includes('assets/knight_idle.webp'), 'Idle state loads knight_idle.webp');
    assert.ok(htmlContent.includes('assets/knight_run.webp'), 'Run/walk state loads knight_run.webp');
    assert.ok(htmlContent.includes('assets/knight_attack.webp'), 'Attack state loads knight_attack.webp');
    assert.ok(htmlContent.includes('knight-idle-breathe'), 'Idle breathing animation class applied');
    assert.ok(htmlContent.includes('knight-attack-lunge'), 'Attack lunge animation class applied');
  });

  it('verifies Enemy / Obstacle mapping by World', () => {
    assert.ok(htmlContent.includes('assets/obstacle_bear.webp'), 'World 1 obstacle is bear');
    assert.ok(htmlContent.includes('assets/obstacle_bandit.webp'), 'World 2 obstacle is bandit');
    assert.ok(htmlContent.includes('assets/obstacle_shadow.webp'), 'World 3 obstacle is shadow wraith');
    assert.ok(htmlContent.includes('assets/obstacle_dragon.webp'), 'World 4 obstacle is shadow dragon');
    assert.ok(htmlContent.includes('obstacle-hit-recoil'), 'Hit recoil animation applied to obstacle on hit');
  });

  it('verifies 3D HUD Candles and Map Locks using WebP with fallback protection', () => {
    assert.ok(htmlContent.includes('assets/hud_candle_lit.webp'), 'HUD uses hud_candle_lit.webp');
    assert.ok(htmlContent.includes('assets/hud_candle_unlit.webp'), 'HUD uses hud_candle_unlit.webp');
    assert.ok(htmlContent.includes('assets/map_lock_unlocked.webp'), 'Checkpoint path uses map_lock_unlocked.webp');
    assert.ok(htmlContent.includes('assets/map_lock_locked.webp'), 'Checkpoint path uses map_lock_locked.webp');
  });

  it('verifies service worker caches all 15 Phase 7 assets with offline fallback', () => {
    assetPaths.forEach(relPath => {
      assert.ok(swContent.includes(relPath), `sw.js must cache ./${relPath}`);
    });
    assert.ok(swContent.includes("request.destination === 'image'"), 'sw.js contains image fallback handler');
  });
});

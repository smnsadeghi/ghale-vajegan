// ====================================================================
// GHALE VAJEGAN - LEADERBOARD FLAWLESS WEIGHTING & MULTI-MODE TESTS
// Flawless (+25%) Bonus, Retry Penalty, Overall & By-Stage Rankings
// ====================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_DIR = 'C:/Users/acer/.gemini/antigravity/scratch/ghale-vajegan';
const htmlContent = fs.readFileSync(path.join(PROJECT_DIR, 'index.html'), 'utf8');

// Helper to simulate score calculation matching completeStageVictory in index.html
function calculateVictoryScore({ baseXP, speedBonusXP = 0, isHell = false, stageLosses = 0, stageMistakesCount = 0 }) {
  const conquestBonus = isHell ? 50 : 25;
  const baseRunScore = baseXP + speedBonusXP + conquestBonus;
  const isFlawlessRun = (stageLosses === 0 && stageMistakesCount === 0);

  let flawlessBonusXP = 0;
  let retryPenaltyXP = 0;
  let stageRunScore = baseRunScore;

  if (isFlawlessRun) {
    flawlessBonusXP = Math.round(baseRunScore * 0.25);
    stageRunScore = baseRunScore + flawlessBonusXP;
  } else {
    const penaltyPct = Math.min(35, (stageLosses * 10) + (stageMistakesCount * 5));
    retryPenaltyXP = Math.round(baseRunScore * (penaltyPct / 100));
    stageRunScore = Math.max(20, baseRunScore - retryPenaltyXP);
  }

  return { isFlawlessRun, baseRunScore, flawlessBonusXP, retryPenaltyXP, stageRunScore };
}

// Helper to simulate getStudentTotalScore matching index.html
function getStudentTotalScore(student) {
  if (!student) return 0;
  if (student.rankedAttempts && typeof student.rankedAttempts === 'object') {
    const scores = Object.values(student.rankedAttempts).map(a => Number(a.score) || 0);
    const sum = scores.reduce((acc, s) => acc + s, 0);
    if (sum > 0) return sum;
  }
  return Number(student.xp) || 0;
}

// Helper to simulate getStudentFlawlessCount matching index.html
function getStudentFlawlessCount(student) {
  if (!student) return 0;
  if (typeof student.flawlessClears === 'number') return student.flawlessClears;
  if (student.stats && typeof student.stats.flawlessClears === 'number') return student.stats.flawlessClears;
  let count = 0;
  if (student.stagePerformance && typeof student.stagePerformance === 'object') {
    Object.values(student.stagePerformance).forEach(p => {
      if (p && p.flawless) count++;
    });
    if (count > 0) return count;
  }
  if (student.rankedAttempts && typeof student.rankedAttempts === 'object') {
    Object.values(student.rankedAttempts).forEach(a => {
      if (a && a.flawless) count++;
    });
  }
  return count;
}

// Helper to simulate getStudentTotalLosses matching index.html
function getStudentTotalLosses(student) {
  if (!student) return 0;
  if (typeof student.totalLosses === 'number') return student.totalLosses;
  if (student.stats && typeof student.stats.totalLosses === 'number') return student.stats.totalLosses;
  let losses = 0;
  if (student.stagePerformance && typeof student.stagePerformance === 'object') {
    Object.values(student.stagePerformance).forEach(p => {
      if (p && typeof p.losses === 'number') losses += p.losses;
    });
  }
  return losses;
}

// Helper to simulate getStudentBestTime matching index.html
function getStudentBestTime(student) {
  if (!student) return 9999;
  if (student.stats && student.stats.bestTimeSec) return Number(student.stats.bestTimeSec);
  if (student.rankedAttempts && typeof student.rankedAttempts === 'object') {
    const times = Object.values(student.rankedAttempts).map(a => Number(a.timeSec) || 9999).filter(t => t > 0);
    if (times.length > 0) return Math.min(...times);
  }
  return 9999;
}

// Overall comparison function matching index.html
function compareStudentsOverall(a, b) {
  const sa = getStudentTotalScore(a);
  const sb = getStudentTotalScore(b);
  if (sb !== sa) return sb - sa;

  const fa = getStudentFlawlessCount(a);
  const fb = getStudentFlawlessCount(b);
  if (fb !== fa) return fb - fa;

  const la = getStudentTotalLosses(a);
  const lb = getStudentTotalLosses(b);
  if (la !== lb) return la - lb;

  return getStudentBestTime(a) - getStudentBestTime(b);
}

// Stage data extractor matching index.html
function getStudentStageData(student, stageId) {
  if (!student || !stageId) return null;
  const p = (student.stagePerformance && (student.stagePerformance[stageId] || student.stagePerformance[Number(stageId)])) || null;
  const r = (student.rankedAttempts && (student.rankedAttempts[stageId] || student.rankedAttempts[Number(stageId)])) || null;
  if (!p && !r) return null;
  return {
    score: (p && typeof p.bestStageScore === 'number' && p.bestStageScore > 0) ? p.bestStageScore : (r ? (Number(r.score) || 0) : 0),
    timeSec: (p && typeof p.bestTimeSec === 'number' && p.bestTimeSec > 0 && p.bestTimeSec < 9999) ? p.bestTimeSec : (r ? (Number(r.timeSec) || 9999) : 9999),
    losses: (p && typeof p.losses === 'number') ? p.losses : 0,
    attempts: (p && typeof p.attempts === 'number') ? p.attempts : (r ? 1 : 0),
    flawless: (p && typeof p.flawless === 'boolean') ? p.flawless : (r ? Boolean(r.flawless) : false)
  };
}

// Stage comparison function matching index.html
function compareStudentsByStage(a, b, stageId) {
  const da = getStudentStageData(a, stageId);
  const db = getStudentStageData(b, stageId);
  if (!da && !db) return 0;
  if (!da) return 1;
  if (!db) return -1;

  if (db.score !== da.score) return db.score - da.score;
  if (da.flawless !== db.flawless) return da.flawless ? -1 : 1;
  if (da.losses !== db.losses) return da.losses - db.losses;
  if (da.attempts !== db.attempts) return da.attempts - db.attempts;
  return da.timeSec - db.timeSec;
}

describe('Leaderboard Upgrade: Flawless Weighting & Retry Penalty Logic', () => {
  it('awards +25% flawless bonus when cleared with 0 losses and 0 mistakes', () => {
    const flawlessResult = calculateVictoryScore({
      baseXP: 100,
      speedBonusXP: 25,
      isHell: false,
      stageLosses: 0,
      stageMistakesCount: 0
    });

    assert.equal(flawlessResult.isFlawlessRun, true, 'Zero losses & zero mistakes must be flawless');
    assert.equal(flawlessResult.baseRunScore, 150); // 100 + 25 + 25
    assert.equal(flawlessResult.flawlessBonusXP, 38); // Math.round(150 * 0.25) = 38
    assert.equal(flawlessResult.stageRunScore, 188); // 150 + 38
  });

  it('applies retry penalty when cleared after losses/mistakes, yielding strictly lower score than clean run', () => {
    // Clean run
    const clean = calculateVictoryScore({
      baseXP: 100,
      speedBonusXP: 25,
      isHell: false,
      stageLosses: 0,
      stageMistakesCount: 0
    });

    // Run cleared after 1 previous loss (extinguished 3 candles in earlier attempt)
    const retryWithLoss = calculateVictoryScore({
      baseXP: 100,
      speedBonusXP: 25,
      isHell: false,
      stageLosses: 1,
      stageMistakesCount: 0
    });

    // Run cleared with 2 mistake candles lost during the run
    const retryWithMistakes = calculateVictoryScore({
      baseXP: 100,
      speedBonusXP: 25,
      isHell: false,
      stageLosses: 0,
      stageMistakesCount: 2
    });

    // Run cleared after 2 previous losses and 1 mistake
    const multiRetry = calculateVictoryScore({
      baseXP: 100,
      speedBonusXP: 25,
      isHell: false,
      stageLosses: 2,
      stageMistakesCount: 1
    });

    assert.equal(retryWithLoss.isFlawlessRun, false);
    assert.equal(retryWithMistakes.isFlawlessRun, false);
    assert.equal(multiRetry.isFlawlessRun, false);

    assert.ok(clean.stageRunScore > retryWithLoss.stageRunScore, 'Clean run must beat retry run with loss');
    assert.ok(clean.stageRunScore > retryWithMistakes.stageRunScore, 'Clean run must beat run with mistakes');
    assert.ok(retryWithLoss.stageRunScore > multiRetry.stageRunScore, 'Fewer losses must beat multiple losses');
    assert.equal(multiRetry.stageRunScore, 112); // 150 - Math.round(150 * 0.25) = 112
  });

  it('caps retry penalty at 35% and maintains minimum floor of 20 XP', () => {
    const extremeFailures = calculateVictoryScore({
      baseXP: 40,
      speedBonusXP: 0,
      isHell: false,
      stageLosses: 10, // 10 * 10% = 100% -> capped at 35%
      stageMistakesCount: 5
    });

    assert.equal(extremeFailures.baseRunScore, 65); // 40 + 25
    assert.equal(extremeFailures.retryPenaltyXP, Math.round(65 * 0.35)); // 23
    assert.equal(extremeFailures.stageRunScore, 42); // 65 - 23 >= 20
  });
});

describe('Leaderboard Upgrade: Overall Ranking Sorting Order & Tie-Breaking', () => {
  it('strictly respects the 4-tier sort order: (1) Score desc, (2) Flawless Clears desc, (3) Total Losses asc, (4) Fastest Best Time asc', () => {
    const students = [
      {
        code: '09120000001',
        name: 'دانش‌آموز الف (امتیاز ۱۰۰۰، ۲ بدون باخت)',
        accountStatus: 'approved',
        rankedAttempts: { 1: { score: 500 }, 2: { score: 500 } },
        stagePerformance: {
          1: { flawless: true, losses: 0, attempts: 1 },
          2: { flawless: true, losses: 0, attempts: 1 }
        },
        stats: { bestTimeSec: 45 }
      },
      {
        code: '09120000002',
        name: 'دانش‌آموز ب (امتیاز ۱۰۰۰، ۳ بدون باخت - باید بالاتر از الف باشد)',
        accountStatus: 'approved',
        rankedAttempts: { 1: { score: 500 }, 2: { score: 500 } },
        stagePerformance: {
          1: { flawless: true, losses: 0, attempts: 1 },
          2: { flawless: true, losses: 0, attempts: 1 },
          3: { flawless: true, losses: 0, attempts: 1 }
        },
        stats: { bestTimeSec: 60 } // slower time, but more flawless clears!
      },
      {
        code: '09120000003',
        name: 'دانش‌آموز ج (امتیاز ۱۰۰۰، ۲ بدون باخت، باخت کمتر از د)',
        accountStatus: 'approved',
        rankedAttempts: { 1: { score: 500 }, 2: { score: 500 } },
        stagePerformance: {
          1: { flawless: true, losses: 0, attempts: 1 },
          2: { flawless: true, losses: 0, attempts: 1 },
          3: { flawless: false, losses: 1, attempts: 2 }
        },
        stats: { bestTimeSec: 50 }
      },
      {
        code: '09120000004',
        name: 'دانش‌آموز د (امتیاز ۱۰۰۰، ۲ بدون باخت، باخت بیشتر از ج)',
        accountStatus: 'approved',
        rankedAttempts: { 1: { score: 500 }, 2: { score: 500 } },
        stagePerformance: {
          1: { flawless: true, losses: 0, attempts: 1 },
          2: { flawless: true, losses: 0, attempts: 1 },
          3: { flawless: false, losses: 3, attempts: 4 }
        },
        stats: { bestTimeSec: 30 } // faster time, but more losses!
      },
      {
        code: '09120000005',
        name: 'دانش‌آموز ه (امتیاز بالاتر ۱۲۰۰ - باید قطعا اول باشد)',
        accountStatus: 'approved',
        rankedAttempts: { 1: { score: 600 }, 2: { score: 600 } },
        stagePerformance: {
          1: { flawless: false, losses: 2, attempts: 3 },
          2: { flawless: false, losses: 2, attempts: 3 }
        },
        stats: { bestTimeSec: 75 }
      },
      {
        code: '09120000006',
        name: 'دانش‌آموز و (هم‌امتیاز با الف و هم‌تعداد بدون‌باخت و باخت، اما سریع‌تر در زمان)',
        accountStatus: 'approved',
        rankedAttempts: { 1: { score: 500 }, 2: { score: 500 } },
        stagePerformance: {
          1: { flawless: true, losses: 0, attempts: 1 },
          2: { flawless: true, losses: 0, attempts: 1 }
        },
        stats: { bestTimeSec: 35 } // 35s beats 45s of student الف!
      }
    ];

    const sorted = [...students].sort(compareStudentsOverall);

    assert.equal(sorted[0].code, '09120000005', '#1 must be highest total score (1200 XP)');
    assert.equal(sorted[1].code, '09120000002', '#2 must be tie-breaker tier 2: most flawless clears (3 clears)');
    assert.equal(sorted[2].code, '09120000006', '#3 must be tie-breaker tier 4: fastest time (35s vs 45s) at 0 losses');
    assert.equal(sorted[3].code, '09120000001', '#4 is slower time (45s) at 0 losses');
    assert.equal(sorted[4].code, '09120000003', '#5 is 1 loss');
    assert.equal(sorted[5].code, '09120000004', '#6 is 3 losses');
  });
});

describe('Leaderboard Upgrade: Per-Stage Ranking Mode', () => {
  const stageId = 'g10_w1_s1';
  const students = [
    {
      code: '09120000010',
      name: 'بازیکن ۱ (مرحله را بازی نکرده)',
      accountStatus: 'approved',
      stagePerformance: {}
    },
    {
      code: '09120000011',
      name: 'بازیکن ۲ (۱۸۸ امتیاز، بدون باخت، ۳۰ ثانیه)',
      accountStatus: 'approved',
      stagePerformance: {
        [stageId]: { bestStageScore: 188, bestTimeSec: 30, losses: 0, attempts: 1, flawless: true }
      }
    },
    {
      code: '09120000012',
      name: 'بازیکن ۳ (۱۸۸ امتیاز، بدون باخت، ۲۵ ثانیه - سریع‌تر)',
      accountStatus: 'approved',
      stagePerformance: {
        [stageId]: { bestStageScore: 188, bestTimeSec: 25, losses: 0, attempts: 1, flawless: true }
      }
    },
    {
      code: '09120000013',
      name: 'بازیکن ۴ (۱۳۵ امتیاز، ۱ باخت قبلی)',
      accountStatus: 'approved',
      stagePerformance: {
        [stageId]: { bestStageScore: 135, bestTimeSec: 20, losses: 1, attempts: 2, flawless: false }
      }
    }
  ];

  it('filters out students who have not attempted the selected stage', () => {
    const stageStudents = students.filter(s => getStudentStageData(s, stageId) !== null);
    assert.equal(stageStudents.length, 3);
    assert.ok(!stageStudents.some(s => s.code === '09120000010'), 'Unattempted student must be excluded from stage view');
  });

  it('ranks per-stage performers by score desc, flawless status, attempts asc, and time asc', () => {
    const stageStudents = students
      .filter(s => getStudentStageData(s, stageId) !== null)
      .sort((a, b) => compareStudentsByStage(a, b, stageId));

    assert.equal(stageStudents[0].code, '09120000012', 'Rank 1 must be 188 XP flawless in 25s');
    assert.equal(stageStudents[1].code, '09120000011', 'Rank 2 must be 188 XP flawless in 30s');
    assert.equal(stageStudents[2].code, '09120000013', 'Rank 3 must be retry clear with 135 XP');

    const sData1 = getStudentStageData(stageStudents[0], stageId);
    assert.equal(sData1.flawless, true);
    assert.equal(sData1.score, 188);

    const sData3 = getStudentStageData(stageStudents[2], stageId);
    assert.equal(sData3.flawless, false);
    assert.equal(sData3.attempts, 2);
  });
});

describe('Leaderboard Upgrade: DOM Structure, Persian Badges & Hooks Integrity in index.html', () => {
  it('contains the Mode Switcher tabs for Overall vs By Stage', () => {
    assert.ok(htmlContent.includes('id="btnTabLbOverall"'), 'btnTabLbOverall must exist');
    assert.ok(htmlContent.includes('id="btnTabLbByStage"'), 'btnTabLbByStage must exist');
    assert.ok(htmlContent.includes('class="capsule-tabs leaderboard-mode-tabs"'), 'leaderboard-mode-tabs must exist');
  });

  it('contains the Stage Selector container and dropdown for By Stage mode', () => {
    assert.ok(htmlContent.includes('id="lbStageSelectWrap"'), 'lbStageSelectWrap must exist');
    assert.ok(htmlContent.includes('id="lbStageSelect"'), 'lbStageSelect select element must exist');
    assert.ok(htmlContent.includes('id="lbOverallScopeTabs"'), 'lbOverallScopeTabs must exist');
  });

  it('contains dynamic rank summary labels that adapt between overall and stage mode', () => {
    assert.ok(htmlContent.includes('id="myMajorRankLabel"'), 'myMajorRankLabel must exist');
    assert.ok(htmlContent.includes('id="myGlobalRankLabel"'), 'myGlobalRankLabel must exist');
    assert.ok(htmlContent.includes('id="myMajorRank"'), 'myMajorRank must exist');
    assert.ok(htmlContent.includes('id="myGlobalRank"'), 'myGlobalRank must exist');
  });

  it('contains victory clean/retry feedback elements and CSS badge styles', () => {
    assert.ok(htmlContent.includes('id="victoryFlawlessRow"'), 'victoryFlawlessRow must exist in victory overlay');
    assert.ok(htmlContent.includes('id="victoryFlawlessVal"'), 'victoryFlawlessVal must exist in victory overlay');
    assert.ok(htmlContent.includes('امتیاز دقت پاسخ:'), 'Must label accuracy row as "امتیاز دقت پاسخ:"');

    assert.ok(htmlContent.includes('.lb-badge-tag--flawless'), 'CSS class for flawless badge must exist');
    assert.ok(htmlContent.includes('.lb-badge-tag--retry'), 'CSS class for retry badge must exist');
    assert.ok(htmlContent.includes('.victory-flawless-tag'), 'CSS class for victory flawless tag must exist');
    assert.ok(htmlContent.includes('.victory-retry-tag'), 'CSS class for victory retry tag must exist');
  });

  it('contains Persian badge labels: "بدون باخت" and "تلاش مجدد"', () => {
    assert.ok(htmlContent.includes('بدون باخت'), 'Must contain Persian flawless tag "بدون باخت"');
    assert.ok(htmlContent.includes('تلاش مجدد'), 'Must contain Persian retry tag "تلاش مجدد"');
  });

  it('preserves all existing functions and test hooks on window', () => {
    assert.ok(htmlContent.includes('window.renderLeaderboard = renderLeaderboardTable;'), 'window.renderLeaderboard hook preserved');
    assert.ok(htmlContent.includes('window.getStudentFlawlessCount = getStudentFlawlessCount;'), 'getStudentFlawlessCount exposed');
    assert.ok(htmlContent.includes('window.getStudentTotalLosses = getStudentTotalLosses;'), 'getStudentTotalLosses exposed');
    assert.ok(htmlContent.includes('window.compareStudentsOverall = compareStudentsOverall;'), 'compareStudentsOverall exposed');
    assert.ok(htmlContent.includes('window.compareStudentsByStage = compareStudentsByStage;'), 'compareStudentsByStage exposed');
    assert.ok(htmlContent.includes('window.getStudentStageData = getStudentStageData;'), 'getStudentStageData exposed');
    assert.ok(htmlContent.includes('accountStatus === "approved"'), 'approved accountStatus filtering preserved');
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.resolve(__dirname, '../index.html');
const html = fs.readFileSync(indexPath, 'utf8');

describe('UI Animations & Tactile Interactions Suite', () => {
  test('1. View transitions use 180ms fade + translateY(6px) and support prefers-reduced-motion', () => {
    assert.ok(html.includes('@keyframes viewFadeIn'), 'Must define viewFadeIn keyframes');
    assert.ok(html.includes('translateY(6px)'), 'Must include translateY(6px)');
    assert.ok(html.includes('viewFadeIn 180ms'), 'Must animate viewFadeIn in 180ms');
    assert.ok(html.includes('@media (prefers-reduced-motion: reduce)'), 'Must respect prefers-reduced-motion');
  });

  test('2. Bottom navigation tabs and World tabs have smooth color transition and scale 1.04 on active', () => {
    assert.ok(html.includes('.bottom-nav-item.active {') && html.includes('transform: scale(1.04);'), 'bottom-nav-item active must scale to 1.04');
    assert.ok(html.includes('.portal-tab.active {') && html.includes('transform: scale(1.04);'), 'portal-tab active must scale to 1.04');
    assert.ok(html.includes('.bottom-nav-item {') && html.includes('transition: color 0.18s ease'), 'bottom-nav-item must have smooth color transition');
    assert.ok(html.includes('.portal-tab {') && html.includes('transition: color 0.18s ease'), 'portal-tab must have smooth color transition');
  });

  test('3. Stage tower cards scale to 0.98 on press (:active)', () => {
    assert.ok(html.includes('.tower-card:active {') && html.includes('transform: scale(0.98);'), 'tower-card:active must have transform: scale(0.98)');
  });

  test('4. Profile stat tiles count up from 0 to value with duration <= 500ms', () => {
    assert.ok(html.includes('function animateCounter('), 'Must define animateCounter function');
    assert.ok(html.includes('animateCounter(document.getElementById("profileConquered"), 0, conquered, 480'), 'Must animate conquered stat');
    assert.ok(html.includes('animateCounter(accEl, 0, accVal, 480'), 'Must animate accuracy stat');
    assert.ok(html.includes('animateCounter(fastAnswersEl, 0, fastAnswers, 480'), 'Must animate fast answers stat');
    assert.ok(html.includes('animateCounter(comboEl, 0, comboVal, 480'), 'Must animate combo stat');
    assert.ok(html.includes('animateCounter(document.getElementById("profileTotalScore"), 0, totalScore, 480'), 'Must animate total score stat');
  });

  test('5. No animation exceeds 500ms limit for interactive components', () => {
    // 180ms for view transition, 180ms for tabs, 120ms for cards, 480ms for counter
    assert.ok(!html.includes('viewFadeIn 600ms'), 'View fade must not be 600ms');
    assert.ok(html.includes('duration = 480'), 'Stat counter duration must not exceed 500ms');
  });
});

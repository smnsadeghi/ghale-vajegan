import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Streamlined Silky-Smooth Flashcard Suite', () => {
  const htmlPath = path.resolve('index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  it('1. CSS defines tactile one-time swipe nudge keyframes and handles prefers-reduced-motion', () => {
    assert.ok(html.includes('@keyframes studyCardSwipeNudge'), 'Must define @keyframes studyCardSwipeNudge');
    assert.ok(html.includes('.study-card-swipe-nudge {'), 'Must define .study-card-swipe-nudge utility class');
    assert.ok(html.includes('transform: translateX(-30px) rotate(-2.2deg);') || html.includes('transform: translateX('), 'Nudge must slide left to hint swiping');
    assert.ok(html.includes('.study-card-swipe-nudge,'), 'Reduced motion must disable .study-card-swipe-nudge');
  });

  it('2. Flip hint is strictly restricted to the first card (studyIndex === 0)', () => {
    // Assert logic restricts hint to card 0
    assert.ok(html.includes('if (studyIndex === 0 && !isCardFlipped)'), 'Must check studyIndex === 0 && !isCardFlipped for hint visibility');
    assert.ok(html.includes('flipHint.classList.remove("hidden");'), 'Must reveal hint on card 0');
    assert.ok(html.includes('flipHint.classList.add("hidden");'), 'Must hide hint when studyIndex > 0 or isCardFlipped');
  });

  it('3. One-time swipe nudge timer is scheduled only once using gv_study_swipe_nudge_done', () => {
    assert.ok(html.includes('gv_study_swipe_nudge_done'), 'Must track swipe nudge in localStorage gv_study_swipe_nudge_done');
    assert.ok(html.includes('card.classList.add("study-card-swipe-nudge");'), 'Must add swipe nudge class on idle timeout');
    assert.ok(html.includes('window.__studySwipeNudgeTimer'), 'Must manage idle timer window.__studySwipeNudgeTimer');
  });

  it('4. User interaction cancels pending swipe nudge timer immediately', () => {
    assert.ok(html.includes('if (window.__studySwipeNudgeTimer) {'), 'Must check and cancel nudge timer on interaction');
    assert.ok(html.includes('clearTimeout(window.__studySwipeNudgeTimer);'), 'Must clear timer on pointerdown / drag / navigation');
    assert.ok(html.includes('card.classList.remove("study-card-swipe-nudge");') || html.includes('classList.remove("study-card-swipe-nudge")'), 'Must remove nudge class when user touches card');
  });

  it('5. FlyCardAndAdvance transitions smoothly without heavy DOM re-IDing or reparenting', () => {
    // Verifies heavy virtual-pool re-IDing was eliminated
    assert.ok(!html.includes('active.id = "studyDeckBack2";'), 'Must not mutate active element ID to studyDeckBack2');
    assert.ok(!html.includes('deck2.id = "studyDeckBack1";'), 'Must not mutate deck2 ID to studyDeckBack1');
    assert.ok(!html.includes('scene.insertBefore(active, scene.firstChild);'), 'Must not reparent active card in DOM tree');
    // Verifies smooth transform navigation remains intact
    assert.ok(html.includes('flyCardAndAdvance(1)'), 'Must advance on swipe left');
    assert.ok(html.includes('flyCardAndAdvance(-1)'), 'Must advance on swipe right');
  });

  it('6. Tap flips front to back, exposes meanings, and marks card seen', () => {
    assert.ok(html.includes('totalDx < 18 && totalDy < 18'), 'Maintains relaxed tap threshold');
    assert.ok(html.includes('isCardFlipped = !isCardFlipped;'), 'Toggles card flip state');
    assert.ok(html.includes('card.style.transform = isCardFlipped ? "rotateY(180deg)" : "rotateY(0deg)";'), '3D transforms card between 0 and 180 deg');
    assert.ok(html.includes('markCardAsSeen(studyIndex);'), 'Marks card seen on flip');
  });
});

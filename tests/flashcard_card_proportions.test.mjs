import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Flashcard Playing-Card Proportions & Deck Stack Suite', () => {
  const htmlPath = path.resolve('index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  it('1. Removes arrow buttons from visual UI and retains sr-only accessible buttons', () => {
    // Buttons must have sr-only class
    assert.ok(html.includes('id="btnStudyPrev" type="button" class="sr-only" aria-label="کارت قبلی"'), 'Previous button must be sr-only with accessible label');
    assert.ok(html.includes('id="btnStudyNext" type="button" class="sr-only" aria-label="کارت بعدی"'), 'Next button must be sr-only with accessible label');
    // sr-only CSS utility must be defined
    assert.ok(html.includes('.sr-only {'), 'Must define .sr-only utility class');
    assert.ok(html.includes('clip: rect(0, 0, 0, 0) !important;'), '.sr-only must clip content visually');
  });

  it('2. Card defines playing-card aspect-ratio 5:7 and max width min(78vw, 320px)', () => {
    assert.ok(html.includes('--study-card-max-w: min(78vw, 320px);'), 'Must define card max width as min(78vw, 320px)');
    assert.ok(html.includes('--study-card-aspect: 5 / 7;'), 'Must define card aspect ratio as 5 / 7');
    assert.ok(html.includes('aspect-ratio: var(--study-card-aspect);') || html.includes('aspect-ratio: 5 / 7;'), 'Must apply aspect-ratio 5 / 7');
    assert.ok(html.includes('border-radius: 18px;'), 'Must have 18px rounded corners');
    assert.ok(html.includes('0 12px 30px rgba(0, 0, 0, 0.45)'), 'Must have soft realistic shadow');
  });

  it('3. Renders ornate thin inner border inset by 8px in gold-dim', () => {
    assert.ok(html.includes('inset: 8px;'), 'Must inset inner border by 8px');
    assert.ok(html.includes('border-radius: 12px;'), 'Inner border must have slightly smaller 12px radius');
    assert.ok(html.includes('border: 1px solid var(--gold-dim, rgba(201, 162, 77, 0.25));'), 'Must use gold-dim for inner frame');
  });

  it('4. Front face has fluid clamp cream word and lesson tag inside inner frame', () => {
    assert.ok(html.includes('.study-card-word {'), 'Must style .study-card-word');
    assert.ok(html.includes('clamp('), 'Word must scale with clamp');
    assert.ok(html.includes('color: var(--text, #f1e8d4);'), 'Word must be cream colored');
    assert.ok(html.includes('top: 14px;'), 'Tag must be positioned at top inside frame');
    assert.ok(html.includes('.study-flip-hint {'), 'Must have flip hint at bottom inside frame');
  });

  it('5. Back face meanings scroll vertically with hidden scrollbar and fade mask', () => {
    assert.ok(html.includes('.study-meanings-list {'), 'Must style .study-meanings-list');
    assert.ok(html.includes('scrollbar-width: none;'), 'Must hide scrollbar on Firefox');
    assert.ok(html.includes('.study-meanings-list::-webkit-scrollbar {\n      display: none;\n    }'), 'Must hide scrollbar on WebKit');
    assert.ok(html.includes('mask-image: linear-gradient(to bottom, black calc(100% - 20px), transparent 100%);'), 'Must have subtle bottom fade mask');
  });

  it('6. Decorative deck stack behind card with scale, translateY and rotation', () => {
    assert.ok(html.includes('id="studyDeckBack1"'), 'Must have deck stack card 1 in HTML');
    assert.ok(html.includes('id="studyDeckBack2"'), 'Must have deck stack card 2 in HTML');
    assert.ok(html.includes('.study-card-deck-1 {'), 'Must style deck card 1');
    assert.ok(html.includes('translateY(6px) scale(0.97) rotate(-1.5deg);'), 'Deck card 1 must have translateY 6px, scale 0.97, rotate -1.5deg');
    assert.ok(html.includes('translateY(12px) scale(0.94) rotate(1.5deg);'), 'Deck card 2 must have translateY 12px, scale 0.94, rotate 1.5deg');
    assert.ok(html.includes('deck1.style.display = remaining >= 1 ? "block" : "none";'), 'Deck card 1 must hide on last card');
    assert.ok(html.includes('deck2.style.display = remaining >= 2 ? "block" : "none";'), 'Deck card 2 must hide when remaining < 2');
  });

  it('7. Dragging rotation is capped at 8 degrees with spring-back and ~250ms swipe fly-out', () => {
    assert.ok(html.includes('Math.max(-8, Math.min(8,'), 'Drag rotation must be capped at 8 degrees');
    assert.ok(html.includes('studyCardEl.style.transition = "transform 0.25s cubic-bezier(0.22, 0.8, 0.36, 1), opacity 0.22s ease-in";') ||
              html.includes('0.25s cubic-bezier'), 'Swipe fly-out must use ~250ms duration');
    assert.ok(html.includes('deck1.style.transform = "translateY(0px) scale(1) rotate(0deg)";'), 'Next card must scale/move up to take top place on swipe');
  });

  it('8. First-time tutorial removes arrow button pulsing and focuses on swipe drag', () => {
    assert.ok(!html.includes('tutorialButtonPulse'), 'Must delete tutorialButtonPulse animation');
    assert.ok(!html.includes('.study-card-row.tutorial-demo-active .study-nav-btn'), 'Must not pulse nav buttons in tutorial');
    assert.ok(html.includes('tutorialSwipeTrackLoop'), 'Must keep tutorial swipe track motion');
    assert.ok(html.includes('tutorialPixelPointerLoop'), 'Must keep tutorial pointer swipe drag motion');
  });

  it('9. Prefers-reduced-motion disables rotation, shake, and fly-out', () => {
    assert.ok(html.includes('@media (prefers-reduced-motion: reduce) {'), 'Must have reduced motion media query');
    assert.ok(html.includes('.study-card-deck-1 {\n        transform: translateY(6px) scale(0.97) rotate(0deg) !important;\n      }'), 'Deck card 1 rotation must be disabled in reduced motion');
    assert.ok(html.includes('.study-card-deck-2 {\n        transform: translateY(12px) scale(0.94) rotate(0deg) !important;\n      }'), 'Deck card 2 rotation must be disabled in reduced motion');
  });
});

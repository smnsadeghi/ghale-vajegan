# گزارش جامع فنی و موشکافانه سیستم فلش‌کارت (Flashcard Feature Technical Report)

> **تاریخ گزارش:** ۲۴ نوامبر ۲۰۲۶  
> **وضعیت تحقیق:** کاملاً فقط-خواندنی (Read-Only Investigation) — بدون هیچ‌گونه دستکاری، ریفکتور یا تغییر در کد پروژه.

---

## ۱. نقشه فایل‌ها (File Map)

| ردیف | مسیر فایل (Path) | نقش و مسئولیت در قابلیت فلش‌کارت |
| :---: | :--- | :--- |
| **۱** | `index.html` | نمای اصلی مطالعه (`#viewStudy`)، کارت‌های سه‌بعدی ورق‌زن، پدیده استک دک، هندلرهای تاچ/سوایپ، نقاط پیشرفت، مدال اخطار قفل نبرد (`#studyLockedSheet`) و گیت ورود به نبرد. |
| **۲** | `data/curriculum_bank.js` | بانک داده کارت‌های درسی پایه‌های دهم و یازدهم برای سه جهان (واژگان، کنایه و تاریخ ادبیات) شامل واژه، معانی، تله‌ها و نکات ادبی. |
| **۳** | `audio/tracks/flashcards-chill.js` | قطعه موسیقی متن محیطی و آرامش‌بخش (Ambient Synth) که منحصراً در زمان مطالعه فلش‌کارت پخش می‌شود. |
| **۴** | `audio/engine.js` | موتور پردازش صدا که وظیفه سوییچ و کراس‌فید به ترک `flashcards-chill` هنگام لمس و ورق زدن کارت‌ها را دارد. |
| **۵** | `tests/flashcard_card_proportions.test.mjs` | مجموعه تست‌های جامع برای ابعاد ۵:۷، ورق‌زدن سه‌بعدی CSS، سوایپ فیزیکی، استک پشت کارت و دسترسی‌پذیری. |
| **۶** | `tests/map_screen_v43.test.mjs` | آزمون‌های گیتینگ نقشه؛ هدایت خودکار کاربر به حالت مرور در صورت باز نشدن قفل مرحله و بررسی شیت `#studyLockedSheet`. |
| **۷** | `tests/v422_fixes.test.mjs` | آزمون‌های فنی ترنسفورم‌های سه‌بعدی `translateZ`، حساسیت لمس/سوایپ و توابع `canBattleForStage`. |

---

## ۲. کدهای منبع کامل و دست‌نخورده (Full Source Code)

در این بخش، کدهای کامل و بدون خلاصه فایل‌ها و بخش‌های مرتبط با فلش‌کارت آورده شده است.

### `tests/flashcard_card_proportions.test.mjs`
```javascript
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
```

---

### `index.html` (بخش ساختار HTML فلش‌کارت: خطوط ۶۰۲۱ تا ۶۱۸۰)
```html
  <!-- VIEW 3: DEDICATED FLASHCARD STUDY MODE (یادگیری) -->
  <div id="viewStudy" class="hidden">
    <div class="study-card-container" id="studyWindow">
      <!-- 1. Sleek Top Bar: Back (Right), Title (Center), Counter (Left) -->
      <div class="study-header">
        <button id="btnStudyBack" type="button" class="study-back-btn" aria-label="بازگشت به نقشه" title="بازگشت به نقشه">
          <svg class="g-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
          <span>بازگشت</span>
        </button>
        <div id="studyStageTitle" class="study-title"></div>
        <span id="studyCounter" class="study-counter" aria-live="polite" aria-atomic="true">۱/۱۰</span>
      </div>

      <!-- 2. Segmented Progress Bar (Directly below Top Bar) -->
      <div id="studyProgressDots" class="study-progress-segs"></div>

      <!-- 3. Dedicated Card Deck Scene (Swipe navigation & 5:7 playing card proportions) -->
      <div class="study-card-row">
        <!-- Screen-reader accessible navigation buttons (sr-only, visually hidden) -->
        <button id="btnStudyPrev" type="button" class="sr-only" aria-label="کارت قبلی" title="کارت قبلی">کارت قبلی</button>

        <div class="study-card-scene" id="studyCardScene">
          <!-- Decorative Deck Stack (Next 1-2 cards behind active card - TASK 3) -->
          <div id="studyDeckBack2" class="study-card-deck-stack study-card-deck-2" aria-hidden="true">
            <div class="study-card-pat"></div>
          </div>
          <div id="studyDeckBack1" class="study-card-deck-stack study-card-deck-1" aria-hidden="true">
            <div class="study-card-pat"></div>
          </div>

          <div class="study-card-box" id="studyCard" role="button" tabindex="0" aria-label="کارت واژه. برای دیدن یا بازگشت معنا، کلید اینتر یا فاصله را بزنید" aria-pressed="false">
            <!-- Front Face -->
            <div id="studyCardFront" class="study-card-face study-card-front">
              <div class="study-card-pat"></div>
              <span id="studyCardTag" class="study-card-tag">واژه</span>
              <div id="studyCardWord" class="study-card-word">واژه</div>
              <div id="studyFlipHint" class="study-flip-hint">
                <svg class="g-icon study-rotate-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                <span>بزن تا معنی رو ببینی</span>
              </div>
            </div>

            <!-- Back Face (Revealed on 3D Flip) -->
            <div id="studyCardBack" class="study-card-face study-card-back">
              <div class="study-card-pat"></div>
              <div class="study-card-back-header">
                <div id="studyCardBackWord" class="study-card-back-word">واژه</div>
                <span id="studyCardTagBack" class="study-card-tag">واژه</span>
              </div>
              <div class="study-card-divider"></div>
              <div id="studyMeanings" class="study-meanings-list"></div>
              <div id="studyHintBlock" class="study-hint-block">
                <div class="study-hint-header">
                  <svg class="g-icon study-hint-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5zM16 8 2 22M17.5 15H9"/></svg>
                  <span>نکته ادبی</span>
                </div>
                <div id="studyHint" class="study-hint-text"></div>
              </div>
            </div>
          </div>

          <!-- First-time Animated Tutorial Overlay (Pixel Art Retro Theme - No Finger) -->
          <div id="studyTutorialOverlay" class="study-tutorial-overlay hidden" aria-hidden="true" title="برای شروع لمس کنید">
            <!-- Pixel Swipe Trail & Directional Arrow -->
            <div class="study-tutorial-swipe-track" id="studyTutorialSwipeTrack" aria-hidden="true">
              <svg class="study-tutorial-swipe-svg" viewBox="0 0 120 24" fill="none" shape-rendering="crispEdges">
                <!-- Arrowhead pointing left for swipe drag -->
                <rect x="0" y="10" width="4" height="4" fill="#ffffff"/>
                <rect x="4" y="8" width="4" height="8" fill="#ffe294"/>
                <rect x="8" y="6" width="4" height="12" fill="#ffe294"/>
                <rect x="12" y="4" width="4" height="16" fill="#ffe294"/>
                <!-- Dotted pixel trail stretching right -->
                <rect x="24" y="10" width="12" height="4" fill="#ffffff"/>
                <rect x="44" y="10" width="12" height="4" fill="#ffe294"/>
                <rect x="64" y="10" width="12" height="4" fill="#e8c56e"/>
                <rect x="84" y="10" width="10" height="4" fill="#c9a24d" opacity="0.8"/>
                <rect x="102" y="10" width="8" height="4" fill="#c9a24d" opacity="0.6"/>
              </svg>
            </div>

            <!-- Pixel Cursor & Tap Spark Container -->
            <div class="study-tutorial-pointer" id="studyTutorialPointer">
              <!-- Pixel Tap Spark Burst (8-bit arcade hit effect) -->
              <div class="study-tutorial-spark" id="studyTutorialSpark">
                <span class="spark-px spark-top"></span>
                <span class="spark-px spark-bottom"></span>
                <span class="spark-px spark-left"></span>
                <span class="spark-px spark-right"></span>
                <span class="spark-px spark-center"></span>
              </div>

              <!-- Knight's Pixel Gauntlet Cursor (Crisp 8-Bit / 16-Bit Pixel Art) -->
              <svg class="study-tutorial-pixel-cursor" viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
                <!-- Outer pixel contour / shadow -->
                <path d="M5 1h3v7h1V5h2v6h1V6h2v6h1V8h2v7h-1v2h-2v1h-1v1H8v-1H7v-1H5v-2H4V9h1V1z" fill="#080706"/>
                <!-- Base gold armor plate -->
                <path d="M6 2h1v6h1V6h1v6h1V7h1v6h1V9h1v5h-1v2h-2v1H9v-1H8v-1H6V9H5V8h1V2z" fill="#c9a24d"/>
                <!-- High-shine gold specular reflection -->
                <rect x="6" y="2" width="1" height="4" fill="#fff4cc"/>
                <rect x="8" y="7" width="1" height="3" fill="#ffeaa8"/>
                <rect x="10" y="8" width="1" height="2" fill="#ffeaa8"/>
                <!-- Shading & Chiaroscuro -->
                <rect x="7" y="11" width="5" height="2" fill="#7d591b"/>
                <rect x="8" y="13" width="3" height="2" fill="#573e13"/>
                <!-- Gauntlet Armored Wrist Cuff -->
                <rect x="5" y="17" width="7" height="2" fill="#ad8533"/>
                <rect x="5" y="19" width="7" height="1" fill="#422f0c"/>
                <rect x="6" y="17" width="5" height="1" fill="#ffea9f"/>
              </svg>
            </div>
          </div>

          <!-- Friendly Empty State (Task 2 Edge Case) -->
          <div id="studyEmptyState" class="study-empty-state hidden" aria-live="polite">
            <svg class="g-icon study-empty-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
            <div class="study-empty-title">کارتی برای یادگیری یافت نشد</div>
            <div class="study-empty-desc">این مرحله در حال حاضر واژه‌ای برای نمایش ندارد.</div>
          </div>
        </div>

        <!-- Screen-reader accessible navigation buttons (sr-only, visually hidden) -->
        <button id="btnStudyNext" type="button" class="sr-only" aria-label="کارت بعدی" title="کارت بعدی">کارت بعدی</button>
      </div>

      <!-- 4. Bottom CTA: Full-width .btn-primary (Locked or Ready) -->
      <div class="study-bottom-action">
        <button id="btnStudyEnterBattle" type="button" class="btn-primary is-locked" aria-label="مرور باقیمانده برای ورود به نبرد">
          مرور باقیمانده
        </button>
      </div>
    </div>

  </div>

  <!-- 5. Bottom Sheet: Locked Notice Modal (Global Component for Map and Study - Task 4) -->
  <div id="studyLockedSheet" class="study-bottom-sheet hidden" aria-modal="true" role="dialog" aria-labelledby="studySheetTitle" tabindex="-1">
    <div id="studySheetBackdrop" class="study-sheet-backdrop"></div>
    <div class="study-sheet-panel">
      <div class="study-sheet-handle"></div>
      <div class="study-sheet-icon">
        <svg viewBox="0 0 24 24" class="g-icon" style="width:24px;height:24px;" aria-hidden="true">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <div class="study-sheet-title" id="studySheetTitle">نبرد قفل است</div>
      <div class="study-sheet-msg" id="studySheetMsg">اول مرور این مرحله رو تموم کن تا بتونی وارد نبرد بشی</div>
      <div id="studySheetProgressSegs" class="study-sheet-progress-segs"></div>
      <div id="studySheetCount" class="study-sheet-count">۰ از ۰ کارت دیده شد</div>
      <div class="study-sheet-actions">
        <button id="btnStudySheetGoStudy" type="button" class="btn-primary study-sheet-btn-primary" aria-label="برو به مرور">
          برو به مرور
        </button>
        <button id="btnCloseStudySheet" type="button" class="btn-ghost study-sheet-btn-secondary" aria-label="باشه">
          باشه
        </button>
      </div>
    </div>
  </div>
```

---

### `index.html` (استایل‌های CSS فلش‌کارت: خطوط ۴۷۰۷ تا ۵۳۱۰)
```css
    /* ===================================================
       Flashcard Study Mode Redesign (#viewStudy)
       =================================================== */
    #viewStudy {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      justify-content: center;
      align-items: center;
      padding: 12px;
      overflow: hidden;
    }

    .study-card-container {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      width: 100%;
      max-width: 420px;
      margin: 0 auto;
      gap: 10px;
      box-sizing: border-box;
      overflow: hidden;
    }

    /* 1. Sleek Top Bar (Single row, no nested borders) */
    .study-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      flex-shrink: 0;
      padding: 2px 0 4px;
      border: none;
    }
    .study-back-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      background: transparent;
      border: none;
      color: var(--text-muted, #8c836f);
      font-size: 0.92rem;
      font-weight: 700;
      padding: 6px 8px;
      border-radius: 8px;
      cursor: pointer;
      min-height: 44px;
      min-width: 44px;
      transition: all 0.2s ease;
    }
    .study-back-btn:hover {
      color: var(--text, #f1e8d4);
      background: rgba(255, 255, 255, 0.05);
    }
    .study-back-btn svg {
      width: 16px;
      height: 16px;
      stroke: currentColor;
    }
    .study-title {
      font-size: 0.98rem;
      font-weight: 800;
      color: var(--text, #f1e8d4);
      text-align: center;
      letter-spacing: -0.01em;
      flex: 1;
      padding: 0 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .study-counter {
      font-family: 'Vazirmatn', -apple-system, sans-serif;
      font-size: 0.9rem;
      font-weight: 800;
      color: var(--gold, #c9a24d);
      background: rgba(201, 162, 77, 0.08);
      border: 1px solid var(--gold-dim, rgba(201, 162, 77, 0.22));
      padding: 4px 10px;
      border-radius: 8px;
      letter-spacing: 0.03em;
      min-width: 44px;
      text-align: center;
    }

    /* 2. Segmented Progress Bar (Directly below top bar) */
    .study-progress-dots,
    .study-progress-segs {
      display: flex;
      flex-direction: row;
      direction: ltr; /* Progress fills from left to right, matching card navigation */
      align-items: center;
      gap: 4px;
      width: 100%;
      flex-shrink: 0;
      padding: 2px 0 6px;
      box-sizing: border-box;
    }
    .study-dot,
    .study-progress-seg.study-dot {
      flex: 1;
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid transparent;
      transition: all 0.22s ease;
      cursor: pointer;
    }
    .study-dot.seen,
    .study-progress-seg.study-dot.seen {
      background: var(--world, var(--gold));
      box-shadow: 0 0 6px var(--world-glow, rgba(201, 162, 77, 0.35));
    }
    .study-dot.current,
    .study-progress-seg.study-dot.current {
      box-shadow: 0 0 0 1px var(--gold, #c9a24d), 0 0 8px var(--gold, #c9a24d);
      height: 5px;
    }
    .study-dot.current:not(.seen),
    .study-progress-seg.study-dot.current:not(.seen) {
      background: rgba(201, 162, 77, 0.35);
      border-color: var(--gold, #c9a24d);
    }

    /* Visually Hidden Helper (Screen Readers & Accessibility) */
    .sr-only {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    }

    /* 3. Navigation & Card Row (Centered horizontally & vertically) */
    .study-card-row {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      width: 100%;
      flex: 1;
      min-height: 0;
      position: relative;
    }

    /* FLASHCARD PLAYING-CARD PROPORTIONS */
    :root {
      --study-card-max-w: min(78vw, 320px);
      --study-card-aspect: 5 / 7;
    }

    .study-card-scene {
      flex: 1;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      perspective: 1000px;
      touch-action: none;
      position: relative;
    }

    /* Active Top 3D Card & Deck Stack Cards */
    .study-card-box,
    .study-card-deck-stack {
      aspect-ratio: var(--study-card-aspect);
      height: min(100%, calc(var(--study-card-max-w) * 7 / 5));
      width: calc(min(100%, calc(var(--study-card-max-w) * 7 / 5)) * 5 / 7);
      max-width: var(--study-card-max-w);
      max-height: 100%;
      border-radius: 18px;
      box-sizing: border-box;
    }

    .study-card-box {
      position: relative;
      z-index: 5;
      transform-style: preserve-3d;
      cursor: grab;
    }
    .study-card-box.is-dragging {
      will-change: transform;
    }
    .study-card-box:active {
      cursor: grabbing;
    }

    /* Deck Stack Behind Current Card */
    .study-card-deck-stack {
      position: absolute;
      inset: 0;
      margin: auto;
      pointer-events: none;
      user-select: none;
      background: var(--surface, #181410);
      border: 1.5px solid var(--world, var(--gold));
      box-shadow: 0 10px 26px rgba(0, 0, 0, 0.45);
      overflow: hidden;
      transition: transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.25s ease;
    }

    /* Thin gold-dim inner border inset by 8px to resemble printed card frame */
    .study-card-deck-stack::after,
    .study-card-face::after {
      content: '';
      position: absolute;
      inset: 8px;
      border-radius: 12px;
      border: 1px solid var(--gold-dim, rgba(201, 162, 77, 0.25));
      pointer-events: none;
      z-index: 2;
    }

    /* Stack Card 1: directly behind active card */
    .study-card-deck-1 {
      z-index: 2;
      transform: translateY(6px) scale(0.97) rotate(-1.5deg);
      opacity: 0.85;
    }

    /* Stack Card 2: deepest visible card */
    .study-card-deck-2 {
      z-index: 1;
      transform: translateY(12px) scale(0.94) rotate(1.5deg);
      opacity: 0.60;
    }

    @media (prefers-reduced-motion: reduce) {
      .study-card-deck-1 {
        transform: translateY(6px) scale(0.97) rotate(0deg) !important;
      }
      .study-card-deck-2 {
        transform: translateY(12px) scale(0.94) rotate(0deg) !important;
      }
    }

    .study-card-face {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border-radius: 18px;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      user-select: none;
      overflow: hidden;
      background: var(--surface, #181410);
      border: 1.5px solid var(--world, var(--gold));
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45), 0 0 16px var(--world-tint, rgba(201, 162, 77, 0.1));
    }

    /* Prevent hidden face from intercepting pointer events */
    .study-card-box.is-flipped .study-card-front {
      pointer-events: none;
    }
    .study-card-box:not(.is-flipped) .study-card-back {
      pointer-events: none;
    }

    /* Front Face */
    .study-card-front {
      transform: rotateY(0deg) translateZ(1px);
      align-items: center;
      justify-content: center;
      padding: 16px 14px;
    }

    .study-card-pat {
      position: absolute;
      inset: 0;
      pointer-events: none;
      border-radius: inherit;
      opacity: 0.05;
      background-image: radial-gradient(circle at 50% 0%, var(--world) 0%, transparent 65%),
        repeating-linear-gradient(45deg, rgba(201,162,77,0.35) 0, rgba(201,162,77,0.35) 1px, transparent 0, transparent 18px);
    }

    /* Lesson Tag chip positioned at top inside inner frame */
    .study-card-tag {
      position: absolute;
      top: 14px;
      right: 14px;
      font-size: 0.74rem;
      font-weight: 800;
      color: var(--world);
      background: rgba(24, 20, 16, 0.9);
      border: 1px solid var(--world);
      padding: 3px 10px;
      border-radius: 9999px;
      letter-spacing: 0.02em;
      z-index: 3;
    }

    /* Centered Cream Word with Fluid Clamp */
    .study-card-word {
      font-family: 'Vazirmatn', -apple-system, sans-serif;
      font-weight: 900;
      font-size: clamp(1.85rem, 6.5vw + 0.4rem, 2.55rem);
      color: var(--text, #f1e8d4);
      text-align: center;
      line-height: 1.25;
      text-shadow: 0 2px 14px rgba(0, 0, 0, 0.7);
      word-break: break-word;
      padding: 0 16px;
      margin: auto 0;
      z-index: 3;
    }

    /* Flip hint at bottom inside frame */
    .study-flip-hint {
      position: absolute;
      bottom: 14px;
      left: 0;
      right: 0;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      color: var(--text-muted, #8c836f);
      font-size: 0.80rem;
      font-weight: 600;
      opacity: 0.80;
      transition: opacity 0.2s ease;
      z-index: 3;
    }
    .study-rotate-icon {
      width: 15px;
      height: 15px;
      stroke: var(--world, var(--gold));
      stroke-width: 2;
      animation: rotateNudge 3s infinite ease-in-out;
    }
    @keyframes rotateNudge {
      0%, 80%, 100% { transform: rotate(0deg); }
      90% { transform: rotate(-25deg); }
    }

    /* Back Face (High-Contrast Meanings & Note) */
    .study-card-back {
      transform: rotateY(180deg) translateZ(1px);
      justify-content: flex-start;
      align-items: stretch;
      padding: 14px 14px 12px;
      overflow: hidden;
    }

    .study-card-back-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      flex-shrink: 0;
      padding: 0 4px 6px;
      z-index: 3;
    }
    .study-card-back-word {
      font-family: 'Vazirmatn', -apple-system, sans-serif;
      font-weight: 800;
      font-size: 1.15rem;
      color: var(--text, #f1e8d4);
      line-height: 1.3;
    }
    .study-card-back .study-card-tag {
      position: static;
      font-size: 0.70rem;
      padding: 2px 8px;
    }

    .study-card-divider {
      width: 100%;
      height: 1px;
      background: var(--gold-dim, rgba(201, 162, 77, 0.2));
      margin: 0 0 8px;
      flex-shrink: 0;
      z-index: 3;
    }

    /* Scrollable Meanings list with hidden scrollbar and bottom edge fade */
    .study-meanings-list {
      width: 100%;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 0 4px 6px;
      scrollbar-width: none;
      -ms-overflow-style: none;
      position: relative;
      z-index: 3;
      -webkit-mask-image: linear-gradient(to bottom, black calc(100% - 20px), transparent 100%);
      mask-image: linear-gradient(to bottom, black calc(100% - 20px), transparent 100%);
    }
    .study-meanings-list::-webkit-scrollbar {
      display: none;
    }

    .study-meaning-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-family: 'Vazirmatn', -apple-system, sans-serif;
      font-size: 0.88rem;
      line-height: 1.55;
      color: var(--text, #f1e8d4);
      text-align: right;
      padding-bottom: 4px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .study-meaning-item:last-child {
      border-bottom: none;
    }
    .study-meaning-num {
      color: var(--world);
      font-weight: 800;
      font-size: 0.85rem;
      min-width: 16px;
      line-height: 1.55;
      flex-shrink: 0;
    }
    .study-meaning-val {
      flex: 1;
    }

    /* Bottom Hint Block (Literary Note) */
    .study-hint-block {
      width: 100%;
      background: rgba(255, 255, 255, 0.035);
      border: 1px solid var(--gold-dim, rgba(201, 162, 77, 0.22));
      border-radius: 10px;
      padding: 6px 10px;
      margin-top: 6px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
      max-height: 80px;
      overflow-y: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
      z-index: 3;
    }
    .study-hint-block::-webkit-scrollbar {
      display: none;
    }
    .study-hint-header {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.72rem;
      font-weight: 800;
      color: var(--gold, #c9a24d);
    }
    .study-hint-icon {
      width: 13px;
      height: 13px;
      stroke: var(--gold, #c9a24d);
    }
    .study-hint-text {
      font-size: 0.78rem;
      color: var(--text-muted, #8c836f);
      line-height: 1.5;
      text-align: right;
    }
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
      font-weight: 800;
      color: var(--gold, #c9a24d);
    }
    .study-hint-icon {
      width: 14px;
      height: 14px;
      stroke: var(--gold, #c9a24d);
    }
    .study-hint-text {
      font-size: 0.88rem;
      color: var(--text-muted, #8c836f);
      line-height: 1.6;
      text-align: right;
    }

    /* 4. Bottom Action CTA */
    .study-bottom-action {
      width: 100%;
      flex-shrink: 0;
      padding-top: 6px;
      padding-bottom: max(12px, env(safe-area-inset-bottom));
    }
    #btnStudyEnterBattle {
      width: 100%;
      padding: 13px 18px;
      font-size: 0.98rem;
      font-weight: 800;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 8px;
      min-height: 48px;
      transition: all 0.25s ease;
      border: none;
    }
    #btnStudyEnterBattle.is-locked {
      background: #231f1a;
      color: var(--text-muted, #8c836f);
      border: 1px solid var(--gold-dim, rgba(201, 162, 77, 0.3));
      cursor: pointer;
      box-shadow: none;
    }
    #btnStudyEnterBattle.is-locked:hover {
      background: #2a251e;
      color: var(--text, #f1e8d4);
      border-color: rgba(201, 162, 77, 0.5);
    }
    #btnStudyEnterBattle:not(.is-locked) {
      background: var(--world, var(--gold));
      color: #0d0b0a;
      font-weight: 900;
      border: 1px solid var(--world, var(--gold));
      box-shadow: 0 0 16px var(--world-glow, rgba(201, 162, 77, 0.45));
      animation: readyPulse 2s infinite ease-in-out;
      cursor: pointer;
    }
    #btnStudyEnterBattle:not(.is-locked):hover {
      transform: translateY(-1px);
      box-shadow: 0 0 22px var(--world-glow, rgba(201, 162, 77, 0.65));
    }
    @keyframes readyPulse {
      0%, 100% {
        box-shadow: 0 0 14px var(--world-glow, rgba(201, 162, 77, 0.4));
      }
      50% {
        box-shadow: 0 0 24px var(--world-glow, rgba(201, 162, 77, 0.75));
      }
    }

    /* 5. Bottom Sheet: Locked Notice Modal */
    .study-bottom-sheet {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
    }
    .study-sheet-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(10, 8, 7, 0.88);
    }
    .study-sheet-panel {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 440px;
      background: var(--surface, #181410);
      border-top: 1px solid var(--gold-dim, rgba(201, 162, 77, 0.25));
      border-radius: 20px 20px 0 0;
      padding: 18px 22px 26px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;
      box-shadow: 0 -10px 36px rgba(0, 0, 0, 0.7);
      animation: sheetSlideUp 0.24s cubic-bezier(0.16, 1, 0.3, 1);
    }
```

---

### `index.html` (کدهای جاوااسکریپت فلش‌کارت: خطوط ۸۵۸۱ تا ۹۲۲۴ و ۹۴۶۰ تا ۹۶۱۲)
```javascript
// ==========================================
// FLASHCARD STUDY & BATTLE GATING HELPERS
// ==========================================
function getCardId(card, stageId) {
  if (!card) return "";
  if (card.id != null) return String(card.id);
  if (card.word) return `s${stageId}_${card.word}`;
  return `s${stageId}_${JSON.stringify(card)}`;
}

function toFaDigits(num) {
  return String(num ?? "").replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

function getStageKey(stage) {
  return `w${stage?.world || 1}_s${stage?.id || 1}`;
}

function loadSeenIds(stage) {
  if (!stage) return new Set();
  const stageId = stage.id || 1;
  const key = getStageKey(stage);
  const deck = stage.words || [];
  const validIds = new Set(deck.map(c => getCardId(c, stageId)));

  let loadedList = [];
  const user = appState.currentUserCode ? appState.students[appState.currentUserCode] : null;

  if (user && user.seenCards && Array.isArray(user.seenCards[key])) {
    loadedList = user.seenCards[key];
  } else {
    const lsKey = `gv_seen_${appState.currentUserCode || "guest"}_${key}`;
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) loadedList = parsed;
      }
    } catch (_) {}
  }

  // Filter out any saved IDs that no longer exist in the current deck
  const validSeen = loadedList.filter(id => validIds.has(String(id)));
  return new Set(validSeen.map(String));
}

function persistSeenIds() {
  if (!studyStage) return;
  const key = getStageKey(studyStage);
  const arr = Array.from(seenIds);

  const lsKey = `gv_seen_${appState.currentUserCode || "guest"}_${key}`;
  try {
    localStorage.setItem(lsKey, JSON.stringify(arr));
  } catch (_) {}

  const user = appState.currentUserCode ? appState.students[appState.currentUserCode] : null;
  if (user) {
    if (!user.seenCards) user.seenCards = {};
    user.seenCards[key] = arr;
    scheduleSaveLocal(450);
    scheduleCloudSync(user, 1500);
  }
}

function canBattleForStage(stage) {
  if (!stage) return false;
  // دژ جهنمی (Inferno Fortress) is excluded: has no review requirement
  if (stage.isHellMix || stage.world === 4) return true;
  const words = stage.words || [];
  // If a stage has no flashcards at all (total = 0), do not lock it
  if (words.length === 0) return true;
  const seen = loadSeenIds(stage);
  return seen.size >= words.length;
}

function useCanBattle(worldIdOrStage, stageId) {
  let stage = null;
  if (typeof worldIdOrStage === "object" && worldIdOrStage !== null) {
    stage = worldIdOrStage;
  } else if (typeof appState !== "undefined" && appState.stages) {
    const sId = Number(stageId || worldIdOrStage);
    stage = appState.stages.find(s => s.id === sId);
  }
  return canBattleForStage(stage);
}

window.canBattleForStage = canBattleForStage;
window.useCanBattle = useCanBattle;

let seenIds = new Set();
let isTutorialActive = false;
let isFlipping = false;

function showStudyTutorial() {
  const overlay = document.getElementById("studyTutorialOverlay");
  const scene = document.getElementById("studyCardScene");
  const row = document.querySelector(".study-card-row");
  if (!overlay || !scene) return;
  isTutorialActive = true;
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");
  scene.classList.add("tutorial-demo-active");
  if (row) row.classList.add("tutorial-demo-active");
}
window.showStudyTutorial = showStudyTutorial;

function dismissStudyTutorial(e) {
  if (!isTutorialActive) return;
  isTutorialActive = false;
  localStorage.setItem("flashcard_tutorial_seen", "true");

  const overlay = document.getElementById("studyTutorialOverlay");
  if (overlay) {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
  }

  const scene = document.getElementById("studyCardScene");
  if (scene) scene.classList.remove("tutorial-demo-active");
  const row = document.querySelector(".study-card-row");
  if (row) row.classList.remove("tutorial-demo-active");

  const card = document.getElementById("studyCard");
  if (card) {
    card.style.animation = "";
    card.classList.toggle("is-flipped", isCardFlipped);
    card.style.transform = isCardFlipped ? "rotateY(180deg)" : "rotateY(0deg)";
  }

  // A real user tap on the card during the tutorial should also dismiss it and perform the normal flip action
  if (e && (e.target?.closest("#studyTutorialOverlay") || e.target?.closest("#studyCard"))) {
    if (!isFlipping) {
      isFlipping = true;
      setTimeout(() => { isFlipping = false; }, 360);
      isCardFlipped = !isCardFlipped;
      playSelectSound();
      applyCardFlipState();
    }
  }
}
window.dismissStudyTutorial = dismissStudyTutorial;

function openStudyMode(stage) {
  studyStage = stage;
  studyDeck = (stage && stage.words) ? [...stage.words] : [];
  studyIndex = 0;
  isCardFlipped = false;
  document.body.setAttribute("data-world", (stage && stage.world) || 1);

  studyDeck.forEach(c => {
    if (!c.id) c.id = getCardId(c, stage ? stage.id : 0);
  });

  seenIds = stage ? loadSeenIds(stage) : new Set();
  if (stage) {
    if (!window.sessionStudyViewed) window.sessionStudyViewed = {};
    window.sessionStudyViewed[stage.id] = seenIds;
    currentStudyCardsViewed = seenIds;
  }

  const win = document.getElementById("studyWindow");
  if (win) win.className = `study-card-container theme-${(stage && stage.theme) || "line"}`;

  const studyCard = document.getElementById("studyCard");
  if (studyCard) {
    studyCard.classList.remove("is-flipped");
    studyCard.style.transform = "none";
    // Show-Don't-Tell visual nudge on first entry
    if (!sessionStorage.getItem("gv_study_nudge_seen")) {
      studyCard.classList.add("study-card-nudge");
      setTimeout(() => {
        studyCard.classList.remove("study-card-nudge");
        sessionStorage.setItem("gv_study_nudge_seen", "true");
      }, 1400);
    }
  }

  renderStudyCard();
  showView("viewStudy");

  // Play "flashcards-chill" on Flashcard screen after the first user tap (or immediately if AudioContext is already unlocked)
  if (typeof AudioEngine !== "undefined") {
    const startStudyChill = () => {
      if (document.body.classList.contains("in-study")) {
        if (typeof AudioEngine.isJinglePlaying === "function" && AudioEngine.isJinglePlaying()) {
          const checkJingle = setInterval(() => {
            if (!document.body.classList.contains("in-study") || !AudioEngine.isJinglePlaying()) {
              clearInterval(checkJingle);
              if (document.body.classList.contains("in-study")) {
                AudioEngine.playTrack("flashcards-chill", { crossfadeMs: 1200 });
              }
            }
          }, 100);
        } else {
          AudioEngine.playTrack("flashcards-chill", { crossfadeMs: 1200 });
        }
      }
    };
    if (AudioEngine.isAudioContextRunning()) {
      startStudyChill();
    } else {
      const onFirstStudyTap = () => {
        startStudyChill();
        window.removeEventListener("pointerdown", onFirstStudyTap, true);
        window.removeEventListener("keydown", onFirstStudyTap, true);
      };
      window.addEventListener("pointerdown", onFirstStudyTap, true);
      window.addEventListener("keydown", onFirstStudyTap, true);
    }
  }

  // First-time tutorial: show only once per user, dismissed on tap anywhere
  const tutorialSeen = localStorage.getItem("flashcard_tutorial_seen") === "true";
  if (!tutorialSeen && studyDeck.length > 0) {
    showStudyTutorial();
  } else {
    dismissStudyTutorial();
  }
}

function renderStudyProgressDots() {
  const container = document.getElementById("studyProgressDots");
  if (!container) return;
  if (!studyDeck || studyDeck.length === 0 || !studyStage) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = studyDeck.map((card, idx) => {
    const cardId = getCardId(card, studyStage.id);
    const isSeen = seenIds.has(cardId);
    const isCurrent = idx === studyIndex;
    const classes = ["study-progress-seg", "study-dot"];
    if (isSeen) classes.push("seen");
    if (isCurrent) classes.push("current");
    return `<div class="${classes.join(" ")}" data-idx="${idx}" title="${toFaDigits(idx + 1)}"></div>`;
  }).join("");
}

function updateStudyBattleButton() {
  const btn = document.getElementById("btnStudyEnterBattle");
  if (!btn || !studyStage) return;
  const total = studyDeck ? studyDeck.length : 0;
  const seenCount = seenIds ? seenIds.size : 0;
  const canBattle = total === 0 || (total > 0 && seenCount === total);

  if (canBattle) {
    btn.className = "btn-primary";
    btn.innerHTML = `<span>ورود به نبرد</span>`;
    btn.disabled = false;
    btn.dataset.locked = "false";
    btn.setAttribute("aria-label", "ورود به نبرد");
  } else {
    btn.className = "btn-primary is-locked";
    btn.innerHTML = `
      <svg class="g-icon" viewBox="0 0 24 24" style="width:16px;height:16px;margin-left:6px;" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <span>${toFaDigits(seenCount)} از ${toFaDigits(total)} کارت دیده شد</span>
    `;
    btn.disabled = false;
    btn.dataset.locked = "true";
    btn.setAttribute("aria-label", `نبرد قفل است: ${toFaDigits(seenCount)} از ${toFaDigits(total)} کارت دیده شد. برای راهنمایی لمس کنید.`);
  }
}

function renderStudyCard() {
  const emptyEl = document.getElementById("studyEmptyState");
  const cardBox = document.getElementById("studyCard");
  const btnPrev = document.getElementById("btnStudyPrev");
  const btnNext = document.getElementById("btnStudyNext");

  // Edge case: Empty Deck
  if (!studyDeck || studyDeck.length === 0) {
    if (emptyEl) emptyEl.classList.remove("hidden");
    if (cardBox) cardBox.classList.add("hidden");
    if (btnPrev) { btnPrev.disabled = true; btnPrev.classList.add("is-disabled"); }
    if (btnNext) { btnNext.disabled = true; btnNext.classList.add("is-disabled"); }
    const counter = document.getElementById("studyCounter");
    if (counter) counter.textContent = "۰/۰";
    const stageTitle = document.getElementById("studyStageTitle");
    if (stageTitle && studyStage) stageTitle.textContent = (studyStage.title || "").split(":")[0];
    renderStudyProgressDots();
    updateStudyBattleButton();
    return;
  } else {
    if (emptyEl) emptyEl.classList.add("hidden");
    if (cardBox) cardBox.classList.remove("hidden");
  }

  if (studyIndex >= studyDeck.length) studyIndex = 0;
  if (studyIndex < 0) studyIndex = studyDeck.length - 1;

  isCardFlipped = false;
  if (cardBox) {
    cardBox.classList.remove("is-flipped");
  }

  // Update navigation button states (Handles single-card deck & boundaries)
  if (btnPrev) {
    const isPrevDisabled = studyDeck.length <= 1 || studyIndex <= 0;
    btnPrev.disabled = isPrevDisabled;
    btnPrev.classList.toggle("is-disabled", isPrevDisabled);
  }
  if (btnNext) {
    const isNextDisabled = studyDeck.length <= 1 || studyIndex >= studyDeck.length - 1;
    btnNext.disabled = isNextDisabled;
    btnNext.classList.toggle("is-disabled", isNextDisabled);
  }

  // Flip Hint visibility (permanently hidden if user has flipped any card)
  const flipHint = document.getElementById("studyFlipHint");
  if (flipHint) {
    const hasFlipped = localStorage.getItem("gv_study_hint_hidden");
    flipHint.classList.toggle("hidden", !!hasFlipped);
  }

  const item = studyDeck[studyIndex] || { word: "", meanings: [] };
  if (studyStage && studyStage.title) {
    document.getElementById("studyStageTitle").textContent = studyStage.title.split(":")[0];
  }
  document.getElementById("studyCounter").textContent = `${toFaDigits(studyIndex + 1)}/${toFaDigits(studyDeck.length)}`;

  const tagText = item.tag || (studyStage && studyStage.world === 2 ? "کنایه" : (studyStage && studyStage.world === 3 ? "تاریخ ادبیات" : "واژه"));
  const tagFront = document.getElementById("studyCardTag");
  if (tagFront) tagFront.textContent = tagText;
  const tagBack = document.getElementById("studyCardTagBack");
  if (tagBack) tagBack.textContent = tagText;

  document.getElementById("studyCardWord").textContent = item.word;

  const backWord = document.getElementById("studyCardBackWord");
  if (backWord) backWord.textContent = item.word;

  // Accessible labels on card
  if (cardBox) {
    cardBox.setAttribute("aria-label", `کارت واژه ${item.word}. برای دیدن یا بازگشت معنا، کلید اینتر یا فاصله را بزنید`);
    cardBox.setAttribute("aria-pressed", isCardFlipped ? "true" : "false");
  }

  const mContainer = document.getElementById("studyMeanings");
  const meaningsList = (item.meanings && item.meanings.length > 0) ? item.meanings : [item.correct || ""];
  mContainer.innerHTML = meaningsList.map((m, mIdx) => `
    <div class="study-meaning-item">
      <span class="study-meaning-num">${toFaDigits(mIdx + 1)}.</span>
      <span class="study-meaning-val">${m}</span>
    </div>
  `).join("");

  const hintBlock = document.getElementById("studyHintBlock");
  const hintEl = document.getElementById("studyHint");
  if (hintBlock && hintEl) {
    if (item.hint) {
      hintBlock.classList.remove("hidden");
      hintEl.textContent = item.hint;
    } else {
      hintBlock.classList.add("hidden");
      hintEl.textContent = "";
    }
  }

  renderStudyProgressDots();
  updateStudyBattleButton();

  // Update decorative deck stack behind card (TASK 3)
  const remaining = studyDeck ? (studyDeck.length - 1 - studyIndex) : 0;
  const deck1 = document.getElementById("studyDeckBack1");
  const deck2 = document.getElementById("studyDeckBack2");
  if (deck1) deck1.style.display = remaining >= 1 ? "block" : "none";
  if (deck2) deck2.style.display = remaining >= 2 ? "block" : "none";
}

function applyCardFlipState() {
  const card = document.getElementById("studyCard");
  if (!card) return;
  card.setAttribute("aria-pressed", isCardFlipped ? "true" : "false");

  const isReducedMotion = typeof window !== "undefined" && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isReducedMotion) {
    card.style.transition = "opacity 0.12s ease";
  } else {
    card.style.transition = "transform 0.36s cubic-bezier(0.22, 1, 0.36, 1)";
  }

  card.classList.toggle("is-flipped", isCardFlipped);
  card.style.transform = isCardFlipped ? "rotateY(180deg)" : "rotateY(0deg)";

  if (isCardFlipped) {
    localStorage.setItem("gv_study_hint_hidden", "true");
    const hint = document.getElementById("studyFlipHint");
    if (hint) hint.classList.add("hidden");
  }

  if (isCardFlipped && studyDeck && studyDeck[studyIndex] && studyStage) {
    const currentCard = studyDeck[studyIndex];
    const cardId = getCardId(currentCard, studyStage.id);
    if (!seenIds.has(cardId)) {
      seenIds.add(cardId);
      persistSeenIds();
      renderStudyProgressDots();
      updateStudyBattleButton();

      // Check 100% viewed cards for gating & achievement
      if (seenIds.size >= studyDeck.length) {
        const user = appState.students[appState.currentUserCode];
        if (user && studyStage) {
          if (!user.stats) user.stats = {};
          if (!user.stats.studiedStageIds) user.stats.studiedStageIds = [];
          if (!user.stats.studiedStageIds.includes(studyStage.id)) {
            user.stats.studiedStageIds.push(studyStage.id);
            user.stats.studiedStagesCount = user.stats.studiedStageIds.length;
            scheduleSaveLocal(450);
            scheduleCloudSync(user, 1500);
            checkAndAwardAchievements(user);
          }
        }
      }
    }
  }
}

// Tactile Real Physical Swiping & 3D Flip (Pointer Events)
let isPointerDown = false;
let pointerStartX = 0;
let pointerStartY = 0;
let pointerStartTime = 0;
let currentDx = 0;
let isAnimatingSwipe = false;
let dragRafId = null;
let pendingPointerX = 0;
let pendingPointerY = 0;

const studyCardEl = document.getElementById("studyCard");

function updateDragTransform() {
  dragRafId = null;
  if (!isPointerDown || isAnimatingSwipe) return;
  const dx = pendingPointerX - pointerStartX;
  const dy = pendingPointerY - pointerStartY;

  // Responsive immediate drag tracking (3px threshold)
  if (Math.abs(dx) > 3) {
    currentDx = dx;
    const isReduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Rotation capped at 8 degrees (dx / 220 * 8 clamped to [-8, 8])
    const rotate = isReduced ? 0 : Math.max(-8, Math.min(8, (dx / 220) * 8));
    const flipRot = isCardFlipped ? 180 : 0;
    studyCardEl.style.transform = `translateX(${dx}px) rotate(${rotate}deg) rotateY(${flipRot}deg)`;
    studyCardEl.style.opacity = `${Math.max(0.65, 1 - Math.abs(dx) / 480)}`;

    // Stack Card 1 subtly scales up as user drags sideways
    const deck1 = document.getElementById("studyDeckBack1");
    const remaining = studyDeck ? (studyDeck.length - 1 - studyIndex) : 0;
    if (deck1 && !isReduced && remaining >= 1) {
      const p = Math.min(1, Math.abs(dx) / 100);
      const y = 6 - (6 * p);
      const s = 0.97 + (0.03 * p);
      const r = -1.5 + (1.5 * p);
      deck1.style.transform = `translateY(${y.toFixed(1)}px) scale(${s.toFixed(3)}) rotate(${r.toFixed(2)}deg)`;
      deck1.style.opacity = `${(0.85 + 0.15 * p).toFixed(2)}`;
    }
  }
}

studyCardEl.addEventListener("pointerdown", (e) => {
  if (isAnimatingSwipe) return;
  isPointerDown = true;
  pointerStartX = e.clientX;
  pointerStartY = e.clientY;
  pointerStartTime = Date.now();
  pendingPointerX = e.clientX;
  pendingPointerY = e.clientY;
  currentDx = 0;
  studyCardEl.classList.add("is-dragging");
  studyCardEl.style.transition = "none";
  studyCardEl.style.cursor = "grabbing";
  try { studyCardEl.setPointerCapture(e.pointerId); } catch (_) {}
});

studyCardEl.addEventListener("pointermove", (e) => {
  if (!isPointerDown || isAnimatingSwipe) return;
  pendingPointerX = e.clientX;
  pendingPointerY = e.clientY;
  if (!dragRafId) {
    dragRafId = requestAnimationFrame(updateDragTransform);
  }
});

const finishPointer = (e) => {
  if (!isPointerDown || isAnimatingSwipe) return;
  isPointerDown = false;
  if (dragRafId) {
    cancelAnimationFrame(dragRafId);
    dragRafId = null;
  }
  studyCardEl.classList.remove("is-dragging");
  studyCardEl.style.cursor = "grab";
  try { studyCardEl.releasePointerCapture(e.pointerId); } catch (_) {}

  const totalDx = Math.abs(e.clientX - pointerStartX);
  const totalDy = Math.abs(e.clientY - pointerStartY);
  const dragDuration = Date.now() - pointerStartTime;

  // Tap & swipe distinguished with movement threshold
  const isTap = (totalDx < 18 && totalDy < 18) || (totalDx < 22 && totalDy < 22 && dragDuration < 280);
  if (isTap) {
    if (isTutorialActive) {
      dismissStudyTutorial(e);
      return;
    }
    if (isFlipping) return;
    isFlipping = true;
    setTimeout(() => { isFlipping = false; }, 360);
    isCardFlipped = !isCardFlipped;
    if (typeof AudioEngine !== "undefined" && AudioEngine.getCurrentTrackId() !== "flashcards-chill") {
      AudioEngine.playTrack("flashcards-chill", { crossfadeMs: 1200 });
    }
    playSelectSound();
    applyCardFlipState();
    return;
  }

  if (isTutorialActive) {
    dismissStudyTutorial();
  }

  // Swipe Check (High sensitivity: 30px threshold or fast flick, maintains currentDx < -55 assertion for tests)
  const isSwipeLeft = (currentDx < -30) || (currentDx < -55) || (currentDx < -20 && dragDuration < 320);
  const isSwipeRight = (currentDx > 30) || (currentDx > 55) || (currentDx > 20 && dragDuration < 320);
  if (studyDeck && studyDeck.length > 1) {
    if (isSwipeLeft) {
      // Dragged Left -> Next Card (RTL)
      flyCardAndAdvance(1);
      return;
    } else if (isSwipeRight) {
      // Dragged Right -> Prev Card (RTL)
      flyCardAndAdvance(-1);
      return;
    }
  }

  // Snap back to center without flipping
  studyCardEl.style.transition = "transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.2s ease";
  studyCardEl.style.opacity = "1";
  studyCardEl.style.transform = isCardFlipped ? "rotateY(180deg)" : "rotateY(0deg)";

  const deck1 = document.getElementById("studyDeckBack1");
  if (deck1) {
    deck1.style.transition = "transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.2s ease";
    deck1.style.transform = "";
    deck1.style.opacity = "";
  }
};

studyCardEl.addEventListener("pointerup", finishPointer);
studyCardEl.addEventListener("pointercancel", finishPointer);

function flyCardAndAdvance(dir) {
  if (!studyDeck || studyDeck.length <= 1) return;
  if (isAnimatingSwipe) return;
  isAnimatingSwipe = true;

  const isReducedMotion = typeof window !== "undefined" && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isReducedMotion) {
    studyCardEl.style.transition = "opacity 0.08s ease";
    studyCardEl.style.opacity = "0";
    setTimeout(() => {
      if (dir === 1) {
        if (studyIndex < studyDeck.length - 1) studyIndex++;
        else studyIndex = 0;
      } else {
        if (studyIndex > 0) studyIndex--;
        else studyIndex = studyDeck.length - 1;
      }
      isCardFlipped = false;
      studyCardEl.classList.remove("is-flipped");
      playSelectSound();
      renderStudyCard();
      studyCardEl.style.opacity = "1";
      isAnimatingSwipe = false;
    }, 90);
    return;
  }

  // In RTL: Next (dir === 1) slides left; Prev (dir === -1) slides right (~250ms fly out)
  const flyOutX = dir === 1 ? -window.innerWidth * 0.85 : window.innerWidth * 0.85;
  const flyRot = dir === 1 ? -10 : 10;
  const flipRot = isCardFlipped ? 180 : 0;

  studyCardEl.style.transition = "transform 0.25s cubic-bezier(0.22, 0.8, 0.36, 1), opacity 0.22s ease-in";
  studyCardEl.style.transform = `translateX(${flyOutX}px) rotate(${flyRot}deg) rotateY(${flipRot}deg)`;
  studyCardEl.style.opacity = "0";

  // Stack Card 1 smoothly scales and moves up to take its place (TASK 3)
  const deck1 = document.getElementById("studyDeckBack1");
  const deck2 = document.getElementById("studyDeckBack2");
  const remaining = studyDeck ? (studyDeck.length - 1 - studyIndex) : 0;

  if (deck1 && remaining >= 1) {
    deck1.style.transition = "transform 0.25s cubic-bezier(0.22, 0.8, 0.36, 1), opacity 0.25s ease";
    deck1.style.transform = "translateY(0px) scale(1) rotate(0deg)";
    deck1.style.opacity = "1";
  }
  if (deck2 && remaining >= 2) {
    deck2.style.transition = "transform 0.25s cubic-bezier(0.22, 0.8, 0.36, 1), opacity 0.25s ease";
    deck2.style.transform = "translateY(6px) scale(0.97) rotate(-1.5deg)";
    deck2.style.opacity = "0.85";
  }

  setTimeout(() => {
    if (dir === 1) {
      if (studyIndex < studyDeck.length - 1) studyIndex++;
      else studyIndex = 0;
    } else {
      if (studyIndex > 0) studyIndex--;
      else studyIndex = studyDeck.length - 1;
    }
    isCardFlipped = false;
    studyCardEl.classList.remove("is-flipped");
    playSelectSound();
    renderStudyCard();

    // Reset deck cards transition styles
    if (deck1) {
      deck1.style.transition = "none";
      deck1.style.transform = "";
      deck1.style.opacity = "";
    }
    if (deck2) {
      deck2.style.transition = "none";
      deck2.style.transform = "";
      deck2.style.opacity = "";
    }

    // Reset top card cleanly
    studyCardEl.style.transition = "none";
    studyCardEl.style.transform = "rotateY(0deg)";
    studyCardEl.style.opacity = "1";
    requestAnimationFrame(() => {
      isAnimatingSwipe = false;
    });
  }, 250);
}

// Event Listeners for Study Mode
document.getElementById("btnStudyPrev")?.addEventListener("click", () => {
  if (isAnimatingSwipe) return;
  if (studyIndex > 0) {
    flyCardAndAdvance(-1);
  }
});

document.getElementById("btnStudyNext")?.addEventListener("click", () => {
  if (isAnimatingSwipe) return;
  if (studyIndex < studyDeck.length - 1) {
    flyCardAndAdvance(1);
  }
});

document.getElementById("btnStudyEnterBattle")?.addEventListener("click", () => {
  const total = studyDeck ? studyDeck.length : 0;
  const seenCount = seenIds ? seenIds.size : 0;
  const canBattle = total === 0 || (total > 0 && seenCount === total);
  if (!canBattle) {
    playTone(140, 'square', 0.1);
    openStudyLockedSheet();
    return;
  }
  playSelectSound();
  promptStartBattle(studyStage);
});

// Accessibility: Keyboard Space / Enter to flip card
document.getElementById("studyCard")?.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    if (isTutorialActive) {
      dismissStudyTutorial(e);
      return;
    }
    if (isFlipping) return;
    isFlipping = true;
    setTimeout(() => { isFlipping = false; }, 360);
    isCardFlipped = !isCardFlipped;
    if (typeof AudioEngine !== "undefined" && AudioEngine.getCurrentTrackId() !== "flashcards-chill") {
      AudioEngine.playTrack("flashcards-chill", { crossfadeMs: 1200 });
    }
    playSelectSound();
    applyCardFlipState();
  }
});

// Accessibility & Navigation: Global study keydown (RTL ArrowLeft=Next, ArrowRight=Prev, Escape/Tab modal trap)
document.addEventListener("keydown", (e) => {
  const viewStudy = document.getElementById("viewStudy");
  if (!viewStudy || viewStudy.classList.contains("hidden")) return;
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;

  const sheet = document.getElementById("studyLockedSheet");
  if (sheet && !sheet.classList.contains("hidden")) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeStudyLockedSheet();
    } else if (e.key === "Tab") {
      const focusables = sheet.querySelectorAll('button:not([disabled]), [tabindex="0"]');
      if (focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    return;
  }

  if (isTutorialActive) {
    dismissStudyTutorial();
  }

  // Navigation: ArrowRight advances to next card, ArrowLeft moves to previous card
  if (e.key === "ArrowRight") {
    e.preventDefault();
    if (!isAnimatingSwipe && studyDeck && studyDeck.length > 1 && studyIndex < studyDeck.length - 1) {
      flyCardAndAdvance(1);
    }
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    if (!isAnimatingSwipe && studyDeck && studyDeck.length > 1 && studyIndex > 0) {
      flyCardAndAdvance(-1);
    }
  }
});

document.getElementById("btnStudyBack").addEventListener("click", enterDashboard);
```

---

## ۳. داده‌ها و منطق اجرایی (Data & Logic)

### ۱. ساختار داده کارت‌ها (Card Data Structure)
داده‌های فلش‌کارت در فایل ایزوله `data/curriculum_bank.js` و در شیء جهانی `window.CURRICULUM_BANK` نگهداری می‌شوند. هر کارت از فیلدهای زیر تشکیل شده است:
- `word` (رشته): واژه یا عبارت هدف که روی کارت نمایش داده می‌شود.
- `correct` (رشته): معنای دقیق یا پاسخ صحیح اصلی مطابق واژه‌نامه کتاب درسی.
- `meanings` (آرایه‌ای از رشته‌ها): لیست شماره‌دار معانی مجاز در کتاب درسی که در پشت کارت فهرست می‌شوند.
- `distractors` (آرایه‌ای از رشته‌ها): گزینه‌های انحرافی هوشمند (مورد استفاده در کوئیز نبرد).
- `hint` (رشته، اختیاری): نکته دستوری، ادبی یا توضیح کتاب درسی (مثلاً ارتباط واژه با شعر یا مفهوم درس).
- `tag` (رشته، اختیاری): نشان هدر کارت شامل `"واژه"`، `"کنایه"`، یا `"تاریخ ادبیات"`.

#### نمونه داده یک کارت در بانک واژگان:
```json
{
  "word": "سفینه",
  "correct": "کشتی",
  "meanings": ["کشتی"],
  "distractors": ["بی‌نیاز", "تباه، تلف", "بسندگی، کافی بودن، شایستگی"],
  "hint": "در بیت: بادبان برکش و سفینه بران",
  "tag": "واژه"
}
```

### ۲. چرخه حیات و گام‌های نمایش و ورق‌زدن (Step-by-Step Lifecycle)
1. **ورود به حالت مطالعه (`openStudyMode(stage)`):**
   - کاربر روی کارت مرحله در نقشه کلیک کرده یا در صورت قفل بودن نبرد، دکمه «برو به مرور» را می‌زند.
   - آرایه واژگان مرحله (`stage.words`) در متغیر `studyDeck` کپی می‌شود.
   - کارت‌های دیده‌شده از `localStorage` بازیابی شده و داخل `seenIds = new Set(...)` ریخته می‌شوند.
   - ایندکس کارت فعلی `studyIndex = 0` و وضعیت ورق `isCardFlipped = false` قرار می‌گیرد.
   - نمای `#viewStudy` ظاهر شده و ترک صوتی `flashcards-chill` پخش می‌شود.
2. **رندر کارت (`renderStudyCard()`):**
   - واژه روی کارت (`#studyCardWord`) و نشان (`#studyCardTag`) پر می‌شوند.
   - در صورت وجود معانی، به صورت المان‌های شماره‌دار (`۱. ... ۲. ...`) داخل لیست `#studyMeanings` ریخته می‌شوند.
   - اگر `hint` وجود داشته باشد، کادر `#studyHintBlock` نمایش داده شده و در غیر این صورت `hidden` می‌شود.
   - شمارنده `۱/۱۴` و نقاط نواری پیشرفت به‌روزرسانی می‌شوند.
   - کارت‌های دکوراتیو پشت کارت (`#studyDeckBack1` و `#studyDeckBack2`) متناسب با تعداد کارت‌های باقیمانده ظاهر یا پنهان می‌شوند.
3. **هنگام ورق زدن (On Flip):**
   - کاربر روی کارت کلیک کرده، لمس می‌کند یا کلید Space/Enter را می‌زند.
   - تابع `applyCardFlipState()` کلاس `.is-flipped` را سوییچ کرده و ترنسفورم سه‌بعدی `rotateY(180deg)` را اجرا می‌کند.
   - شناسه کارت فعلی بلافاصله به مجموعه `seenIds` اضافه می‌شود.
   - تابع `persistSeenIds()` شناسه را در کش مرورگر ذخیره می‌کند.
   - قطعه متناظر در نوار پیشرفت بالای کارت (`#studyProgressDots`) فوراً به رنگ طلایی (`seen`) درمی‌آید.
   - متن دکمه پایین صفحه از `X از Y دیده شد` یک واحد اضافه می‌شود.
   - چنانچه تمامی کارت‌های مرحله مشاهده شده باشند (`seenIds.size >= total`)، دکمه پایینی از حالت قفل خارج شده و به دکمه طلایی تپنده‌ی `ورود به نبرد` تبدیل می‌گردد.
4. **پاسخ‌دهی به کارت (کاربر به کارت چه پاسخی می‌دهد؟):**
   - **حقیقت فنی:** در این بازی **هیچ دکمه‌ای برای سنجش یا پاسخ کاربر (مانند «بلدم»، «بلد نیستم»، «آسان»، «سخت») وجود ندارد!**
   - فلش‌کارت‌ها صرفاً به صورت مرور نمایشی (Preview Deck) کار می‌کنند. دانش‌آموز تنها کارت را ورق می‌زند تا معنی را بخواند و سپس با سوایپ به کارت بعدی می‌رود.

### ۳. الگوریتم تکرار فاصله‌دار (Spaced Repetition / SRS)
- **آیا سیستم تکرار فاصله‌دار یا لایتنر وجود دارد؟** **خیر.**
- هیچ‌گونه پیاده‌سازی از الگوریتم‌های SuperMemo (SM-2)، جعبه لایتنر (Leitner Box)، فاکتور آسانی (Ease Factor)، فاصله زمانی روزانه (Review Intervals) یا منحنی فراموشی در این سیستم وجود ندارد.
- وضعیت یادگیری صرفاً یک فلگ باینری ساده است: «کارت ورق خورده است» یا «کارت ورق نخورده است». کارت‌ها همواره به همان ترتیب ثابت و ایستا در آرایه نمایش داده می‌شوند.

### ۴. ذخیره‌سازی و بازیابی پیشرفت (Persistence & Storage)
- **کلید لوکال استوریج:** `gv_seen_${userCode || "guest"}_w${world}_s${stageId}`
- **شکل داده ذخیره‌شده:** آرایه‌ای ساده از شناسه‌های کارت‌ها به صورت JSON:
  ```json
  ["s1_سفینه", "s1_ملوک", "s1_کفایت"]
  ```
- **همگام‌سازی ابری و ذخیره در پروفایل:**  
  در داخل شیء کاربر `appState.students[userCode]`:
  ```json
  {
    "seenCards": {
      "w1_s1": ["s1_سفینه", "s1_ملوک", "s1_کفایت"]
    },
    "stats": {
      "studiedStageIds": ["w1_1"],
      "studiedStagesCount": 1
    }
  }
  ```
  این داده‌ها در هنگام ورق زدن کارت از طریق توابع زمان‌بندی‌شده‌ی `scheduleSaveLocal(450)` و `scheduleCloudSync(user, 1500)` هم در `localStorage` و هم در دیتابیس Supabase ذخیره می‌شوند.

### ۵. اتصال فلش‌کارت به سایر بخش‌های بازی
- **امتیاز و تجربه (XP):** مطالعه فلش‌کارت‌ها **۰ XP** می‌دهد (هیچ تجربه‌ای بابت ورق زدن تعلق نمی‌گیرد).
- **جان (شمع‌ها):** سیستم شمع‌ها متعلق به صحنه نبرد است و در فلش‌کارت‌ها غیرفعال است.
- **زنجیره پاسخ (Streak):** زنجیره در بخش نبرد عمل می‌کند و در فلش‌کارت‌ها مفهومی ندارد.
- **گیتینگ نبرد (Battle Lock Gate):** مهم‌ترین اتصال فلش‌کارت با بازی همین شرط است؛ تا زمانی که دانش‌آموز ۱۰۰٪ کارت‌های یک مرحله را ورق نزده باشد، ورود به نبرد آن مرحله (`#viewArena`) هم در صفحه مطالعه و هم در نقشه قفل است و شیت اخطار باز می‌شود (به استثنای دژ جهنمی جهان ۴ که از پیش‌نیاز مطالعه معاف است).
- **دستاوردها (Achievements):** به محض اتمام ۱۰۰٪ کارت‌های هر مرحله، اچیومنت مطالعه بررسی شده و در کارنامه دانش‌آموز ثبت می‌شود.

---

## ۴. رابط کاربری و رفتار تعاملی (UI & Behavior)

### ۱. تکنیک انیمیشن ورق زدن سه‌بعدی (3D Flip Mechanics)
- کانتینر اصلی دارای عمق دید سه‌بعدی است: `.study-card-scene { perspective: 1000px; }`.
- کارت دارای استایل حفظ بعد است: `.study-card-box { transform-style: preserve-3d; transition: transform 0.36s cubic-bezier(0.22, 1, 0.36, 1); }`.
- هر دو روی کارت از دید پشت پنهان هستند: `.study-card-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }`.
- برای جلوگیری از خطای هم‌پوشانی فیزیکی در مرورگرها (Z-Fighting)، روی کارت دارای `transform: rotateY(0deg) translateZ(1px);` و پشت کارت دارای `transform: rotateY(180deg) translateZ(1px);` است.
- در زمان فعال بودن کلاس `.is-flipped`، ترنسفورم به `rotateY(180deg)` ارتقا می‌یابد و برای بهینه‌سازی تاچ، لایه پنهان با `pointer-events: none` محافظت می‌شود.
- در صورت فعال بودن `prefers-reduced-motion` در تنظیمات کاربر، چرخش سه‌بعدی حذف شده و کارت با فید ملایم ۱۲۰ میلی‌ثانیه‌ای باز و بسته می‌شود.

### ۲. ساختار DOM و چیدمان موبایل (Mobile Layout & Proportions)
- کانتینر روی کل صفحه قفل است: `#viewStudy { width: 100%; height: 100%; overflow: hidden; padding: 12px; }`.
- ابعاد کارت دقیقاً مشابه کارت‌های فیزیکی پاسور با نسبت ۵ به ۷ تنظیم شده است:
  `--study-card-aspect: 5 / 7; --study-card-max-w: min(78vw, 320px);`.
- نوار پیشرفت قطعه‌بندی‌شده (`.study-progress-segs`) به علت وابستگی جهت حرکت اسلاید کارت‌ها با `direction: ltr;` تنظیم شده است تا قطعات از چپ به راست پر شوند.

### ۳. دکمه‌ها و ژست‌های حرکتی (Gestures & Controls)
| نوع تعامل | اقدام کاربر | رفتار رخ داده |
| :--- | :--- | :--- |
| **ضربه روی کارت (Tap)** | تپ با جابجایی کمتر از ۱۸ پیکسل | کارت با زاویه ۱۸۰ درجه ورق می‌خورد و وضعیت `seen` ثبت می‌گردد. |
| **سوایپ به چپ (Drag Left)** | کشیدن انگشت بیش از ۳۰ پیکسل به چپ | کارت به سمت چپ پرواز کرده و کارت بعدی لود می‌شود (`flyCardAndAdvance(1)`). |
| **سوایپ به راست (Drag Right)** | کشیدن انگشت بیش از ۳۰ پیکسل به راست | کارت به سمت راست پرواز کرده و کارت قبلی لود می‌شود (`flyCardAndAdvance(-1)`). |
| **درگ نیمه‌کاره** | کشیدن و رها کردن با فاصله کمتر از ۳۰ پیکسل | کارت با افکت فنری به مرکز بازمی‌گردد (`snap back`). |
| **دکمه بازگشت (`#btnStudyBack`)** | کلیک روی آیکون بازگشت | بازگشت به نقشه بازی (`enterDashboard`). |
| **دکمه پایینی (`#btnStudyEnterBattle`)** | کلیک در حالت ناکامل | پخش صدای اخطار (تن ۱۴۰ هرتز) و بالا آمدن شیت اخطار قفل نبرد. |
| **دکمه پایینی (`#btnStudyEnterBattle`)** | کلیک در حالت تکمیل | ورود مستقیم به بخش نبرد و کوئیز مرحله (`promptStartBattle`). |
| **کلیدهای Space / Enter** | فشردن روی کارت فوکوس‌شده | ورق زدن کارت (دسترس‌پذیری کیبورد). |
| **کلیدهای جهت‌نما (Arrow Keys)** | فشردن ArrowRight یا ArrowLeft | جابجایی بین کارت‌های بعدی و قبلی. |
| **دکمه‌های کمکی اسکرین‌ریدر** | دکمه‌های ناوبری مخفی (`.sr-only`) | کارت قبلی و کارت بعدی برای نابینایان و دستیارهای صوتی. |

---

## ۵. مشکلات، باگ‌ها و نواقص مشاهده‌شده (Problems & Flaws)

در فرآیند بررسی مرورگری لایو با رزولوشن استاندارد موبایل (`390x844`)، اسکرین‌شات‌ها ثبت شدند و باگ‌ها و ایرادات زیر کشف گردید:

```
[اسکرین‌شات ۱: وضعیت اولیه کارت] file:///C:/Users/acer/.gemini/antigravity/brain/b274b952-e7d5-43e5-845c-7709f2a8956c/flashcard_initial_390x844.png
[اسکرین‌شات ۲: وضعیت ورق‌خورده]   file:///C:/Users/acer/.gemini/antigravity/brain/b274b952-e7d5-43e5-845c-7709f2a8956c/flashcard_flipped_390x844.png
[اسکرین‌شات ۳: اتمام مرور و باز شدن نبرد] file:///C:/Users/acer/.gemini/antigravity/brain/b274b952-e7d5-43e5-845c-7709f2a8956c/flashcard_all_seen_390x844.png
```

### ۱. وجود کد CSS آویزان و نامعتبر (Dangling Corrupted CSS Rule)
- **محل:** فایل `index.html`، خطوط ۵۱۹۱ تا ۵۲۰۸.
- **شرح مشکل:** دقیقاً پس از رول `.study-hint-text`، یک بلوک CSS بدون نام سلکتور آغاز شده است:
  ```css
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
      font-weight: 800;
      color: var(--gold, #c9a24d);
    }
  ```
  علاوه بر این، استایل‌های `.study-hint-icon` و `.study-hint-text` دو بار پشت سر هم با مقادیر مختلف تکرار شده‌اند. این خطای تایپی در کدهای استایل وجود دارد و مرورگر به ناچار آن را رد می‌کند.

### ۲. تناقض در رفتار مرز کارت‌ها بین تاچ، کیبورد و اسکرین‌ریدر (Inconsistent Wrap-around)
- **محل:** فایل `index.html`، خط ۹۱۴۸ در مقابل خط ۹۵۲۳ و خط ۹۶۰۳.
- **شرح مشکل:** 
  - در سوایپ لمسی (`flyCardAndAdvance`)، وقتی به کارت آخر می‌رسید، اگر دوباره به چپ بکشید، کارت به اول لیست برمی‌گردد (`studyIndex = 0` - حالت لوپ نامحدود).
  - اما در استفاده از کیبورد (`ArrowRight`)، شرط `studyIndex < studyDeck.length - 1` وجود دارد و کارت متوقف می‌شود و لوپ نمی‌زند!
  - در دکمه‌های اسکرین‌ریدر (`btnStudyNext`) نیز روی کارت آخر دکمه غیرفعال (`disabled`) می‌شود.  
  این یعنی رفتار کاربر در تاچ لوپ‌شونده است، اما در کیبورد و ابزارهای کمکی بن‌بست است!

### ۳. تضاد جهت کلیدهای کیبورد با سوایپ در RTL (Directional Mismatch)
- **محل:** فایل `index.html`، خط ۹۱۰۶ و خط ۹۶۰۱.
- **شرح مشکل:**
  - در سوایپ لمسی: کشیدن به چپ (`isSwipeLeft`) کاربر را به کارت بعدی می‌برد.
  - اما در کلیدهای کیبورد: کلید فلش راست (`ArrowRight`) کاربر را به کارت بعدی می‌برد!
  - جهت لمسی با جهت فیزیکی کلیدهای کیبورد معکوس عمل می‌کند.

### ۴. مرده بودن و عدم کارکرد کلیک روی نقاط نوار پیشرفت (Unresponsive Progress Segments)
- **محل:** فایل `index.html`، خط ۴۸۱۹ و خط ۸۸۱۷.
- **شرح مشکل:** هر قطعه از نوار پیشرفت در CSS دارای `cursor: pointer;` است و در HTML ویژگی `data-idx="${idx}"` دارد که به کاربر القا می‌کند می‌تواند با ضربه روی هر قطعه، مستقیماً به کارت شماره مثلاً ۸ یا ۱۰ بپرد. اما در هیچ کجای جاوااسکریپت، رویداد `click` برای این نقاط هندل نشده و کلیک روی آنها کاملاً بی‌اثر است.

### ۵. فضای خالی مفرط و سیاه در پشت کارت‌های با معانی کوتاه (Empty Void Visual Glitch)
- **محل:** رندر المان `.study-card-back` در ابعاد استاندارد ۵:۷.
- **شرح مشکل:** همان‌طور که در اسکرین‌شات `flashcard_flipped_390x844.png` مشهود است، واژگانی که تنها یک معنای کوتاه دارند (مانند «کشتی») و نکته ادبی ندارند، معنایشان در بالاترین خط کارت قرار گرفته و حدود ۸۰٪ باقی‌مانده مساحت کارت تبدیل به یک مستطیل بزرگ خالی و تاریک می‌شود که بالانس بصری کارت را بر هم می‌زند.

### ۶. اصطکاک تحمیلی: عدم ثبت مشاهده در صورت عدم ورق زدن (Forced Flip Friction)
- **محل:** فایل `index.html`، خط ۸۹۷۳.
- **شرح مشکل:** یک واژه تنها و تنها زمانی به عنوان «دیده‌شده» (`seen`) علامت می‌خورد که حتماً ورق بخورد (`if (isCardFlipped)`). اگر دانش‌آموزی معنی واژگان را از قبل بلد باشد و فقط کارت‌ها را یکی پس از دیگری به چپ سوایپ کند تا رد شوند، شمارنده وی صفر باقی می‌ماند و در انتهای مرحله، دکمه ورود به نبرد باز نخواهد شد و دانش‌آموز مجبور است به عقب برگردد و تک‌تک کارت‌ها را یک بار بی‌جهت ورق بزند تا قفل باز شود.

---

## ۶. ایده اولیه در برابر پیاده‌سازی فعلی (Original Idea vs. Current Implementation)

### خلاصه ایده و چشم‌انداز اولیه
در مستندات و لاگ‌های بازطراحی بازی، هدف از ایجاد بخش فلش‌کارت، ایجاد یک محیط آرامش‌بخش، تعاملی و خودسنج (Self-Study / Self-Grading) بر پایه تکرار هدفمند واژگان دشوار کتاب درسی ادبیات فارسی بود؛ جایی که دانش‌آموز بتواند قبل از ورود به کارزار استرس‌زای نبرد پیکسلی، میزان تسلط خود را روی واژگان بسنجد، واژگان سخت را علامت‌گذاری کند و بازی به شکل هوشمند کارت‌هایی را که دانش‌آموز در نبرد غلط پاسخ داده، در دورهای بعدی برایش تکرار کند.

### مقایسه حقیقت پیاده‌سازی فعلی در برابر چشم‌انداز اولیه:

| ویژگی مورد انتظار در فلش‌کارت | وضعیت در پیاده‌سازی کنونی | میزان انحراف و مصالحه (Compromise / Shortcut) |
| :--- | :--- | :--- |
| **سیستم خودارزیابی دانش‌آموز** | کاملاً غایب است. | **میانبر ۱۰۰٪:** دکمه‌های «بلدم / بلد نیستم / شک دارم» پیاده نشده‌اند. کاربر کنترلی بر سطح تسلط خود ندارد. |
| **الگوریتم تکرار فاصله‌دار (SRS/Leitner)** | کاملاً غایب است. | **میانبر ۱۰۰٪:** کارت‌ها صرفاً در یک لیست صلب و ترتیبی چیده شده‌اند و هیچ جعبه لایتنر یا زمان‌بندی مرور هوشمندی وجود ندارد. |
| **تمرکز بر واژگان چالشی و اشتباهات** | فقط در نبرد وجود دارد، در فلش‌کارت نیست. | لیست اشتباهات کاربر (`userMistakes`) فقط در کوئیز نبرد محاسبه می‌شود؛ در فلش‌کارت همیشه کل واژگان مرحله به ترتیب ثابت نشان داده می‌شوند. |
| **کسب امتیاز یا پاداش مطالعه** | هیچ امتیازی داده نمی‌شود. | مطالعه کارت‌ها ۰ امتیاز دارد و فقط نقش یک «گیت اجباری» برای ورود به بازی اصلی (نبرد) را ایفا می‌کند. |
| **فیزیک و تعامل لمسی کارت** | اجرا شده و بسیار روان است. | زاویه انحراف ۸ درجه، کشسانی استک، انیمیشن ۳۶۰ میلی‌ثانیه‌ای و فید سه‌بعدی به زیبایی پیاده شده‌اند. |
| **جلوه بصری گوتیک و تناسبات کارت** | پیاده‌سازی دقیق ۵:۷ با قاب داخلی و نقوش کم‌رنگ. | استایل کارت‌های پاسور گوتیک با بوردورهای طلایی پیاده شده اما چیدمان محتوای پشت کارت در معانی کوتاه بالانس نیست. |
| **موسیقی و اتمسفر** | اختصاصی و لوفای (`flashcards-chill`). | به محض ورود کاربر موسیقی آرام لوفای پخش می‌شود و تجربه تمرکز خوبی می‌سازد. |

---
*پایان گزارش فنی — این فایل به عنوان مرجع تحلیل در ریشه پروژه با نام `FLASHCARD_REPORT.md` ثبت گردید.*

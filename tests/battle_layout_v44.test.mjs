import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const htmlPath = path.resolve('index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

describe('Battle Screen Layout & Polish Suite (v4.4)', () => {

  describe('Task 1: Combo Chip & Enemy HUD Isolation', () => {
    it('moves #comboBadge out of the scene HUD into .rpg-question', () => {
      // Must NOT be inside .enemy-scene-hud
      const enemyHudStart = htmlContent.indexOf('class="enemy-scene-hud');
      const enemyHudEnd = htmlContent.indexOf('<!-- Battle Visual Effects');
      const enemyHudSlice = htmlContent.slice(enemyHudStart, enemyHudEnd);
      assert.ok(!enemyHudSlice.includes('id="comboBadge"'), '#comboBadge must not be inside enemy-scene-hud');

      // Must be inside .rpg-question
      const questionStart = htmlContent.indexOf('class="rpg-question"');
      const questionEnd = htmlContent.indexOf('class="rpg-options-list"');
      const questionSlice = htmlContent.slice(questionStart, questionEnd);
      assert.ok(questionSlice.includes('id="comboBadge"'), '#comboBadge must be inside .rpg-question');
    });

    it('styles #comboBadge pinned to top-left straddling question card border with pop animation', () => {
      assert.ok(htmlContent.includes('.combo-badge {'), 'Must have combo-badge styling');
      assert.ok(htmlContent.includes('position: absolute;'), 'combo-badge must be position absolute');
      assert.ok(htmlContent.includes('transform: translateY(-50%);'), 'combo-badge must straddle border via translateY(-50%)');
      assert.ok(htmlContent.includes('@keyframes comboPop'), 'Must define comboPop keyframes');
      assert.ok(htmlContent.includes('.combo-badge.pop-anim'), 'Must define .combo-badge.pop-anim class');
      assert.ok(htmlContent.includes('prefers-reduced-motion'), 'Must support prefers-reduced-motion for combo badge');
    });

    it('updateComboBadge toggles pop-anim on combo increments >= 3', () => {
      assert.ok(htmlContent.includes('badge.classList.add("pop-anim");'), 'Must add pop-anim class on combo count >= 3');
      assert.ok(htmlContent.includes('badge.classList.remove("pop-anim");'), 'Must remove pop-anim when hidden or resetting');
    });

    it('fixes enemy HP numbers bidi reversal with dir="ltr" and unicode-bidi: isolate', () => {
      // HTML has dir="ltr"
      assert.ok(htmlContent.includes('id="enemyHpNum" class="enemy-hp-num font-pixel" dir="ltr"'), 'enemyHpNum HTML must have dir="ltr"');
      // CSS has direction: ltr and unicode-bidi: isolate
      assert.ok(htmlContent.includes('.enemy-hp-num {') && htmlContent.includes('direction: ltr;') && htmlContent.includes('unicode-bidi: isolate;'), 'CSS must isolate bidi and force LTR for HP numbers');
      // JS enforces dir="ltr"
      assert.ok(htmlContent.includes('num.setAttribute("dir", "ltr")'), 'updateEnemyHP must enforce dir="ltr" on update');
    });

    it('keeps enemy HUD row clean with skull icon, هماورد chip, enemy name, and HP bar', () => {
      assert.ok(htmlContent.includes('class="enemy-skull-icon"'), 'Must have enemy skull icon');
      assert.ok(htmlContent.includes('id="speakerTag"'), 'Must have speaker tag هماورد');
      assert.ok(htmlContent.includes('id="enemyNameLabel"'), 'Must have enemyNameLabel');
      assert.ok(htmlContent.includes('id="enemyHpFill"'), 'Must have enemyHpFill');
    });
  });

  describe('Task 2: Battle Header Row Optimization', () => {
    it('Row 1 has icon-only back button with chevron SVG and 44px min touch target', () => {
      const exitBtnStart = htmlContent.indexOf('id="btnBackToMap"');
      const exitBtnEnd = htmlContent.indexOf('</button>', exitBtnStart);
      const exitBtnHtml = htmlContent.slice(exitBtnStart, exitBtnEnd);
      assert.ok(!exitBtnHtml.includes('<span>نقشه</span>'), 'Must remove text "نقشه" from back button');
      assert.ok(exitBtnHtml.includes('<svg'), 'Must keep chevron SVG in back button');
      assert.ok(htmlContent.includes('min-width: 44px;') && htmlContent.includes('min-height: 44px;'), 'Must have 44px minimum touch target');
    });

    it('Row 1 title uses responsive clamp(13px, 3.8vw, 15px) and 2-line clamp', () => {
      assert.ok(htmlContent.includes('font-size: clamp(13px, 3.8vw, 15px);'), 'Title must use responsive clamp(13px, 3.8vw, 15px)');
      assert.ok(htmlContent.includes('-webkit-line-clamp: 2;'), 'Title must allow 2 lines via -webkit-line-clamp: 2');
      assert.ok(htmlContent.includes('stageTitleEl.setAttribute("title", fullStageTitle)'), 'JS must set title attribute for full accessibility');
    });

    it('Row 1 stopwatch is on the left with monospace numbers', () => {
      assert.ok(htmlContent.includes('class="arena-timer-wrap"'), 'Timer wrap must exist in Row 1');
      assert.ok(htmlContent.includes('id="arenaTimer" class="font-pixel arena-timer"'), 'Timer must have font-pixel monospace numbers');
    });

    it('Row 2 has player chip, 3 candles, and LTR question counter in outlined chip', () => {
      assert.ok(htmlContent.includes('id="arenaPlayerChip"'), 'Player chip must exist in Row 2');
      assert.ok(htmlContent.includes('id="candlesHud"'), 'Candles HUD must exist in Row 2');
      assert.ok(htmlContent.includes('id="arenaCounter" class="arena-counter font-pixel" dir="ltr"'), 'Question counter must have dir="ltr"');
      assert.ok(htmlContent.includes('border-radius: 9999px;') && htmlContent.includes('.arena-counter-wrap'), 'Counter wrap must be styled as outlined chip');
    });
  });

  describe('Task 3: Full-Height Flex Layout & Responsive Options Breakpoint', () => {
    it('#viewArena uses 100dvh flex column layout with safe-area padding', () => {
      assert.ok(htmlContent.includes('#viewArena:not(.hidden) {'), 'Must have dedicated #viewArena:not(.hidden) layout rule');
      assert.ok(htmlContent.includes('height: 100dvh;'), 'Must use 100dvh height');
      assert.ok(htmlContent.includes('min-height: 100vh;'), 'Must have min-height 100vh fallback');
      assert.ok(htmlContent.includes('padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 12px);'), 'Must anchor with safe-area padding');
      assert.ok(htmlContent.includes('overflow-y: auto;'), 'Must allow vertical scroll on small viewports');
    });

    it('.rpg-dialog and #phaseQuiz flex to fill vertical space', () => {
      assert.ok(htmlContent.includes('.rpg-dialog {') && htmlContent.includes('flex: 1;'), '.rpg-dialog must have flex: 1');
      assert.ok(htmlContent.includes('#phaseQuiz {') && htmlContent.includes('flex: 1;'), '#phaseQuiz must have flex: 1');
    });

    it('.rpg-question has min-height 96px, max-height 190px, and prominent ember-orange target word', () => {
      assert.ok(htmlContent.includes('min-height: 96px;'), '.rpg-question must have min-height 96px');
      assert.ok(htmlContent.includes('max-height: 190px;'), '.rpg-question must have max-height 190px');
      assert.ok(htmlContent.includes('font-size: clamp(22px, 3.4dvh, 30px);'), 'Target word must use clamp(22px, 3.4dvh, 30px)');
      assert.ok(htmlContent.includes('#d9703a'), 'Target word must use ember-orange #d9703a');
    });

    it('options list anchors to bottom with 1-column layout on viewport height >= 700px', () => {
      assert.ok(htmlContent.includes('.rpg-options-list {') && htmlContent.includes('margin-top: auto;'), 'Options must anchor to bottom via margin-top: auto');
      assert.ok(htmlContent.includes('min-height: clamp(60px, 8.5dvh, 88px);'), 'Option buttons must use clamp(60px, 8.5dvh, 88px)');
      assert.ok(htmlContent.includes('font-size: 16px;'), 'Option text must use generous 16px font');
    });

    it('defines 1-column vs 2-column breakpoint at 700px viewport height', () => {
      assert.ok(htmlContent.includes('@media (max-height: 699px)'), 'Must define breakpoint at max-height: 699px (height < 700px)');
      const breakStart = htmlContent.indexOf('@media (max-height: 699px)');
      const breakEnd = htmlContent.indexOf('}\n    }', breakStart);
      const breakCss = htmlContent.slice(breakStart, breakEnd + 10);
      assert.ok(breakCss.includes('grid-template-columns: 1fr 1fr;'), 'Must switch to 2x2 grid when height < 700px');
    });
  });

  describe('Task 4: Polish & Safety Checks', () => {
    it('HARD CONSTRAINT: .stage-wrapper maintains exact 16:9 aspect ratio and constraints', () => {
      assert.ok(htmlContent.includes('aspect-ratio: 16 / 9;'), 'Must retain aspect-ratio: 16 / 9');
      assert.ok(htmlContent.includes('max-height: 270px;'), 'Must retain max-height: 270px');
      assert.ok(htmlContent.includes('min-height: 160px;'), 'Must retain min-height: 160px');
    });

    it('visual effects overlay #battleEffectsOverlay remains strictly aligned inside #stageScene', () => {
      const stageStart = htmlContent.indexOf('id="stageScene"');
      const stageEnd = htmlContent.indexOf('<!-- RPG DIALOG WINDOW');
      const stageSlice = htmlContent.slice(stageStart, stageEnd);
      assert.ok(stageSlice.includes('id="battleEffectsOverlay"'), '#battleEffectsOverlay must be strictly inside #stageScene');
      assert.ok(htmlContent.includes('.battle-effects-overlay {') && htmlContent.includes('position: absolute;'), 'Effects overlay must be position absolute');
    });

    it('keyboard shortcuts 1-4 continue to trigger options', () => {
      assert.ok(htmlContent.includes('const keyMap = { "1": 0, "2": 1, "3": 2, "4": 3'), 'Keymap 1-4 must exist');
      assert.ok(htmlContent.includes('btns[idx].click()'), 'Keymap must click option button');
    });
  });

});

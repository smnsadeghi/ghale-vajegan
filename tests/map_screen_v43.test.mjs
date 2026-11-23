import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve('C:/Users/acer/.gemini/antigravity/scratch/ghale-vajegan');
const htmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

describe('Map Screen & Battle Review Gating Suite (v4.3)', () => {

  describe('TASK 1: Header - Single Compact Row', () => {
    it('defines .top-hud:not(.hud-arena) as a single row with 56-64px height and vertical alignment', () => {
      assert.ok(htmlContent.includes('.top-hud:not(.hud-arena) {'), 'Must have dedicated single-row rule for top-hud outside arena');
      assert.ok(htmlContent.includes('flex-direction: row;'), 'Must be flex-direction row');
      assert.ok(htmlContent.includes('height: 60px;') || htmlContent.includes('min-height: 56px;'), 'Must have height around 56-64px');
      assert.ok(htmlContent.includes('align-items: center;'), 'Must vertically center items');
    });

    it('contains user greeting with ellipsis and XP chip on the right', () => {
      assert.ok(htmlContent.includes('id="userGreeting"'), 'Must have userGreeting');
      assert.ok(htmlContent.includes('text-overflow: ellipsis;'), 'Name must truncate with ellipsis if long');
      assert.ok(htmlContent.includes('class="xp-readout'), 'Must have XP chip next to greeting');
    });

    it('contains two compact round icon buttons with accessible labels on the left', () => {
      assert.ok(htmlContent.includes('.top-hud-round-btn {'), 'Must have .top-hud-round-btn style');
      assert.ok(htmlContent.includes('border-radius: 50%;'), 'Must be round');
      assert.ok(htmlContent.includes('min-width: 40px;') || htmlContent.includes('min-width: 42px;'), 'Touch target must be 40-44px');
      assert.ok(htmlContent.includes('id="btnAudio"') && htmlContent.includes('aria-label="تنظیمات صدا"'), 'Sound button must have aria-label');
      assert.ok(htmlContent.includes('id="btnLogout"') && htmlContent.includes('aria-label="خروج از حساب"'), 'Logout button must have aria-label');
    });
  });

  describe('TASK 2: World Tabs - 4-Column Equal Grid & Structure', () => {
    it('defines .world-portal-grid with repeat(4, 1fr) and equal-width tabs', () => {
      assert.ok(htmlContent.includes('grid-template-columns: repeat(4, 1fr);'), 'Tabs must be equal-width grid');
      assert.ok(htmlContent.includes('height: 64px;') && htmlContent.includes('min-height: 64px;'), 'Tabs must have fixed 64px height');
    });

    it('has 24px line icons with stroke 1.75 across tabs', () => {
      assert.ok(htmlContent.includes('.portal-tab svg {') && htmlContent.includes('width: 24px;') && htmlContent.includes('height: 24px;'), 'Tab SVG icons must be 24px');
      assert.ok(htmlContent.includes('stroke-width: 1.75;'), 'SVG icons must use stroke-width 1.75');
    });

    it('shows gold underline for active tab and accent color for active label and icon', () => {
      assert.ok(htmlContent.includes('.portal-tab.active {') && htmlContent.includes('border-bottom-color: var(--gold'), 'Active tab must have gold underline');
      assert.ok(htmlContent.includes('.portal-tab[data-world="1"].active svg { stroke: var(--gold'), 'World 1 active gold');
      assert.ok(htmlContent.includes('.portal-tab[data-world="2"].active svg { stroke: var(--teal'), 'World 2 active teal');
      assert.ok(htmlContent.includes('.portal-tab[data-world="3"].active svg { stroke: var(--rose'), 'World 3 active rose');
      assert.ok(htmlContent.includes('.portal-tab[data-world="4"].active svg { stroke: var(--ember'), 'World 4 active ember');
    });

    it('positions the Gothic arch motif watermark ONLY behind world summary title area with <=6% opacity', () => {
      assert.ok(htmlContent.includes('.gothic-arch-bg {') && htmlContent.includes('opacity: 0.055;'), 'Arch watermark opacity must be 5-6%');
      assert.ok(htmlContent.includes('<div id="worldBanner" class="section-summary">\n      <!-- Subtle Gothic Arch Motif Watermark ONLY behind world summary title area -->'), 'Arch watermark must be inside worldBanner, not crossing tabs');
    });

    it('displays compact 2x XP chip for World 4 tab', () => {
      assert.ok(htmlContent.includes('class="portal-xp-chip">۲× XP</span>'), 'World 4 must have compact 2x XP chip');
      assert.ok(htmlContent.includes('.portal-xp-chip {'), 'Must have portal-xp-chip CSS styling');
    });
  });

  describe('TASK 3: Icons for World 3 (Iham) and World 4 (Inferno)', () => {
    it('uses a theatre/venetian mask icon for World 3 (Iham)', () => {
      // Venetian mask path from lucide
      assert.ok(htmlContent.includes('data-world="3"') && htmlContent.includes('M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V7h-3a8 8 0 0 0-5 2 8 8 0 0 0-5-2H2Z'), 'World 3 tab must have venetian/theatre mask SVG');
      assert.ok(!htmlContent.includes('data-world="3" onclick="switchWorld(3)">\n        <svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5'), 'Dollar icon must be completely removed from World 3');
    });

    it('uses a castle tower with flame icon for World 4 (Inferno Fortress)', () => {
      assert.ok(htmlContent.includes('data-world="4"') && htmlContent.includes('M5 21h14') && htmlContent.includes('M12 1.5c1 1.2'), 'World 4 tab must have castle tower with flame SVG');
    });
  });

  describe('TASK 4: Review Gating, Shared Helper & Bottom Sheet', () => {
    it('defines canBattleForStage and exports useCanBattle as shared helper', () => {
      assert.ok(htmlContent.includes('function canBattleForStage(stage)'), 'canBattleForStage must be defined');
      assert.ok(htmlContent.includes('function useCanBattle(worldIdOrStage, stageId)'), 'useCanBattle must be defined');
      assert.ok(htmlContent.includes('window.canBattleForStage = canBattleForStage;'), 'canBattleForStage must be attached to window');
      assert.ok(htmlContent.includes('window.useCanBattle = useCanBattle;'), 'useCanBattle must be attached to window');
    });

    it('canBattleForStage excludes World 4 (Inferno Fortress) and 0-card stages', () => {
      assert.ok(htmlContent.includes('if (stage.isHellMix || stage.world === 4) return true;'), 'World 4 must be excluded from review lock');
      assert.ok(htmlContent.includes('if (words.length === 0) return true;'), '0-word stages must not be locked');
      assert.ok(htmlContent.includes('seen.size >= words.length;'), 'Must check seen.size against words.length');
    });

    it('renders real seen counts and "مرور کامل شد" badge on completed stage cards', () => {
      assert.ok(htmlContent.includes('const seenSet = loadSeenIds(st);'), 'Must read real seen cards via loadSeenIds');
      assert.ok(htmlContent.includes('class="stage-complete-badge"'), 'Must have stage-complete-badge element');
      assert.ok(htmlContent.includes('مرور کامل شد'), 'Must display "مرور کامل شد" on card when complete');
    });

    it('swaps button emphasis: review is primary when incomplete, battle is primary when complete', () => {
      assert.ok(htmlContent.includes('studyBtn.className = "btn-primary tower-btn-action tower-btn-study-primary";'), 'Review is filled primary when incomplete');
      assert.ok(htmlContent.includes('battleBtn.className = "btn-ghost tower-btn-action tower-btn-battle-locked";'), 'Battle is secondary locked look when incomplete');
      assert.ok(htmlContent.includes('battleBtn.className = "btn-primary tower-btn-action tower-btn-battle-ready";'), 'Battle is primary filled when complete');
    });

    it('opens #studyLockedSheet when locked battle is tapped with message and two buttons', () => {
      assert.ok(htmlContent.includes('openStudyLockedSheet(st);'), 'Tapping locked battle button calls openStudyLockedSheet(st)');
      assert.ok(htmlContent.includes('اول مرور این مرحله رو تموم کن تا بتونی وارد نبرد بشی'), 'Bottom sheet has exact required copy');
      assert.ok(htmlContent.includes('id="btnStudySheetGoStudy"'), 'Bottom sheet has "برو به مرور" button');
      assert.ok(htmlContent.includes('id="btnCloseStudySheet"'), 'Bottom sheet has "باشه" button');
    });

    it('places #studyLockedSheet outside #viewStudy so it can be opened from map view', () => {
      const idxStudy = htmlContent.indexOf('id="viewStudy"');
      const idxStudyEnd = htmlContent.indexOf('</div>\n\n  <!-- 5. Bottom Sheet: Locked Notice Modal');
      const idxSheet = htmlContent.indexOf('id="studyLockedSheet"');
      assert.ok(idxSheet > idxStudyEnd, '#studyLockedSheet must be placed outside #viewStudy');
    });

    it('protects the battle route at showView and startBattleMode', () => {
      assert.ok(htmlContent.includes('if (viewId === "viewArena") {\n    const battleStage = currentStage || studyStage || (appState.stages && appState.stages[0]);\n    if (battleStage && typeof canBattleForStage === "function" && !canBattleForStage(battleStage)) {\n      openStudyMode(battleStage);\n      return;\n    }\n  }'), 'showView("viewArena") must redirect to openStudyMode if not canBattle');
      assert.ok(htmlContent.includes('function startBattleMode(stage, isRanked = false) {\n  if (!stage) return;\n  if (typeof canBattleForStage === "function" && !canBattleForStage(stage)) {\n    openStudyMode(stage);\n    return;\n  }'), 'startBattleMode must guard entry against unreviewed stages');
    });
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const htmlContent = fs.readFileSync('C:/Users/acer/.gemini/antigravity/scratch/ghale-vajegan/index.html', 'utf8');
const swContent = fs.readFileSync('C:/Users/acer/.gemini/antigravity/scratch/ghale-vajegan/sw.js', 'utf8');

describe('v4.2.2 Surgical Production Fixes', () => {

  describe('1. Missing Quiz Options & #phaseQuiz Cleanup', () => {
    it('uses correct qzOptions container ID in renderNextQuizQuestion', () => {
      assert.ok(htmlContent.includes('const grid = document.getElementById("qzOptions");'), 'Must query qzOptions');
      assert.ok(!htmlContent.includes('document.getElementById("qzOptionsGrid")'), 'qzOptionsGrid must be removed');
    });

    it('generates rpg-option-btn with opt-box structure and updates selector', () => {
      assert.ok(htmlContent.includes('btn.className = "rpg-option-btn";'), 'Must use rpg-option-btn class');
      assert.ok(htmlContent.includes('<span class="opt-box">${idx + 1}</span>'), 'Must use opt-box for option numbering');
      assert.ok(htmlContent.includes('grid.querySelectorAll(".rpg-option-btn")'), 'Must select rpg-option-btn for click handling');
    });

    it('styles rpg-options-list as a crisp 2-column grid', () => {
      assert.ok(htmlContent.includes('display: grid;'), 'Must have display: grid');
      assert.ok(htmlContent.includes('grid-template-columns: 1fr 1fr;'), 'Must be 2-column grid');
    });

    it('removes unused btnConfirmAnswer from phaseQuiz HTML', () => {
      assert.ok(!htmlContent.includes('id="btnConfirmAnswer"'), 'btnConfirmAnswer must not exist in HTML');
    });

    it('removes duplicate dialogXP readout from rpg-header and guards JS updates', () => {
      assert.ok(!htmlContent.includes('<span class="xp-readout" id="dialogXP">'), 'dialogXP must be removed from rpg-header');
      assert.ok(!htmlContent.includes('document.getElementById("dialogXP").textContent ='), 'Direct unguarded dialogXP assignments must not exist');
    });
  });

  describe('2. Top Battle HUD Overlap Resolution (.top-hud)', () => {
    it('restructures top-hud into clean 2-row layout without crowding', () => {
      assert.ok(htmlContent.includes('top-hud hud-arena'), 'Must use hud-arena container');
      assert.ok(htmlContent.includes('id="btnBackToMap"'), 'btnBackToMap must exist');
      assert.ok(htmlContent.includes('id="arenaStageTitle"'), 'arenaStageTitle must exist');
      assert.ok(htmlContent.includes('id="arenaCounter"'), 'arenaCounter must exist');
      assert.ok(htmlContent.includes('id="candlesHud"'), 'candlesHud must exist');
      assert.ok(htmlContent.includes('id="arenaTimer"'), 'arenaTimer must exist');
      assert.ok(htmlContent.includes('id="arenaModeBadge"'), 'arenaModeBadge must exist');
    });

    it('has ellipsis and centered alignment on arenaStageTitle', () => {
      assert.ok(htmlContent.includes('text-overflow:ellipsis;'), 'Must truncate title with ellipsis if long');
    });
  });

  describe('3. Arena Visuals (#stageScene)', () => {
    it('removes yellow glowing gate box from stageScene HTML and guards JS', () => {
      assert.ok(!htmlContent.includes('id="gateGlow"'), 'gateGlow element must be removed from HTML');
      assert.ok(!htmlContent.includes('document.getElementById("gateGlow").classList'), 'Unguarded gateGlow calls must not exist');
    });

    it('removes crt-overlay from stageScene HTML and disables it in CSS', () => {
      assert.ok(!htmlContent.includes('<div class="crt-overlay"></div>'), 'crt-overlay element must be removed from HTML');
      assert.ok(htmlContent.includes('.crt-overlay {\n      display: none !important;\n    }'), 'crt-overlay must be disabled in CSS');
    });
  });

  describe('4. Vertical Mobile Layout & Viewport Optimization', () => {
    it('sets body min-height to 100dvh', () => {
      assert.ok(htmlContent.includes('min-height: 100dvh;'), 'body must use 100dvh');
    });

    it('makes viewArena and rpg-dialog flex items filling vertical space', () => {
      assert.ok(htmlContent.includes('#viewArena:not(.hidden)'), 'viewArena rule must exist');
      assert.ok(htmlContent.includes('#viewArena .rpg-dialog'), 'viewArena rpg-dialog rule must exist');
    });

    it('pins footer-ver to bottom with margin-top: auto', () => {
      assert.ok(htmlContent.includes('margin-top: auto;'), 'footer-ver must have margin-top: auto');
    });
  });

  describe('5. Version & PWA Cache Bump', () => {
    it('bumps version trigger to v4.2.2', () => {
      assert.ok(htmlContent.includes('<div class="footer-ver" id="versionTrigger">v4.2.2</div>'), 'Version trigger must be v4.2.2');
    });

    it('bumps Service Worker cache name to ghale-vajegan-v4.2.2', () => {
      assert.ok(swContent.includes("const CACHE_NAME = 'ghale-vajegan-v4.2.2';"), 'sw.js cache must be v4.2.2');
    });
  });

});

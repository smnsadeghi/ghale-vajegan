import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const htmlContent = fs.readFileSync('C:/Users/acer/.gemini/antigravity/scratch/ghale-vajegan/index.html', 'utf8');
const swContent = fs.readFileSync('C:/Users/acer/.gemini/antigravity/scratch/ghale-vajegan/sw.js', 'utf8');
const manifestContent = fs.readFileSync('C:/Users/acer/.gemini/antigravity/scratch/ghale-vajegan/manifest.json', 'utf8');

describe('v5.1.0 Minimalist Gothic UI & Architecture Suite', () => {

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

  describe('3. Arena Visuals (#stageScene) & 1v1 Arena Duel', () => {
    it('removes yellow glowing gate box from stageScene HTML and guards JS', () => {
      assert.ok(!htmlContent.includes('id="gateGlow"'), 'gateGlow element must be removed from HTML');
      assert.ok(!htmlContent.includes('document.getElementById("gateGlow").classList'), 'Unguarded gateGlow calls must not exist');
    });

    it('removes crt-overlay from stageScene HTML and disables it in CSS', () => {
      assert.ok(!htmlContent.includes('<div class="crt-overlay"></div>'), 'crt-overlay element must be removed from HTML');
      assert.ok(htmlContent.includes('.crt-overlay {\n      display: none !important;\n    }'), 'crt-overlay must be disabled in CSS');
    });

    it('implements 1v1 duel actors and enemy HP bar in arena', () => {
      assert.ok(htmlContent.includes('id="enemyHpWrap"'), 'Must have enemyHpWrap');
      assert.ok(htmlContent.includes('id="enemyHpFill"'), 'Must have enemyHpFill');
      assert.ok(htmlContent.includes('arena-enemy') && htmlContent.includes('roadObstacle'), 'Must have enemy actor');
      assert.ok(htmlContent.includes('setupArenaEnemy'), 'Must define setupArenaEnemy function');
      assert.ok(htmlContent.includes('updateEnemyHP'), 'Must define updateEnemyHP function');
      assert.ok(!htmlContent.includes('id="gatePrincess"'), 'gatePrincess must be removed');
    });
  });

  describe('4. Vertical Mobile Layout & Viewport Optimization', () => {
    it('locks html, body and container to 100dvh', () => {
      assert.ok(htmlContent.includes('height: 100dvh;'), 'html, body or container must lock height to 100dvh');
      assert.ok(htmlContent.includes('overflow: hidden;'), 'must lock overflow to hidden');
    });

    it('makes viewArena and stage-wrapper flex items filling vertical space', () => {
      assert.ok(htmlContent.includes('#viewArena:not(.hidden)'), 'viewArena rule must exist');
      assert.ok(htmlContent.includes('.stage-wrapper'), 'stage-wrapper rule must exist');
    });

    it('compacts footer-ver and places it inside viewAuth', () => {
      assert.ok(htmlContent.includes('footer-ver'), 'footer-ver class must exist');
      assert.ok(htmlContent.includes('id="versionTrigger"'), 'versionTrigger must exist');
    });
  });

  describe('5. Version & PWA Cache Bump (v5.1.0)', () => {
    it('bumps version trigger to v5.1.0', () => {
      assert.ok(htmlContent.includes('id="versionTrigger"') && htmlContent.includes('v5.1.0'), 'Version trigger must be v5.1.0');
    });

    it('bumps Service Worker cache name to shovalie-vajeha-v5.1.0', () => {
      assert.ok(swContent.includes("const CACHE_NAME = 'shovalie-vajeha-v5.1.0';"), 'sw.js cache must be v5.1.0');
    });

    it('manifest.json has correct rebrand name and icons', () => {
      const manifest = JSON.parse(manifestContent);
      assert.equal(manifest.name, 'شوالیه واژه‌ها');
      assert.equal(manifest.short_name, 'شوالیه واژه‌ها');
      assert.ok(manifest.icons.some(i => i.src === './icon-192.png' || i.src === 'icon-192.png'));
      assert.ok(manifest.icons.some(i => i.src === './icon-512.png' || i.src === 'icon-512.png'));
    });
  });

  describe('6. Minimalist Dark-Fantasy Overhaul & 3D Flashcard System', () => {
    it('hides topBar, bottomNav and footer-ver when body.in-study is active', () => {
      assert.ok(htmlContent.includes('body.in-study #topBar'), 'Must hide topBar in study mode');
      assert.ok(htmlContent.includes('body.in-study .footer-ver'), 'Must hide footer in study mode');
      assert.ok(htmlContent.includes('body.in-study #bottomNav'), 'Must hide bottomNav in study mode');
    });

    it('removes text clutter from study mode', () => {
      assert.ok(!htmlContent.includes('بخش یادگیری آرام و مرور واژگان'), 'Must delete subtitle clutter');
      assert.ok(!htmlContent.includes('studyGestureHint'), 'Must delete gesture hint text element');
      assert.ok(!htmlContent.includes('[برای مشاهده معنا لمس کنید]'), 'Must delete tap helper text');
      assert.ok(!htmlContent.includes('[برای بازگشت به واژه لمس کنید]'), 'Must delete return helper text');
    });

    it('implements true 3D card flip CSS with transparent box and Z separation', () => {
      assert.ok(htmlContent.includes('.study-card-scene'), 'Must have study-card-scene');
      assert.ok(htmlContent.includes('perspective: 1000px;'), 'Must define perspective');
      assert.ok(htmlContent.includes('transform-style: preserve-3d;'), 'Must have preserve-3d');
      assert.ok(htmlContent.includes('backface-visibility: hidden;'), 'Must have backface-visibility hidden');
      assert.ok(htmlContent.includes('.study-card-front {\n      transform: rotateY(0deg) translateZ(1px);'), 'Must have translateZ on front');
      assert.ok(htmlContent.includes('.study-card-back {\n      transform: rotateY(180deg) translateZ(1px);'), 'Must have translateZ on back');
    });

    it('implements touch-action none and relaxed mobile tap threshold', () => {
      assert.ok(htmlContent.includes('touch-action: none;'), 'Must set touch-action none on card');
      assert.ok(htmlContent.includes('totalDx < 18 && totalDy < 18'), 'Must relax tap threshold to 18px');
      assert.ok(htmlContent.includes('currentDx < -55'), 'Must use 55px swipe threshold');
    });

    it('renders horizontal study progress dots and updates them dynamically', () => {
      assert.ok(htmlContent.includes('id="studyProgressDots"'), 'Must have studyProgressDots container in HTML');
      assert.ok(htmlContent.includes('function renderStudyProgressDots()'), 'Must define renderStudyProgressDots function');
      assert.ok(htmlContent.includes('.study-dot {') || htmlContent.includes('"study-dot"'), 'Must have study-dot styling/class');
    });

    it('strictly gates battle button in study mode until all cards viewed or already studied', () => {
      assert.ok(htmlContent.includes('function updateStudyBattleButton()'), 'Must define updateStudyBattleButton function');
      assert.ok(htmlContent.includes('btn.className = "pixel-btn btn-amber";'), 'Must enable button style when complete');
      assert.ok(htmlContent.includes('btn.className = "pixel-btn btn-slate";'), 'Must lock button style when incomplete');
    });

    it('strictly gates battle button on map view with lock until stage studied', () => {
      assert.ok(htmlContent.includes('user?.stats?.studiedStageIds?.includes(st.id) || completed.includes(st.id)'), 'Must check studied or completed status on map');
      assert.ok(htmlContent.includes('battleBtn.textContent = "🔒 نبرد";'), 'Must show lock on unstudied battle button');
    });

    it('optimizes World 1 map layout to fit 8 stages inside 100dvh', () => {
      assert.ok(htmlContent.includes('min-height:58px;') || htmlContent.includes('min-height: 58px;') || htmlContent.includes('min-height: 56px;'), 'Must compact tower cards');
      assert.ok(htmlContent.includes('grid-template-columns: repeat(4, 1fr);'), 'Portal tabs must be 4 columns in 1 row');
    });

    it('applies deep minimal dark-fantasy palette', () => {
      assert.ok(htmlContent.includes('--bg: #0d0b0a;') || htmlContent.includes('--bg: #0e0c0b;'), 'Must have true obsidian background');
      assert.ok(htmlContent.includes('--surface: #141210;') || htmlContent.includes('--surface: #161311;'), 'Must have deep charcoal stone panel');
      assert.ok(htmlContent.includes('--ink: #e8dcc8;'), 'Must have soft parchment ink');
      assert.ok(htmlContent.includes('--accent-gold: #c9a25e;'), 'Must have muted antique gold');
    });
  });

  describe('7. v5.1.0 Native Bottom Navigation & Refined Component Architecture', () => {
    it('implements native bottom navigation bar with 3 tabs in HTML', () => {
      assert.ok(htmlContent.includes('id="bottomNav"'), 'Must have bottomNav container');
      assert.ok(htmlContent.includes('id="btnNavMap"'), 'Must have btnNavMap');
      assert.ok(htmlContent.includes('id="btnNavLeaderboard"'), 'Must have btnNavLeaderboard');
      assert.ok(htmlContent.includes('id="btnNavProfile"'), 'Must have btnNavProfile');
    });

    it('defines bottom-nav CSS with active indicator and blur glass effect', () => {
      assert.ok(htmlContent.includes('.bottom-nav {'), 'Must have bottom-nav class');
      assert.ok(htmlContent.includes('.bottom-nav-item.active {'), 'Must have bottom-nav-item active class');
      assert.ok(htmlContent.includes('body.in-battle #bottomNav'), 'Must hide bottomNav in battle');
    });

    it('removes blocky pixel clip-path from buttons, windows, dialogs, and cards', () => {
      assert.ok(!htmlContent.includes('.pixel-btn {\n      font-family: \'Vazirmatn\', sans-serif;\n      font-weight: 800;\n      font-size: 0.9rem;\n      border: none;\n      padding: 10px 16px;\n      cursor: pointer;\n      display: inline-flex;\n      align-items: center;\n      justify-content: center;\n      gap: 8px;\n      color: #fff;\n      text-shadow: 2px 2px 0 #0b0d12;\n      clip-path: polygon'), 'pixel-btn must not have clip-path');
      assert.ok(!htmlContent.includes('.rpg-dialog {\n      background: var(--ink);\n      padding: 4px;\n      clip-path: polygon'), 'rpg-dialog must not have clip-path');
    });

    it('defines setupArenaEnemy and updateEnemyHP functions', () => {
      assert.ok(htmlContent.includes('function setupArenaEnemy(stage)'), 'Must define setupArenaEnemy');
      assert.ok(htmlContent.includes('function updateEnemyHP()'), 'Must define updateEnemyHP');
    });
  });

});

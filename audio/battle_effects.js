/**
 * ============================================================================
 * GHALE VAJEGAN - BATTLE VISUAL EFFECTS ENGINE (audio/battle_effects.js)
 * ============================================================================
 * Single visual effects overlay positioned strictly over the 16:9 pixel-art scene (#stageScene).
 * Driven by one unified requestAnimationFrame loop.
 * Uses ONLY transform, opacity, and CSS filter for optimal 60fps GPU execution.
 *
 * Single Source of Truth:
 * Reads intensity state (level 0-3, progress p) from BattleIntensity store
 * and musical beat phase / downbeat timing from AudioEngine.
 *
 * Accessibility & Safety:
 * - Reduced motion (prefers-reduced-motion): disables shakes, particles, and pulsing.
 * - Photosensitivity: all opacity swings <= 0.12; BPM > 140 pulses on every 2nd beat only.
 * - Quiz safety: strictly isolates overlays to #stageScene; never touches headers or quiz cards.
 * ============================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], () => factory(root));
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.BattleEffects = factory(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  root = root || (typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {}));

  /**
   * ============================================================================
   * LEVEL-TO-EFFECT MAPPING CONFIGURATION (TASK 2 & OUTPUT DELIVERABLE)
   * ============================================================================
   * Easily inspectable and tweakable configuration mapping Battle Intensity
   * levels (0 to 3) to visual parameters.
   */
  const LEVEL_CONFIG = {
    0: {
      name: 'Level 0 - Calm Baseline',
      vignetteBase: 0.0,
      vignettePulse: 0.0,
      candleFlicker: false,
      particlesCount: 0,
      ambientSpeedMult: 1.0,
      hpPulse: false,
      hpColorShift: false, // stays rose (#c9777f)
      enemyGlow: false,
      downbeatShake: false,
      downbeatFlicker: false
    },
    1: {
      name: 'Level 1 - Breathing Vignette',
      vignetteBase: 0.15,
      vignettePulse: 0.10, // pulse swing <= 0.12 (max opacity ~0.25)
      candleFlicker: true,  // candle flames flicker slightly faster
      particlesCount: 0,
      ambientSpeedMult: 1.0,
      hpPulse: false,
      hpColorShift: false,
      enemyGlow: false,
      downbeatShake: false,
      downbeatFlicker: false
    },
    2: {
      name: 'Level 2 - High Intensity Embers & Glow',
      vignetteBase: 0.28,
      vignettePulse: 0.10, // pulse swing <= 0.12 (max opacity ~0.38)
      candleFlicker: true,
      particlesCount: 16,   // 16 small rising soul/ember pixels
      ambientSpeedMult: 1.5,// fog/ambient motion speedup
      hpPulse: true,        // HP bar pulses on beat
      hpColorShift: true,   // shifts HP fill color toward ember-orange (#d9703a)
      enemyGlow: true,      // soft red outer glow (filter: drop-shadow) pulsing on beat
      downbeatShake: false,
      downbeatFlicker: false
    },
    3: {
      name: 'Level 3 - Climax / Final Stand',
      vignetteBase: 0.42,   // stronger vignette
      vignettePulse: 0.12,  // max opacity ~0.54
      candleFlicker: true,
      particlesCount: 20,
      ambientSpeedMult: 2.0,
      hpPulse: true,
      hpColorShift: true,
      enemyGlow: true,
      downbeatShake: true,  // 1-2px shake for ~80ms on downbeat only
      downbeatFlicker: true // quick brightness flicker on downbeat
    }
  };

  // State Variables
  let isRunning = false;
  let rafId = null;
  let lastFrameTime = 0;
  let currentLevel = 0;
  let targetLevel = 0;
  let currentWorld = 1;
  let beatCounter = 0;

  // Smooth Crossfade Variables (800ms transition)
  const CROSSFADE_DURATION_MS = 800;
  let currentVignetteBase = 0.0;
  let currentVignettePulse = 0.0;
  let currentParticlesAlpha = 0.0;
  let currentParticlesTargetCount = 0;

  // Beat Clock & Downbeat Timers
  let downbeatStartTime = 0;
  let downbeatShakeX = 0;
  let downbeatShakeY = 0;

  // Kill Moment Timers
  let killFlashStartTime = 0;
  let killShakeStartTime = 0;

  // Wrong Answer Pulse Timer
  let wrongPulseStartTime = 0;

  // Particle System (capped at 20 pixels)
  const MAX_PARTICLES = 20;
  const particles = [];

  // DOM Element References (cached on start)
  let stageScene = null;
  let fxOverlay = null;
  let fxVignette = null;
  let fxParticlesCanvas = null;
  let fxFlash = null;
  let fxWrongPulse = null;
  let enemySprite = null;
  let enemyHpWrap = null;
  let enemyHpFill = null;
  let candlesHud = null;
  let canvasCtx = null;

  // Subscriptions
  let unsubscribeIntensity = null;
  let unsubscribeBeat = null;

  function isReducedMotion() {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function initParticles(width, height) {
    particles.length = 0;
    const w = width > 0 ? width : 320;
    const h = height > 0 ? height : 180;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() > 0.4 ? 3 : 2,
        speedY: 18 + Math.random() * 22, // 18 - 40 px/s
        swaySpeed: 1.5 + Math.random() * 2.0,
        swayAmp: 6 + Math.random() * 8,
        seed: Math.random() * 100,
        baseAlpha: 0.35 + Math.random() * 0.45
      });
    }
  }

  function updateAndRenderParticles(ctx, w, h, dt, alpha, isReduced) {
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    if (isReduced || alpha <= 0.01) return;

    const dtSec = dt / 1000.0;
    const count = Math.min(particles.length, currentParticlesTargetCount);
    const now = performance.now() * 0.001;

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      p.y -= p.speedY * dtSec;
      const sway = Math.sin(now * p.swaySpeed + p.seed) * p.swayAmp;
      const renderX = (p.x + sway) % w;
      const finalX = renderX < 0 ? renderX + w : renderX;

      // Wrap around when rising past top edge
      if (p.y < -6) {
        p.y = h + Math.random() * 10;
        p.x = Math.random() * w;
      }

      const pAlpha = p.baseAlpha * alpha;
      // Ember orange with soft glow
      ctx.fillStyle = `rgba(217, 112, 58, ${pAlpha.toFixed(2)})`;
      ctx.fillRect(Math.round(finalX), Math.round(p.y), p.size, p.size);
    }
  }

  function handleScheduledBeat(beatInfo) {
    if (!isRunning) return;
    beatCounter = (beatInfo && typeof beatInfo.beatNumber === 'number') ? beatInfo.beatNumber : (beatCounter + 1);

    const isDownbeat = !!(beatInfo && beatInfo.isDownbeat);
    const cfg = LEVEL_CONFIG[targetLevel] || LEVEL_CONFIG[0];

    if (isDownbeat && cfg.downbeatShake && !isReducedMotion()) {
      downbeatStartTime = performance.now();
      downbeatShakeX = (Math.random() > 0.5 ? 1.5 : -1.5);
      downbeatShakeY = (Math.random() > 0.5 ? 1.0 : -1.0);
    }
  }

  /**
   * Main Unified requestAnimationFrame Render Loop
   */
  function renderLoop(timestamp) {
    if (!isRunning) return;

    if (document.hidden) {
      rafId = requestAnimationFrame(renderLoop);
      return;
    }

    if (!lastFrameTime) lastFrameTime = timestamp;
    const dt = Math.min(timestamp - lastFrameTime, 64);
    lastFrameTime = timestamp;

    const reduced = isReducedMotion();
    const targetCfg = LEVEL_CONFIG[targetLevel] || LEVEL_CONFIG[0];

    // Smooth 800ms interpolation towards target level values
    const blendFactor = Math.min(1.0, dt / CROSSFADE_DURATION_MS);
    currentVignetteBase += (targetCfg.vignetteBase - currentVignetteBase) * blendFactor;
    currentVignettePulse += (targetCfg.vignettePulse - currentVignettePulse) * blendFactor;

    const targetPAlpha = targetCfg.particlesCount > 0 ? 1.0 : 0.0;
    currentParticlesAlpha += (targetPAlpha - currentParticlesAlpha) * blendFactor;
    currentParticlesTargetCount = targetCfg.particlesCount;

    // Read Beat Phase from AudioEngine
    let beatPhase = 0;
    if (typeof root.AudioEngine !== 'undefined' && typeof root.AudioEngine.getBeatPhase === 'function') {
      beatPhase = root.AudioEngine.getBeatPhase();
    }

    // Photosensitivity Guard: When BPM > 140, pulse on every 2nd beat only
    let effectiveBpm = 100;
    if (typeof root.BattleIntensity !== 'undefined') {
      const bState = root.BattleIntensity.getState();
      if (bState && bState.effectiveBpm) effectiveBpm = bState.effectiveBpm;
    }
    const isTempoFast = effectiveBpm > 140;
    const allowBeatPulse = (!isTempoFast || (beatCounter % 2 === 0)) && !reduced;

    // Smooth breathing pulse curve (0 -> 1 -> 0)
    const beatPulseFactor = allowBeatPulse ? Math.sin(beatPhase * Math.PI) : 0;

    // 1. VIGNETTE EFFECT (Opacity only)
    if (fxVignette) {
      if (reduced) {
        fxVignette.style.opacity = currentVignetteBase.toFixed(3);
      } else {
        const vigOp = Math.min(0.60, Math.max(0, currentVignetteBase + currentVignettePulse * beatPulseFactor));
        fxVignette.style.opacity = vigOp.toFixed(3);
      }
    }

    // 2. CANDLE HUD FLICKER CLASS
    if (candlesHud) {
      candlesHud.classList.toggle('intensity-fast-flicker', !!targetCfg.candleFlicker);
    }

    // 3. ENEMY HP BAR COLOR SHIFT & BEAT PULSE
    if (enemyHpFill) {
      enemyHpFill.classList.toggle('intensity-ember', !!targetCfg.hpColorShift);
    }
    if (enemyHpWrap) {
      if (targetCfg.hpPulse && !reduced) {
        const hpScale = 1.0 + (0.12 * beatPulseFactor);
        enemyHpWrap.style.transform = `scaleY(${hpScale.toFixed(3)})`;
        enemyHpWrap.style.transformOrigin = 'bottom center';
      } else {
        enemyHpWrap.style.transform = '';
      }
    }

    // 4. PARTICLES CANVAS
    if (fxParticlesCanvas && canvasCtx) {
      const cw = fxParticlesCanvas.width || 320;
      const ch = fxParticlesCanvas.height || 180;
      updateAndRenderParticles(canvasCtx, cw, ch, dt, currentParticlesAlpha, reduced);
    }

    // 5. DOWNBEAT EFFECTS (Level 3: Shake & Brightness Flicker)
    let isDownbeatActive = false;
    if (downbeatStartTime > 0) {
      const elapsed = timestamp - downbeatStartTime;
      if (elapsed < 80) {
        isDownbeatActive = true;
      } else {
        downbeatStartTime = 0;
      }
    }

    // 6. ENEMY SPRITE GLOW & DOWNBEAT FLICKER
    if (enemySprite) {
      if (targetCfg.enemyGlow) {
        if (isDownbeatActive && targetCfg.downbeatFlicker && !reduced) {
          enemySprite.style.filter = 'drop-shadow(0 0 12px rgba(255, 60, 60, 0.95)) brightness(1.35)';
        } else if (!reduced) {
          const glowAlpha = (0.35 + 0.35 * beatPulseFactor).toFixed(3);
          enemySprite.style.filter = `drop-shadow(0 0 8px rgba(220, 40, 40, ${glowAlpha}))`;
        } else {
          enemySprite.style.filter = 'drop-shadow(0 0 6px rgba(220, 40, 40, 0.45))';
        }
      } else {
        enemySprite.style.filter = '';
      }
    }

    // 7. SCENE SHAKE (Downbeat shake or Kill Moment shake)
    let hasShake = false;
    if (killShakeStartTime > 0 && !reduced) {
      const elapsedKill = timestamp - killShakeStartTime;
      if (elapsedKill < 200) {
        hasShake = true;
        const decay = 1.0 - (elapsedKill / 200.0);
        const kx = (Math.random() * 4 - 2) * decay;
        const ky = (Math.random() * 4 - 2) * decay;
        if (stageScene) stageScene.style.transform = `translate(${kx.toFixed(1)}px, ${ky.toFixed(1)}px)`;
      } else {
        killShakeStartTime = 0;
      }
    } else if (isDownbeatActive && targetCfg.downbeatShake && !reduced) {
      hasShake = true;
      if (stageScene) stageScene.style.transform = `translate(${downbeatShakeX}px, ${downbeatShakeY}px)`;
    }

    if (!hasShake && stageScene && stageScene.style.transform !== '') {
      stageScene.style.transform = '';
    }

    // 8. KILL MOMENT WHITE FLASH (peak 0.35, 60ms in, 240ms out)
    if (killFlashStartTime > 0 && fxFlash) {
      const elapsedFlash = timestamp - killFlashStartTime;
      if (elapsedFlash < 300 && !reduced) {
        let flashOp = 0;
        if (elapsedFlash <= 60) {
          flashOp = (elapsedFlash / 60.0) * 0.35;
        } else {
          flashOp = 0.35 * (1.0 - (elapsedFlash - 60.0) / 240.0);
        }
        fxFlash.style.opacity = Math.max(0, flashOp).toFixed(3);
      } else {
        killFlashStartTime = 0;
        fxFlash.style.opacity = '0';
      }
    }

    // 9. WRONG ANSWER DARK-RED VIGNETTE PULSE (200ms)
    if (wrongPulseStartTime > 0 && fxWrongPulse) {
      const elapsedWrong = timestamp - wrongPulseStartTime;
      if (elapsedWrong < 200 && !reduced) {
        const wrongOp = 0.30 * (1.0 - elapsedWrong / 200.0);
        fxWrongPulse.style.opacity = Math.max(0, wrongOp).toFixed(3);
      } else {
        wrongPulseStartTime = 0;
        fxWrongPulse.style.opacity = '0';
      }
    }

    rafId = requestAnimationFrame(renderLoop);
  }

  /**
   * Cache DOM elements & canvas context
   */
  function bindElements() {
    if (typeof document === 'undefined') return;
    stageScene = document.getElementById('stageScene');
    fxOverlay = document.getElementById('battleEffectsOverlay');
    fxVignette = document.getElementById('fxVignette');
    fxParticlesCanvas = document.getElementById('fxParticlesCanvas');
    fxFlash = document.getElementById('fxFlash');
    fxWrongPulse = document.getElementById('fxWrongPulse');
    enemySprite = document.getElementById('enemySprite');
    enemyHpWrap = document.getElementById('enemyHpWrap');
    enemyHpFill = document.getElementById('enemyHpFill');
    candlesHud = document.getElementById('candlesHud');

    if (fxParticlesCanvas) {
      canvasCtx = fxParticlesCanvas.getContext('2d');
      const rect = fxParticlesCanvas.getBoundingClientRect();
      const w = Math.max(160, Math.round(rect.width || fxParticlesCanvas.clientWidth || 320));
      const h = Math.max(90, Math.round(rect.height || fxParticlesCanvas.clientHeight || 180));
      fxParticlesCanvas.width = w;
      fxParticlesCanvas.height = h;
      initParticles(w, h);
    }
  }

  function start(worldId = 1) {
    currentWorld = worldId;
    bindElements();

    if (typeof root.BattleIntensity !== 'undefined') {
      const bState = root.BattleIntensity.getState();
      targetLevel = bState.level || 0;
      currentLevel = targetLevel;
    } else {
      targetLevel = 0;
      currentLevel = 0;
    }

    // Set initial baseline values
    const initCfg = LEVEL_CONFIG[targetLevel] || LEVEL_CONFIG[0];
    currentVignetteBase = initCfg.vignetteBase;
    currentVignettePulse = initCfg.vignettePulse;
    currentParticlesAlpha = initCfg.particlesCount > 0 ? 1.0 : 0.0;
    currentParticlesTargetCount = initCfg.particlesCount;
    if (typeof window !== 'undefined') {
      window.arenaAmbientSpeedMult = initCfg.ambientSpeedMult || 1.0;
    }

    // Subscribe to BattleIntensity changes
    if (typeof root.BattleIntensity !== 'undefined' && typeof root.BattleIntensity.subscribe === 'function') {
      if (unsubscribeIntensity) unsubscribeIntensity();
      unsubscribeIntensity = root.BattleIntensity.subscribe(state => {
        targetLevel = (state && typeof state.level === 'number') ? state.level : 0;
        const cfg = LEVEL_CONFIG[targetLevel] || LEVEL_CONFIG[0];
        if (typeof window !== 'undefined') {
          window.arenaAmbientSpeedMult = cfg.ambientSpeedMult || 1.0;
        }
      });
    }

    // Subscribe to AudioEngine beat clock
    if (typeof root.AudioEngine !== 'undefined' && typeof root.AudioEngine.onBeat === 'function') {
      if (unsubscribeBeat) unsubscribeBeat();
      unsubscribeBeat = root.AudioEngine.onBeat(handleScheduledBeat);
    }

    isRunning = true;
    lastFrameTime = performance.now();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(renderLoop);
  }

  function stop() {
    isRunning = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (unsubscribeIntensity) {
      unsubscribeIntensity();
      unsubscribeIntensity = null;
    }
    if (unsubscribeBeat) {
      unsubscribeBeat();
      unsubscribeBeat = null;
    }

    // Reset Visual Elements
    if (fxVignette) fxVignette.style.opacity = '0';
    if (fxFlash) fxFlash.style.opacity = '0';
    if (fxWrongPulse) fxWrongPulse.style.opacity = '0';
    if (enemySprite) enemySprite.style.filter = '';
    if (enemyHpWrap) enemyHpWrap.style.transform = '';
    if (enemyHpFill) enemyHpFill.classList.remove('intensity-ember');
    if (stageScene) stageScene.style.transform = '';
    if (candlesHud) candlesHud.classList.remove('intensity-fast-flicker');

    if (fxParticlesCanvas && canvasCtx) {
      canvasCtx.clearRect(0, 0, fxParticlesCanvas.width, fxParticlesCanvas.height);
    }

    if (typeof window !== 'undefined') {
      window.arenaAmbientSpeedMult = 1.0;
    }

    currentVignetteBase = 0.0;
    currentVignettePulse = 0.0;
    currentParticlesAlpha = 0.0;
    killFlashStartTime = 0;
    killShakeStartTime = 0;
    wrongPulseStartTime = 0;
    downbeatStartTime = 0;
  }

  /**
   * Final Kill Moment:
   * 150ms hit-stop, soft white flash (peak 0.35, 60ms in, 240ms out),
   * 2px shake for 200ms, synchronized with crash cymbal.
   */
  function triggerKillMoment(onProceed) {
    if (typeof root.AudioEngine !== 'undefined' && typeof root.AudioEngine.playSfx === 'function') {
      root.AudioEngine.playSfx('crash');
    }

    if (!isReducedMotion()) {
      killFlashStartTime = performance.now();
      killShakeStartTime = performance.now();
    }

    // 150ms hit-stop before proceeding to death animation
    setTimeout(() => {
      if (typeof onProceed === 'function') {
        try { onProceed(); } catch (e) { console.error(e); }
      }
    }, 150);
  }

  /**
   * Wrong Answer:
   * Brief dark-red vignette pulse (200ms)
   */
  function triggerWrongPulse() {
    if (isReducedMotion()) return;
    wrongPulseStartTime = performance.now();
  }

  // Handle Visibility change (pause/resume rAF loop)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      } else if (isRunning && !rafId) {
        lastFrameTime = performance.now();
        rafId = requestAnimationFrame(renderLoop);
      }
    });
  }

  return {
    LEVEL_CONFIG,
    start,
    stop,
    triggerKillMoment,
    triggerWrongPulse,
    isRunning: () => isRunning,
    getCurrentLevel: () => targetLevel,
    isReducedMotion
  };
});

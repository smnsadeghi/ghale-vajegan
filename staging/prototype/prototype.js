/**
 * GHALE VAJEGAN — ISOLATED BATTLE SCENE PROTOTYPE JS
 * Event-driven controller for testing scene composition, sprite alignment,
 * lighting, and mobile readability.
 * Zero persistent game loops or requestAnimationFrame overhead.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const scene = document.getElementById('battleScene');
  const knightEl = document.getElementById('knightSprite');
  const knightLayer = document.getElementById('layerKnight');
  const obstacleEl = document.getElementById('obstacleSprite');
  const obstacleLayer = document.getElementById('layerObstacle');
  const princessLayer = document.getElementById('layerPrincess');
  const combatFx = document.getElementById('combatFxSpark');
  const deviceFrame = document.getElementById('deviceFrame');
  const progressSlider = document.getElementById('progressSlider');
  const progressVal = document.getElementById('progressVal');
  const debugGuides = document.getElementById('debugGuides');

  // Layer elements for toggling
  const layerFog = document.getElementById('layerFog');
  const layerParticles = document.getElementById('layerParticles');
  const layerTorches = document.getElementById('layerTorches');
  const layerAmbient = document.getElementById('layerAmbient');

  // State
  let currentKnightState = 'idle';
  let currentObstacle = 'bear';
  let currentDimension = '480x270';
  let currentScale = 0.38;
  let currentProgress = 35; // percent

  // Sprite Path Maps
  const knightSprites = {
    idle: '../sprites/spr_knight_idle.png',
    walk: '../sprites/spr_knight_walk.png',
    attack: '../sprites/spr_knight_attack.png',
    damage: '../sprites/spr_knight_damage.png',
    kneel: '../sprites/spr_knight_kneel.png'
  };

  const obstacleData = {
    none: null,
    trap: {
      src: '../sprites/obs_spike_trap.png',
      rawH: 102,
      rawW: 140,
      right: '110px'
    },
    bear: {
      src: '../sprites/obs_shadow_bear.png',
      rawH: 108,
      rawW: 134,
      right: '90px'
    },
    dragon: {
      src: '../sprites/obs_shadow_dragon.png',
      rawH: 201,
      rawW: 292,
      right: '25px'
    }
  };

  // 1. Knight State Switcher
  window.setKnightState = function(state) {
    if (!knightSprites[state]) return;
    currentKnightState = state;

    // Update active button
    document.querySelectorAll('[data-knight-state]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.knightState === state);
    });

    // Reset classes
    knightLayer.classList.remove('knight-walk-bob', 'knight-damage-fx');
    
    // Set sprite
    knightEl.src = knightSprites[state];

    // Trigger state-specific behavioral effects
    if (state === 'walk') {
      knightLayer.classList.add('knight-walk-bob');
    } else if (state === 'attack') {
      triggerCombatFx();
    } else if (state === 'damage') {
      knightLayer.classList.add('knight-damage-fx');
      triggerScreenShake();
    }
  };

  // Trigger sword impact spark
  function triggerCombatFx() {
    if (!combatFx) return;
    // Position spark relative to knight
    const knightRect = knightLayer.getBoundingClientRect();
    const sceneRect = scene.getBoundingClientRect();
    const sparkX = (knightRect.right - sceneRect.left) - 15;
    const sparkY = (knightRect.top - sceneRect.top) + 15;

    combatFx.style.left = `${sparkX}px`;
    combatFx.style.top = `${sparkY}px`;
    combatFx.classList.remove('active');
    void combatFx.offsetWidth; // force reflow
    combatFx.classList.add('active');
  }

  // Trigger slight screen shake on damage
  function triggerScreenShake() {
    scene.style.transform = 'translate(-2px, 2px)';
    setTimeout(() => { scene.style.transform = 'translate(2px, -1px)'; }, 50);
    setTimeout(() => { scene.style.transform = 'translate(-1px, 1px)'; }, 100);
    setTimeout(() => { scene.style.transform = 'none'; }, 150);
  }

  // 2. Obstacle Switcher
  window.setObstacle = function(type) {
    currentObstacle = type;
    document.querySelectorAll('[data-obstacle]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.obstacle === type);
    });

    const data = obstacleData[type];
    if (!data) {
      obstacleLayer.style.display = 'none';
    } else {
      obstacleLayer.style.display = 'flex';
      obstacleEl.src = data.src;
      obstacleEl.style.height = `calc(${data.rawH}px * var(--knight-scale))`;
      obstacleLayer.style.right = data.right;
    }
  };

  // 3. Knight Progress Slider
  window.updateProgress = function(val) {
    currentProgress = parseInt(val, 10);
    if (progressVal) progressVal.textContent = `${currentProgress}%`;
    
    // Interpolate horizontal position between start (25px) and end (300px)
    const minX = 24;
    const maxX = 300;
    const posX = minX + ((maxX - minX) * (currentProgress / 100));
    knightLayer.style.left = `${posX}px`;
  };

  if (progressSlider) {
    progressSlider.addEventListener('input', (e) => {
      updateProgress(e.target.value);
    });
  }

  // 4. Knight Scale Switcher
  window.setKnightScale = function(scale) {
    currentScale = parseFloat(scale);
    document.querySelectorAll('[data-scale]').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.scale) === currentScale);
    });
    document.documentElement.style.setProperty('--knight-scale', currentScale);
    
    // Update obstacle height if active
    if (currentObstacle && obstacleData[currentObstacle]) {
      const data = obstacleData[currentObstacle];
      obstacleEl.style.height = `calc(${data.rawH}px * var(--knight-scale))`;
    }
  };

  // 5. Scene Dimension Switcher (480x270 vs 480x312)
  window.setSceneDimension = function(dim) {
    currentDimension = dim;
    document.querySelectorAll('[data-dim]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.dim === dim);
    });

    if (dim === '480x270') {
      document.documentElement.style.setProperty('--scene-width', '480px');
      document.documentElement.style.setProperty('--scene-height', '270px');
      document.documentElement.style.setProperty('--ground-y', '28px');
    } else if (dim === '480x312') {
      document.documentElement.style.setProperty('--scene-width', '480px');
      document.documentElement.style.setProperty('--scene-height', '312px');
      document.documentElement.style.setProperty('--ground-y', '38px');
    }
  };

  // 6. Device Frame Switcher (Desktop, Mobile 360, Mobile 390)
  window.setDeviceMode = function(mode) {
    document.querySelectorAll('[data-device]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.device === mode);
    });
    deviceFrame.className = `device-frame mode-${mode}`;
  };

  // 7. Layer Toggles
  window.toggleLayer = function(layerId, isChecked) {
    switch (layerId) {
      case 'fog':
        layerFog.style.display = isChecked ? 'block' : 'none';
        break;
      case 'particles':
        layerParticles.style.display = isChecked ? 'block' : 'none';
        break;
      case 'torches':
        layerTorches.style.display = isChecked ? 'block' : 'none';
        break;
      case 'ambient':
        layerAmbient.style.display = isChecked ? 'block' : 'none';
        break;
      case 'princess':
        princessLayer.style.display = isChecked ? 'flex' : 'none';
        break;
      case 'guides':
        debugGuides.style.display = isChecked ? 'block' : 'none';
        knightEl.classList.toggle('debug-box', isChecked);
        if (obstacleEl) obstacleEl.classList.toggle('debug-box', isChecked);
        break;
    }
  };

  // Initialize defaults
  setKnightState('idle');
  setObstacle('bear');
  updateProgress(35);
  setKnightScale(0.38);
  setSceneDimension('480x270');
});

// const CACHE_NAME = 'shovalie-vajeha-v5.1.0';
// const CACHE_NAME = 'shovalie-vajeha-v5.2.0';
// const CACHE_NAME = 'shovalie-vajeha-v5.3.0';
// const CACHE_NAME = 'shovalie-vajeha-v6.0.0';
// const CACHE_NAME = 'shovalie-vajeha-v6.1.0';
// const CACHE_NAME = 'shovalie-vajeha-v6.2.0';
// const CACHE_NAME = 'shovalie-vajeha-v6.3.0';
// const CACHE_NAME = 'shovalie-vajeha-v6.4.0';
// const CACHE_NAME = 'shovalie-vajeha-v6.5.0';
// const CACHE_NAME = 'shovalie-vajeha-v6.6.0';
// const CACHE_NAME = 'shovalie-vajeha-v6.7.0';
// const CACHE_NAME = 'shovalie-vajeha-v6.8.0';
// const CACHE_NAME = 'shovalie-vajeha-v7.0.0';
// const CACHE_NAME = 'shovalie-vajeha-v7.1.0';
// const CACHE_NAME = 'shovalie-vajeha-v7.2.0';
const CACHE_NAME = 'shovalie-vajeha-v1.0.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './assets/icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon-32.png',
  './data/curriculum_bank.js',
  './js/scorched_city.js',
  './audio/engine.js',
  './audio/battle_effects.js',
  './audio/tracks/battle.js',
  './audio/tracks/flashcards-chill.js',
  './audio/tracks/battle-vazhgan.js',
  './audio/tracks/battle-iham.js',
  './audio/tracks/battle-kenayeh.js',
  './audio/tracks/battle-inferno.js',
  './assets/redesign/bg_w1.webp',
  './assets/redesign/bg_w2.webp',
  './assets/redesign/bg_w3.webp',
  './assets/redesign/bg_w4.webp',
  './assets/redesign/bg_scorched_city.webp',
  './assets/redesign/sprites/knight_x2.webp',
  './assets/redesign/sprites/knight_meta.json',
  './assets/redesign/sprites/enemy_w1_x2.webp',
  './assets/redesign/sprites/enemy_w1_meta.json',
  './assets/redesign/sprites/enemy_w2_x2.webp',
  './assets/redesign/sprites/enemy_w2_meta.json',
  './assets/redesign/sprites/enemy_w3_x2.webp',
  './assets/redesign/sprites/enemy_w3_meta.json',
  './assets/redesign/sprites/enemy_w4_x2.webp',
  './assets/redesign/sprites/enemy_w4_meta.json',
  './assets/world1_bg.webp',
  './assets/world2_bg.webp',
  './assets/world3_bg.webp',
  './assets/world4_bg.webp',
  './assets/knight_idle.webp',
  './assets/knight_run.webp',
  './assets/knight_attack.webp',
  './assets/obstacle_bear.webp',
  './assets/obstacle_bandit.webp',
  './assets/obstacle_shadow.webp',
  './assets/obstacle_dragon.webp',
  './assets/hud_candle_lit.webp',
  './assets/hud_candle_unlit.webp',
  './assets/map_lock_unlocked.webp',
  './assets/map_lock_locked.webp',
  './assets/bg/bg_w1_battle_ruins.webp',
  './assets/bg/bg_w1_citadel_bridge.webp',
  './assets/sprites/spr_knight_idle.png',
  './assets/sprites/spr_knight_walk.png',
  './assets/sprites/spr_knight_attack.png',
  './assets/sprites/spr_knight_damage.png',
  './assets/sprites/spr_knight_kneel.png',
  './assets/sprites/spr_princess_standing.png',
  './assets/sprites/obs_spike_trap.png',
  './assets/sprites/obs_shadow_bear.png',
  './assets/sprites/obs_shadow_dragon.png',
  './assets/props/prop_wall_torch.png',
  './assets/props/prop_broken_pillar.png',
  './assets/props/prop_mossy_boulders.png',
  './assets/props/prop_dead_tree.png',
  './assets/props/prop_signboard.png',
  './assets/props/prop_iron_chain.png',
  './assets/props/prop_lantern_lit.png',
  './assets/fx/fx_torch_flames_strip.png',
  './assets/fx/fx_ground_fog.png',
  './assets/fx/fx_golden_dust.png',
  './assets/fx/fx_portal_aura.png',
  './assets/fx/fx_sword_sparks.png',
  './assets/fx/fx_amber_impact.png',
  './assets/scorched_city_cards_final/card_combo_flame_strike_l1.jpg',
  './assets/scorched_city_cards_final/card_combo_flame_strike_l2.jpg',
  './assets/scorched_city_cards_final/card_combo_flame_strike_l3.jpg',
  './assets/scorched_city_cards_final/card_combo_golden_strike_l1.jpg',
  './assets/scorched_city_cards_final/card_combo_golden_strike_l2.jpg',
  './assets/scorched_city_cards_final/card_combo_golden_strike_l3.jpg',
  './assets/scorched_city_cards_final/card_combo_ember_chain_l1.jpg',
  './assets/scorched_city_cards_final/card_combo_ember_chain_l2.jpg',
  './assets/scorched_city_cards_final/card_combo_ember_chain_l3.jpg',
  './assets/scorched_city_cards_final/card_greed_treasure_hoard_l1.jpg',
  './assets/scorched_city_cards_final/card_greed_treasure_hoard_l2.jpg',
  './assets/scorched_city_cards_final/card_greed_treasure_hoard_l3.jpg',
  './assets/scorched_city_cards_final/card_greed_extortionist_l1.jpg',
  './assets/scorched_city_cards_final/card_greed_extortionist_l2.jpg',
  './assets/scorched_city_cards_final/card_greed_extortionist_l3.jpg',
  './assets/scorched_city_cards_final/card_greed_golden_quill_l1.jpg',
  './assets/scorched_city_cards_final/card_greed_golden_quill_l2.jpg',
  './assets/scorched_city_cards_final/card_greed_golden_quill_l3.jpg',
  './assets/scorched_city_cards_final/card_survival_threshold_guardian_l1.jpg',
  './assets/scorched_city_cards_final/card_survival_threshold_guardian_l2.jpg',
  './assets/scorched_city_cards_final/card_survival_threshold_guardian_l3.jpg',
  './assets/scorched_city_cards_final/card_survival_hidden_flame_l1.jpg',
  './assets/scorched_city_cards_final/card_survival_hidden_flame_l2.jpg',
  './assets/scorched_city_cards_final/card_survival_hidden_flame_l3.jpg',
  './assets/scorched_city_cards_final/card_survival_cracked_armor_l1.jpg',
  './assets/scorched_city_cards_final/card_survival_cracked_armor_l2.jpg',
  './assets/scorched_city_cards_final/card_survival_cracked_armor_l3.jpg',
  './assets/scorched_city_cards_final/card_arcane_passage_l1.jpg',
  './assets/scorched_city_cards_final/card_arcane_passage_l2.jpg',
  './assets/scorched_city_cards_final/card_arcane_passage_l3.jpg',
  './assets/scorched_city_cards_final/card_arcane_error_mirror_l1.jpg',
  './assets/scorched_city_cards_final/card_arcane_error_mirror_l2.jpg',
  './assets/scorched_city_cards_final/card_arcane_error_mirror_l3.jpg',
  './assets/scorched_city_cards_final/card_arcane_midnight_eye_l1.jpg',
  './assets/scorched_city_cards_final/card_arcane_midnight_eye_l2.jpg',
  './assets/scorched_city_cards_final/card_arcane_midnight_eye_l3.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network-first for API/Supabase requests, Cache-first for static assets
  if (event.request.url.includes('supabase.co') || event.request.method !== 'GET') {
    return;
  }

  // Network-first for HTML navigation so deployed updates appear immediately, falling back to cache offline
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Fallback for image requests when offline
        if (event.request.destination === 'image' || event.request.url.match(/\.(png|webp|jpg|jpeg|svg)$/i)) {
          return caches.match('./assets/bg/bg_w1_battle_ruins.webp') || caches.match('./icon.svg');
        }
        return caches.match('./index.html');
      });
    })
  );
});

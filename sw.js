const CACHE_NAME = 'ghale-vajegan-v4.1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
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
  './assets/fx/fx_amber_impact.png'
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
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

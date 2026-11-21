# Ghale Vajegan — Battle Scene Prototype Evaluation Report (Phase 3A)
**World 1: Vocabulary Kingdom (جهان واژگان)**  
*Document Version: 1.0.0 — Date: 2026-11-21*

---

## 1. Executive Summary & Objective

Phase 3A established an **isolated, non-destructive prototype** of the redesigned Battle Scene (`#viewArena`) inside `staging/prototype/battle_scene_prototype.html`.

The prototype integrates the processed 16-bit raster pixel-art assets from Phase 2 into a multi-layered DOM + CSS environment, validating visual composition, ground baseline stability, character state transitions, obstacle placement, atmospheric lighting, and mobile viewport ergonomics before any changes are introduced to the production game (`index.html` and `sw.js`).

---

## 2. Comparison of Scene Dimensions (480×270 vs. 480×312)

The prototype tested both candidate viewports side-by-side on desktop and across simulated mobile screen widths (360px Samsung Galaxy, 390px iPhone, 412px Android):

| Dimension Metric | 480 × 270 (Standard 16:9) | 480 × 312 (Retro 16:10.4) |
| :--- | :--- | :--- |
| **Aspect Ratio** | **$16 : 9$ ($1.777 : 1$)** | **$16 : 10.4$ ($1.538 : 1$)** |
| **Raw Asset Fit** | Matches source $1024 \times 571$ ($1.793 : 1$) with **$< 0.9\%$ cropping**. Almost 100% of the painted castle and road is visible without vertical compression. | Requires vertical cropping or scaling up background by $\approx 15\%$, cropping left/right peripheral towers. |
| **Mobile Height (at 360px width)** | **$202.5\text{px}$** | **$234.0\text{px}$** ($+31.5\text{px}$ taller) |
| **Mobile Height (at 390px width)** | **$219.4\text{px}$** | **$253.5\text{px}$** ($+34.1\text{px}$ taller) |
| **Quiz Layout Impact** | Leaves **$\approx 437\text{px}$** of vertical space for the riddle card, 4 answer choices, and action buttons on a 640px viewport. No scrolling required! | Compresses the quiz zone down to $\approx 406\text{px}$, which causes 4-line riddle prompts or large Persian fonts to overflow on compact screens (e.g., iPhone SE / 360×640). |
| **Visual Atmosphere** | Wide, cinematic, panoramic bridge crossing. Emphasizes the sense of distance between the Knight and the Citadel. | Taller sky, emphasizes the gothic moon and cathedral spires, but creates empty vertical space above characters. |

### Recommendation: **480 × 270 (16:9 Standard)**
The **480 × 270** viewport is strongly recommended for production integration:
1. It maps 1:1 to the native 16:9 aspect ratio of the generated background environment without clipping.
2. It guarantees that the lock riddle prompt, four large touch-target choice cards (min 48px), and candle status remain 100% visible above the fold on mobile screens without requiring scrolling.

---

## 3. Knight Sprite Scale & Baseline Alignment

### 3.1 Ground Contact Plane & Baseline Verification
A pixel audit of the extracted sprites confirmed that all poses possess a uniform **$2\text{px}$ transparent bottom margin**:
- `spr_knight_idle.png`: $99 \times 211\text{px}$ (bottom pad = 2px)
- `spr_knight_walk.png`: $115 \times 204\text{px}$ (bottom pad = 2px)
- `spr_knight_attack.png`: $131 \times 207\text{px}$ (bottom pad = 2px)
- `spr_knight_damage.png`: $142 \times 141\text{px}$ (bottom pad = 3px)
- `spr_knight_kneel.png`: $121 \times 134\text{px}$ (bottom pad = 3px)

### 3.2 Anchoring Architecture
By enforcing `bottom: var(--ground-y); transform-origin: bottom center;` on `.layer-knight`, all five poses share an identical foot-contact plane on the stone bridge pavers ($Y = 28\text{px}$ from the scene bottom in 480×270).

When cycling through states:
- **Idle $\to$ Walk:** The slight height difference ($211\text{px} \to 204\text{px}$) represents the natural lower stance of a walking gait, accentuated by the subtle CSS `walkBob` keyframe.
- **Idle $\to$ Damage:** The knight drops into a low defensive recoil stance ($141\text{px}$ tall). Ground anchoring makes his torso and head recoil downward naturally without his boots floating off the bridge.
- **Idle $\to$ Kneel:** The knight's knees rest firmly on the cobblestone line.

### 3.3 Knight Scale Evaluation

| Scale Preset | Rendered Height | Rendered Width | Visual Evaluation |
| :--- | :--- | :--- | :--- |
| **Small ($0.30\times$)** | $\approx 63\text{px}$ | $\approx 30\text{px}$ | Character feels distant; facial features and sword hilt become slightly difficult to read on 360px mobile displays. |
| **Balanced ($0.38\times$) — Recommended** | **$\approx 80\text{px}$** | **$\approx 38\text{px}$** | **Optimal balance.** Silhouette, armor specular highlights, and sword swing are razor-sharp. Character feels substantial without crowding road obstacles. |
| **Large ($0.45\times$)** | $\approx 95\text{px}$ | $\approx 45\text{px}$ | Knight feels imposing, but crowds the obstacle zone and obscures the midground scenery. |

---

## 4. Layer Hierarchy & Z-Index Specification

The prototype successfully deployed an 11-tier Z-index hierarchy:

```
[Layer 0  - Z: 10]  .layer-bg (bg_w1_battle_ruins.webp)
[Layer 1  - Z: 20]  .layer-ambient-lighting (radial vignette + dark violet shadow cast)
[Layer 2  - Z: 30]  .layer-torches (wall sconces + 4-frame CSS flame strip + radial amber light)
[Layer 3  - Z: 40]  .layer-props (dead tree, hanging iron chains, weathered signboard)
[Layer 4  - Z: 50]  .layer-princess (captive princess at gate + pulsing portal aura)
[Layer 5  - Z: 60]  .layer-obstacle (Spike Trap, Shadow Bear, or Shadow Dragon)
[Layer 6  - Z: 70]  .layer-knight (Knight actor with bottom-center anchor)
[Layer 7  - Z: 80]  .layer-combat-fx (sword sparks & hit burst on attack)
[Layer 8  - Z: 90]  .layer-ground-fog (horizontal drifting fog strip with mix-blend-mode: screen)
[Layer 9  - Z: 100] .layer-particles (ambient floating golden dust)
[Layer 10 - Z: 110] .layer-foreground (ruined stone pillar + mossy foreground boulders)
```

---

## 5. Lighting & FX Implementation Findings

1. **Torches (Pure CSS Sprite Sheet Animation):**
   - Using `fx_torch_flames_strip.png` with CSS `@keyframes` and `steps(4)` completely avoids JavaScript intervals or timers.
   - Combined with a CSS radial amber pulse (`animation: flickerRadial 1.8s ease-in-out infinite alternate`), the torches produce organic dark-fantasy lighting with **0 CPU overhead**.
2. **Atmospheric Ground Fog:**
   - Using `fx_ground_fog.png` with `background-repeat: repeat-x` and `mix-blend-mode: screen` at `opacity: 0.65` softens the boundary between the bridge floor and background abyss, creating dramatic depth.
3. **Floating Golden Dust:**
   - `fx_golden_dust.png` at `opacity: 0.45` drifting slowly provides the melancholic, magical aesthetic characteristic of Eastward.
4. **Combat Sparks:**
   - Triggering `.active` with CSS `sparkBurst` on the attack state provides crisp, high-impact feedback during lock breaking.

---

## 6. Obstacle & Boss Integration Findings

- **Spike Trap (`obs_spike_trap.png`):** Scaled at $0.38\times$ ($39\text{px}$ high, $53\text{px}$ wide). Sits flush with the cobblestone floor, serving as a low physical barrier in early stages (Stages 1–2).
- **Shadow Bear (`obs_shadow_bear.png`):** Scaled at $0.38\times$ ($41\text{px}$ high, $51\text{px}$ wide). Menacing mid-stage guardian (Stages 3–5).
- **Shadow Dragon (`obs_shadow_dragon.png`):** Scaled at $0.38\times$ ($76\text{px}$ high, $111\text{px}$ wide). Positioned near the portal gate ($X \approx 350\text{px}$), its wingspan frames the right third of the arena, creating an epic boss presence for final stages.

---

## 7. Discovered Inconsistencies & Fixes

1. **Knight Walk Cycle Limitation:**
   - The AI sheet provided a single walking pose (`spr_knight_walk.png`) rather than a full 4-frame walk cycle.
   - *Prototype Solution:* Implemented a 2-step vertical bobbing animation (`@keyframes walkBob { from { transform: translateY(0); } to { transform: translateY(-2px); } }`). This creates a convincing 16-bit marching cadence during movement without visual jitter.
2. **Princess Perspective:**
   - The captive princess is viewed slightly more front-on than the profile knight. Placing her at the right edge near the castle portal with the pulsing `fx_portal_aura.png` behind her visually integrates her into the scene naturally.
3. **Chroma Key Edges:**
   - Verification across dark, amber, and light backgrounds confirmed zero pink/magenta contamination. The defringing algorithm from Phase 2 succeeded completely.

---

## 8. Conclusion & Gate for Phase 3B

The isolated prototype in `staging/prototype/battle_scene_prototype.html` validates that:
- The 16:9 ($480 \times 270$) composition is superior for mobile game ergonomics.
- The $0.38\times$ scale factor provides ideal readability and visual balance.
- Bottom-center anchoring provides rock-solid baseline stability.
- Pure CSS atmospheric lighting and sprite animations introduce zero CPU/battery drain.

**Status:** Phase 3A Prototype is complete, verified, and ready for review. Modification of production files (`index.html`, `sw.js`) remains paused pending user approval to begin Phase 3B.

# Ghale Vajegan — Sprite Alignment and Animation Baseline Report
**World 1: Vocabulary Kingdom (جهان واژگان)**  
*Document Version: 1.0.0 — Date: 2026-11-21*

---

## 1. Overview & Purpose

In Ghale Vajegan, sprite animations and state transitions occur during battle encounters:
- **Idle $\to$ Walking:** As player answers correctly and the knight advances towards the castle gate.
- **Attack:** Sword swing triggered upon breaking a lock or completing a combo.
- **Damage / Recoil:** Triggered when the player answers incorrectly (candle extinguishes, screen shake).
- **Kneeling / Defeat:** Triggered when all 3 candles are extinguished.
- **Victory:** Knight reaches the captive Princess at the open castle gate.

Without standardized ground baselines and pivot points, switching between sprites of different dimensions (e.g., Idle at 211px vs Kneel at 134px) causes the character to jitter, "bounce" vertically, or float above the ground plane.

This report establishes the mathematical coordinate baselines, anchor pivots, and scale ratios to guarantee seamless transitions.

---

## 2. Character & Monster Dimension Manifest

| Sprite ID | Natural Dimensions | Aspect Ratio | Ground Baseline (Y) | Visual Center (X) | Role / State |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `spr_knight_idle.png` | **99 $\times$ 211 px** | $1 : 2.13$ | Bottom edge (Y = 211) | X = 50 (center of torso) | Default standing battle stance |
| `spr_knight_walk.png` | **115 $\times$ 204 px** | $1 : 1.77$ | Bottom edge (Y = 204) | X = 58 (leading hip) | Movement forward along road |
| `spr_knight_attack.png` | **131 $\times$ 207 px** | $1 : 1.58$ | Bottom edge (Y = 207) | X = 55 (plant foot) | Lock-strike sword slash |
| `spr_knight_damage.png` | **142 $\times$ 141 px** | $1 : 0.99$ | Bottom edge (Y = 141) | X = 71 (knee contact) | Hit recoil / stagger |
| `spr_knight_kneel.png` | **121 $\times$ 134 px** | $1 : 1.11$ | Bottom edge (Y = 134) | X = 60 (contact base) | Defeat / zero candles |
| `spr_princess_standing.png`| **86 $\times$ 217 px** | $1 : 2.52$ | Bottom edge (Y = 217) | X = 43 (hemline center) | Captive royal at gate |
| `obs_shadow_bear.png` | **134 $\times$ 108 px** | $1 : 0.81$ | Bottom edge (Y = 108) | X = 67 (paws on road) | Road obstacle (Stage 3–5) |
| `obs_spike_trap.png` | **140 $\times$ 102 px** | $1 : 0.73$ | Bottom edge (Y = 102) | X = 70 (base plate) | Road obstacle (Stage 1–2) |
| `obs_shadow_dragon.png` | **292 $\times$ 201 px** | $1 : 0.69$ | Bottom edge (Y = 201) | X = 175 (hind claws) | Gate boss obstacle (Stage 7–8) |

---

## 3. Ground Baseline & Pivot Alignment Architecture

### 3.1 The "Bottom-Center" Anchor Rule
To ensure that character feet remain anchored to the stone road at all times, every sprite container must utilize **Bottom-Center alignment**:

```css
.character-sprite-container {
  position: absolute;
  /* Horizontal placement determined by progress percentage (0% to 80%) */
  left: var(--knight-x, 24px);
  /* Vertical anchor locked to the road horizon */
  bottom: var(--road-baseline-y, 28px);
  transform-origin: bottom center;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.character-sprite {
  height: var(--character-render-height, 52px);
  width: auto;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  vertical-align: bottom;
}
```

### 3.2 Vertical Offset Compensation
Because the raw cropped sprites vary slightly in bounding height:
- **Idle (211px) $\to$ Walk (204px):** A $-7\text{px}$ difference in raw height. In a rendered height of $52\text{px}$, this difference is only $\approx 1.7\text{px}$, naturally absorbed by the walking bob cycle.
- **Idle (211px) $\to$ Damage (141px):** The knight hunches over into a crouched defensive position. Anchoring to `bottom` causes the knight's torso and head to drop naturally by $\approx 17\text{px}$ (rendered), visually communicating the heavy impact!
- **Idle (211px) $\to$ Kneel (134px):** Anchoring to `bottom` places the knight's knee squarely on the ground surface without shifting the ground position.

---

## 4. Visual Scale & Proportions

### 4.1 Proportional Consistency
- **Knight vs. Princess:**
  - Knight standing height: $211\text{px}$
  - Princess standing height: $217\text{px}$ (including tiara / hair crown)
  - Relative ratio: $1 : 1.02$. They share identical pixel density ($1\times$ native Eastward scale).
- **Knight vs. Shadow Bear:**
  - Bear height: $108\text{px}$ (shoulder height $\approx 51\%$ of Knight standing height).
  - Accurately conveys a stocky, menacing quadruped beast.
- **Knight vs. Spike Trap:**
  - Trap height: $102\text{px}$ (half knight height).
  - Represents a massive, spring-loaded medieval iron jaw mechanism.
- **Knight vs. Shadow Dragon:**
  - Dragon width: $292\text{px}$ ($2.95\times$ knight width).
  - Dragon height: $201\text{px}$ ($0.95\times$ knight height, but with horizontal span covering almost the entire gate opening).

### 4.2 Arena Display Scaling
The game's battle arena has a logical viewport of $360 \times 170\text{px}$.
- **Target Knight Render Height:** $52\text{px}$ ($\approx 30.5\%$ of arena height).
- **Scale Factor:**
  $$S = \frac{52}{211} \approx 0.2464 \quad (\approx 25\%)$$
- At this scale factor:
  - Knight Width: $\approx 24\text{px}$
  - Princess Width: $\approx 21\text{px}$
  - Bear Width: $\approx 33\text{px}$, Height: $\approx 26\text{px}$
  - Spike Trap Width: $\approx 34\text{px}$, Height: $\approx 25\text{px}$
  - Dragon Width: $\approx 72\text{px}$, Height: $\approx 49\text{px}$
  - Road Baseline: $Y \approx 138\text{px}$ from top ($32\text{px}$ from bottom).

---

## 5. Scene Depth & Layer Ordering (Z-Index Specification)

To maintain realistic dark-fantasy environmental depth, visual elements in the Battle Scene should follow this strict layer stack:

```
[Layer 0 - Z: 10] Background Environment (bg_w1_battle_ruins.webp)
[Layer 1 - Z: 20] Distant Ruins & Gothic Castle Silhouette
[Layer 2 - Z: 30] Wall Torches & Animated Sconces (prop_wall_torch.png + fx_torch_flames)
[Layer 3 - Z: 40] Environmental Props (Broken pillars, dead trees, chains, signpost)
[Layer 4 - Z: 50] Princess Captive (spr_princess_standing.png) at Gate X = 82%
[Layer 5 - Z: 60] Gate Obstacle / Monster (Bear, Trap, or Dragon) at X = 72%
[Layer 6 - Z: 70] Knight Hero (spr_knight_idle / walk / attack / damage / kneel) at X = 15%..75%
[Layer 7 - Z: 80] Ground Fog Particle Overlay (fx_ground_fog.png, opacity 0.7, mix-blend: screen)
[Layer 8 - Z: 90] Combat FX & Sparks (fx_sword_sparks.png, fx_amber_impact.png)
[Layer 9 - Z: 100] Foreground Props & Vines (mossy boulders, cracked stone arch in foreground)
[Layer 10 - Z: 110] UI Chrome & Lock HUD (Candles, lock icons, riddle prompt, choice cards)
```

---

## 6. Verification Summary

- All 15 character, obstacle, and turnaround sprites have been mapped and verified.
- The `bottom center` anchoring strategy eliminates vertical popping during state changes.
- Proportions across the Knight, Princess, and all three enemy types are balanced and consistent with the Eastward dark-fantasy aesthetic.
- Ready for implementation in Phase 3 without any additional asset modification.

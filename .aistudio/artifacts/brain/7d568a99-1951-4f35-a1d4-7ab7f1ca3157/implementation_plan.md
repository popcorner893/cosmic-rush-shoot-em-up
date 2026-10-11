# Global Canvas Shake & Dynamic Trauma System

Implementation plan for a dedicated, mathematically smooth global canvas shake system that applies dynamic translational displacement to the rendering context, triggering strictly on player damage events and boss encounters.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed via interactive consultation:

- **Shake Mechanics & Decay**: Dynamic non-linear trauma decay (`trauma²` formula), providing a punchy initial impact that smoothly settles back to zero, with sustained low-frequency rumble during boss presence.
- **Trigger Scope**: Strictly restricted to player damage events (shield breaks, life losses) and boss encounter events (boss entry, heavy boss barrage attacks, enraged phase, boss death). Standard enemy kills and basic blaster shots will not shake the canvas to preserve visual clarity during high-speed maneuvering.

---

### 1. Overview & Core Concept

- **What It Does**: Exposes a standalone, globally accessible canvas camera shake mechanism that applies random, directional sub-pixel and integer translations to the 2D rendering context (`ctx.translate(dx, dy)`) at the start of each frame, followed by a guaranteed `ctx.restore()` after drawing.
- **Target Audience**: Players navigating high-intensity boss battles and dodging bullet hell patterns where physical, tactile feedback elevates arcade immersion.
- **Key Value**: Delivers visceral impact and tension during critical moments without disorienting the player during regular wave clearing.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. *Player Takes Hit*: The moment La Medusa collides with an enemy or projectile, trauma jumps to a calibrated peak (e.g., `trauma = 0.5` on shield break, `0.75` on life loss). The canvas context rapidly displaces in random perpendicular vectors (up to ±10px), smoothly decaying within 300–450ms.
  2. *Boss Arrival*: Upon boss descent, a continuous rumble frequency activates, shaking the canvas with low-amplitude tremors (±3px).
  3. *Boss Heavy Barrage & Berserk Phase*: When the boss unleashes its 5-way spread or enters Berserk mode (HP < 35%), trauma surges, amplifying both displacement amplitude and high-frequency jitter.
  4. *Boss Defeated*: Epic multi-staged shockwave shake (trauma = 1.0) coinciding with the boss explosion animation before smoothly resolving to stillness.
- **Visual Feel**: Smooth sinusoidal-random offset avoiding jarring clipping or black borders; canvas background remains bound within the arcade bezel.

---

### 3. Key Product Decisions & Trade-Offs

- **Trauma-Based Quadratic Displacement (`Trauma²`)**:
  - *Chosen Approach*: Maintain a normalized trauma variable `0.0 <= trauma <= 1.0`. Displacement offset is calculated as `dx = maxOffset * trauma² * rand(-1, 1)` and `dy = maxOffset * trauma² * rand(-1, 1)`.
  - *Why*: Linear decay feels abrupt or sluggish; quadratic trauma decay feels explosive at peak impact and gives a soft, natural cushion as it settles.
  - *Alternatives Considered*: CSS translate on the `<canvas>` DOM element (can trigger browser reflows and blur canvas on high-DPI displays) vs. 2D context translation (hardware accelerated, zero DOM reflows, perfectly synchronized with frame rate).
- **Separation of Concerns**:
  - *Chosen Approach*: Implement a clean, dedicated `CanvasShake` manager class with a global instance `window.canvasShake` and a convenience helper `applyCanvasShake(ctx, callback)`.
  - *Why*: Decouples camera shake logic from the particle emitter system, enabling modular maintenance and independent testing.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Cosmic Rush Game Loop                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   [ Game Events ]                       [ Render Cycle ]
   - Player damaged                      - Clear canvas
   - Boss arrived / attacks              - window.canvasShake.update(dt)
   - Boss enraged / killed               - Get { offsetX, offsetY }
            │                                     │
            ▼                                     ▼
 ┌──────────────────────┐              ┌──────────────────────┐
 │  canvasShake.add(t)  │              │  ctx.save()          │
 │  (Increments trauma) │              │  ctx.translate(x, y) │
 └──────────────────────┘              │  Draw Entities & BG  │
                                       │  ctx.restore()       │
                                       └──────────────────────┘
```

#### Core Components & File Updates:
1. **`js/shake.js` (New Modular File)**:
   - `CanvasShakeManager`: Holds `trauma`, `decayRate`, `maxOffset`, `tremorIntensity`, and methods `addTrauma(amount)`, `setTremor(intensity)`, `update(dt)`, `getDisplacement()`.
   - Exposes global `window.canvasShake` and helper function.
2. **`index.html`**:
   - Register `<script src="js/shake.js"></script>` in the head scripts sequence.
3. **`js/game.js`**:
   - Wrap canvas rendering in `window.canvasShake` translation.
   - Bind triggers strictly to player damage methods and boss event triggers.
4. **Verification**:
   - Verify syntax via Node and test build with `compile_applet`.

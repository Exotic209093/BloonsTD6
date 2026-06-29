# 🎈 Bloons Tower Defense

A browser-based, [Bloons TD](https://en.wikipedia.org/wiki/Bloons_Tower_Defense)-style
tower defense game built with **TypeScript + HTML5 Canvas** and bundled by **Vite**.
Place monkeys along a winding track, pop waves of bloons before they escape, earn
cash, upgrade your towers, and survive all **20 rounds**.

No game engine, no runtime dependencies — just a canvas and ~1k lines of game logic.

## Gameplay

- **Place towers** — click a tower in the shop (or press `1`–`6`), then click the
  map to place it. Towers can't be placed on the path or on top of each other.
- **Start a wave** — press **Start Round** (or `Enter`). Each escaped bloon costs
  you lives; reach 0 lives and it's game over.
- **Earn & upgrade** — every pop pays cash, plus an end-of-round bonus. Select a
  placed tower to buy upgrades, change its **targeting priority** (First / Last /
  Close / Strong), or sell it for a partial refund.
- **Controls** — `Space` pause, speed toggle (1× / 2× / 3×), `Esc` to deselect.

### The bloons

Red → Blue → Green → **Yellow** (very fast, round 6) → Pink → Black (immune to
explosions) → White (immune to ice) → Lead (immune to sharp darts) → Ceramic
(tough) → **MOAB** (the round-20 boss). Popping a bloon reveals the layer inside.

### The towers

| Tower | Role |
|-------|------|
| 🐵 Dart Monkey | Cheap, reliable single-target darts |
| ✴️ Tack Shooter | Fires tacks in all directions — great on corners |
| 💣 Bomb Shooter | Area explosions (can't pop Black bloons) |
| ❄️ Ice Monkey | Freezes & damages everything in range (can't pop White) |
| 🎯 Sniper Monkey | Instantly hits one bloon anywhere — pops anything |
| 🦸 Super Monkey | A storm of energy darts — pops anything, very fast |

Because Lead is immune to sharp, Black to explosions, and White to ice, you'll
need a **mix** of towers to get through the late rounds.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

Build a production bundle:

```bash
npm run build    # type-checks, then outputs static files to dist/
npm run preview  # serve the production build locally
```

## Deploy to Vercel

This is a static Vite app — Vercel builds and serves it with zero extra config.

**Option A — Git import (recommended)**

1. Push this repo to GitHub (already wired to the `Exotic209093/BloonsTD6` repo).
2. In [Vercel](https://vercel.com/new), **Import** the repository.
3. Vercel auto-detects Vite. Confirm the settings (they match `vercel.json`):
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Framework Preset:** Vite
4. Click **Deploy**. Every push to the branch redeploys automatically.

**Option B — Vercel CLI**

```bash
npm i -g vercel
vercel          # preview deploy
vercel --prod   # production deploy
```

## Project structure

```
index.html              # app shell (Vite entry)
src/
  main.ts               # bootstrap: canvas, UI wiring, input, game loop
  style.css             # UI styling
  game/
    config.ts           # balance constants
    types.ts            # shared type contracts
    geometry.ts         # vector / segment math
    path.ts             # the track + position-along-path lookup
    bloons.ts           # bloon hierarchy & stats
    towers.ts           # tower definitions & upgrades
    waves.ts            # the 20 rounds
    entities.ts         # Bloon / Tower / Projectile + stat folding
    Game.ts             # the simulation (update + economy + lifecycle)
    renderer.ts         # canvas drawing
```

Tweak the difficulty in `config.ts` (starting cash/lives, round bonuses) and
`waves.ts` (the round table).

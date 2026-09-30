# Cursed Flight

An isometric, Monument Valley–inspired 3D web game. Mom & Dad's flights always get
canceled — war, medical emergencies, strikes, even crabs. Guide them up a pastel tower
to the plane waiting on the roof while the curses rain down from the sky.

## Run it

```bash
cd cursed-flight
npm install          # or, from scratch:
# npm install react react-dom three @react-three/fiber @react-three/drei gsap zustand
# npm install -D vite @vitejs/plugin-react tailwindcss @tailwindcss/vite
npm run dev          # http://localhost:5173
npm run build        # production bundle in dist/
```

URL flags for playtesting: `?debug` draws the parents' hitbox, `?invincible` disables
hazard collisions.

## Controls

- **Click / tap** any tile or staircase — the parents path-find there (BFS over the waypoint graph).
- **Arrow keys / WASD** or the on-screen diamond pad — step one node. The keys map to the
  isometric diagonals: ↑ up-right, → down-right, ↓ down-left, ← up-left. Press the opposite
  direction mid-step to turn around.
- **אפשרויות** (the menu button in the top bar) offers עצירה (pause), התחלה מחדש (restart the level) and יציאה (quit to the start screen at level 1, after a confirmation). **Esc** pauses/resumes and **R** restarts.

## Architecture

```
src/
├── App.jsx                     Canvas + HUD shell
├── components/
│   ├── Experience.jsx          Ortho camera at [10,10,10] → origin, responsive zoom, lights, ground, impact shake
│   ├── LevelArchitecture.jsx   Tower generated from the level graph: columns, stairs, arches, runway pad, clickable nodes
│   ├── Airplane.jsx            Low-poly jet + GSAP take-off timeline
│   ├── Player.jsx              The voxel parents, waypoint movement, walk cycle, hitbox
│   ├── HazardManager.jsx       Pooled spawner, falling physics, warning rings, collision
│   ├── HazardModels.jsx        Crab, missile, crashing plane, TV, medkit
│   ├── PowerUpManager.jsx      Prayer (Torah scroll) and summon (crystal) drops that grant a short shield
│   └── UIOverlay.jsx           Tailwind HUD, D-pad, Start / Game Over / Victory cards (GSAP)
└── game/
    ├── levelData.js            Both levels (4-floor and 6-floor towers): nodes, edges, pad, camera, palette
    ├── navigation.js           BFS, D-pad neighbour lookup, stair-aware walking height
    ├── hazards.js              Hazard types + their "flight canceled" copy
    ├── powerups.js             Pickup types + shield duration
    ├── store.js                Zustand store: phases, commands, HUD values
    ├── runtime.js              Per-frame shared data (player position/hitbox), kept out of React
    └── materials.js            Shared geometry + cached flat-shaded materials
```

Performance notes:

- Per-frame state (positions, hitbox, hazard simulation) lives in refs and plain objects, not
  React state. Nothing re-renders during play except the HUD when the floor changes.
- One unit-box geometry is scaled for every block, and materials are cached per colour.
- Hazards come from a fixed pool of 12. Each slot pre-builds every model and only toggles
  visibility, so spawning allocates nothing.
- Restarting bumps `runId`, which remounts Player, HazardManager and Airplane with a clean slate.

## Tuning

- Level layouts: `LEVEL_1` / `LEVEL_2` in `src/game/levelData.js` (add more to `LEVELS`). The geometry is derived from `NODES`/`EDGES`, so what
  you see is exactly what you can walk on.
- Difficulty: `SPAWN_INTERVAL`, `FALL_TIME` and `POOL_SIZE` in `HazardManager.jsx`.
- Shield length: `SHIELD_SECONDS` in `powerups.js`; drop frequency in `PowerUpManager.jsx`.
- Walk speed and hitbox size: `WALK_SPEED` and `HITBOX_SIZE` in `Player.jsx`.

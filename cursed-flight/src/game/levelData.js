/**
 * Level definition — the single source of truth for the tower.
 *
 * The architecture is generated from this graph, so what you can see is exactly
 * what you can walk on (no Monument Valley optical illusions: every connection is
 * physically real).
 *
 * Conventions
 *  - A node's position is the walkable surface point [x, y, z].
 *  - "tile" nodes sit in the centre of a 2×2 floor tile whose top is at y.
 *  - "stair" nodes sit halfway up a staircase that joins two tile nodes that are
 *    4 units apart horizontally and 2 units apart vertically.
 */

export const TILE = 2 // tile footprint (world units)
export const FLOOR_HEIGHT = 2 // vertical distance between floors
export const PLINTH_TOP = -0.3 // top of the stone base everything stands on

/** Pastel architectural palette, one scheme per floor. */
export const PALETTE = {
  plinth: '#EAD7B7',
  plinthSide: '#D9BF97',
  floors: [
    { body: '#F2CC8F', cap: '#F8E2B8' }, // 0 sand
    { body: '#E07A5F', cap: '#F2A98F' }, // 1 terracotta
    { body: '#5BBCB0', cap: '#94DCD2' }, // 2 turquoise
    { body: '#E9D8BE', cap: '#F7EDDC' }, // 3 beige
    { body: '#F4ACB7', cap: '#FAD1D7' }, // 4 blush (plane deck)
  ],
  arch: '#FFF8EE',
  accent: '#3D9A8B',
}

/** Walkable nodes. `floor` is used for colours and the HUD. */
export const NODES = {
  // Floor 0 — ground plaza (a small grid so there is room to dodge)
  start: { pos: [4, 0, 4], kind: 'tile', floor: 0 },
  plazaW: { pos: [2, 0, 4], kind: 'tile', floor: 0 },
  plazaC: { pos: [2, 0, 2], kind: 'tile', floor: 0 },
  plazaE: { pos: [4, 0, 2], kind: 'tile', floor: 0 },
  gate: { pos: [4, 0, 0], kind: 'tile', floor: 0 },

  // Stair A (−x) up to floor 1
  stairA: { pos: [2, 1, 0], kind: 'stair', floor: 1 },

  // Floor 1 — terracotta terrace + lookout balcony
  terrace: { pos: [0, 2, 0], kind: 'tile', floor: 1 },
  lookout: { pos: [0, 2, 2], kind: 'tile', floor: 1 },
  terraceN: { pos: [0, 2, -2], kind: 'tile', floor: 1 },

  // Stair B (+x) up to floor 2
  stairB: { pos: [2, 3, -2], kind: 'stair', floor: 2 },

  // Floor 2 — turquoise tower top
  tower: { pos: [4, 4, -2], kind: 'tile', floor: 2 },
  towerN: { pos: [4, 4, -4], kind: 'tile', floor: 2 },

  // Stair C (−x) up to floor 3
  stairC: { pos: [2, 5, -4], kind: 'stair', floor: 3 },

  // Floor 3 — beige colonnade walkway (with an archway)
  walkE: { pos: [0, 6, -4], kind: 'tile', floor: 3 },
  walkMid: { pos: [-2, 6, -4], kind: 'tile', floor: 3 },
  walkW: { pos: [-4, 6, -4], kind: 'tile', floor: 3 },

  // Stair D (+z) up to floor 4
  stairD: { pos: [-4, 7, -2], kind: 'stair', floor: 4 },

  // Floor 4 — the runway deck (slab on pillars so the walkway behind stays visible)
  deck: { pos: [-4, 8, 0], kind: 'tile', floor: 4, support: 'pillars' },
  deckE: { pos: [-2, 8, 0], kind: 'tile', floor: 4, support: 'pillars' },
  gateway: { pos: [-2, 8, 2], kind: 'tile', floor: 4, goal: true },
}

export const START_NODE = 'start'
export const GOAL_NODE = 'gateway'
export const TOP_FLOOR = 4

/** Undirected connections between nodes. */
export const EDGES = [
  ['start', 'plazaW'],
  ['start', 'plazaE'],
  ['plazaW', 'plazaC'],
  ['plazaE', 'plazaC'],
  ['plazaE', 'gate'],
  ['gate', 'stairA'],
  ['stairA', 'terrace'],
  ['terrace', 'lookout'],
  ['terrace', 'terraceN'],
  ['terraceN', 'stairB'],
  ['stairB', 'tower'],
  ['tower', 'towerN'],
  ['towerN', 'stairC'],
  ['stairC', 'walkE'],
  ['walkE', 'walkMid'],
  ['walkMid', 'walkW'],
  ['walkW', 'stairD'],
  ['stairD', 'deck'],
  ['deck', 'deckE'],
  ['deckE', 'gateway'],
]

/**
 * Staircases are derived from the graph: every stair node joins a lower and an
 * upper tile. We return enough info for LevelArchitecture to build the steps.
 */
export const STAIRS = Object.entries(NODES)
  .filter(([, n]) => n.kind === 'stair')
  .map(([id, n]) => {
    const [a, b] = EDGES.filter((e) => e.includes(id)).map((e) => (e[0] === id ? e[1] : e[0]))
    const [low, high] = NODES[a].pos[1] < NODES[b].pos[1] ? [a, b] : [b, a]
    return { id, low, high, floor: n.floor }
  })

/** Adjacency list, built once. */
export const ADJACENCY = (() => {
  const adj = Object.fromEntries(Object.keys(NODES).map((id) => [id, []]))
  for (const [a, b] of EDGES) {
    adj[a].push(b)
    adj[b].push(a)
  }
  return adj
})()

/**
 * The runway pad the plane rests on (a slab on pillars, top at y = 8).
 * The goal tile ("gateway") sits on its inner corner.
 */
export const PLANE_PAD = { min: [-5.8, 1], max: [-1, 5.8], top: 8, thickness: 0.5 }

/** Where the plane rests and which way its nose points (radians around Y). */
export const PLANE_TRANSFORM = {
  position: [-3.9, 8, 3.9],
  scale: 0.85,
  // The model's nose points down +x; this turns it towards −x/+z (screen-left).
  rotationY: (-3 * Math.PI) / 4,
}

/** Decorative archways straddling walkway tiles: [nodeId, axis the path runs along]. */
export const ARCHES = [
  ['walkE', 'x'],
  ['walkMid', 'x'],
]

/** Tiles with a low parapet wall on the given open sides (±x / ±z). */
export const PARAPETS = [['lookout', ['+z', '-x', '+x']]]

/** Low-poly trees dotted around the plinth: [x, z, scale]. */
export const TREES = [
  [6.2, 2.2, 1],
  [6.1, -1.2, 0.8],
  [0.2, 5.8, 0.9],
  [-2.4, 6.1, 1.1],
]

/** Plinth footprint the whole level stands on. */
export const PLINTH = { min: [-6.2, -6], max: [6.8, 6.6] }

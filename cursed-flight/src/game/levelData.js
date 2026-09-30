/**
 * Level definitions — the single source of truth for each tower.
 *
 * Level 1 is a 4-floor tower with the plane on a pad at floor 4; level 2 builds the
 * same base two floors higher, up to a rooftop runway at floor 6. The active level's
 * data is exposed through the live `export let` bindings below, switched by setLevel().
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
    { body: '#F4ACB7', cap: '#FAD1D7' }, // 4 blush
    { body: '#B8A6E3', cap: '#D9CEF4' }, // 5 lavender
    { body: '#7FB8E0', cap: '#B7DAF2' }, // 6 sky blue (rooftop runway)
  ],
  arch: '#FFF8EE',
  accent: '#3D9A8B',
}

/** Floors 0–4, shared by both levels. `floor` is used for colours and the HUD. */
const BASE_NODES = {
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

  // Floor 4 — blush deck (slab on pillars so the walkway behind stays visible)
  deck: { pos: [-4, 8, 0], kind: 'tile', floor: 4, support: 'pillars' },
  deckE: { pos: [-2, 8, 0], kind: 'tile', floor: 4, support: 'pillars' },
}

/** Connections between the shared nodes. */
const BASE_EDGES = [
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
]

/** Decorative archways straddling walkway tiles: [nodeId, axis the path runs along]. */
const ARCHES = [
  ['walkE', 'x'],
  ['walkMid', 'x'],
]

/** Tiles with a low parapet wall on the given open sides (±x / ±z). */
const PARAPETS = [['lookout', ['+z', '-x', '+x']]]

/** Low-poly trees dotted around the plinth: [x, z, scale]. */
const TREES = [
  [6.2, 2.2, 1],
  [6.1, -1.2, 0.8],
  [0.2, 5.8, 0.9],
  [-2.4, 6.1, 1.1],
]

/** A 0.6-wide square pillar centred on (x, z), as a support box from the plinth. */
const pillar = (x, z) => [x - 0.3, z - 0.3, x + 0.3, z + 0.3, null]

/* ------------------------------------------------------------------------------------------------
 * Level 1 — four floors; the plane waits on a pad beside the floor-4 deck.
 * --------------------------------------------------------------------------------------------- */

const LEVEL_1 = {
  nodes: {
    ...BASE_NODES,
    gateway: { pos: [-2, 8, 2], kind: 'tile', floor: 4, goal: true },
  },
  edges: [...BASE_EDGES, ['deckE', 'gateway']],
  topFloor: 4,
  /**
   * The runway pad (a slab on pillars, top at y = 8). The goal tile sits on its inner
   * corner. Supports are [minX, minZ, maxX, maxZ, baseY] boxes rising to the underside.
   */
  pad: {
    min: [-5.8, 1],
    max: [-1, 5.8],
    top: 8,
    thickness: 0.5,
    floor: 4,
    supports: [pillar(-5.4, 1.4), pillar(-5.4, 5.4), pillar(-1.4, 5.4), pillar(-3.4, 3.4)],
  },
  plane: { position: [-3.9, 8, 3.9] },
  plinth: { min: [-6.2, -6], max: [6.8, 6.6] },
  camera: { viewWidth: 17, viewHeight: 18.5, offsetY: -2.7 },
}

/* ------------------------------------------------------------------------------------------------
 * Level 2 — six floors; the plane waits on a rooftop runway.
 * --------------------------------------------------------------------------------------------- */

const LEVEL_2 = {
  nodes: {
    ...BASE_NODES,
    // Stair E (+z) from the deck's east end up to floor 5
    stairE: { pos: [-2, 9, 2], kind: 'stair', floor: 5 },

    // Floor 5 — lavender terrace at the front-left, on pillars
    terrace5E: { pos: [-2, 10, 4], kind: 'tile', floor: 5, support: 'pillars' },
    terrace5W: { pos: [-4, 10, 4], kind: 'tile', floor: 5, support: 'pillars' },

    // Stair F (−z) up to floor 6 — a floating flight so it doesn't hide the deck behind it
    stairF: { pos: [-4, 11, 2], kind: 'stair', floor: 6, support: 'floating' },

    // Floor 6 — rooftop runway with the plane
    roofW: { pos: [-4, 12, 0], kind: 'tile', floor: 6 },
    roofS: { pos: [-2, 12, 0], kind: 'tile', floor: 6 },
    roofE: { pos: [0, 12, 0], kind: 'tile', floor: 6 },
    roofN: { pos: [0, 12, -2], kind: 'tile', floor: 6 },
    gateway: { pos: [0, 12, -4], kind: 'tile', floor: 6, goal: true },
  },
  edges: [
    ...BASE_EDGES,
    ['deckE', 'stairE'],
    ['stairE', 'terrace5E'],
    ['terrace5E', 'terrace5W'],
    ['terrace5W', 'stairF'],
    ['stairF', 'roofW'],
    ['roofW', 'roofS'],
    ['roofS', 'roofE'],
    ['roofE', 'roofN'],
    ['roofN', 'gateway'],
  ],
  topFloor: 6,
  /**
   * The rooftop runway (top at y = 12), carried by a tall back wall behind the floor-3
   * walkway plus a few pillars; it overhangs the floor-4 deck. Every floor-6 node stands on it.
   */
  pad: {
    min: [-5, -6.2],
    max: [1, 1],
    top: 12,
    thickness: 0.5,
    floor: 6,
    supports: [
      [-5, -6.2, 1, -5, null], // back wall (from the plinth)
      [-2.35, -2.35, -1.65, -1.65, null], // pillar in the empty courtyard
      [-4.85, 0.45, -4.45, 0.85, 8], // pillar standing on the floor-4 deck
    ],
    wallWindows: true, // window slits on the back wall's camera-facing side
  },
  plane: { position: [-3.1, 12, -3.1] },
  plinth: { min: [-6.2, -6.8], max: [6.8, 6.6] },
  camera: { viewWidth: 19, viewHeight: 23.5, offsetY: -5.3 },
}

/* ------------------------------------------------------------------------------------------------
 * Derived data + the active level
 * --------------------------------------------------------------------------------------------- */

function buildLevel(def) {
  const { nodes, edges } = def
  // Staircases are derived from the graph: every stair node joins a lower and an upper tile.
  const stairs = Object.entries(nodes)
    .filter(([, n]) => n.kind === 'stair')
    .map(([id, n]) => {
      const [a, b] = edges.filter((e) => e.includes(id)).map((e) => (e[0] === id ? e[1] : e[0]))
      const [low, high] = nodes[a].pos[1] < nodes[b].pos[1] ? [a, b] : [b, a]
      return { id, low, high, floor: n.floor, support: n.support }
    })
  const adjacency = Object.fromEntries(Object.keys(nodes).map((id) => [id, []]))
  for (const [a, b] of edges) {
    adjacency[a].push(b)
    adjacency[b].push(a)
  }
  return { ...def, stairs, adjacency }
}

export const LEVELS = [LEVEL_1, LEVEL_2].map(buildLevel)

export const START_NODE = 'start'
export const GOAL_NODE = 'gateway'

/*
 * The active level. These are live ES-module bindings: after setLevel() every importer
 * sees the new values. The scene remounts on every level change (it is keyed by run),
 * so nothing holds on to the old level's data.
 */
export let LEVEL_INDEX = 0
export let NODES
export let EDGES
export let STAIRS
export let ADJACENCY
export let TOP_FLOOR
export let PLANE_PAD
/** Where the plane rests and which way its nose points (radians around Y). */
export let PLANE_TRANSFORM
export let PLINTH
export let CAMERA
export { ARCHES, PARAPETS, TREES }

export function setLevel(index) {
  const level = LEVELS[index]
  LEVEL_INDEX = index
  NODES = level.nodes
  EDGES = level.edges
  STAIRS = level.stairs
  ADJACENCY = level.adjacency
  TOP_FLOOR = level.topFloor
  PLANE_PAD = level.pad
  PLINTH = level.plinth
  CAMERA = level.camera
  PLANE_TRANSFORM = {
    position: level.plane.position,
    scale: 0.85,
    // The model's nose points down +x; this turns it towards −x/+z (screen-left).
    rotationY: (-3 * Math.PI) / 4,
  }
}

setLevel(0)

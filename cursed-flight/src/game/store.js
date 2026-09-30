import { create } from 'zustand'
import { NODES, START_NODE } from './levelData.js'

/**
 * Low-frequency game state (phases, HUD values, player commands).
 * Anything that changes every frame lives in runtime.js instead.
 *
 * Phases: intro → playing → (gameover | boarding → won)
 */
export const useGame = create((set, get) => ({
  phase: 'intro',
  /** Bumped on every (re)start; used as a React key to fully reset the scene. */
  runId: 0,
  /** Hazard type that cancelled the flight (for the Game Over copy). */
  cause: null,
  /** How many flights the curse has cancelled this session. */
  cancellations: 0,
  startedAt: 0,
  finishTime: 0,
  /** Node the parents are on — drives the HUD floor indicator. */
  currentNode: START_NODE,
  /** Latest movement command; `id` makes identical commands distinct. */
  command: null,
  /** Active protective shield for the HUD: { type, id } or null. */
  shield: null,

  start: () => set({ phase: 'playing', startedAt: performance.now() }),

  restart: () =>
    set((s) => ({
      phase: 'playing',
      runId: s.runId + 1,
      cause: null,
      currentNode: START_NODE,
      command: null,
      shield: null,
      startedAt: performance.now(),
    })),

  /** Called by HazardManager when a curse lands on the parents. */
  cancelFlight: (hazardType) => {
    if (get().phase !== 'playing') return
    set((s) => ({ phase: 'gameover', cause: hazardType, cancellations: s.cancellations + 1 }))
  },

  /** Called by Player when the goal tile is reached. */
  board: () => {
    if (get().phase !== 'playing') return
    set((s) => ({ phase: 'boarding', finishTime: (performance.now() - s.startedAt) / 1000 }))
  },

  /** Called by Airplane when the take-off animation completes. */
  depart: () => get().phase === 'boarding' && set({ phase: 'won' }),

  /** Called by PowerUpManager when the parents collect a prayer or summon. */
  grantShield: (type) => set((s) => ({ shield: { type, id: (s.shield?.id ?? 0) + 1 } })),

  /** Called by Player when the shield timer runs out. */
  clearShield: () => get().shield && set({ shield: null }),

  setCurrentNode: (id) => get().currentNode !== id && set({ currentNode: id }),

  /** { type: 'goto', node } or { type: 'step', dir } */
  issueCommand: (cmd) => {
    if (get().phase !== 'playing') return
    set((s) => ({ command: { ...cmd, id: (s.command?.id ?? 0) + 1 } }))
  },
}))

export const selectFloor = (s) => NODES[s.currentNode].floor

// Handy for poking at the game from the browser console during development.
if (import.meta.env.DEV && typeof window !== 'undefined') window.__game = useGame

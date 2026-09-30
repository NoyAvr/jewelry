import { create } from 'zustand'
import { LEVELS, NODES, setLevel, START_NODE } from './levelData.js'

/**
 * Low-frequency game state (phases, HUD values, player commands).
 * Anything that changes every frame lives in runtime.js instead.
 *
 * Phases: intro → playing → (gameover | boarding → won)
 * After winning, nextLevel() moves on; after the last level, playAgain() starts over.
 * askQuit() pauses play ('paused') until resume() or quit(), which goes back to the intro at level 1.
 */
export const useGame = create((set, get) => ({
  phase: 'intro',
  /** Index into LEVELS of the tower being played. */
  level: 0,
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
  /** Latest false alarm for the HUD toast: { type, id } or null. */
  falseAlarm: null,

  start: () => set({ phase: 'playing', startedAt: performance.now() }),

  /** Replays the current level from the bottom. */
  restart: () => get().loadLevel(get().level),

  /** Moves on to the next tower after a win. */
  nextLevel: () => get().loadLevel(Math.min(get().level + 1, LEVELS.length - 1)),

  /** Starts the whole journey over from level 1. */
  playAgain: () => get().loadLevel(0),

  /** Pauses the game while the player confirms quitting. */
  askQuit: () => get().phase === 'playing' && set({ phase: 'paused', pausedAt: performance.now() }),

  /** Closes the quit prompt; the pause doesn't count towards the climb time. */
  resume: () =>
    get().phase === 'paused' &&
    set((s) => ({ phase: 'playing', startedAt: s.startedAt + (performance.now() - s.pausedAt) })),

  /** Quits to the start screen; the next journey starts from level 1 with a clean slate. */
  quit: () => {
    setLevel(0)
    set((s) => ({
      phase: 'intro',
      level: 0,
      runId: s.runId + 1,
      cancellations: 0,
      cause: null,
      currentNode: START_NODE,
      command: null,
      shield: null,
      falseAlarm: null,
    }))
  },

  /** Switches the active level data, then remounts the scene (via runId) with a clean slate. */
  loadLevel: (level) => {
    setLevel(level)
    set((s) => ({
      phase: 'playing',
      level,
      runId: s.runId + 1,
      cause: null,
      currentNode: START_NODE,
      command: null,
      shield: null,
      falseAlarm: null,
      startedAt: performance.now(),
    }))
  },

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

  /** Called by HazardManager when a curse hits but the flight goes ahead anyway. */
  raiseFalseAlarm: (type) => set((s) => ({ falseAlarm: { type, id: (s.falseAlarm?.id ?? 0) + 1 } })),

  /** Hides the toast, unless a newer false alarm has replaced it meanwhile. */
  clearFalseAlarm: (id) => get().falseAlarm?.id === id && set({ falseAlarm: null }),

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

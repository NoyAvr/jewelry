import { Box3, Vector3 } from 'three'
import { START_NODE } from './levelData.js'

/**
 * Hot, per-frame game data shared between systems.
 *
 * This deliberately lives outside React/Zustand: it is mutated every frame by
 * Player and read every frame by HazardManager, and pushing it through React
 * state would cause 60 re-renders per second for no visual benefit.
 */
export const playerRuntime = {
  /** Feet position of the couple (world space, inside the level group). */
  position: new Vector3(),
  /** Axis-aligned hitbox around both parents; kept in sync by Player. */
  hitbox: new Box3(),
  /** Node the couple is standing on or last left. */
  currentNode: START_NODE,
  /** Node the couple is walking towards (null when idle). */
  nextNode: null,
  /** Remaining queued nodes after `nextNode`. */
  queue: [],
}

export function resetPlayerRuntime() {
  playerRuntime.currentNode = START_NODE
  playerRuntime.nextNode = null
  playerRuntime.queue = []
  playerRuntime.hitbox.makeEmpty()
}

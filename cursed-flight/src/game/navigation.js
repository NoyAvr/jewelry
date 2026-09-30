import { ADJACENCY, NODES } from './levelData.js'

/** Breadth-first search → list of node ids from `from` to `to` (inclusive), or null. */
export function findPath(from, to) {
  if (from === to) return [from]
  const prev = { [from]: null }
  const queue = [from]
  while (queue.length) {
    const id = queue.shift()
    for (const next of ADJACENCY[id]) {
      if (next in prev) continue
      prev[next] = id
      if (next === to) {
        const path = [to]
        for (let cur = id; cur !== null; cur = prev[cur]) path.unshift(cur)
        return path
      }
      queue.push(next)
    }
  }
  return null
}

/** All node ids within `maxHops` graph steps of `from` (including itself). */
export function nodesWithin(from, maxHops) {
  const dist = { [from]: 0 }
  const queue = [from]
  while (queue.length) {
    const id = queue.shift()
    if (dist[id] === maxHops) continue
    for (const next of ADJACENCY[id]) {
      if (next in dist) continue
      dist[next] = dist[id] + 1
      queue.push(next)
    }
  }
  return Object.keys(dist)
}

/**
 * Isometric D-pad directions mapped onto the world grid axes. With the camera at
 * [10, 10, 10] the world axes appear as screen diagonals, so the on-screen pad is
 * a diamond whose buttons point along those diagonals.
 */
export const DIRECTIONS = {
  upRight: [0, -1], // −z
  downRight: [1, 0], // +x
  downLeft: [0, 1], // +z
  upLeft: [-1, 0], // −x
}

/** The neighbour of `nodeId` lying (horizontally) in `dir`, or null. */
export function neighborInDirection(nodeId, dir) {
  const [dx, dz] = DIRECTIONS[dir]
  const [x, , z] = NODES[nodeId].pos
  let best = null
  let bestDot = 0.7 // must be clearly in that direction
  for (const next of ADJACENCY[nodeId]) {
    const [nx, , nz] = NODES[next].pos
    const len = Math.hypot(nx - x, nz - z) || 1
    const dot = ((nx - x) * dx + (nz - z) * dz) / len
    if (dot > bestDot) {
      bestDot = dot
      best = next
    }
  }
  return best
}

/**
 * Walking height along an edge at progress t ∈ [0, 1].
 * Between a tile and a stair node the first unit is flat (the tile), then the
 * path ramps up the steps, so the parents never float above the floor.
 */
export function edgeHeight(fromId, toId, t) {
  const a = NODES[fromId]
  const b = NODES[toId]
  const ya = a.pos[1]
  const yb = b.pos[1]
  if (ya === yb) return ya
  if (a.kind === b.kind) return ya + (yb - ya) * t

  const len = Math.hypot(b.pos[0] - a.pos[0], b.pos[2] - a.pos[2])
  const halfTile = 1 / len // fraction of the edge that lies on the tile
  if (a.kind === 'tile') {
    return t <= halfTile ? ya : ya + ((yb - ya) * (t - halfTile)) / (1 - halfTile)
  }
  return t >= 1 - halfTile ? yb : ya + ((yb - ya) * t) / (1 - halfTile)
}

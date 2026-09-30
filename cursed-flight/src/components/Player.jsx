import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { GOAL_NODE, NODES, PLANE_TRANSFORM, START_NODE } from '../game/levelData.js'
import { edgeHeight, findPath, neighborInDirection } from '../game/navigation.js'
import { playerRuntime, resetPlayerRuntime } from '../game/runtime.js'
import { useGame } from '../game/store.js'
import { flatMaterial, UNIT_BOX } from '../game/materials.js'

/* ------------------------------------------------------------------------------------------------
 * Tunables
 * --------------------------------------------------------------------------------------------- */

const WALK_SPEED = 3.4 // world units per second
const TURN_SPEED = 14 // yaw smoothing (higher = snappier)
/** Hitbox around both parents (+ suitcase). Axis-aligned, so it is a little generous. */
const HITBOX_SIZE = new THREE.Vector3(1.0, 1.1, 1.0)
const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug')

/** World point by the plane's rear door where the parents disappear when boarding. */
const BOARDING_POINT = new THREE.Vector3(-1.4, 0, 0)
  .multiplyScalar(PLANE_TRANSFORM.scale)
  .applyAxisAngle(new THREE.Vector3(0, 1, 0), PLANE_TRANSFORM.rotationY)
  .add(new THREE.Vector3(...PLANE_TRANSFORM.position))

const SKIN = flatMaterial('#F1C7A5')

/* ------------------------------------------------------------------------------------------------
 * The voxel parents
 * --------------------------------------------------------------------------------------------- */

/** Box helper — every body part is a scaled unit cube (one shared geometry). */
function Part({ position, size, material }) {
  return <mesh geometry={UNIT_BOX} material={material} position={position} scale={size} castShadow />
}

/**
 * One blocky parent, facing local +z. Limbs hang from pivot groups so a single
 * rotation swings them naturally. `motion` is a shared ref written by <Player>.
 */
function Parent({ variant, motion, offset }) {
  const legL = useRef()
  const legR = useRef()
  const armL = useRef()
  const armR = useRef()
  const body = useRef()
  const isDad = variant === 'dad'
  const phaseShift = isDad ? 0 : Math.PI * 0.35 // they don't walk in perfect lockstep

  useFrame(() => {
    const { walk, phase } = motion.current
    const swing = Math.sin(phase + phaseShift) * 0.65 * walk
    legL.current.rotation.x = swing
    legR.current.rotation.x = -swing
    armL.current.rotation.x = -swing * 0.8
    armR.current.rotation.x = swing * 0.8
    body.current.position.y = Math.abs(Math.sin(phase + phaseShift)) * 0.05 * walk
  })

  const top = flatMaterial(isDad ? '#6C8EBF' : '#E98A7A')
  const bottom = flatMaterial(isDad ? '#3E4A61' : '#8C5E58')
  const hair = flatMaterial(isDad ? '#1E1E22' : '#B08158')

  return (
    <group position={[offset, 0, 0]}>
      <group ref={body}>
        {/* Legs */}
        <group ref={legL} position={[-0.08, 0.4, 0]}>
          <Part position={[0, -0.2, 0]} size={[0.12, 0.4, 0.14]} material={bottom} />
        </group>
        <group ref={legR} position={[0.08, 0.4, 0]}>
          <Part position={[0, -0.2, 0]} size={[0.12, 0.4, 0.14]} material={bottom} />
        </group>

        {/* Torso (dad: shirt, mom: dress with a flared skirt) */}
        <Part position={[0, 0.6, 0]} size={[0.34, 0.4, 0.22]} material={top} />
        {!isDad && (
          <mesh position={[0, 0.38, 0]} material={top} castShadow>
            <cylinderGeometry args={[0.2, 0.26, 0.26, 6]} />
          </mesh>
        )}

        {/* Arms */}
        <group ref={armL} position={[-0.23, 0.76, 0]}>
          <Part position={[0, -0.16, 0]} size={[0.1, 0.34, 0.12]} material={top} />
          <Part position={[0, -0.36, 0]} size={[0.09, 0.08, 0.1]} material={SKIN} />
        </group>
        <group ref={armR} position={[0.23, 0.76, 0]}>
          <Part position={[0, -0.16, 0]} size={[0.1, 0.34, 0.12]} material={top} />
          <Part position={[0, -0.36, 0]} size={[0.09, 0.08, 0.1]} material={SKIN} />
        </group>

        {/* Head + hair */}
        <Part position={[0, 0.95, 0]} size={[0.26, 0.26, 0.26]} material={SKIN} />
        {isDad ? (
          <Part position={[0, 1.1, -0.02]} size={[0.28, 0.07, 0.28]} material={hair} />
        ) : (
          // Bob: a crown, short fringe, and sides + back that stop at chin level
          <>
            <Part position={[0, 1.11, -0.01]} size={[0.31, 0.08, 0.31]} material={hair} />
            <Part position={[0, 1.05, 0.14]} size={[0.3, 0.06, 0.03]} material={hair} />
            <Part position={[-0.145, 0.96, -0.01]} size={[0.04, 0.24, 0.29]} material={hair} />
            <Part position={[0.145, 0.96, -0.01]} size={[0.04, 0.24, 0.29]} material={hair} />
            <Part position={[0, 0.96, -0.145]} size={[0.31, 0.24, 0.04]} material={hair} />
          </>
        )}
      </group>
    </group>
  )
}

function Suitcase() {
  return (
    <group position={[-0.56, 0, 0.02]}>
      <Part position={[0, 0.24, 0]} size={[0.14, 0.36, 0.28]} material={flatMaterial('#F2CC8F')} />
      <Part position={[0, 0.25, 0]} size={[0.15, 0.05, 0.29]} material={flatMaterial('#E07A5F')} />
      <Part position={[0, 0.48, 0]} size={[0.03, 0.14, 0.03]} material={flatMaterial('#3E4A61')} />
    </group>
  )
}

/* ------------------------------------------------------------------------------------------------
 * Player controller
 * --------------------------------------------------------------------------------------------- */

const tmpCenter = new THREE.Vector3()

function shortestAngle(from, to) {
  return ((((to - from + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI
}

function edgeLength(a, b) {
  const pa = NODES[a].pos
  const pb = NODES[b].pos
  return Math.hypot(pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2])
}

export default function Player() {
  const root = useRef() // world position of the couple's feet
  const yawGroup = useRef() // facing direction
  const couple = useRef() // squash / shrink tweens
  const debugBox = useRef()
  const motion = useRef({ walk: 0, phase: 0 })
  /**
   * Navigation state: walking along the edge `from → to` at progress `t`,
   * then continuing through `queue`. Idle when `to` is null.
   */
  const nav = useRef({ from: START_NODE, to: null, t: 0, queue: [] })

  // Fresh runtime on mount (the component is keyed by runId, so this is every restart).
  useEffect(() => {
    resetPlayerRuntime()
    useGame.getState().setCurrentNode(START_NODE)
  }, [])

  /* ---- Commands from the HUD / clicks / keyboard ------------------------------------------ */
  useEffect(() => {
    const reverse = () => {
      const n = nav.current
      ;[n.from, n.to] = [n.to, n.from]
      n.t = 1 - n.t
    }

    const handle = (cmd) => {
      const n = nav.current
      if (cmd.type === 'goto') {
        if (!n.to) {
          n.queue = (findPath(n.from, cmd.node) ?? [n.from]).slice(1)
          return
        }
        // Mid-edge: either finish this edge or turn around, whichever is shorter.
        const ahead = findPath(n.to, cmd.node)
        const behind = findPath(n.from, cmd.node)
        if (behind && ahead && behind.length < ahead.length) {
          reverse()
          n.queue = behind.slice(1)
        } else {
          n.queue = (ahead ?? [n.to]).slice(1)
        }
      } else if (cmd.type === 'step') {
        // Pressing "back" while walking an edge turns the couple around on the spot.
        if (n.to && neighborInDirection(n.to, cmd.dir) === n.from) {
          reverse()
          n.queue = []
          return
        }
        // Otherwise queue one step from wherever we'll be standing next.
        const next = neighborInDirection(n.to ?? n.from, cmd.dir)
        n.queue = next ? [next] : []
      }
    }

    return useGame.subscribe((state, prev) => {
      if (state.command && state.command !== prev.command) handle(state.command)
    })
  }, [])

  /* ---- Scripted reactions: squash on Game Over, walk into the plane on victory ------------- */
  useEffect(() => {
    let ctx
    const unsub = useGame.subscribe((state, prev) => {
      if (state.phase === prev.phase) return
      ctx?.revert()
      ctx = gsap.context(() => {
        if (state.phase === 'gameover') {
          motion.current.walk = 0
          gsap.to(couple.current.scale, { y: 0.28, x: 1.35, z: 1.35, duration: 0.5, ease: 'elastic.out(1, 0.4)' })
        }
        if (state.phase === 'boarding') {
          const p = root.current.position
          yawGroup.current.rotation.y = Math.atan2(BOARDING_POINT.x - p.x, BOARDING_POINT.z - p.z)
          motion.current.walk = 1
          gsap.to(p, { x: BOARDING_POINT.x, z: BOARDING_POINT.z, duration: 0.8, ease: 'none' })
          gsap.to(couple.current.scale, { x: 0, y: 0, z: 0, duration: 0.35, delay: 0.6, ease: 'back.in(2)' })
        }
      })
    })
    return () => {
      unsub()
      ctx?.revert()
    }
  }, [])

  /* ---- Per-frame movement ------------------------------------------------------------------ */
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05) // avoid huge jumps after a tab switch
    const { phase } = useGame.getState()
    const m = motion.current

    if (phase === 'boarding') {
      m.phase += dt * 11
      return
    }
    if (phase !== 'playing') {
      m.walk = THREE.MathUtils.damp(m.walk, 0, 10, dt)
      return
    }

    // 1. Advance along the waypoint graph.
    const n = nav.current
    let budget = WALK_SPEED * dt
    while (budget > 0) {
      if (!n.to) {
        if (!n.queue.length) break
        n.to = n.queue.shift()
        n.t = 0
      }
      const len = edgeLength(n.from, n.to)
      const remaining = (1 - n.t) * len
      if (budget < remaining) {
        n.t += budget / len
        budget = 0
      } else {
        budget -= remaining
        n.from = n.to
        n.to = null
        n.t = 0
        useGame.getState().setCurrentNode(n.from)
        if (n.from === GOAL_NODE) {
          n.queue = []
          useGame.getState().board()
          break
        }
      }
    }

    // 2. Place the couple on the path (with stair-aware height).
    const a = NODES[n.from].pos
    const pos = root.current.position
    if (n.to) {
      const b = NODES[n.to].pos
      pos.set(
        THREE.MathUtils.lerp(a[0], b[0], n.t),
        edgeHeight(n.from, n.to, n.t),
        THREE.MathUtils.lerp(a[2], b[2], n.t),
      )
      const targetYaw = Math.atan2(b[0] - a[0], b[2] - a[2])
      const yaw = yawGroup.current.rotation
      yaw.y += shortestAngle(yaw.y, targetYaw) * Math.min(1, TURN_SPEED * dt)
    } else {
      pos.set(a[0], a[1], a[2])
    }

    // 3. Walk-cycle animation.
    const moving = !!n.to
    m.walk = THREE.MathUtils.damp(m.walk, moving ? 1 : 0, 10, dt)
    if (moving) m.phase += dt * 11

    // 4. Publish hitbox + navigation for the hazard system.
    tmpCenter.set(pos.x, pos.y + HITBOX_SIZE.y / 2, pos.z)
    playerRuntime.position.copy(pos)
    playerRuntime.hitbox.setFromCenterAndSize(tmpCenter, HITBOX_SIZE)
    playerRuntime.currentNode = n.from
    playerRuntime.nextNode = n.to
    playerRuntime.queue = n.queue
    if (debugBox.current) debugBox.current.position.copy(tmpCenter)
  })

  const start = NODES[START_NODE].pos
  return (
    <>
      <group ref={root} position={start}>
        <group ref={yawGroup} rotation={[0, Math.PI / 4, 0]}>
          <group ref={couple}>
            <Parent variant="dad" motion={motion} offset={-0.24} />
            <Parent variant="mom" motion={motion} offset={0.24} />
            <Suitcase />
          </group>
        </group>
      </group>
      {DEBUG && (
        <mesh ref={debugBox} scale={HITBOX_SIZE.toArray()}>
          <boxGeometry />
          <meshBasicMaterial color="#ff0066" wireframe />
        </mesh>
      )}
    </>
  )
}

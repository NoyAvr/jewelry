import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GOAL_NODE, NODES } from '../game/levelData.js'
import { HAZARD_KEYS, HAZARD_TYPES } from '../game/hazards.js'
import { nodesWithin } from '../game/navigation.js'
import { playerRuntime } from '../game/runtime.js'
import { useGame } from '../game/store.js'
import { HAZARD_MODELS } from './HazardModels.jsx'

/* ------------------------------------------------------------------------------------------------
 * Tunables
 * --------------------------------------------------------------------------------------------- */

const POOL_SIZE = 12 // max simultaneous hazards (object pool — nothing is allocated at runtime)
const DROP_HEIGHT = 16 // how far above its target a hazard spawns
const FIRST_SPAWN_DELAY = 1.6
const SPAWN_INTERVAL = [1.35, 0.55] // seconds between spawns: [easy, hard]
const FALL_TIME = [1.55, 1.05] // seconds from spawn to impact: [easy, hard]
const IMPACT_TIME = 0.45 // squash + shockwave duration
const IMPACT_LETHAL_TIME = 0.08 // landing still hurts for a split second
const ALL_NODES = Object.keys(NODES)
/** Playtesting aid: `?invincible` in the URL disables hazard collisions. */
const INVINCIBLE = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('invincible')

const RING_GEO = new THREE.RingGeometry(0.5, 0.66, 28).rotateX(-Math.PI / 2)
const SHADOW_GEO = new THREE.CircleGeometry(0.55, 20).rotateX(-Math.PI / 2)

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const lerp = THREE.MathUtils.lerp

/**
 * Choose a node to curse. Mostly the parents' current/next waypoint (pressure),
 * sometimes somewhere nearby (area denial), occasionally anywhere (ambience).
 */
function pickTarget(busy) {
  const here = playerRuntime.nextNode ?? playerRuntime.currentNode
  const focus = [playerRuntime.nextNode, playerRuntime.queue[0], playerRuntime.currentNode]
  const nearby = nodesWithin(here, 3)
  const roll = Math.random()
  const pool = roll < 0.5 ? focus : roll < 0.85 ? nearby : ALL_NODES
  const free = (list) => list.filter((id) => id && id !== GOAL_NODE && !busy.has(id))
  const candidates = free(pool)
  return candidates.length ? pick(candidates) : pick(free(nearby)) ?? null
}

/* ------------------------------------------------------------------------------------------------
 * One pooled hazard: a falling body (with every model pre-built, only one visible) plus a
 * warning ring and a growing shadow at the landing spot.
 * --------------------------------------------------------------------------------------------- */

function HazardSlot({ index, register }) {
  const body = useRef()
  const marker = useRef()
  const ring = useRef()
  const shadow = useRef()
  const models = useRef({})
  // Per-slot materials because each slot fades independently.
  const ringMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#E0533D', transparent: true, opacity: 0, depthWrite: false }),
    [],
  )
  const shadowMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#2F3E46', transparent: true, opacity: 0, depthWrite: false }),
    [],
  )

  useLayoutEffect(() => {
    register(index, {
      body: body.current,
      marker: marker.current,
      ring: ring.current,
      shadow: shadow.current,
      models: models.current,
      ringMat,
      shadowMat,
    })
    return () => {
      ringMat.dispose()
      shadowMat.dispose()
    }
  }, [index, register, ringMat, shadowMat])

  return (
    <>
      <group ref={body} visible={false}>
        {HAZARD_KEYS.map((key) => {
          const Model = HAZARD_MODELS[key]
          return (
            <group key={key} ref={(el) => (models.current[key] = el)} visible={false}>
              <Model />
            </group>
          )
        })}
      </group>
      <group ref={marker} visible={false}>
        <mesh ref={ring} geometry={RING_GEO} material={ringMat} position={[0, 0.03, 0]} renderOrder={2} />
        <mesh ref={shadow} geometry={SHADOW_GEO} material={shadowMat} position={[0, 0.025, 0]} renderOrder={1} />
      </group>
    </>
  )
}

/* ------------------------------------------------------------------------------------------------
 * Manager: spawning, falling, collision and impact effects — all in one useFrame.
 * --------------------------------------------------------------------------------------------- */

export default function HazardManager() {
  const views = useRef([]) // scene-graph handles per slot
  const hazards = useMemo(
    () =>
      Array.from({ length: POOL_SIZE }, () => ({
        active: false,
        type: 'crab',
        node: null,
        state: 'falling', // 'falling' | 'impact'
        age: 0,
        fallTime: 1,
        gravity: 1,
        groundY: 0,
        spin: new THREE.Vector3(),
      })),
    [],
  )
  const clock = useRef({ elapsed: 0, nextSpawn: FIRST_SPAWN_DELAY })
  const sphere = useMemo(() => new THREE.Sphere(), [])

  const register = useCallback((i, view) => {
    views.current[i] = view
  }, [])

  const spawn = (difficulty) => {
    const slot = hazards.findIndex((h) => !h.active)
    if (slot === -1) return
    const busy = new Set(hazards.filter((h) => h.active).map((h) => h.node))
    const node = pickTarget(busy)
    if (!node) return

    const h = hazards[slot]
    const v = views.current[slot]
    const [x, y, z] = NODES[node].pos
    h.active = true
    h.type = pick(HAZARD_KEYS)
    h.node = node
    h.state = 'falling'
    h.age = 0
    h.fallTime = lerp(FALL_TIME[0], FALL_TIME[1], difficulty) * THREE.MathUtils.randFloat(0.9, 1.1)
    h.gravity = (2 * DROP_HEIGHT) / (h.fallTime * h.fallTime) // s = ½gt² → lands exactly at fallTime
    h.groundY = y
    const tumble = HAZARD_TYPES[h.type].tumble
    h.spin.set(THREE.MathUtils.randFloatSpread(6), THREE.MathUtils.randFloatSpread(6), THREE.MathUtils.randFloatSpread(6)).multiplyScalar(tumble)

    for (const key of HAZARD_KEYS) v.models[key].visible = key === h.type
    v.body.visible = true
    v.body.scale.setScalar(1)
    v.body.rotation.set(0, Math.random() * Math.PI * 2, 0)
    v.body.position.set(x, y + DROP_HEIGHT, z)
    v.marker.visible = true
    v.marker.position.set(x, y, z)
    v.ring.scale.setScalar(1)
  }

  const retire = (h, v) => {
    h.active = false
    v.body.visible = false
    v.marker.visible = false
  }

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const { phase, cancelFlight, currentNode } = useGame.getState()
    // Nothing falls before the game starts; everything freezes dramatically on Game Over.
    if (phase === 'intro' || phase === 'gameover') return

    // --- Spawning (ramps up with time and altitude) ---
    const c = clock.current
    c.elapsed += dt
    if (phase === 'playing') {
      const difficulty = THREE.MathUtils.clamp(c.elapsed / 75 + NODES[currentNode].floor / 10, 0, 1)
      c.nextSpawn -= dt
      if (c.nextSpawn <= 0) {
        spawn(difficulty)
        c.nextSpawn = lerp(SPAWN_INTERVAL[0], SPAWN_INTERVAL[1], difficulty) * THREE.MathUtils.randFloat(0.75, 1.25)
      }
    }

    // --- Simulation ---
    for (let i = 0; i < POOL_SIZE; i++) {
      const h = hazards[i]
      if (!h.active) continue
      const v = views.current[i]
      const { radius, tumble } = HAZARD_TYPES[h.type]
      h.age += dt

      if (h.state === 'falling') {
        const fallen = 0.5 * h.gravity * h.age * h.age
        const progress = Math.min(fallen / DROP_HEIGHT, 1)
        v.body.position.y = h.groundY + radius + Math.max(DROP_HEIGHT - fallen, 0)
        v.body.rotation.x += h.spin.x * dt
        v.body.rotation.y += (h.spin.y + (tumble === 0 ? 8 : 0)) * dt // missiles spin on their axis
        v.body.rotation.z += h.spin.z * dt

        // Warning ring pulses faster as impact approaches; shadow grows and darkens.
        v.ringMat.opacity = 0.45 + 0.4 * Math.sin(h.age * (8 + progress * 18))
        v.shadow.scale.setScalar(lerp(0.25, 1, progress))
        v.shadowMat.opacity = 0.35 * progress

        if (progress >= 1) {
          h.state = 'impact'
          h.age = 0
          v.body.rotation.x = v.body.rotation.z = 0 // settle upright on the floor
        }
      } else {
        // Impact: squash the object into the floor and blast a shockwave ring outwards.
        const k = h.age / IMPACT_TIME
        v.body.scale.set(1 + k * 0.4, Math.max(1 - k, 0.001), 1 + k * 0.4)
        v.body.position.y = h.groundY + radius * (1 - k)
        v.ring.scale.setScalar(1 + k * 1.6)
        v.ringMat.opacity = 0.8 * (1 - k)
        v.shadowMat.opacity = 0.35 * (1 - k)
        if (k >= 1) {
          retire(h, v)
          continue
        }
      }

      // --- Collision: hazard bounding sphere vs the parents' hitbox ---
      const lethal = h.state === 'falling' || h.age < IMPACT_LETHAL_TIME
      // A prayer/summon shield lets curses pass straight through the parents.
      if (phase === 'playing' && lethal && !INVINCIBLE && playerRuntime.shield <= 0) {
        sphere.set(v.body.position, radius)
        if (sphere.intersectsBox(playerRuntime.hitbox)) {
          cancelFlight(h.type)
          return
        }
      }
    }
  })

  return Array.from({ length: POOL_SIZE }, (_, i) => <HazardSlot key={i} index={i} register={register} />)
}

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GOAL_NODE, NODES, START_NODE } from '../game/levelData.js'
import { nodesWithin } from '../game/navigation.js'
import { POWERUP_KEYS, POWERUP_TYPES, SHIELD_SECONDS } from '../game/powerups.js'
import { playerRuntime } from '../game/runtime.js'
import { useGame } from '../game/store.js'
import { flatMaterial, UNIT_BOX } from '../game/materials.js'

/* ------------------------------------------------------------------------------------------------
 * Tunables
 * --------------------------------------------------------------------------------------------- */

const MAX_DROPS = 2 // pickups on the board at once
const FIRST_DROP_DELAY = 3.5
const DROP_INTERVAL = [5.5, 8.5] // seconds between drops (random in range)
const DROP_LIFETIME = 9 // a drop vanishes if nobody picks it up…
const BLINK_TIME = 2 // …blinking during its last seconds
const PICKUP_RADIUS = 0.7 // horizontal distance from the parents that collects it

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

/* ------------------------------------------------------------------------------------------------
 * Models (≈0.5 units, centred; they hover above the tile)
 * --------------------------------------------------------------------------------------------- */

const CRYSTAL_MAT = new THREE.MeshStandardMaterial({
  color: '#B9A2FF',
  emissive: '#7B5CFF',
  emissiveIntensity: 0.55,
  roughness: 0.25,
  flatShading: true,
  transparent: true,
  opacity: 0.92,
})
const CRYSTAL_GEO = new THREE.OctahedronGeometry(0.2, 0)

/** A small leather-bound Bible with a gold cross — a prayer. */
function BibleModel() {
  return (
    <group rotation={[0.35, 0, 0.15]}>
      <mesh geometry={UNIT_BOX} material={flatMaterial('#6B3E2E')} scale={[0.46, 0.13, 0.36]} castShadow />
      <mesh geometry={UNIT_BOX} material={flatMaterial('#FFF4DC')} scale={[0.42, 0.09, 0.37]} position={[0.03, 0, 0]} />
      <mesh geometry={UNIT_BOX} material={flatMaterial('#F6C453')} scale={[0.05, 0.02, 0.2]} position={[-0.02, 0.07, 0]} />
      <mesh geometry={UNIT_BOX} material={flatMaterial('#F6C453')} scale={[0.14, 0.02, 0.05]} position={[-0.02, 0.07, -0.04]} />
      {/* Ribbon bookmark */}
      <mesh geometry={UNIT_BOX} material={flatMaterial('#E85D4A')} scale={[0.03, 0.12, 0.02]} position={[0.1, -0.08, 0.18]} />
    </group>
  )
}

/** A cluster of glowing crystals — a segula (protective charm). */
function CrystalModel() {
  return (
    <group>
      <mesh geometry={CRYSTAL_GEO} material={CRYSTAL_MAT} scale={[1, 1.7, 1]} castShadow />
      <mesh geometry={CRYSTAL_GEO} material={CRYSTAL_MAT} scale={[0.55, 1, 0.55]} position={[0.2, -0.1, 0.06]} rotation={[0, 0, -0.4]} />
      <mesh geometry={CRYSTAL_GEO} material={CRYSTAL_MAT} scale={[0.5, 0.9, 0.5]} position={[-0.17, -0.12, -0.05]} rotation={[0.2, 0, 0.45]} />
    </group>
  )
}

const MODELS = { prayer: BibleModel, summon: CrystalModel }
const HALO_GEO = new THREE.RingGeometry(0.42, 0.56, 24).rotateX(-Math.PI / 2)

/* ------------------------------------------------------------------------------------------------
 * One pooled drop slot (both models pre-built; only one visible)
 * --------------------------------------------------------------------------------------------- */

function DropSlot({ view }) {
  // Each slot owns its halo material so it can be tinted and faded independently.
  const haloMat = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8, depthWrite: false }),
    [],
  )
  return (
    <group ref={(el) => (view.root = el)} visible={false}>
      <group ref={(el) => (view.float = el)} scale={1.4}>
        {POWERUP_KEYS.map((key) => {
          const Model = MODELS[key]
          return (
            <group key={key} ref={(el) => (view.models[key] = el)} visible={false}>
              <Model />
            </group>
          )
        })}
      </group>
      <mesh
        ref={(el) => {
          view.halo = el
          view.haloMat = haloMat
        }}
        geometry={HALO_GEO}
        material={haloMat}
        position={[0, 0.03, 0]}
      />
    </group>
  )
}

/* ------------------------------------------------------------------------------------------------
 * Manager: spawns drops near the parents, animates them and detects pickups.
 * --------------------------------------------------------------------------------------------- */

export default function PowerUpManager() {
  const slots = useMemo(
    () =>
      Array.from({ length: MAX_DROPS }, () => ({
        active: false,
        type: 'prayer',
        node: null,
        age: 0,
        view: { models: {} },
      })),
    [],
  )
  const timer = useRef(FIRST_DROP_DELAY)

  const spawn = () => {
    const slot = slots.find((s) => !s.active)
    if (!slot) return
    const taken = new Set(slots.filter((s) => s.active).map((s) => s.node))
    // Somewhere reachable soon, but never under the parents' feet or on start/goal.
    const candidates = nodesWithin(playerRuntime.currentNode, 4).filter(
      (id) =>
        id !== playerRuntime.currentNode &&
        id !== playerRuntime.nextNode &&
        id !== START_NODE &&
        id !== GOAL_NODE &&
        !taken.has(id),
    )
    if (!candidates.length) return
    slot.active = true
    slot.type = pick(POWERUP_KEYS)
    slot.node = pick(candidates)
    slot.age = 0
    const { view } = slot
    for (const key of POWERUP_KEYS) view.models[key].visible = key === slot.type
    view.haloMat.color.set(POWERUP_TYPES[slot.type].color)
    view.root.position.set(...NODES[slot.node].pos)
    view.root.visible = true
  }

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    const { phase, grantShield } = useGame.getState()
    if (phase !== 'playing') return

    timer.current -= dt
    if (timer.current <= 0) {
      spawn()
      timer.current = THREE.MathUtils.randFloat(DROP_INTERVAL[0], DROP_INTERVAL[1])
    }

    const t = clock.elapsedTime
    for (const slot of slots) {
      if (!slot.active) continue
      const { view } = slot
      slot.age += dt

      // Hover, spin and (near the end of its life) blink.
      view.float.position.y = 0.75 + Math.sin(t * 3 + slot.age) * 0.1
      view.float.rotation.y += dt * 1.8
      view.haloMat.opacity = 0.55 + 0.3 * Math.sin(t * 5)
      const remaining = DROP_LIFETIME - slot.age
      view.root.visible = remaining > BLINK_TIME || Math.sin(t * 20) > 0

      // Pickup: the parents walk close enough to it.
      const [x, y, z] = NODES[slot.node].pos
      const p = playerRuntime.position
      const near = Math.hypot(p.x - x, p.z - z) < PICKUP_RADIUS && Math.abs(p.y - y) < 1.2
      if (near) {
        playerRuntime.shield = SHIELD_SECONDS
        playerRuntime.shieldType = slot.type
        grantShield(slot.type)
      }
      if (near || remaining <= 0) {
        slot.active = false
        view.root.visible = false
      }
    }
  })

  return slots.map((slot, i) => <DropSlot key={i} view={slot.view} />)
}

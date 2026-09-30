import { memo, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  ARCHES,
  GOAL_NODE,
  NODES,
  PALETTE,
  PARAPETS,
  PLANE_PAD,
  PLANE_TRANSFORM,
  PLINTH,
  PLINTH_TOP,
  STAIRS,
  TILE,
  TREES,
} from '../game/levelData.js'
import { useGame } from '../game/store.js'
import { flatMaterial, UNIT_BOX } from '../game/materials.js'
import Airplane from './Airplane.jsx'

const WINDOW_MAT = new THREE.MeshStandardMaterial({ color: '#3F5A63', roughness: 1 })
const HIT_MAT = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })

/** A box described by its min/max corners — much easier to reason about for architecture. */
function Block({ min, max, color, cast = true, receive = true }) {
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]]
  const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]
  return (
    <mesh
      geometry={UNIT_BOX}
      material={typeof color === 'string' ? flatMaterial(color) : color}
      position={center}
      scale={size}
      castShadow={cast}
      receiveShadow={receive}
    />
  )
}

const isOnPad = ([x, y, z]) =>
  y === PLANE_PAD.top &&
  x > PLANE_PAD.min[0] &&
  x < PLANE_PAD.max[0] &&
  z > PLANE_PAD.min[1] &&
  z < PLANE_PAD.max[1]

/* ------------------------------------------------------------------------------------------------
 * Structural pieces
 * --------------------------------------------------------------------------------------------- */

function Plinth() {
  const { min, max } = PLINTH
  return (
    <group>
      <Block min={[min[0], PLINTH_TOP - 0.5, min[1]]} max={[max[0], PLINTH_TOP, max[1]]} color={PALETTE.plinth} cast={false} />
      {/* A slightly wider, darker footing gives the base a crisp MV-style edge */}
      <Block
        min={[min[0] - 0.25, PLINTH_TOP - 1.1, min[1] - 0.25]}
        max={[max[0] + 0.25, PLINTH_TOP - 0.5, max[1] + 0.25]}
        color={PALETTE.plinthSide}
        cast={false}
      />
    </group>
  )
}

/**
 * A tile: normally a solid column rising from the plinth, capped with a lighter slab and
 * window slits. Tiles flagged `support: 'pillars'` become a slab on four slim pillars so
 * they don't hide the walkways behind them.
 */
function TileColumn({ pos, floor, support }) {
  const [x, y, z] = pos
  const h = TILE / 2
  const { body, cap } = PALETTE.floors[floor]
  const height = y - PLINTH_TOP
  const onPillars = support === 'pillars'
  const p = h - 0.22 // pillar inset from the tile edge
  return (
    <group>
      {onPillars ? (
        <>
          <Block min={[x - h, y - 0.5, z - h]} max={[x + h, y - 0.14, z + h]} color={body} />
          {[[-p, -p], [-p, p], [p, -p], [p, p]].map(([dx, dz], i) => (
            <Block key={i} min={[x + dx - 0.16, PLINTH_TOP, z + dz - 0.16]} max={[x + dx + 0.16, y - 0.5, z + dz + 0.16]} color={body} />
          ))}
        </>
      ) : (
        <Block min={[x - h, PLINTH_TOP, z - h]} max={[x + h, y - 0.14, z + h]} color={body} />
      )}
      <Block min={[x - h - 0.04, y - 0.14, z - h - 0.04]} max={[x + h + 0.04, y, z + h + 0.04]} color={cap} />
      {/* Arched window slits on the two camera-facing sides of tall columns */}
      {!onPillars && height > 3 && (
        <>
          <mesh geometry={UNIT_BOX} material={WINDOW_MAT} position={[x + h + 0.01, y - 1.3, z]} scale={[0.04, 0.9, 0.36]} />
          <mesh geometry={UNIT_BOX} material={WINDOW_MAT} position={[x, y - 1.3, z + h + 0.01]} scale={[0.36, 0.9, 0.04]} />
        </>
      )}
    </group>
  )
}

/**
 * Stepped staircase between two tiles. Steps are normally extruded down to the plinth;
 * `support: 'floating'` makes each step a thin slab instead, so the flight doesn't hide
 * what's underneath it.
 */
function Staircase({ low, high, floor, support }) {
  const steps = useMemo(() => {
    const a = NODES[low].pos
    const b = NODES[high].pos
    const dx = Math.sign(b[0] - a[0])
    const dz = Math.sign(b[2] - a[2])
    const count = 4
    const run = (Math.hypot(b[0] - a[0], b[2] - a[2]) - TILE) / count
    const rise = (b[1] - a[1]) / (count + 1)
    const halfWidth = 0.8
    return Array.from({ length: count }, (_, i) => {
      const along = TILE / 2 + run * (i + 0.5)
      const cx = a[0] + dx * along
      const cz = a[2] + dz * along
      const top = a[1] + rise * (i + 1)
      // Extent along the stair axis is `run`, across it `halfWidth * 2`.
      const ex = dx !== 0 ? run / 2 : halfWidth
      const ez = dz !== 0 ? run / 2 : halfWidth
      const bottom = support === 'floating' ? top - 0.6 : PLINTH_TOP
      return { min: [cx - ex, bottom, cz - ez], max: [cx + ex, top, cz + ez], top, cx, cz, ex, ez }
    })
  }, [low, high, support])

  const { body, cap } = PALETTE.floors[floor]
  return (
    <group>
      {steps.map((s, i) => (
        <group key={i}>
          <Block min={s.min} max={[s.max[0], s.top - 0.08, s.max[2]]} color={body} />
          <Block min={[s.min[0], s.top - 0.08, s.min[2]]} max={s.max} color={cap} />
        </group>
      ))}
    </group>
  )
}

/** A freestanding archway straddling a walkway tile. */
function Archway({ node, axis }) {
  const [x, y, z] = NODES[node].pos
  const color = PALETTE.arch
  // Posts sit either side of the path (perpendicular to the walking axis).
  const off = 0.82
  const posts = axis === 'x' ? [[x, z - off], [x, z + off]] : [[x - off, z], [x + off, z]]
  const postSize = axis === 'x' ? [0.5, 0.26] : [0.26, 0.5]
  return (
    <group>
      {posts.map(([px, pz], i) => (
        <Block
          key={i}
          min={[px - postSize[0] / 2, y, pz - postSize[1] / 2]}
          max={[px + postSize[0] / 2, y + 1.55, pz + postSize[1] / 2]}
          color={color}
        />
      ))}
      <Block
        min={axis === 'x' ? [x - 0.3, y + 1.55, z - off - 0.2] : [x - off - 0.2, y + 1.55, z - 0.3]}
        max={axis === 'x' ? [x + 0.3, y + 1.85, z + off + 0.2] : [x + off + 0.2, y + 1.85, z + 0.3]}
        color={color}
      />
      {/* Half-ring gives the lintel its rounded arch silhouette */}
      <mesh
        position={[x, y + 1.18, z]}
        rotation={[0, axis === 'x' ? Math.PI / 2 : 0, 0]}
        material={flatMaterial(color)}
        castShadow
      >
        <torusGeometry args={[0.66, 0.1, 6, 12, Math.PI]} />
      </mesh>
    </group>
  )
}

function Parapet({ node, sides }) {
  const [x, y, z] = NODES[node].pos
  const h = TILE / 2
  const color = PALETTE.floors[NODES[node].floor].cap
  const t = 0.16
  const boxes = {
    '+z': [[x - h, y, z + h - t], [x + h, y + 0.4, z + h]],
    '-z': [[x - h, y, z - h], [x + h, y + 0.4, z - h + t]],
    '+x': [[x + h - t, y, z - h], [x + h, y + 0.4, z + h]],
    '-x': [[x - h, y, z - h], [x - h + t, y + 0.4, z + h]],
  }
  return sides.map((s) => <Block key={s} min={boxes[s][0]} max={boxes[s][1]} color={color} />)
}

/** The plane's runway pad: a slab on its supports (pillars / a back wall), with dashed markings. */
function PlanePad() {
  const { min, max, top, thickness, supports, floor, wallWindows } = PLANE_PAD
  const { body, cap } = PALETTE.floors[floor]
  // Runway centreline along the plane's heading (−x/+z diagonal), through the plane.
  const [cx, , cz] = PLANE_TRANSFORM.position
  return (
    <group>
      <Block min={[min[0], top - thickness, min[1]]} max={[max[0], top - 0.12, max[1]]} color={body} />
      <Block min={[min[0] - 0.05, top - 0.12, min[1] - 0.05]} max={[max[0] + 0.05, top, max[1] + 0.05]} color={cap} />
      {supports.map(([x0, z0, x1, z1, base], i) => (
        <Block key={i} min={[x0, base ?? PLINTH_TOP, z0]} max={[x1, top - thickness, z1]} color={body} />
      ))}
      {/* Window slits on the camera-facing side of the back wall */}
      {wallWindows &&
        [-4, -2, 0].flatMap((x) =>
          [3.5, 7.5].map((y) => (
            <mesh
              key={`${x}-${y}`}
              geometry={UNIT_BOX}
              material={WINDOW_MAT}
              position={[x, y, supports[0][3] + 0.01]}
              scale={[0.36, 0.9, 0.04]}
            />
          )),
        )}
      {[-1.8, -0.9, 0, 0.9, 1.8].map((d) => (
        <mesh
          key={d}
          geometry={UNIT_BOX}
          material={flatMaterial('#FFFFFF')}
          position={[cx - d * Math.SQRT1_2, top + 0.005, cz + d * Math.SQRT1_2]}
          rotation={[0, Math.PI / 4, 0]}
          scale={[0.5, 0.01, 0.1]}
          receiveShadow
        />
      ))}
    </group>
  )
}

function Tree({ x, z, s }) {
  return (
    <group position={[x, PLINTH_TOP, z]} scale={s}>
      <mesh position={[0, 0.3, 0]} material={flatMaterial('#B7835A')} castShadow>
        <cylinderGeometry args={[0.09, 0.12, 0.6, 5]} />
      </mesh>
      <mesh position={[0, 1.05, 0]} material={flatMaterial('#6FBF8E')} castShadow>
        <coneGeometry args={[0.55, 1.2, 6]} />
      </mesh>
      <mesh position={[0, 1.55, 0]} material={flatMaterial('#86D0A1')} castShadow>
        <coneGeometry args={[0.38, 0.8, 6]} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------------------------------------
 * Interaction: invisible hit pads on every node + hover/target markers
 * --------------------------------------------------------------------------------------------- */

const RING_GEO = new THREE.RingGeometry(0.42, 0.56, 24).rotateX(-Math.PI / 2)

const WalkableNode = memo(function WalkableNode({ id }) {
  const { pos, kind } = NODES[id]
  const [hovered, setHovered] = useState(false)
  const issueCommand = useGame((s) => s.issueCommand)
  // Stair nodes sit mid-flight; give them a taller hit volume so the whole flight is clickable.
  const tall = kind === 'stair'

  return (
    <group position={pos}>
      <mesh
        geometry={UNIT_BOX}
        material={HIT_MAT}
        scale={[TILE * 0.95, tall ? 1.2 : 0.3, TILE * 0.95]}
        position={[0, tall ? -0.4 : -0.1, 0]}
        onClick={(e) => {
          e.stopPropagation()
          issueCommand({ type: 'goto', node: id })
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = ''
        }}
      />
      {hovered && (
        <mesh geometry={RING_GEO} position={[0, 0.02, 0]}>
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
})

/** Pulsing ring on the node the parents are currently walking to. */
function DestinationMarker() {
  const ref = useRef()
  const target = useGame((s) => (s.command?.type === 'goto' ? s.command.node : null))
  const current = useGame((s) => s.currentNode)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const k = 1 + Math.sin(clock.elapsedTime * 6) * 0.12
    ref.current.scale.setScalar(k)
  })
  if (!target || target === current) return null
  return (
    <mesh ref={ref} geometry={RING_GEO} position={[NODES[target].pos[0], NODES[target].pos[1] + 0.03, NODES[target].pos[2]]}>
      <meshBasicMaterial color={PALETTE.accent} transparent opacity={0.9} depthWrite={false} />
    </mesh>
  )
}

/** Bobbing arrow + pulsing ring over the goal tile so the destination is obvious. */
function GoalBeacon() {
  const arrow = useRef()
  const ring = useRef()
  const [x, y, z] = NODES[GOAL_NODE].pos
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    arrow.current.position.y = y + 1.7 + Math.sin(t * 3) * 0.15
    arrow.current.rotation.y = t * 1.5
    ring.current.scale.setScalar(1 + ((t * 0.8) % 1) * 0.5)
    ring.current.material.opacity = 0.9 * (1 - ((t * 0.8) % 1))
  })
  return (
    <group>
      <mesh ref={arrow} position={[x, y + 1.7, z]} rotation={[Math.PI, 0, 0]} material={flatMaterial('#F2CC8F')} castShadow>
        <coneGeometry args={[0.22, 0.45, 4]} />
      </mesh>
      <mesh ref={ring} geometry={RING_GEO} position={[x, y + 0.02, z]}>
        <meshBasicMaterial color="#FFFFFF" transparent depthWrite={false} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------------------------------------
 * The level
 * --------------------------------------------------------------------------------------------- */

/** Static geometry never re-renders: memo with no props. */
const StaticArchitecture = memo(function StaticArchitecture() {
  return (
    <group>
      <Plinth />
      {Object.entries(NODES)
        .filter(([, n]) => n.kind === 'tile' && !isOnPad(n.pos))
        .map(([id, n]) => (
          <TileColumn key={id} pos={n.pos} floor={n.floor} support={n.support} />
        ))}
      {STAIRS.map((s) => (
        <Staircase key={s.id} {...s} />
      ))}
      {ARCHES.map(([node, axis]) => (
        <Archway key={node} node={node} axis={axis} />
      ))}
      {PARAPETS.map(([node, sides]) => (
        <Parapet key={node} node={node} sides={sides} />
      ))}
      <PlanePad />
      {TREES.map(([x, z, s], i) => (
        <Tree key={i} x={x} z={z} s={s} />
      ))}
    </group>
  )
})

export default function LevelArchitecture() {
  const runId = useGame((s) => s.runId)
  const level = useGame((s) => s.level)
  return (
    <group>
      {/* Keyed by level: the static tower is rebuilt when the level changes */}
      <StaticArchitecture key={`tower-${level}`} />
      {Object.keys(NODES).map((id) => (
        <WalkableNode key={`${level}-${id}`} id={id} />
      ))}
      <DestinationMarker />
      <GoalBeacon />
      {/* Keyed by run so the plane is parked again after every restart */}
      <Airplane key={`plane-${runId}`} />
    </group>
  )
}

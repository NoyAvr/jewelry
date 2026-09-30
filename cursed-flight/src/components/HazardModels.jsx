import * as THREE from 'three'
import { flatMaterial, UNIT_BOX } from '../game/materials.js'

/**
 * Low-poly "curse" models, each roughly 0.8 units across and centred on the origin
 * so HazardManager can treat them as spheres. They only use the shared unit box and
 * a few tiny primitives, so a whole pool of them stays cheap.
 */

function B({ p, s, c, r }) {
  return <mesh geometry={UNIT_BOX} material={flatMaterial(c)} position={p} scale={s} rotation={r} castShadow />
}

const CRAB = '#E85D4A'
const CRAB_DARK = '#C8453A'

export function CrabModel() {
  return (
    <group>
      <B p={[0, 0, 0]} s={[0.62, 0.22, 0.44]} c={CRAB} />
      <B p={[0, 0.12, 0]} s={[0.46, 0.08, 0.34]} c={CRAB_DARK} />
      {/* Eye stalks */}
      {[-0.1, 0.1].map((x) => (
        <group key={x}>
          <B p={[x, 0.2, 0.16]} s={[0.04, 0.16, 0.04]} c={CRAB} />
          <B p={[x, 0.3, 0.16]} s={[0.08, 0.08, 0.08]} c="#FFFFFF" />
          <B p={[x, 0.3, 0.2]} s={[0.04, 0.04, 0.02]} c="#2F3E46" />
        </group>
      ))}
      {/* Claws */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.36, 0.04, 0.26]} rotation={[0, side * -0.5, 0]}>
          <B p={[0, 0, 0]} s={[0.1, 0.1, 0.2]} c={CRAB} />
          <B p={[side * 0.04, 0.05, 0.16]} s={[0.16, 0.08, 0.16]} c={CRAB} />
          <B p={[side * 0.04, -0.05, 0.16]} s={[0.12, 0.06, 0.12]} c={CRAB_DARK} />
        </group>
      ))}
      {/* Legs */}
      {[-1, 1].flatMap((side) =>
        [-0.14, 0, 0.14].map((z) => (
          <B key={`${side}${z}`} p={[side * 0.38, -0.1, z]} s={[0.2, 0.05, 0.05]} r={[0, 0, side * -0.6]} c={CRAB_DARK} />
        )),
      )}
    </group>
  )
}

const EXHAUST = new THREE.MeshBasicMaterial({ color: '#FFB347' })

export function MissileModel() {
  return (
    <group>
      {/* Falls nose-first: nose at the bottom, fins + exhaust at the top */}
      <mesh material={flatMaterial('#9AAEAA')} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.7, 8]} />
      </mesh>
      <mesh position={[0, -0.5, 0]} rotation={[Math.PI, 0, 0]} material={flatMaterial('#E07A5F')} castShadow>
        <coneGeometry args={[0.14, 0.3, 8]} />
      </mesh>
      <B p={[0, -0.12, 0]} s={[0.29, 0.06, 0.29]} c="#F2CC8F" />
      {[0, Math.PI / 2].map((ry) => (
        <B key={ry} p={[0, 0.3, 0]} s={[0.5, 0.2, 0.03]} r={[0, ry, 0]} c="#6E8480" />
      ))}
      <mesh position={[0, 0.48, 0]} material={EXHAUST}>
        <coneGeometry args={[0.1, 0.3, 6]} />
      </mesh>
    </group>
  )
}

export function RubbleModel() {
  return (
    <group>
      <B p={[-0.12, -0.08, 0.05]} s={[0.42, 0.24, 0.26]} c="#D9744F" r={[0.2, 0.3, 0.1]} />
      <B p={[0.18, 0.05, -0.08]} s={[0.34, 0.22, 0.24]} c="#E9D8BE" r={[-0.3, 0.8, 0.2]} />
      <B p={[0.02, 0.2, 0.12]} s={[0.26, 0.18, 0.2]} c="#C9674A" r={[0.5, -0.4, 0.3]} />
      <B p={[-0.2, 0.16, -0.16]} s={[0.14, 0.12, 0.12]} c="#F2CC8F" r={[0.2, 0.2, 0.7]} />
    </group>
  )
}

const TV_SCREEN = new THREE.MeshBasicMaterial({ color: '#9FE3F5' })

export function TVModel() {
  return (
    <group>
      <B p={[0, 0, 0]} s={[0.66, 0.5, 0.42]} c="#F4E4C9" />
      <mesh position={[-0.06, 0, 0.215]} material={TV_SCREEN}>
        <planeGeometry args={[0.42, 0.34]} />
      </mesh>
      {/* "BREAKING" banner on the screen */}
      <B p={[-0.06, -0.1, 0.22]} s={[0.42, 0.07, 0.01]} c="#E85D4A" />
      <B p={[0.25, 0.08, 0.22]} s={[0.06, 0.06, 0.01]} c="#3E4A61" />
      <B p={[0.25, -0.06, 0.22]} s={[0.06, 0.06, 0.01]} c="#3E4A61" />
      {/* Rabbit-ear antenna */}
      <B p={[-0.1, 0.38, 0]} s={[0.025, 0.36, 0.025]} r={[0, 0, 0.45]} c="#3E4A61" />
      <B p={[0.1, 0.38, 0]} s={[0.025, 0.36, 0.025]} r={[0, 0, -0.45]} c="#3E4A61" />
      <B p={[-0.2, -0.3, 0]} s={[0.06, 0.1, 0.06]} c="#3E4A61" />
      <B p={[0.2, -0.3, 0]} s={[0.06, 0.1, 0.06]} c="#3E4A61" />
    </group>
  )
}

export function MedkitModel() {
  return (
    <group>
      <B p={[0, 0, 0]} s={[0.6, 0.42, 0.3]} c="#FDFBF7" />
      <B p={[0, 0.25, 0]} s={[0.24, 0.08, 0.08]} c="#8C9AA0" />
      {[0.155, -0.155].map((z) => (
        <group key={z}>
          <B p={[0, 0, z]} s={[0.26, 0.08, 0.01]} c="#E85D4A" />
          <B p={[0, 0, z]} s={[0.08, 0.26, 0.01]} c="#E85D4A" />
        </group>
      ))}
    </group>
  )
}

export const HAZARD_MODELS = {
  crab: CrabModel,
  missile: MissileModel,
  rubble: RubbleModel,
  tv: TVModel,
  medkit: MedkitModel,
}

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { PLANE_TRANSFORM } from '../game/levelData.js'
import { useGame } from '../game/store.js'
import { flatMaterial } from '../game/materials.js'

const WHITE = flatMaterial('#FDFBF7')
const STRIPE = flatMaterial('#5BBCB0')
const ACCENT = flatMaterial('#E07A5F')
const GLASS = flatMaterial('#3F5A63')
const METAL = flatMaterial('#C9D3D6')

/**
 * Low-poly passenger jet. Modelled with its nose pointing down local +x and the
 * wheels resting on y = 0, then placed on the runway pad via PLANE_TRANSFORM.
 */
function JetModel() {
  const windows = [-0.9, -0.6, -0.3, 0, 0.3, 0.6]
  return (
    <group position={[0, 0.55, 0]}>
      {/* Fuselage */}
      <mesh rotation={[0, 0, Math.PI / 2]} material={WHITE} castShadow receiveShadow>
        <cylinderGeometry args={[0.36, 0.36, 2.6, 10]} />
      </mesh>
      {/* Nose cone */}
      <mesh position={[1.6, -0.03, 0]} rotation={[0, 0, -Math.PI / 2]} material={WHITE} castShadow>
        <cylinderGeometry args={[0.1, 0.36, 0.6, 10]} />
      </mesh>
      {/* Tail cone, swept upwards */}
      <mesh position={[-1.65, 0.08, 0]} rotation={[0, 0, Math.PI / 2 - 0.15]} material={WHITE} castShadow>
        <cylinderGeometry args={[0.36, 0.12, 0.75, 10]} />
      </mesh>
      {/* Cockpit glass */}
      <mesh position={[1.62, 0.12, 0]} rotation={[0, 0, -0.5]} material={GLASS}>
        <boxGeometry args={[0.22, 0.08, 0.42]} />
      </mesh>
      {/* Cabin windows (both sides) + livery stripe */}
      {windows.map((x) => (
        <group key={x}>
          <mesh position={[x, 0.1, 0.355]} material={GLASS}>
            <boxGeometry args={[0.12, 0.1, 0.02]} />
          </mesh>
          <mesh position={[x, 0.1, -0.355]} material={GLASS}>
            <boxGeometry args={[0.12, 0.1, 0.02]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -0.08, 0]} rotation={[0, 0, Math.PI / 2]} material={STRIPE}>
        <cylinderGeometry args={[0.365, 0.365, 2.6, 10, 1, true, 0, Math.PI * 2]} />
      </mesh>
      {/* Main wings (slightly swept) */}
      {[1, -1].map((side) => (
        <mesh key={side} position={[0.05, -0.12, side * 1.05]} rotation={[0, side * 0.35, 0]} material={WHITE} castShadow>
          <boxGeometry args={[0.7, 0.06, 1.6]} />
        </mesh>
      ))}
      {/* Engines */}
      {[1, -1].map((side) => (
        <group key={side} position={[0.35, -0.35, side * 0.95]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={METAL} castShadow>
            <cylinderGeometry args={[0.15, 0.13, 0.55, 8]} />
          </mesh>
          <mesh position={[0.28, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={GLASS}>
            <circleGeometry args={[0.12, 8]} />
          </mesh>
        </group>
      ))}
      {/* Vertical tail fin with accent colour */}
      <mesh position={[-1.75, 0.55, 0]} rotation={[0, 0, 0.45]} material={ACCENT} castShadow>
        <boxGeometry args={[0.55, 0.8, 0.06]} />
      </mesh>
      {/* Horizontal stabilisers */}
      <mesh position={[-1.8, 0.15, 0]} material={WHITE} castShadow>
        <boxGeometry args={[0.35, 0.04, 1.0]} />
      </mesh>
      {/* Landing gear */}
      {[
        [1.2, 0],
        [-0.1, 0.35],
        [-0.1, -0.35],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, -0.45, z]} rotation={[Math.PI / 2, 0, 0]} material={GLASS}>
          <cylinderGeometry args={[0.1, 0.1, 0.08, 8]} />
        </mesh>
      ))}
    </group>
  )
}

/** Blinking beacon on top of the tail fin. */
function Beacon() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current) ref.current.visible = Math.sin(clock.elapsedTime * 5) > 0.2
  })
  return (
    <mesh ref={ref} position={[-2.0, 1.5, 0]}>
      <sphereGeometry args={[0.06, 6, 6]} />
      <meshBasicMaterial color="#FF5A4E" />
    </mesh>
  )
}

/**
 * The goal: parked on the runway pad until the parents board, then GSAP runs the
 * take-off (spool up → roll → rotate → climb out) and finally flips the game to "won".
 */
export default function Airplane() {
  const root = useRef() // positioned + yawed on the pad
  const body = useRef() // local roll/pitch/translation during take-off

  useEffect(() => {
    let ctx
    const unsub = useGame.subscribe((state, prev) => {
      if (state.phase !== 'boarding' || prev.phase === 'boarding') return
      ctx = gsap.context(() => {
        const tl = gsap.timeline({ delay: 0.9, onComplete: () => useGame.getState().depart() })
        // Engines spooling up: a tiny nervous shake.
        tl.to(body.current.position, { y: 0.03, duration: 0.05, repeat: 9, yoyo: true, ease: 'none' })
          // Roll down the runway (local +x is the nose).
          .to(body.current.position, { x: 2.6, duration: 1.1, ease: 'power2.in' })
          // Rotate & climb away over the edge of the tower.
          .to(body.current.rotation, { z: 0.35, duration: 0.5, ease: 'power1.out' }, '-=0.35')
          .to(body.current.position, { x: 16, y: 9, duration: 1.8, ease: 'power1.in' }, '-=0.2')
          .to(body.current.scale, { x: 0.4, y: 0.4, z: 0.4, duration: 1.8, ease: 'power1.in' }, '<')
      })
    })
    return () => {
      unsub()
      ctx?.revert()
    }
  }, [])

  const { position, rotationY, scale } = PLANE_TRANSFORM
  return (
    <group ref={root} position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <group ref={body}>
        <JetModel />
        <Beacon />
      </group>
    </group>
  )
}

import { useEffect, useLayoutEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import gsap from 'gsap'
import { CAMERA, PLINTH_TOP } from '../game/levelData.js'
import { useGame } from '../game/store.js'
import LevelArchitecture from './LevelArchitecture.jsx'
import Player from './Player.jsx'
import HazardManager from './HazardManager.jsx'
import PowerUpManager from './PowerUpManager.jsx'

export const BACKGROUND = '#A3D9C9'

/*
 * Per level (see CAMERA in levelData.js): viewWidth × viewHeight world units must stay
 * visible (responsive zoom), and offsetY shifts the tower so it sits centred, with
 * headroom for the HUD, around the origin the camera looks at.
 */

/**
 * Isometric orthographic camera at [10, 10, 10] looking at the origin.
 * Zoom is recomputed on resize so the whole tower always fits (phones included).
 */
function IsometricCamera() {
  const camera = useRef()
  const { width, height } = useThree((s) => s.size)
  const level = useGame((s) => s.level)

  useLayoutEffect(() => {
    const cam = camera.current
    cam.lookAt(0, 0, 0)
    cam.zoom = Math.min(width / CAMERA.viewWidth, height / CAMERA.viewHeight)
    cam.updateProjectionMatrix()
  }, [width, height, level])

  return <OrthographicCamera ref={camera} makeDefault position={[10, 10, 10]} near={-50} far={200} />
}

/** Soft studio lighting: sky/ground hemisphere fill + one warm key light with soft shadows. */
function Lights() {
  return (
    <>
      <hemisphereLight args={['#FFFFFF', '#8FC9B6', 1.3]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[6, 16, 9]}
        intensity={2.1}
        color="#FFF4E0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
        shadow-radius={4}
      />
    </>
  )
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, PLINTH_TOP - 1.1, 0]} receiveShadow>
      <circleGeometry args={[40, 48]} />
      <meshStandardMaterial color="#B2E0D1" roughness={1} />
    </mesh>
  )
}

/** Gives the whole world a short shake when the curse strikes. */
function useImpactShake(target) {
  useEffect(
    () =>
      useGame.subscribe((state, prev) => {
        if (state.phase !== 'gameover' || prev.phase === 'gameover' || !target.current) return
        gsap.fromTo(
          target.current.position,
          { x: 0.25 },
          { x: 0, duration: 0.6, ease: 'elastic.out(1.2, 0.25)' },
        )
      }),
    [target],
  )
}

export default function Experience() {
  const world = useRef()
  const runId = useGame((s) => s.runId)
  useImpactShake(world)

  return (
    <>
      <color attach="background" args={[BACKGROUND]} />
      <IsometricCamera />
      <Lights />

      <group ref={world} position={[0, CAMERA.offsetY, 0]}>
        <Ground />
        <LevelArchitecture />
        {/* Keyed by run: a restart remounts these systems with a clean slate */}
        <Player key={`player-${runId}`} />
        <HazardManager key={`hazards-${runId}`} />
        <PowerUpManager key={`powerups-${runId}`} />
      </group>
    </>
  )
}

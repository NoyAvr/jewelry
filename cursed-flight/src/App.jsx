import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import Experience from './components/Experience.jsx'
import UIOverlay from './components/UIOverlay.jsx'

/**
 * App shell: the WebGL canvas fills the screen and the Tailwind HUD floats on top.
 * The overlay container ignores pointer events so clicks fall through to the 3D
 * scene; interactive HUD elements opt back in with `pointer-events-auto`.
 */
export default function App() {
  return (
    <main className="relative h-full w-full overflow-hidden bg-mint">
      <Canvas
        shadows="percentage"
        flat
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        className="absolute inset-0"
      >
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </Canvas>
      <UIOverlay />
    </main>
  )
}

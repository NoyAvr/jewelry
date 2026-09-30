import * as THREE from 'three'

/**
 * Shared GPU resources.
 * One unit box is reused (scaled) by every block, and materials are cached per colour,
 * so the whole scene costs a handful of geometries/materials no matter how many blocks it has.
 */
export const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1)

const materialCache = new Map()

/** Flat-shaded, matte pastel material — cached by colour. */
export function flatMaterial(color) {
  if (!materialCache.has(color)) {
    materialCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true }))
  }
  return materialCache.get(color)
}

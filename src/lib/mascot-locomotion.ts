/** Animation clip names expected from the eventual original-character GLB. */
export type MascotLocomotion = 'idle' | 'walk' | 'run'

/**
 * Provisional screen-space thresholds in CSS pixels; tune against the approved 3D model.
 * Hysteresis prevents frame-to-frame clip flicker around the walk/run boundaries.
 */
export const MASCOT_MOTION_THRESHOLDS = {
  stop: 28,
  startWalking: 48,
  startRunning: 180,
  stopRunning: 120,
} as const

/**
 * Choose the next *animation state* independently of the renderer or GLB loader.
 * Only the model-driven renderer will later apply these states to real AnimationClips.
 */
export function resolveMascotLocomotion(
  distancePx: number,
  current: MascotLocomotion,
): MascotLocomotion {
  if (!Number.isFinite(distancePx)) return 'idle'
  const distance = Math.max(0, distancePx)

  if (distance <= MASCOT_MOTION_THRESHOLDS.stop) return 'idle'
  if (current === 'run') {
    return distance <= MASCOT_MOTION_THRESHOLDS.stopRunning ? 'walk' : 'run'
  }
  if (current === 'walk') {
    return distance >= MASCOT_MOTION_THRESHOLDS.startRunning ? 'run' : 'walk'
  }
  if (distance >= MASCOT_MOTION_THRESHOLDS.startRunning) return 'run'
  return distance >= MASCOT_MOTION_THRESHOLDS.startWalking ? 'walk' : 'idle'
}

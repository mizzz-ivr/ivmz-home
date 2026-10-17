import { resolveMascotLocomotion, type MascotLocomotion } from './mascot-locomotion'

export type MascotPoint = Readonly<{ x: number; y: number }>

export type MascotFrame = Readonly<{
  position: MascotPoint
  facingRad: number
  locomotion: MascotLocomotion
}>

export type MascotViewport = Readonly<{
  width: number
  height: number
  padding: number
}>

export const MASCOT_FOLLOW_SPEED = {
  walkPxPerSecond: 140,
  runPxPerSecond: 360,
  turnRadPerSecond: Math.PI * 3,
  maxStepSeconds: 0.05,
  followOffsetPx: 28,
} as const

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function finitePoint(point: MascotPoint) {
  return Number.isFinite(point.x) && Number.isFinite(point.y)
}

/**
 * Advance the position and heading of a model-driven cursor companion by one frame.
 * This pure calculation does not render, load a model or start any animation loop.
 */
export function stepMascotFollow(
  current: MascotFrame,
  target: MascotPoint,
  elapsedSeconds: number,
  viewport: MascotViewport,
): MascotFrame {
  if (
    !finitePoint(current.position) ||
    !finitePoint(target) ||
    !Number.isFinite(current.facingRad) ||
    !Number.isFinite(elapsedSeconds) ||
    elapsedSeconds <= 0 ||
    !Number.isFinite(viewport.width) ||
    !Number.isFinite(viewport.height) ||
    !Number.isFinite(viewport.padding) ||
    viewport.width <= 0 ||
    viewport.height <= 0 ||
    viewport.padding < 0
  ) {
    return current
  }

  const delta = Math.min(elapsedSeconds, MASCOT_FOLLOW_SPEED.maxStepSeconds)
  const padX = Math.min(viewport.padding, viewport.width / 2)
  const padY = Math.min(viewport.padding, viewport.height / 2)
  const destination = {
    x: clamp(target.x, padX, viewport.width - padX),
    y: clamp(target.y, padY, viewport.height - padY),
  }
  const start = {
    x: clamp(current.position.x, padX, viewport.width - padX),
    y: clamp(current.position.y, padY, viewport.height - padY),
  }
  const dx = destination.x - start.x
  const dy = destination.y - start.y
  const distance = Math.hypot(dx, dy)
  const locomotion = resolveMascotLocomotion(distance, current.locomotion)

  if (locomotion === 'idle') {
    return { position: start, facingRad: current.facingRad, locomotion }
  }

  const speed =
    locomotion === 'run'
      ? MASCOT_FOLLOW_SPEED.runPxPerSecond
      : MASCOT_FOLLOW_SPEED.walkPxPerSecond
  const move = Math.min(speed * delta, Math.max(0, distance - MASCOT_FOLLOW_SPEED.followOffsetPx))
  const nextPosition = {
    x: start.x + (dx / distance) * move,
    y: start.y + (dy / distance) * move,
  }

  // Wrap to [-π, π] so changing direction near the negative x-axis does not spin the model.
  const desiredHeading = Math.atan2(dy, dx)
  const headingDelta = Math.atan2(
    Math.sin(desiredHeading - current.facingRad),
    Math.cos(desiredHeading - current.facingRad),
  )
  const maxTurn = MASCOT_FOLLOW_SPEED.turnRadPerSecond * delta
  const nextHeading = current.facingRad + clamp(headingDelta, -maxTurn, maxTurn)

  return {
    position: nextPosition,
    facingRad: nextHeading,
    locomotion,
  }
}

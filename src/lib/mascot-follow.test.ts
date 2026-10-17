import { describe, expect, it } from 'vitest'

import {
  MASCOT_FOLLOW_SPEED,
  stepMascotFollow,
  type MascotFrame,
} from './mascot-follow'

const viewport = { width: 800, height: 600, padding: 16 } as const

function frame(
  x = 100,
  y = 100,
  locomotion: MascotFrame['locomotion'] = 'idle',
  facingRad = 0,
): MascotFrame {
  return { position: { x, y }, facingRad, locomotion }
}

describe('3D mascot follow motion', () => {
  it('runs toward a distant cursor with a distinct run speed', () => {
    const result = stepMascotFollow(frame(), { x: 500, y: 100 }, 0.05, viewport)
    expect(result.locomotion).toBe('run')
    expect(result.position.x).toBeCloseTo(100 + MASCOT_FOLLOW_SPEED.runPxPerSecond * 0.05)
    expect(result.position.y).toBe(100)
  })

  it('walks toward a nearby cursor without immediately reaching it', () => {
    const result = stepMascotFollow(frame(), { x: 200, y: 100 }, 0.05, viewport)
    expect(result.locomotion).toBe('walk')
    expect(result.position.x).toBeCloseTo(100 + MASCOT_FOLLOW_SPEED.walkPxPerSecond * 0.05)
    expect(result.position.x).toBeLessThan(200)
  })

  it('keeps distance from the pointer and stops with hysteresis', () => {
    let state = frame(100, 100, 'walk')
    for (let index = 0; index < 60; index += 1) {
      state = stepMascotFollow(state, { x: 170, y: 100 }, 0.05, viewport)
    }
    expect(state.locomotion).toBe('idle')
    expect(state.position.x).toBeCloseTo(142)
  })

  it('caps one frame after a long background suspension', () => {
    const result = stepMascotFollow(frame(), { x: 600, y: 100 }, 8, viewport)
    expect(result.position.x).toBeCloseTo(118)
  })

  it('never leaves the padded viewport even with an offscreen pointer', () => {
    const state = stepMascotFollow(frame(780, 580), { x: 99_999, y: 99_999 }, 0.05, viewport)
    expect(state.position.x).toBeLessThanOrEqual(784)
    expect(state.position.y).toBeLessThanOrEqual(584)
  })

  it('turns by the shortest angle at the -π/π boundary', () => {
    const heading = -Math.PI + 0.05
    const result = stepMascotFollow(
      frame(300, 300, 'walk', heading),
      { x: 100, y: 296 },
      0.05,
      viewport,
    )
    expect(Math.abs(result.facingRad - heading)).toBeLessThan(0.25)
  })

  it('limits turning speed to avoid snapping the model', () => {
    const result = stepMascotFollow(frame(), { x: 100, y: 500 }, 0.01, viewport)
    expect(result.facingRad).toBeCloseTo(MASCOT_FOLLOW_SPEED.turnRadPerSecond * 0.01)
  })

  it('keeps a stable frame when motion parameters are invalid', () => {
    const initial = frame()
    expect(stepMascotFollow(initial, { x: 500, y: 100 }, Number.NaN, viewport)).toBe(initial)
    expect(stepMascotFollow(initial, { x: 500, y: 100 }, -1, viewport)).toBe(initial)
    expect(stepMascotFollow(initial, { x: Infinity, y: 100 }, 0.05, viewport)).toBe(initial)
    expect(
      stepMascotFollow(initial, { x: 500, y: 100 }, 0.05, {
        ...viewport,
        width: 0,
      }),
    ).toBe(initial)
  })

  it('clamps the current position after a resize without a jump toward the pointer', () => {
    const result = stepMascotFollow(frame(1000, 1000), { x: 780, y: 580 }, 0.05, viewport)
    expect(result.position.x).toBeLessThanOrEqual(784)
    expect(result.position.y).toBeLessThanOrEqual(584)
  })
})

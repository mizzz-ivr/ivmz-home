import { describe, expect, it } from 'vitest'

import { MASCOT_MOTION_THRESHOLDS, resolveMascotLocomotion } from './mascot-locomotion'

describe('3D mascot locomotion state decisions', () => {
  it('stays idle when the pointer is nearby', () => {
    expect(resolveMascotLocomotion(0, 'idle')).toBe('idle')
    expect(resolveMascotLocomotion(47, 'idle')).toBe('idle')
    expect(resolveMascotLocomotion(MASCOT_MOTION_THRESHOLDS.startWalking, 'idle')).toBe('walk')
  })

  it('starts to run when the pointer moves far away', () => {
    expect(resolveMascotLocomotion(180, 'idle')).toBe('run')
    expect(resolveMascotLocomotion(180, 'walk')).toBe('run')
  })

  it('hysteresis prevents rapid switching near the running threshold', () => {
    expect(resolveMascotLocomotion(179, 'walk')).toBe('walk')
    expect(resolveMascotLocomotion(121, 'run')).toBe('run')
    expect(resolveMascotLocomotion(120, 'run')).toBe('walk')
  })

  it('stops when the character reaches the cursor', () => {
    expect(resolveMascotLocomotion(28, 'walk')).toBe('idle')
    expect(resolveMascotLocomotion(28, 'run')).toBe('idle')
    expect(resolveMascotLocomotion(29, 'walk')).toBe('walk')
  })

  it('does not pass unsafe distances into animation decisions', () => {
    expect(resolveMascotLocomotion(Number.NaN, 'run')).toBe('idle')
    expect(resolveMascotLocomotion(Number.POSITIVE_INFINITY, 'walk')).toBe('idle')
    expect(resolveMascotLocomotion(-10, 'run')).toBe('idle')
  })
})

import { describe, expect, it, vi } from 'vitest'

import {
  createMascotClipController,
  type MascotClipAction,
  type MascotClipActions,
  type MascotClipName,
} from './mascot-clip-controller'

function action() {
  const clip: MascotClipAction = {
    reset: () => clip,
    fadeIn: () => clip,
    fadeOut: () => clip,
    play: () => clip,
    stop: () => clip,
  }
  return {
    clip,
    reset: vi.spyOn(clip, 'reset'),
    fadeIn: vi.spyOn(clip, 'fadeIn'),
    fadeOut: vi.spyOn(clip, 'fadeOut'),
    play: vi.spyOn(clip, 'play'),
    stop: vi.spyOn(clip, 'stop'),
  }
}

function setup() {
  const idle = action()
  const walk = action()
  const run = action()
  const controller = createMascotClipController({
    idle: idle.clip,
    walk: walk.clip,
    run: run.clip,
  })
  if (!controller) throw new Error('Valid action set was rejected')
  return { controller, idle, walk, run }
}

describe('MascotClipController', () => {
  it('starts idle once without replaying on repeated state frames', () => {
    const { controller, idle } = setup()

    expect(controller.transitionTo('idle')).toBe(true)
    expect(controller.transitionTo('idle')).toBe(true)
    expect(controller.active).toBe('idle')
    expect(idle.reset).toHaveBeenCalledOnce()
    expect(idle.play).toHaveBeenCalledOnce()
    expect(idle.fadeIn).toHaveBeenCalledWith(0.2)
  })

  it('crossfades idle, walk and run as the cursor distance changes', () => {
    const { controller, idle, walk, run } = setup()
    controller.transitionTo('idle')
    controller.transitionTo('walk', 0.15)
    controller.transitionTo('run', 0.3)
    controller.transitionTo('idle')

    expect(idle.fadeOut).toHaveBeenCalledWith(0.15)
    expect(walk.reset).toHaveBeenCalledOnce()
    expect(walk.fadeIn).toHaveBeenCalledWith(0.15)
    expect(walk.fadeOut).toHaveBeenCalledWith(0.3)
    expect(run.fadeIn).toHaveBeenCalledWith(0.3)
    expect(run.fadeOut).toHaveBeenCalledWith(0.2)
    expect(idle.play).toHaveBeenCalledTimes(2)
    expect(controller.active).toBe('idle')
  })

  it('clamps overly long durations and uses a safe default for invalid input', () => {
    const { controller, idle, walk, run } = setup()
    controller.transitionTo('idle', Number.NaN)
    controller.transitionTo('walk', 99)
    controller.transitionTo('run', -5)

    expect(idle.fadeIn).toHaveBeenCalledWith(0.2)
    expect(walk.fadeIn).toHaveBeenCalledWith(0.5)
    expect(run.fadeIn).toHaveBeenCalledWith(0)
  })

  it('stops on hidden tabs and can restart from idle', () => {
    const { controller, idle, run } = setup()
    controller.transitionTo('run')
    controller.stop()
    controller.stop()
    expect(run.stop).toHaveBeenCalledOnce()
    expect(controller.active).toBeNull()

    controller.transitionTo('idle')
    expect(idle.play).toHaveBeenCalledOnce()
  })

  it('releases all clips when a model is replaced or unmounted', () => {
    const { controller, idle, walk, run } = setup()
    controller.transitionTo('walk')
    controller.dispose()
    controller.dispose()

    expect(idle.stop).toHaveBeenCalledOnce()
    expect(walk.stop).toHaveBeenCalledOnce()
    expect(run.stop).toHaveBeenCalledOnce()
    expect(controller.transitionTo('run')).toBe(false)
    expect(controller.active).toBeNull()
  })

  it('refuses missing clips or multiple labels for the same animation action', () => {
    const idle = action()
    const walk = action()
    expect(createMascotClipController({ idle: idle.clip, walk: walk.clip })).toBeNull()
    expect(
      createMascotClipController({ idle: idle.clip, walk: walk.clip, run: walk.clip }),
    ).toBeNull()
  })

  it('refuses malformed renderer actions or unknown clip names', () => {
    const { controller, idle, walk } = setup()
    const fake = { ...walk.clip, fadeOut: undefined } as unknown as MascotClipAction
    expect(createMascotClipController({ idle: idle.clip, walk: fake, run: action().clip })).toBeNull()

    const invalid = 'turn' as MascotClipName
    expect(controller.transitionTo(invalid)).toBe(false)
    expect(controller.active).toBeNull()
  })

  it('supports the Three.js-compatible animation action contract', () => {
    const actions: MascotClipActions = {
      idle: action().clip,
      walk: action().clip,
      run: action().clip,
    }
    expect(createMascotClipController(actions)).not.toBeNull()
  })
})

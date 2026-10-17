/**
 * Model-agnostic animation actions compatible with Three.js AnimationAction.
 * The concrete GLTFLoader/AnimationMixer integration belongs to the renderer.
 */
export type MascotClipName = 'idle' | 'walk' | 'run'

export type MascotClipAction = {
  reset: () => MascotClipAction
  fadeIn: (seconds: number) => MascotClipAction
  fadeOut: (seconds: number) => MascotClipAction
  play: () => MascotClipAction
  stop: () => MascotClipAction
}

export type MascotClipActions = Record<MascotClipName, MascotClipAction>

const REQUIRED_CLIPS: readonly MascotClipName[] = ['idle', 'walk', 'run']
const DEFAULT_FADE_SECONDS = 0.2
const MAX_FADE_SECONDS = 0.5

function fadeDuration(seconds: number): number {
  if (!Number.isFinite(seconds)) return DEFAULT_FADE_SECONDS
  return Math.max(0, Math.min(MAX_FADE_SECONDS, seconds))
}

/**
 * Actions are created by a renderer only after the approved GLB has loaded.
 * No RAF, WebGL context or React state is created by this controller.
 */
export class MascotClipController {
  private current: MascotClipName | null = null
  private disposed = false

  constructor(private readonly actions: MascotClipActions) {}

  get active(): MascotClipName | null {
    return this.current
  }

  transitionTo(name: MascotClipName, durationSeconds = DEFAULT_FADE_SECONDS): boolean {
    if (this.disposed || !REQUIRED_CLIPS.includes(name)) return false
    if (this.current === name) return true

    const duration = fadeDuration(durationSeconds)
    if (this.current) {
      this.actions[this.current].fadeOut(duration)
    }
    this.actions[name].reset().fadeIn(duration).play()
    this.current = name
    return true
  }

  /**
   * On hidden tabs, motion opt-out, or a failed WebGL context, stop replay.
   * A later transitionTo('idle') starts cleanly.
   */
  stop(): void {
    if (this.disposed) return
    if (this.current) {
      this.actions[this.current].stop()
      this.current = null
    }
  }

  /** Release all active and faded-out clips when the model is replaced. */
  dispose(): void {
    if (this.disposed) return
    for (const name of REQUIRED_CLIPS) this.actions[name].stop()
    this.current = null
    this.disposed = true
  }
}

/**
 * Reject missing, malformed or aliased actions before starting animation.
 * A successful check is not proof that the clips animate feet correctly.
 */
export function createMascotClipController(
  actions: Partial<Record<MascotClipName, MascotClipAction>>,
): MascotClipController | null {
  const entries = REQUIRED_CLIPS.map((name) => actions[name])
  if (
    entries.some(
      (action) =>
        !action ||
        typeof action.reset !== 'function' ||
        typeof action.fadeIn !== 'function' ||
        typeof action.fadeOut !== 'function' ||
        typeof action.play !== 'function' ||
        typeof action.stop !== 'function',
    ) ||
    new Set(entries).size !== REQUIRED_CLIPS.length
  ) {
    return null
  }

  return new MascotClipController(actions as MascotClipActions)
}

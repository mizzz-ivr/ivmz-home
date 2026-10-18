'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import {
  createMascotClipController,
  type MascotClipAction,
  type MascotClipController,
  type MascotClipName,
} from '@/lib/mascot-clip-controller'
import { stepMascotFollow, type MascotFrame } from '@/lib/mascot-follow'

const PREFERENCE_KEY = 'ivmz-follow-pet'
const PREFERENCE_EVENT = 'ivmz:pet-preference'
const MODEL_URL = '/mascot/ivmz-mascot-v1.glb'
const CANVAS_WIDTH = 156
const CANVAS_HEIGHT = 184
const MAX_FPS = 45

let temporaryPreference: boolean | null = null

function isEnabled(): boolean {
  if (temporaryPreference !== null) return temporaryPreference
  try {
    return window.localStorage.getItem(PREFERENCE_KEY) !== 'off'
  } catch {
    return true
  }
}

function subscribePreference(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener(PREFERENCE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(PREFERENCE_EVENT, onChange)
  }
}

function initialPreference() {
  return false
}

export function Mascot3DPreference() {
  const enabled = useSyncExternalStore(subscribePreference, isEnabled, initialPreference)

  const toggle = () => {
    const next = !enabled
    try {
      window.localStorage.setItem(PREFERENCE_KEY, next ? 'on' : 'off')
      temporaryPreference = null
    } catch {
      temporaryPreference = next
    }
    window.dispatchEvent(new Event(PREFERENCE_EVENT))
  }

  return (
    <button type="button" className="mascot-3d-toggle" aria-pressed={enabled} onClick={toggle}>
      {enabled ? '3D PET ON ✦' : '3D PET OFF'}
      <span className="sr-only">（立体マスコットの追従表示を切り替え）</span>
    </button>
  )
}

/**
 * Client-only model. No animation loop, WebGL context, or GLB request is started
 * until a desktop fine pointer moves and the visitor permits motion.
 */
export function Mascot3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mobileButtonRef = useRef<HTMLButtonElement>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const enabled = useSyncExternalStore(subscribePreference, isEnabled, initialPreference)

  useEffect(() => {
    if (!mobileOpen) return

    const onOutsideTap = (event: PointerEvent) => {
      if (event.target instanceof Node && mobileButtonRef.current?.contains(event.target)) return
      setMobileOpen(false)
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
        mobileButtonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onOutsideTap, { passive: true })
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('pointerdown', onOutsideTap)
      document.removeEventListener('keydown', onEscape)
    }
  }, [mobileOpen])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const mobile = window.matchMedia('(hover: none), (pointer: coarse)')
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMobile = () => !pointer.matches && mobile.matches
    const supportsMotion = () =>
      (pointer.matches || (onMobile() && mobileOpen)) &&
      !motion.matches &&
      isEnabled() &&
      document.visibilityState === 'visible'

    let alive = true
    let requestToken = 0
    let loading = false
    let loaded = false
    let loadFailed = false
    let frame = 0
    let lastFrameTime = 0
    let abort: AbortController | null = null
    let clipController: MascotClipController | null = null
    let disposeModel: (() => void) | null = null
    let renderFrame: ((delta: number, state: MascotFrame) => void) | null = null
    let target = { x: 90, y: Math.max(90, window.innerHeight - 140) }
    let state: MascotFrame = {
      position: { ...target },
      facingRad: 0,
      locomotion: 'idle',
    }

    const stop = () => {
      if (frame) window.cancelAnimationFrame(frame)
      frame = 0
      lastFrameTime = 0
      clipController?.stop()
      canvas.dataset.active = 'false'
    }

    const unload = () => {
      stop()
      requestToken += 1
      abort?.abort()
      abort = null
      clipController?.dispose()
      clipController = null
      disposeModel?.()
      disposeModel = null
      renderFrame = null
      loaded = false
      loading = false
    }

    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick)
      if (!supportsMotion()) {
        stop()
        return
      }
      if (lastFrameTime && now - lastFrameTime < 1000 / MAX_FPS) return

      const elapsed = lastFrameTime ? Math.min((now - lastFrameTime) / 1000, 0.05) : 0.016
      lastFrameTime = now
      if (onMobile()) {
        // A stationary preview instead of a floating follower on narrow touch screens.
        clipController?.transitionTo('idle')
        renderFrame?.(elapsed, { ...state, facingRad: Math.PI / 2, locomotion: 'idle' })
        return
      }
      state = stepMascotFollow(state, target, elapsed, {
        width: window.innerWidth,
        height: window.innerHeight,
        padding: CANVAS_WIDTH / 2,
      })
      clipController?.transitionTo(state.locomotion)
      canvas.style.transform = `translate3d(${state.position.x - CANVAS_WIDTH / 2}px, ${state.position.y - CANVAS_HEIGHT / 2}px, 0)`
      renderFrame?.(elapsed, state)
    }

    const play = () => {
      if (!loaded || !supportsMotion()) return
      canvas.dataset.active = 'true'
      if (!frame) {
        clipController?.transitionTo('idle')
        frame = window.requestAnimationFrame(tick)
      }
    }

    const beginLoad = async () => {
      if (!alive || loading || loaded || loadFailed || !supportsMotion()) return
      loading = true
      const currentToken = ++requestToken
      const signal = new AbortController()
      abort = signal
      try {
        const [THREE, { GLTFLoader }] = await Promise.all([
          import('three'),
          import('three/addons/loaders/GLTFLoader.js'),
        ])
        if (!alive || currentToken !== requestToken || !supportsMotion()) return

        const response = await fetch(MODEL_URL, { signal: signal.signal, cache: 'force-cache' })
        if (!response.ok) throw new Error('Mascot model unavailable')
        const arrayBuffer = await response.arrayBuffer()
        if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > 5 * 1024 * 1024) {
          throw new Error('Unexpected 3D model size')
        }
        const gltf = await new GLTFLoader().parseAsync(arrayBuffer, '/mascot/')
        if (!alive || currentToken !== requestToken || !supportsMotion()) return

        const model = gltf.scene
        const actionMixer = new THREE.AnimationMixer(model)
        const required: MascotClipName[] = ['idle', 'walk', 'run']
        const actions = {} as Record<MascotClipName, MascotClipAction>
        for (const name of required) {
          const clip = gltf.animations.find((item) => item.name === name)
          if (!clip) throw new Error('Missing mascot animation clip')
          const action = actionMixer.clipAction(clip)
          action.setLoop(THREE.LoopRepeat, Infinity)
          actions[name] = action
        }
        const controller = createMascotClipController(actions)
        if (!controller) throw new Error('Invalid mascot animation actions')

        const renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: 'low-power',
        })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
        renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT, false)
        renderer.setClearColor(0x000000, 0)

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(37, CANVAS_WIDTH / CANVAS_HEIGHT, 0.1, 50)
        camera.position.set(0, 1.24, 5.5)
        camera.lookAt(0, 1.22, 0)
        scene.add(new THREE.AmbientLight(0xffffff, 1.8))
        const sunlight = new THREE.DirectionalLight(0xffffff, 2.2)
        sunlight.position.set(2, 4, 6)
        scene.add(sunlight)
        scene.add(model)

        clipController = controller
        loaded = true
        renderFrame = (delta, current) => {
          actionMixer.update(delta)
          model.rotation.y = Math.PI / 2 - current.facingRad
          renderer.render(scene, camera)
        }
        disposeModel = () => {
          actionMixer.stopAllAction()
          actionMixer.uncacheRoot(model)
          model.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return
            object.geometry.dispose()
            const mats = Array.isArray(object.material) ? object.material : [object.material]
            for (const material of mats) material.dispose()
          })
          scene.clear()
          renderer.dispose()
        }

        clipController.transitionTo('idle')
        play()
      } catch {
        // Do not retry a failed GLB or WebGL initialization on every pointermove.
        loadFailed = true
        canvas.dataset.active = 'false'
      } finally {
        if (currentToken === requestToken) loading = false
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!pointer.matches || event.pointerType !== 'mouse' || !supportsMotion()) return
      const element = event.target
      if (
        element instanceof Element &&
        element.closest('input,textarea,select,[contenteditable]')
      ) {
        return
      }
      target = { x: event.clientX, y: event.clientY }
      if (loaded) play()
      else if (!loading) void beginLoad()
    }
    const onPreference = () => {
      if (!onMobile() || motion.matches || !isEnabled()) setMobileOpen(false)
      if (!supportsMotion()) unload()
      else {
        loadFailed = false
        if (onMobile() && mobileOpen) void beginLoad()
      }
    }
    const onVisibility = () => {
      if (!supportsMotion()) stop()
      else if (loaded) play()
      else if (onMobile() && mobileOpen) void beginLoad()
    }
    const onContextLost = (event: Event) => {
      event.preventDefault()
      unload()
      // Require an explicit preference change before retrying a lost WebGL context.
      loadFailed = true
    }

    document.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener(PREFERENCE_EVENT, onPreference)
    window.addEventListener('storage', onPreference)
    pointer.addEventListener('change', onPreference)
    mobile.addEventListener('change', onPreference)
    motion.addEventListener('change', onPreference)
    canvas.addEventListener('webglcontextlost', onContextLost)
    canvas.dataset.ready = 'true'
    if (onMobile() && mobileOpen) void beginLoad()

    return () => {
      alive = false
      unload()
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener(PREFERENCE_EVENT, onPreference)
      window.removeEventListener('storage', onPreference)
      pointer.removeEventListener('change', onPreference)
      mobile.removeEventListener('change', onPreference)
      motion.removeEventListener('change', onPreference)
      canvas.removeEventListener('webglcontextlost', onContextLost)
    }
  }, [mobileOpen])

  return (
    <>
      <canvas
        ref={canvasRef}
        id="mascot-3d-mobile-preview"
        className="mascot-3d-canvas"
        aria-hidden="true"
        data-testid="mascot-3d"
        data-active="false"
        data-mobile-open={mobileOpen ? 'true' : 'false'}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
      />
      {enabled && (
        <button
          ref={mobileButtonRef}
          type="button"
          className="mascot-3d-mobile-button"
          aria-expanded={mobileOpen}
          aria-controls="mascot-3d-mobile-preview"
          aria-label={mobileOpen ? '3Dマスコットを閉じる' : '3Dマスコットを表示する'}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? '閉じる ×' : '✦ 3D'}
        </button>
      )}
    </>
  )
}

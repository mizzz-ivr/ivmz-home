'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import { site } from '@/lib/site'

const PET_PREFERENCE_KEY = 'ivmz-follow-pet'
const PET_PREFERENCE_EVENT = 'ivmz:pet-preference'
const PET_WIDTH = 88
const PET_HEIGHT = 110

function preferenceEnabled(): boolean {
  try {
    return window.localStorage.getItem(PET_PREFERENCE_KEY) !== 'off'
  } catch {
    return true
  }
}

function bounded(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(Math.max(minimum, maximum), value))
}

/**
 * Visual-only cursor companion. Moves its DOM node with a short, self-stopping RAF loop;
 * mouse movement does not trigger React state updates or intercept pointer interactions.
 */
export function PointerPet() {
  const companion = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = companion.current
    if (!node) return

    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let x = -PET_WIDTH
    let y = -PET_HEIGHT
    let targetX = x
    let targetY = y
    const supported = () => pointer.matches && !motion.matches

    const stop = () => {
      node.classList.remove('is-active')
      if (frame) window.cancelAnimationFrame(frame)
      frame = 0
    }

    const animate = () => {
      x += (targetX - x) * 0.16
      y += (targetY - y) * 0.16
      node.style.transform = `translate3d(${x}px, ${y}px, 0)`

      if (Math.abs(targetX - x) > 0.6 || Math.abs(targetY - y) > 0.6) {
        frame = window.requestAnimationFrame(animate)
      } else {
        frame = 0
      }
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !supported() || !preferenceEnabled()) return
      targetX = bounded(event.clientX - 100, 8, window.innerWidth - PET_WIDTH - 8)
      targetY = bounded(event.clientY + 20, 8, window.innerHeight - PET_HEIGHT - 8)
      node.classList.add('is-active')
      if (!frame) frame = window.requestAnimationFrame(animate)
    }

    const onPreferenceChange = () => {
      if (!supported() || !preferenceEnabled()) stop()
    }

    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('mouseleave', stop)
    pointer.addEventListener('change', onPreferenceChange)
    motion.addEventListener('change', onPreferenceChange)
    window.addEventListener(PET_PREFERENCE_EVENT, onPreferenceChange)

    return () => {
      stop()
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('mouseleave', stop)
      pointer.removeEventListener('change', onPreferenceChange)
      motion.removeEventListener('change', onPreferenceChange)
      window.removeEventListener(PET_PREFERENCE_EVENT, onPreferenceChange)
    }
  }, [])

  return (
    <div ref={companion} className="cursor-pet" data-testid="cursor-pet" aria-hidden="true">
      <span className="cursor-pet-star">✦</span>
      <span className="cursor-pet-head">
        <Image src={site.githubAvatarUrl} alt="" width={72} height={72} sizes="72px" />
      </span>
      <span className="cursor-pet-body">i/</span>
      <span className="cursor-pet-shadow" />
    </div>
  )
}

/** User-controlled setting lives in the footer and only affects this decoration. */
export function PointerPetPreference() {
  const [enabled, setEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    setEnabled(preferenceEnabled())
  }, [])

  const toggle = () => {
    const next = !enabled
    try {
      window.localStorage.setItem(PET_PREFERENCE_KEY, next ? 'on' : 'off')
    } catch {
      // Continue with the in-page preference if local storage is unavailable.
    }
    setEnabled(next)
    window.dispatchEvent(new Event(PET_PREFERENCE_EVENT))
  }

  return (
    <button
      type="button"
      className="pet-preference"
      disabled={enabled === null}
      aria-pressed={enabled === true}
      onClick={toggle}
    >
      {enabled === null ? 'PET …' : enabled ? 'PET ON ✦' : 'PET OFF'}
      <span className="sr-only">（マウス追従キャラクターの表示切替）</span>
    </button>
  )
}

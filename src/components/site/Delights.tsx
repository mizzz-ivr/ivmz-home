'use client'

import { useEffect, useState } from 'react'

const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
] as const

const SPARK_COUNT = 7
const SPARK_COLORS = ['#ffd84a', '#9c6cff', '#68d9e8', '#ee8fc3'] as const
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function isInteractive(target: EventTarget | null) {
  return target instanceof Element && target.closest('input, textarea, select, [contenteditable]')
}

/**
 * Small playful touches: a burst of sparkles where you click, and a Konami-code easter egg.
 * Both are decoration only and stay off with reduced motion.
 */
export function Delights() {
  const [party, setParty] = useState(0)

  useEffect(() => {
    if (reducedMotion()) return

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || event.button !== 0) return
      for (let index = 0; index < SPARK_COUNT; index += 1) {
        const spark = document.createElement('i')
        const angle = (Math.PI * 2 * index) / SPARK_COUNT + Math.random() * 0.6
        const distance = 26 + Math.random() * 30
        spark.className = 'click-spark'
        spark.setAttribute('aria-hidden', 'true')
        spark.textContent = '✦'
        spark.style.left = `${event.clientX}px`
        spark.style.top = `${event.clientY}px`
        spark.style.color = SPARK_COLORS[index % SPARK_COLORS.length]
        spark.style.setProperty('--dx', `${Math.cos(angle) * distance}px`)
        spark.style.setProperty('--dy', `${Math.sin(angle) * distance}px`)
        document.body.appendChild(spark)
        spark.addEventListener('animationend', () => spark.remove(), { once: true })
      }
    }

    let progress = 0
    const onKeyDown = (event: KeyboardEvent) => {
      if (isInteractive(event.target)) return
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
      progress = key === KONAMI[progress] ? progress + 1 : key === KONAMI[0] ? 1 : 0
      if (progress === KONAMI.length) {
        progress = 0
        setParty((count) => count + 1)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useEffect(() => {
    if (party === 0) return
    const timer = setTimeout(() => setParty(0), 4200)
    return () => clearTimeout(timer)
  }, [party])

  if (party === 0) return null

  return (
    <div className="konami" data-konami role="status" key={party}>
      <div className="konami-confetti" aria-hidden="true">
        {Array.from({ length: 36 }, (_, index) => (
          <i
            key={index}
            style={
              {
                '--x': `${(index * 97) % 100}%`,
                '--d': `${(index % 9) * 0.12}s`,
                '--r': `${(index * 53) % 360}deg`,
                background: SPARK_COLORS[index % SPARK_COLORS.length],
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <p>✦ COMMAND ACCEPTED ✦ 見つけてくれて、ありがとう！</p>
    </div>
  )
}

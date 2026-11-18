'use client'

import { useState } from 'react'

import type { Persona } from '@/lib/about-content'

/** About "three faces" tabs: engineer / gamer / creator. */
export function PersonaTabs({ personas }: { personas: readonly Persona[] }) {
  const [active, setActive] = useState(personas[0]?.id)
  const current = personas.find((persona) => persona.id === active) ?? personas[0]
  if (!current) return null

  return (
    <div className="persona-tabs">
      <div className="persona-tablist" role="tablist" aria-label="三つの顔">
        {personas.map((persona) => (
          <button
            key={persona.id}
            type="button"
            role="tab"
            id={`persona-tab-${persona.id}`}
            aria-selected={persona.id === current.id}
            aria-controls={`persona-panel-${persona.id}`}
            className={persona.id === current.id ? 'persona-tab is-active' : 'persona-tab'}
            onClick={() => setActive(persona.id)}
          >
            {persona.label}
          </button>
        ))}
      </div>
      <div
        className="persona-panel"
        role="tabpanel"
        id={`persona-panel-${current.id}`}
        aria-labelledby={`persona-tab-${current.id}`}
      >
        <h3>{current.title}</h3>
        <p className="persona-lead">{current.lead}</p>
        <ul>
          {current.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

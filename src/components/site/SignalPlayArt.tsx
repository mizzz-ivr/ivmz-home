/**
 * Original, purely decorative SVG: marks from a creator's workbench.
 * Replaces the planet-like orbit without changing the canonical character artwork.
 */
export function SignalPlayArt() {
  return (
    <svg
      className="signal-play-art"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 520 520"
      fill="none"
    >
      <path
        className="signal-play-trace"
        d="M44 168 C26 78 124 38 204 62 L250 79 M318 54 C420 42 498 127 482 202 L454 238 M479 304 C507 413 409 488 322 475 L295 468 M204 472 C110 491 26 408 39 312 L64 278"
      />
      <path
        className="signal-play-guide"
        d="M38 137 H104 V118 H149 M390 92 H447 V140 M472 380 H418 V402 H382 M56 384 H124 V430 H153"
      />
      <path
        className="signal-play-ink"
        d="M66 244 C90 225 106 266 135 248 M370 288 C407 259 427 324 455 296"
      />
      <path
        className="signal-play-ink"
        d="M73 340 L112 345 L102 384 M395 144 L439 137 L428 178"
      />
      <g className="signal-play-tab" transform="translate(35 64) rotate(-8)">
        <rect width="110" height="34" rx="8" />
        <path d="M15 17 h9 m9 0 h9 m10 0 h9" />
        <circle cx="90" cy="17" r="5" />
      </g>
      <g className="signal-play-tag" transform="translate(397 366) rotate(7)">
        <rect width="104" height="42" rx="8" />
        <path d="M14 14 h39 M14 25 h62" />
        <path d="M77 11 l9 8 -9 8" />
      </g>
      <path
        className="signal-play-accent"
        d="M255 10 v24 M243 22 h24 M476 255 l18 -7 m-9 -6 8 19 M246 477 l-6 24 m-6 -12 24 2"
      />
      <g className="signal-play-stitches">
        <path d="M129 80 v23 M138 80 v23 M147 80 v23 M156 80 v23" />
        <path d="M352 444 v18 M363 444 v18 M374 444 v18 M385 444 v18" />
      </g>
      <path className="signal-play-highlight" d="M149 420 l18 -24 18 24 -18 24z" />
      <circle className="signal-play-dot" cx="448" cy="86" r="11" />
      <circle className="signal-play-dot" cx="62" cy="450" r="7" />
    </svg>
  )
}

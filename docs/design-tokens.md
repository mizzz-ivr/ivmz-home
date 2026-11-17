# Design tokens v1 — Digital Pop (Issue #176)

Status: Kanata approved the direction on 2026-11-14 based on UI mock v1.
This document is the single source for token values. The machine-readable
form is `src/app/(site)/tokens.css`; when the two disagree, this document
wins and the CSS is fixed to match.

## Relationship to the existing design direction

`docs/design-direction.md` (Character-first Purple Signal) stays in force:

- The canonical character remains the visual anchor. These tokens do not
  introduce a new mascot, a space motif, or a sci-fi brand.
- The base is a light neutral with violet accents; the dark theme is the
  same token set with dark values, not a separate design.
- What v1 adds on top: a tighter digital vocabulary (mono labels, dot
  grid, HUD brackets, ticker) and flat pop accents, formalised as tokens
  so pages stop hard-coding values.

Existing variables already in use (`--color-pop`, `--color-pop-ink`,
`--pop-shadow`, `--color-primary`, `--ease-signal`) keep their names and
meanings; tokens.css extends them rather than renaming.

## Principles

1. Flat colour only. No gradients for surfaces or accents (a rule Kanata
   has given repeatedly). Depth comes from offset solid shadows
   (`--pop-shadow`) and borders, not blur or glass effects.
2. Every colour, spacing, radius, shadow and motion value used by a page
   must come from a token. Hard-coded values in page CSS are defects.
3. Motion is information first: typing, tickers, live dots and reveals.
   All motion is disabled under `prefers-reduced-motion`, and content is
   fully visible with no animation support.
4. Dark and light themes share one token list; only values change.

## Colour

| Token                 | Dark      | Light     | Use                                    |
| --------------------- | --------- | --------- | -------------------------------------- |
| `--color-bg`          | `#0d0a1a` | `#faf8ff` | page background                        |
| `--color-surface`     | `#171130` | `#ffffff` | cards, panels                          |
| `--color-surface-2`   | `#1f1842` | `#f1edff` | raised / inset areas                   |
| `--color-ink`         | `#f2efff` | `#1a1230` | primary text                           |
| `--color-ink-muted`   | `#a79fd0` | `#5c5480` | secondary text                         |
| `--color-ink-soft`    | `#d4cfe2` | `#373044` | soft body text (carried over, see note) |
| `--color-line`        | `#342a63` | `#ddd5f5` | borders, grid lines                    |
| `--color-line-strong` | `rgba(205, 194, 255, 0.38)` | `rgba(68, 45, 92, 0.3)` | strong borders (carried over, see note) |
| `--color-primary`     | `#8b7bff` | `#6c4dff` | violet signal (primary actions, caret) |
| `--color-primary-soft` | `#c8b4ff` | `#6747a5` | soft violet text/accents (carried over, see note) |
| `--color-pop`         | `#ffd84a` | `#ffd23a` | pop yellow (existing token)            |
| `--color-pop-ink`     | `#1a1230` | `#1a1230` | text on pop yellow                     |
| `--color-signal-cyan` | `#3fd6e8` | `#0e7f96` | live / info signal                     |
| `--color-signal-pink` | `#ff7ac1` | `#d63384` | game / accent signal                   |
| `--color-ok`          | `#4ade80` | `#178a4c` | success, live dot                      |
| `--color-warn`        | `#ffd84a` | `#9a7b00` | warning                                |
| `--color-danger`      | `#ff6b6b` | `#c92a2a` | error                                  |
| `--color-selection`   | `rgba(156, 108, 255, 0.14)` | `rgba(109, 59, 216, 0.1)` | selection / hover wash (carried over, see note) |
| `--color-bg-elevated` | `#10101d` | `#e9e4f2` | elevated surface (carried over, see note) |

Note (2026-11-17, S2): `--color-ink-soft`, `--color-line-strong`,
`--color-primary-soft`, `--color-selection` and `--color-bg-elevated` (added in S3) are carried over from the
legacy globals.css palette with their values unchanged, so page CSS can
migrate to token names without a visual change. Retuning them to the v1
palette is a separate, deliberate step.

Heatmap scale (contribution graph, Issue #173):
`--heat-0` (empty) through `--heat-4` reuse `--color-line`,
`--color-primary` at 35% / 65% / 100% mix. No separate green palette.

## Typography

| Token                                | Value                                                            | Use                             |
| ------------------------------------ | ---------------------------------------------------------------- | ------------------------------- |
| `--font-sans`                        | system sans + `"Hiragino Kaku Gothic ProN"`, `"Noto Sans JP"`    | body, headings                  |
| `--font-mono`                        | `ui-monospace`, `"JetBrains Mono"`, `"SFMono-Regular"`, Consolas | labels, ticker, code, numbers   |
| `--text-xs` … `--text-display`       | 12 / 14 / 16 / 20 / 28 / 40 / 56 px scale                        | fixed steps, no arbitrary sizes |
| `--leading-body` / `--leading-tight` | 1.7 / 1.25                                                       | body / headings                 |
| `--tracking-label`                   | 0.12em                                                           | mono section labels (uppercase) |

## Spacing, radius, borders, shadows

- Spacing scale `--space-1..10`: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px.
  Section rhythm keeps the existing `clamp()` shells in pop.css; tokens
  cover component-level spacing.
- Radius: `--radius-s` 6px, `--radius-m` 12px, `--radius-l` 20px,
  `--radius-pill` 999px.
- Borders: `--border-1` 1px solid line colour; `--border-pop` 2px solid
  ink for sticker-style cards.
- Shadows: `--pop-shadow` (existing, 4px 4px 0 solid) is the only
  decorative shadow. `--shadow-raise` (soft, functional only, e.g.
  command palette) is the single exception and must not be used for
  decoration.

## Motion

| Token           | Value                             | Use                              |
| --------------- | --------------------------------- | -------------------------------- |
| `--ease-signal` | existing easing (reveals, hovers) | default                          |
| `--dur-fast`    | 120ms                             | hover, press                     |
| `--dur-mid`     | 320ms                             | reveals, palette open            |
| `--dur-slow`    | 520ms                             | staggered group reveals          |
| `--ticker-dur`  | 40s linear loop                   | activity ticker (pause on hover) |
| `--caret-dur`   | 1.1s steps(1)                     | blinking caret / live dot pulse  |

Rules: transforms and opacity only; stagger step 70ms (as in digital.css);
ticker and typing stop under reduced motion and show full content.

## Layout / misc

- `--grid-dot`: dot-grid background (radial dots in `--color-line`,
  24px pitch, surface areas only — never behind body text).
- `--z-header` 50, `--z-palette` 100, `--z-toast` 110.
- Breakpoints: 761px and 1080px (matching existing CSS).

## Application order

1. Load `tokens.css` before `pop.css` / `digital.css` in the site shell.
2. Migrate page CSS file by file (home → works → blog/news → about →
   schedule/links/contact), replacing hard-coded values with tokens.
3. Each migration is verified visually (PC + mobile, both themes,
   reduced motion) before the next page starts.

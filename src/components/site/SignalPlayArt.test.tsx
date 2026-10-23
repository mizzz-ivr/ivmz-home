import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SignalPlayArt } from './SignalPlayArt'

describe('SignalPlayArt', () => {
  it('renders original SVG decoration without an external asset dependency', () => {
    const markup = renderToStaticMarkup(<SignalPlayArt />)

    expect(markup).toContain('class="signal-play-art"')
    expect(markup).toContain('aria-hidden="true"')
    expect(markup).toContain('focusable="false"')
    expect(markup).toContain('viewBox="0 0 520 520"')
    expect(markup).toContain('signal-play-trace')
    expect(markup).not.toContain('<image')
    expect(markup).not.toContain('<script')
    expect(markup).not.toContain('https://')
  })
})

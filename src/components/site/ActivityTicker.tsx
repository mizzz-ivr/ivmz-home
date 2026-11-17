import type { HomeFeedItem } from '@/lib/home-content'

/**
 * Activity ticker (Issue #176 / idea I-1). Pure CSS loop over the site's real
 * latest writing / news / schedule items; the data source is swapped for the
 * live development feed in Issue #173. Pauses on hover; the global
 * reduced-motion sheet stops the loop, leaving a scrollable strip.
 */
export function ActivityTicker({ items }: { items: HomeFeedItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="activity-ticker" aria-label="最新の更新">
      <span className="ticker-tag" aria-hidden="true">
        <i />
        LIVE
      </span>
      <div className="ticker-viewport">
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <div className="ticker-copy" key={copy} aria-hidden={copy === 1 || undefined}>
              {items.map((item, index) => {
                const inner = (
                  <>
                    <em>{item.label}</em>
                    <span className="ticker-title">{item.title}</span>
                    <small>{item.meta}</small>
                  </>
                )
                return item.href ? (
                  <a
                    className="ticker-item"
                    key={`${item.title}-${index}`}
                    href={item.href}
                    tabIndex={copy === 1 ? -1 : undefined}
                  >
                    {inner}
                  </a>
                ) : (
                  <span className="ticker-item" key={`${item.title}-${index}`}>
                    {inner}
                  </span>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

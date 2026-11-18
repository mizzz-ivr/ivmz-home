/** Small label that marks a block as automatically fetched from an external source. */
export function AutoSyncBadge({ source }: { source: string }) {
  return (
    <span className="autosync-badge">
      <span className="autosync-dot" aria-hidden="true" />
      AUTO SYNC — {source}
    </span>
  )
}

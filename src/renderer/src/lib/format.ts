export function timeAgo(ms: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ms) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return d === 1 ? 'Yesterday' : `${d} days ago`
}

/** Archived units only carry a date (from the folder name), so show it instead of a relative time. */
export function unitWhen(u: { archived: boolean; lastModified: number }): string {
  return u.archived ? new Date(u.lastModified).toISOString().slice(0, 10) : timeAgo(u.lastModified)
}

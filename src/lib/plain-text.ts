// Plain-text helpers: never show customers/staff raw codes, HTTP numbers, provider JSON or ISO dates.
// (Mike 2026-11-15 raw-text sweep.) Same file lives in helm, chart-room, crew-app and skipper-app: src/lib/plain-text.ts

const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

/** What to tell a person when a request failed and all we have is an HTTP number. */
export function friendlyHttp(status?: number | string | null): string {
  const n = Number(status)
  if (n === 401) return 'Please sign in again.'
  if (n === 403) return "You don't have permission to do that."
  if (n === 404) return "We couldn't find that. It may have been removed."
  if (n === 408 || n === 504) return 'The server took too long to answer. Please try again in a moment.'
  if (n === 409) return 'That conflicts with something already saved. Please refresh and try again.'
  if (n === 413) return 'That file is too large.'
  if (n === 429) return 'Too many tries in a row. Please wait a moment and try again.'
  if (n === 502 || n === 503) return 'The server is busy right now. Please try again in a moment.'
  if (n >= 500) return 'Something went wrong on our side. Please try again in a moment.'
  if (n >= 400) return "That didn't go through. Please check it and try again."
  return 'Something went wrong. Please try again.'
}

/** True when text looks like machine output (HTTP codes, JSON, stack traces, exception names). */
export function looksTechnical(s: string): boolean {
  return /(Traceback|\bHTTP \d{3}\b|Server error \d{3}|\{\s*"|\bnull\b|\bundefined\b|\w+Error:|\w+Exception|\[object |\bNaN\b|^Error \d{3}$)/.test(s)
}

/** Safe error text for the screen: the server's own plain sentence if it has one, else the fallback. */
export function cleanErr(raw: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (typeof raw === 'string') {
    const t = raw.trim()
    if (t && t.length <= 240 && !looksTechnical(t)) return t
  }
  return fallback
}

/** 'pending_parts' -> 'Pending parts'; already-readable text is left alone. */
export function fmtLabel(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v).trim()
  if (!s) return ''
  if (/^[a-z0-9_]+$/.test(s)) {
    const t = s.replace(/_/g, ' ')
    return t.charAt(0).toUpperCase() + t.slice(1)
  }
  return s
}

/** '2026-11-12' (or an ISO timestamp) -> 'Nov 12, 2026' (short) / 'November 12, 2026'. Non-dates pass through. */
export function fmtDay(v: unknown, long = false): string {
  if (v === null || v === undefined || v === '') return ''
  const s = String(v).trim()
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (!m) return s
  const mo = Number(m[2]) - 1
  if (mo < 0 || mo > 11) return s
  return (long ? MONTHS_LONG : MONTHS_SHORT)[mo] + ' ' + Number(m[3]) + ', ' + m[1]
}

/** Payment method as stored -> what a person should read. */
export function fmtMethod(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v).trim()
  if (!s) return ''
  const k = s.toLowerCase()
  const map: Record<string, string> = {
    cash: 'Cash', check: 'Check', card: 'Credit card', credit_card: 'Credit card', 'credit card': 'Credit card', debit: 'Debit card',
    ach: 'Bank transfer', bank: 'Bank transfer', bank_transfer: 'Bank transfer', wire: 'Wire transfer', stripe: 'Credit card', clover: 'Credit card',
    account_charge: 'Charged to account', account: 'Charged to account', house_account: 'Charged to account', other: 'Other',
  }
  if (map[k]) return map[k]
  const t = s.replace(/\s*\((?:stripe|clover)[^)]*\)/i, '').trim()
  if (map[t.toLowerCase()]) return map[t.toLowerCase()]
  return fmtLabel(t)
}

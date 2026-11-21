// How many reports twisitter.com takes in an hour, counted in one place for
// the whole site (limits.js), so the caps hold everywhere at once. The caps
// are shared.json's (modules.reports.caps). Plain JS, so node's test runner can
// check it without Cloudflare's runtime.
import shared from '../shared.json' with { type: 'json' }

const { caps } = shared.modules.reports
for (const cap of ['perSender', 'keptPerHour', 'filedPerHour']) {
    if (!Number.isInteger(caps?.[cap])) throw new Error(`This counter keeps the whole site's caps too: shared.json's modules.reports.caps needs ${cap}.`)
}
export const PER_HOUR = caps.perSender // from one sender (an address, or an IPv6 /64)
// kept from everyone together: a flood stops here, and the inbox stays small
export const KEPT_PER_HOUR = caps.keptPerHour
// filed as issues from everyone together: each is an email to the developer
// and a run of the reports workflow. Past it, a report is still kept.
export const FILED_PER_HOUR = caps.filedPerHour

export const hourOf = (t = Date.now()) => Math.floor(t / 3600000)

/**
 * One more report from `sender` in `hour`, if the caps allow it.
 * @param {{ hour: number, kept: number, filed: number, senders: Record<string, number> } | null | undefined} counts the hour's counts so far
 * @returns {{ counts: object, ok: boolean, why?: 'sender' | 'site', file: boolean }}
 */
export function admitCounts(counts, sender, hour) {
    const c = counts && counts.hour === hour ? { ...counts, senders: { ...counts.senders } } : { hour, kept: 0, filed: 0, senders: {} }
    if ((c.senders[sender] || 0) >= PER_HOUR) return { counts: c, ok: false, why: 'sender', file: false }
    if (c.kept >= KEPT_PER_HOUR) return { counts: c, ok: false, why: 'site', file: false }
    c.senders[sender] = (c.senders[sender] || 0) + 1
    c.kept++
    const file = c.filed < FILED_PER_HOUR
    if (file) c.filed++
    return { counts: c, ok: true, file }
}

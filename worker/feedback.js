// The report form's handler (src/pages/feedback.astro posts here), and the
// inbox the developer reads reports in. A report is kept in KV and filed as an
// issue in the private reports repository, by that repository's workflow, so
// GitHub tells the developer about it.

export const ORIGIN = 'https://twisitter.com'
const TYPES = ['bug', 'feature', 'question', 'other']
const TYPE_NAMES = { bug: 'Problem', feature: 'Idea', question: 'Question', other: 'Feedback' }
const LABELS = { bug: ['bug'], feature: ['enhancement'], question: ['question'] }
// a report with the longest log the extension sends is about 30 KB
const MAX_BODY_BYTES = 64 * 1024
// The private repository's workflow (.github/workflows/file-report.yml there)
// opens the issue. Opened with this token it would be the developer's own
// doing, and GitHub doesn't tell anyone about their own activity; opened by
// GitHub Actions and assigned to them, it reaches them. So the token needs
// only Actions: read and write, on that one repository.
const WORKFLOW = 'file-report.yml'

const text = (x, max) => (typeof x === 'string' ? x.slice(0, max) : '')
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

// Only the form on this site sends reports. A browser always names the page a
// POST comes from, so a page elsewhere can't send them for its visitors.
const fromTheForm = origin => origin === ORIGIN || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)

export async function postFeedback(request, env, ctx) {
    if (!fromTheForm(request.headers.get('Origin') || '')) return json({ error: 'Reports come from the form on twisitter.com.' }, 403)
    if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY_BYTES) return json({ error: 'That report is too long.' }, 413)
    let body
    try {
        const raw = await request.text()
        if (raw.length > MAX_BODY_BYTES) return json({ error: 'That report is too long.' }, 413)
        body = JSON.parse(raw)
    } catch {
        return json({ error: 'Invalid JSON' }, 400)
    }

    const { type, message, username, email, details, website } = body || {}
    if (!message || typeof message !== 'string' || !message.trim()) return json({ error: 'Please say what happened.' }, 400)
    // a hidden field people leave empty and bots fill in: thank them, keep nothing
    if (website) return json({ ok: true })
    // the site's counts (caps.js, kept by limits.js) say whether to keep it, and whether to file it
    const admitted = await admit(env, await senderOf(request, env))
    if (!admitted) return json({ error: "Reports can't be taken right now. Please try again later." }, 503)
    if (!admitted.ok)
        return json(
            { error: admitted.why === 'sender' ? 'Several reports came from here in the last hour. Please try again later.' : 'Many reports came in this hour. Please try again later.' },
            429,
        )

    const entry = {
        type: TYPES.includes(type) ? type : 'other',
        message: message.trim().slice(0, 5000),
        username: text(username, 100).trim(),
        email: text(email, 200).trim(),
        ts: new Date().toISOString(),
        // what the extension's "Report a problem" link brought along, if the person kept it
        ...(details && typeof details === 'object'
            ? { details: { v: text(details.v, 40), b: text(details.b, 80), s: text(details.s, 3000), l: text(details.l, 20000) } }
            : {}),
    }

    const key = `fb_${entry.ts}_${crypto.randomUUID().slice(0, 8)}`
    await env.FEEDBACK.put(key, JSON.stringify(entry))
    // After the answer, so the person isn't kept waiting
    if (admitted.file && env.GITHUB_TOKEN && env.GITHUB_REPO) ctx.waitUntil(fileIssue(env, key, entry))
    return json({ ok: true })
}

// An IPv6 sender usually holds a whole /64, and can pick a new address in it
// for each request, so the network's first half counts as the address
export function addressOf(ip) {
    if (!ip.includes(':')) return ip
    const [head, tail = ''] = ip.toLowerCase().split('::')
    const h = head ? head.split(':') : []
    const t = tail ? tail.split(':') : []
    // an IPv4 address written as IPv6 (::ffff:203.0.113.9) is that IPv4 address
    const last = t.at(-1) ?? h.at(-1) ?? ''
    if (last.includes('.')) return last
    const groups = ip.includes('::') ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t] : h
    return `${groups
        .slice(0, 4)
        .map(g => g.replace(/^0+(?=.)/, ''))
        .join(':')}::/64`
}

// Who sent it, for the hourly count: a salted hash of the address (or its
// IPv6 /64), never the address itself
async function senderOf(request, env) {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.FEEDBACK_KEY || ''}|${addressOf(ip)}`))
    return [...new Uint8Array(digest)]
        .slice(0, 8)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}

// The one counter for the whole site (limits.js). Null when it can't be
// asked: the report is then turned away as the site's trouble, not the sender's.
async function admit(env, sender) {
    try {
        return await env.LIMITS.get(env.LIMITS.idFromName('site')).admit(sender)
    } catch (err) {
        console.error('feedback: report counter unavailable', err)
        return null
    }
}

// a code fence longer than any run of backticks in the text, so the text can't close it
export const fenced = t => {
    const fence = '`'.repeat(Math.max(3, ...[...t.matchAll(/`+/g)].map(m => m[0].length + 1)))
    return `${fence}text\n${t}\n${fence}`
}

// a short field as inline code, so it can't turn into a mention or a link either
const code = t => `\`${String(t).replace(/[`\n\r]/g, '')}\``

export function issueFor(key, e) {
    const name = TYPE_NAMES[e.type] || 'Feedback'
    const first = e.message.split('\n')[0]
    const title = `${name}: ${first.length > 70 ? `${first.slice(0, 69)}…` : first}`
    const who = [e.username && `X user: ${code(e.username)}`, e.email && `email: ${code(e.email)}`].filter(Boolean).join(' · ')
    const body = [
        // the person's own words, fenced, so nothing in them turns into a mention or a link
        fenced(e.message),
        '',
        `**${name}**${who ? ` · ${who}` : ''}`,
        ...(e.details
            ? ['', `**Twisitter** ${code(e.details.v)} · ${code(e.details.b)}`, '', fenced(e.details.s), '', '<details><summary>Diagnostic log</summary>', '', fenced(e.details.l), '', '</details>']
            : []),
        '',
        `<sub>Report ${key}</sub>`,
    ].join('\n')
    return { title, body, labels: (LABELS[e.type] || []).join(',') }
}

async function fileIssue(env, key, e) {
    try {
        const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env.GITHUB_TOKEN}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'twisitter-feedback',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ref: 'main', inputs: issueFor(key, e) }),
        })
        if (!res.ok) {
            console.error('feedback: GitHub issue not filed', res.status, await res.text().catch(() => ''))
            return
        }
        // the inbox links to it (the issue's text ends with this report's key)
        e.filed = true
        await env.FEEDBACK.put(key, JSON.stringify(e))
    } catch (err) {
        console.error('feedback: GitHub issue not filed', err)
    }
}

// --- the inbox: /api/feedback?key=<FEEDBACK_KEY> ---

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const PAGE_HEADERS = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    // the key is in this page's address: no link from it may pass that on
    'Referrer-Policy': 'no-referrer',
    'X-Robots-Tag': 'noindex',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
}

export async function getFeedback(request, env) {
    const url = new URL(request.url)
    const key = url.searchParams.get('key')
    if (!env.FEEDBACK_KEY || !key || key !== env.FEEDBACK_KEY) return new Response('Unauthorized', { status: 401, headers: { 'Cache-Control': 'no-store' } })

    const action = url.searchParams.get('action')
    const id = url.searchParams.get('id')
    const back = () => new Response(null, { status: 302, headers: { Location: `${url.pathname}?key=${encodeURIComponent(key)}`, 'Referrer-Policy': 'no-referrer' } })
    if (action === 'delete' && id?.startsWith('fb_')) {
        await env.FEEDBACK.delete(id)
        return back()
    }
    if (action === 'read' && id?.startsWith('fb_')) {
        const raw = await env.FEEDBACK.get(id)
        if (raw) {
            const entry = JSON.parse(raw)
            entry.read = !entry.read
            await env.FEEDBACK.put(id, JSON.stringify(entry))
        }
        return back()
    }
    if (action === 'clear-read') {
        const list = await env.FEEDBACK.list({ prefix: 'fb_' })
        for (const k of list.keys) {
            const raw = await env.FEEDBACK.get(k.name)
            if (raw && JSON.parse(raw).read) await env.FEEDBACK.delete(k.name)
        }
        return back()
    }

    const list = await env.FEEDBACK.list({ prefix: 'fb_' })
    const entries = (
        await Promise.all(
            list.keys.map(async k => {
                const raw = await env.FEEDBACK.get(k.name)
                return raw ? { id: k.name, ...JSON.parse(raw) } : null
            }),
        )
    ).filter(Boolean)
    entries.sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
    const unread = entries.filter(e => !e.read).length
    const qk = encodeURIComponent(key)
    const html = `<!doctype html>
<html><head>
<meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Twisitter reports</title>
<style>
body { font-family: system-ui; max-width: 760px; margin: 2rem auto; padding: 0 1rem; background: #000; color: #e7e9ea; }
h1 { font-size: 1.4rem; }
.toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 1rem; }
.count { font-size: 0.9rem; color: #71767b; }
.entry { border: 1px solid #2f3336; border-radius: 10px; padding: 12px 16px; margin-bottom: 12px; }
.entry.read { opacity: 0.45; }
.meta { font-size: 0.85rem; color: #71767b; margin-bottom: 4px; }
.msg { white-space: pre-wrap; }
.badge { display: inline-block; background: #1d9bf0; color: #fff; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; }
.actions { margin-top: 8px; display: flex; gap: 6px; }
.btn { font: inherit; font-size: 0.78rem; padding: 3px 10px; border-radius: 999px; border: 1px solid #536471; background: #16181c; color: #e7e9ea; text-decoration: none; }
.btn:hover { background: #2f3336; }
.det { margin-top: 8px; font-size: 0.85rem; color: #aab; }
.det pre { white-space: pre-wrap; word-break: break-word; max-height: 300px; overflow: auto; background: #16181c; padding: 8px; border-radius: 6px; }
</style>
</head><body>
<h1>Twisitter reports</h1>
<div class="toolbar">
    <span class="count">${entries.length} total · ${unread} unread</span>
    ${entries.some(e => e.read) ? `<a class="btn" href="?key=${qk}&action=clear-read" onclick="return confirm('Delete all read reports?')">Delete read</a>` : ''}
</div>
${entries
    .map(
        e => `<div class="entry${e.read ? ' read' : ''}">
<div class="meta"><span class="badge">${esc(e.type)}</span> ${esc(e.ts)}${e.username ? ` · ${esc(e.username)}` : ''}${e.email ? ` · ${esc(e.email)}` : ''}</div>
<div class="msg">${esc(e.message)}</div>
${e.details ? `<details class="det"><summary>Twisitter ${esc(e.details.v)} · ${esc(e.details.b)}</summary><pre>${esc(e.details.s)}\n\n${esc(e.details.l)}</pre></details>` : ''}
${e.filed && env.GITHUB_REPO ? `<div class="meta"><a class="btn" rel="noreferrer" href="https://github.com/${esc(env.GITHUB_REPO)}/issues?q=${encodeURIComponent(e.id)}">GitHub issue</a></div>` : ''}
<div class="actions">
    <a class="btn" href="?key=${qk}&action=read&id=${encodeURIComponent(e.id)}">${e.read ? 'Mark unread' : 'Mark read'}</a>
    <a class="btn" href="?key=${qk}&action=delete&id=${encodeURIComponent(e.id)}" onclick="return confirm('Delete this report?')">Delete</a>
</div>
</div>`,
    )
    .join('\n')}
${entries.length === 0 ? '<p style="color:#71767b">No reports yet.</p>' : ''}
</body></html>`
    return new Response(html, { headers: PAGE_HEADERS })
}

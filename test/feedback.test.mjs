// The report form's handler (worker/feedback.js) with a stand-in KV, counter
// and fetch: who may send, what's kept, the hourly caps, the issue it files
// and the inbox. The counter runs the real counting (caps.js); its Durable
// Object wrapper (limits.js) needs Cloudflare's runtime, so app.js is loaded
// instead of index.js.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import worker from '../worker/app.js'
import { addressOf, issueFor } from '../worker/feedback.js'
import { admitCounts, FILED_PER_HOUR, hourOf, KEPT_PER_HOUR, PER_HOUR } from '../worker/caps.js'

function fakeKv() {
  const data = new Map()
  return {
    data,
    get: async k => (data.has(k) ? data.get(k) : null),
    put: async (k, v) => void data.set(k, v),
    delete: async k => void data.delete(k),
    list: async ({ prefix }) => ({ keys: [...data.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })) }),
  }
}

// the Durable Object binding: one object for the whole site, as limits.js keeps it
function fakeLimits() {
  let counts = null
  const object = {
    asked: [],
    admit: async sender => {
      object.asked.push(sender)
      const r = admitCounts(counts, sender, hourOf())
      if (r.ok) counts = r.counts
      return { ok: r.ok, why: r.why, file: r.file }
    },
  }
  return { object, idFromName: name => name, get: id => (id === 'site' ? object : null) }
}

let env, waits, dispatched
beforeEach(() => {
  env = { FEEDBACK: fakeKv(), LIMITS: fakeLimits(), GITHUB_REPO: 'Twisitter/reports', GITHUB_TOKEN: 'test-token', FEEDBACK_KEY: 'inbox-key' }
  waits = []
  dispatched = []
  globalThis.fetch = async (url, init) => {
    dispatched.push({ url, init })
    return new Response(null, { status: 204 })
  }
})
const ctx = () => ({ waitUntil: p => waits.push(p) })
const post = (body, headers = {}) =>
  worker.fetch(
    new Request('https://twisitter.com/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://twisitter.com', 'CF-Connecting-IP': '203.0.113.9', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    env,
    ctx(),
  )
const reports = () => [...env.FEEDBACK.data].filter(([k]) => k.startsWith('fb_')).map(([, v]) => JSON.parse(v))

test('keeps a report from the form, then files it through the private repository’s workflow', async () => {
  const details = { v: '0.0.1', b: 'Chrome 142, macOS', s: 'Watching 2 replies', l: '11-16 20:03 round · #a1b2c3 missing (4 reads)' }
  const res = await post({ type: 'bug', message: 'A reply shows as listed\nbut a friend can’t see it', username: 'someone', email: 'me@example.com', details })
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { ok: true })
  const [kept] = reports()
  assert.equal(kept.type, 'bug')
  assert.equal(kept.username, 'someone')
  assert.deepEqual(kept.details, details)
  await Promise.all(waits)
  assert.equal(dispatched.length, 1)
  assert.equal(dispatched[0].url, 'https://api.github.com/repos/Twisitter/reports/actions/workflows/file-report.yml/dispatches')
  assert.equal(dispatched[0].init.headers.Authorization, 'Bearer test-token')
  const sent = JSON.parse(dispatched[0].init.body)
  assert.equal(sent.ref, 'main')
  assert.equal(sent.inputs.title, 'Problem: A reply shows as listed')
  assert.equal(sent.inputs.labels, 'bug')
  assert.match(sent.inputs.body, /X user: `someone` · email: `me@example\.com`/)
  // filed: the inbox can link to it
  assert.equal(reports()[0].filed, true)
})

test('only the form on twisitter.com may send, and a bot that fills the hidden field is thanked and forgotten', async () => {
  assert.equal((await post({ message: 'hi' }, { Origin: 'https://elsewhere.example' })).status, 403)
  assert.equal((await post({ message: 'hi' }, { Origin: '' })).status, 403)
  assert.equal((await post({ message: 'hi', website: 'http://spam.example' })).status, 200)
  assert.equal((await post({ message: '  ' })).status, 400)
  assert.equal((await post('{not json')).status, 400)
  assert.equal((await post({ message: 'x'.repeat(70000) })).status, 413)
  assert.equal(reports().length, 0)
  assert.equal(dispatched.length, 0)
})

test(`one address gets ${PER_HOUR} reports an hour, counted by a salted hash and never the address`, async () => {
  for (let i = 0; i < PER_HOUR; i++) assert.equal((await post({ message: `report ${i}` })).status, 200)
  const tooMany = await post({ message: 'one too many' })
  assert.equal(tooMany.status, 429)
  assert.match((await tooMany.json()).error, /from here/)
  assert.equal((await post({ message: 'another address' }, { 'CF-Connecting-IP': '198.51.100.4' })).status, 200)
  // the counter is told a hash, never the address; KV keeps only the reports
  for (const sender of env.LIMITS.object.asked) assert.match(sender, /^[0-9a-f]{16}$/)
  assert.ok([...env.FEEDBACK.data.keys()].every(k => k.startsWith('fb_')))
})

test('an IPv6 sender’s whole /64 counts as one address, and an IPv4 address is itself', () => {
  assert.equal(addressOf('203.0.113.9'), '203.0.113.9')
  assert.equal(addressOf('2001:db8:aa:bb:1:2:3:4'), '2001:db8:aa:bb::/64')
  assert.equal(addressOf('2001:0DB8:00aa:bb::9'), '2001:db8:aa:bb::/64')
  assert.equal(addressOf('2001:db8::1'), '2001:db8:0:0::/64')
  assert.equal(addressOf('::ffff:203.0.113.9'), '203.0.113.9')
})

test('addresses in one IPv6 /64 share the hourly cap', async () => {
  for (let i = 0; i < PER_HOUR; i++) assert.equal((await post({ message: `report ${i}` }, { 'CF-Connecting-IP': `2001:db8:aa:bb::${i + 1}` })).status, 200)
  assert.equal((await post({ message: 'a new address, same network' }, { 'CF-Connecting-IP': '2001:db8:aa:bb:ffff::1' })).status, 429)
  assert.equal((await post({ message: 'another network' }, { 'CF-Connecting-IP': '2001:db8:aa:cc::1' })).status, 200)
})

test('when the counter can’t be asked, a report is turned away as the site’s trouble, not the sender’s', async () => {
  env.LIMITS.object.admit = async () => {
    throw new Error('Durable Object unavailable')
  }
  const res = await post({ message: 'while the counter is down' })
  assert.equal(res.status, 503)
  assert.match((await res.json()).error, /can't be taken right now/)
  assert.equal(reports().length, 0)
})

test(`at most ${FILED_PER_HOUR} reports an hour become issues and ${KEPT_PER_HOUR} are kept, from everyone together`, async () => {
  for (let i = 0; i < KEPT_PER_HOUR; i++) assert.equal((await post({ message: `report ${i}` }, { 'CF-Connecting-IP': `198.51.100.${i + 1}` })).status, 200)
  const past = await post({ message: 'past the site’s cap' }, { 'CF-Connecting-IP': '192.0.2.1' })
  assert.equal(past.status, 429)
  assert.match((await past.json()).error, /this hour/)
  await Promise.all(waits)
  assert.equal(dispatched.length, FILED_PER_HOUR)
  assert.equal(reports().length, KEPT_PER_HOUR)
})

test('the counts start over each hour', () => {
  let counts = null
  for (let i = 0; i < PER_HOUR; i++) counts = admitCounts(counts, 'a', 7).counts
  assert.equal(admitCounts(counts, 'a', 7).ok, false)
  const next = admitCounts(counts, 'a', 8)
  assert.equal(next.ok, true)
  assert.deepEqual(next.counts, { hour: 8, kept: 1, filed: 1, senders: { a: 1 } })
})

test('a report’s own words can’t turn into mentions or links in the issue', () => {
  const { body } = issueFor('fb_x', {
    type: 'other',
    message: 'ping @someone ``` and [a link](https://example.com)',
    username: '@another`one',
    email: '',
    details: { v: '0.0.1', b: '@third', s: 's', l: 'l' },
  })
  // the message sits in a fence longer than any run of backticks in it
  assert.match(body, /^````text\nping @someone ``` and \[a link\]\(https:\/\/example\.com\)\n````/)
  assert.match(body, /X user: `@anotherone`/)
  assert.match(body, /\*\*Twisitter\*\* `0\.0\.1` · `@third`/)
})

test('the inbox needs its key, and its page passes the key on to no link', async () => {
  await post({ message: 'kept for the inbox' })
  const get = q => worker.fetch(new Request(`https://twisitter.com/api/feedback${q}`), env, ctx())
  assert.equal((await get('')).status, 401)
  assert.equal((await get('?key=wrong')).status, 401)
  const page = await get('?key=inbox-key')
  assert.equal(page.status, 200)
  assert.equal(page.headers.get('Referrer-Policy'), 'no-referrer')
  assert.equal(page.headers.get('Cache-Control'), 'no-store')
  assert.match(await page.text(), /kept for the inbox/)
  // no key set: no inbox at all
  delete env.FEEDBACK_KEY
  assert.equal((await get('?key=')).status, 401)
})

test('anything else under /api is not found', async () => {
  const res = await worker.fetch(new Request('https://twisitter.com/api/other'), env, ctx())
  assert.equal(res.status, 404)
})

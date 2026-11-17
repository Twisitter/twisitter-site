// The report form's reading of the extension's link (src/lib/report.js): the
// details after #r=, and the stand-ins that hide post ids.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { idHider, readDetails } from '../src/lib/report.js'

// as the extension's report.ts builds the link
const link = d => `#r=${Buffer.from(JSON.stringify(d)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`

test('reads the details the extension put after #r=', () => {
  const d = { v: '0.0.1', b: 'Chrome 142, macOS', s: 'Watching 2 replies ✓', l: '11-16 20:03 round · #1000000000000000005 missing (4 reads)', t: 1 }
  assert.deepEqual(readDetails(link(d)), { v: d.v, b: d.b, s: d.s, l: d.l })
})

test('anything else is no details, and each field is capped', () => {
  assert.equal(readDetails(''), null)
  assert.equal(readDetails('#r='), null)
  assert.equal(readDetails('#r=not json!'), null)
  assert.equal(readDetails(link('just a string')), null)
  assert.equal(readDetails(link(null)), null)
  const long = readDetails(link({ v: 'v'.repeat(100), b: 1, s: 's'.repeat(5000), l: 'l'.repeat(30000) }))
  assert.equal(long.v.length, 40)
  assert.equal(long.b, '')
  assert.equal(long.s.length, 3000)
  assert.equal(long.l.length, 20000)
})

test('hides each post id behind the same stand-in throughout one report', () => {
  let n = 0
  const hide = idHider(() => `#x${n++}`)
  assert.equal(hide('#123 listed · #456 missing · #123 missing'), '#x0 listed · #x1 missing · #x0 missing')
  assert.equal(hide('then #456'), 'then #x1')
})

test('a stand-in starts with a letter, so it is never read as an id again', () => {
  const hide = idHider()
  const once = hide('#1000000000000000005 and #1000000000000000006')
  assert.match(once, /^#[a-z][a-z0-9]{5} and #[a-z][a-z0-9]{5}$/)
  assert.equal(hide(once), once)
})

test('two ids never share a stand-in', () => {
  const picks = ['#aaaaaa', '#aaaaaa', '#bbbbbb']
  const hide = idHider(() => picks.shift())
  assert.equal(hide('#1 #2'), '#aaaaaa #bbbbbb')
})

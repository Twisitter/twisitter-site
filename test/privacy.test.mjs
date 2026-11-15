// The site's privacy page is the extension's PRIVACY.md. When the extension
// repo sits next to this one, the copy must match it (`yarn sync-privacy`).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(root, '..', 'twisitter', 'PRIVACY.md')

test('the privacy page matches the extension repo', { skip: !fs.existsSync(source) && 'no ../twisitter here' }, () => {
  const copy = fs.readFileSync(path.join(root, 'src', 'text', 'privacy.md'), 'utf8')
  assert.equal(copy, fs.readFileSync(source, 'utf8'), 'run yarn sync-privacy')
})

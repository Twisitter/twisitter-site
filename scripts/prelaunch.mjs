// Builds dist-prelaunch from dist: the privacy page and the report form alone,
// so the stores have a privacy-policy URL and the extension's "Report a problem"
// works while the full site waits. twisitter.com/ sends visitors to /privacy,
// and search engines are asked to stay away. At launch, dist replaces it.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const from = path.join(root, 'dist')
const to = path.join(root, 'dist-prelaunch')
// the three pages, and what they load
const keep = ['privacy.html', 'feedback.html', '404.html', '_astro', 'assets', 'favicon.ico', 'apple-touch-icon.png', '_headers']

if (!fs.existsSync(path.join(from, 'privacy.html'))) throw new Error('No build in dist: run yarn build first.')
fs.rmSync(to, { recursive: true, force: true })
fs.mkdirSync(to)
for (const name of keep) fs.cpSync(path.join(from, name), path.join(to, name), { recursive: true })
fs.writeFileSync(path.join(to, 'robots.txt'), 'User-agent: *\nDisallow: /\n')
fs.writeFileSync(path.join(to, '_redirects'), '/ /privacy 302\n')
// a request matching several rules gets all their headers
fs.appendFileSync(path.join(to, '_headers'), '\n/*\n  X-Robots-Tag: noindex\n')
console.log(`dist-prelaunch: ${fs.readdirSync(to).sort().join(', ')}`)

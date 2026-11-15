// Renders the site's raster images from public/assets/mark.svg and
// scripts/og-image.html, in headless Chromium. Playwright comes from the
// extension repo next to this one (../twisitter), so the site itself keeps a
// single dependency.
//   favicon.ico            16, 32 and 48 px
//   apple-touch-icon.png   180 px, a full square (iOS rounds the corners)
//   assets/og-image.png    1200x630 social card
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const pub = path.join(root, 'public')
const require = createRequire(path.join(root, '..', 'twisitter', 'package.json'))
const { chromium } = require('@playwright/test')

const mark = fs.readFileSync(path.join(pub, 'assets', 'mark.svg'), 'utf8')
const browser = await chromium.launch({ channel: 'chromium' })

async function shot(html, width, height, opts = {}) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  if (opts.url) await page.goto(opts.url)
  else await page.setContent(html)
  const png = await page.screenshot({ omitBackground: !opts.opaque, clip: { x: 0, y: 0, width, height } })
  await page.close()
  return png
}
const sized = (svg, size) => svg.replace('<svg ', `<svg width="${size}" height="${size}" `)
const body = inner => `<html><body style="margin:0;background:transparent">${inner}</body></html>`

// favicon.ico: PNG images in an ICO container
const icons = []
for (const size of [16, 32, 48]) icons.push({ size, png: await shot(body(sized(mark, size)), size, size) })
const header = Buffer.alloc(6 + 16 * icons.length)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(icons.length, 4)
let offset = header.length
icons.forEach(({ size, png }, i) => {
  const e = 6 + 16 * i
  header.writeUInt8(size, e)
  header.writeUInt8(size, e + 1)
  header.writeUInt8(0, e + 2)
  header.writeUInt8(0, e + 3)
  header.writeUInt16LE(1, e + 4)
  header.writeUInt16LE(32, e + 6)
  header.writeUInt32LE(png.length, e + 8)
  header.writeUInt32LE(offset, e + 12)
  offset += png.length
})
fs.writeFileSync(path.join(pub, 'favicon.ico'), Buffer.concat([header, ...icons.map(i => i.png)]))

// apple-touch-icon.png: the tile without its rounded corners
const square = sized(mark.replace('rx="22"', 'rx="0"'), 180)
fs.writeFileSync(path.join(pub, 'apple-touch-icon.png'), await shot(body(square), 180, 180, { opaque: true }))

// the social card
const og = await shot('', 1200, 630, { url: 'file://' + path.join(root, 'scripts', 'og-image.html'), opaque: true })
fs.writeFileSync(path.join(pub, 'assets', 'og-image.png'), og)

await browser.close()
console.log('images written to', pub)

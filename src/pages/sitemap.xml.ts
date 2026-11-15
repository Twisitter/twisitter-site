import type { APIRoute } from 'astro'
import { execSync } from 'node:child_process'

const SITE = 'https://twisitter.com'

const pageFiles = Object.keys(import.meta.glob('./**/*.astro'))

function urlPath(file: string): string | null {
  const rel = file.replace(/^\.\//, '').replace(/\.astro$/, '')
  if (rel === '404' || /(^|\/)_/.test(rel) || rel.includes('[')) return null
  if (rel === 'index') return '/'
  return '/' + rel.replace(/\/index$/, '')
}

// <lastmod> is the page file's last commit date. On a shallow clone every file would appear
// to change in the one commit present, so dates are left out rather than reported wrong.
function lastCommitDates(): (file: string) => string | undefined {
  const git = (cmd: string) => execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  try {
    if (git('git rev-parse --is-shallow-repository') !== 'false') return () => undefined
  } catch {
    return () => undefined
  }
  return file => {
    try {
      return git(`git log -1 --format=%cs -- "src/pages/${file.replace(/^\.\//, '')}"`) || undefined
    } catch {
      return undefined
    }
  }
}

export const GET: APIRoute = () => {
  const lastmod = lastCommitDates()
  const urls = pageFiles
    .map(file => ({ path: urlPath(file), lastmod: lastmod(file) }))
    .filter((u): u is { path: string; lastmod: string | undefined } => u.path !== null)
    .sort((a, b) => (a.path === '/' ? -1 : b.path === '/' ? 1 : a.path.localeCompare(b.path)))

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      u => `  <url><loc>${SITE}${u.path}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`,
    ),
    '</urlset>',
    '',
  ].join('\n')

  return new Response(body, { headers: { 'Content-Type': 'application/xml' } })
}

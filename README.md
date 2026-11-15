# twisitter.com

The site for the Twisitter extension (`../twisitter`): one landing page, the
privacy policy and a 404. Built with Astro to static files, served by
Cloudflare Pages.

## Look

X's look, without X's marks: black and white, X's greys and lines, heavy tight
headings, pill buttons, and old Twitter's blue (`#1da1f2`) for the mark and
accents. The mark is the extension's icon (`public/assets/mark.svg`, a copy of
`../twisitter/src/icons/icon.svg`): a reply bubble cut by a stencil diagonal.
The word "hides" in the headline carries the same cut (`.cut` in
`src/styles/global.css`).

The demo thread is made up: no real accounts, posts or handles, apart from the
placeholders `@you` and `@yoursecond`. The note under the reply uses the
extension's own wording (`../twisitter/src/src/describe.ts`).

No webfonts, no scripts, no analytics, nothing from other sites. The built pages
carry a content policy in a meta tag, and `public/_headers` sets it (plus
`frame-ancestors`) on Cloudflare Pages.

## Develop

Yarn 4 with a 7-day age gate on new packages (`.yarnrc.yml`), no install
scripts. Astro's telemetry is off in every script.

```bash
node .yarn/releases/yarn-4.14.1.cjs install
```

```bash
yarn build && yarn preview        # http://localhost:4321
yarn test                         # the privacy page still matches ../twisitter/PRIVACY.md
```

## Files

```
src/pages/index.astro        the landing page; its FAQ list also feeds the FAQPage data
src/pages/privacy.astro      renders src/text/privacy.md
src/text/privacy.md          a copy of ../twisitter/PRIVACY.md: `yarn sync-privacy`
src/components/ReplyDemo.astro   the made-up thread, as you and as others see it
src/data/links.ts            store URLs; empty ones show "Coming soon"
public/_headers              Cloudflare Pages response headers
scripts/make-images.mjs      renders favicon.ico, apple-touch-icon.png and assets/og-image.png
scripts/og-image.html        the social card's source
```

`scripts/make-images.mjs` borrows Playwright from `../twisitter`, so the site
keeps one dependency. Run it after changing the mark or the card:

```bash
node scripts/make-images.mjs
```

## Before launch

- [ ] `PRIVACY.md` in the extension repo says "Draft of 2026-11-14". Date it as
      the live version, then `yarn sync-privacy`.
- [ ] Store URLs in `src/data/links.ts` once the listings are live.
- [ ] Deploy: a Cloudflare Pages project with the custom domain
      `twisitter.com` (the domain is already on Cloudflare). `wrangler pages
      deploy dist` needs Node 22.

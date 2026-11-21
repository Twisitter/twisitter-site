# twisitter.com

The site for the Twisitter extension (`../twisitter`): one landing page, the
privacy policy and a 404. Built with Astro to static files, served by a
Cloudflare Worker that serves static files only (see Deploy).

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
`frame-ancestors`) on Cloudflare.

## Develop

Yarn 4 with a 7-day age gate on new packages (`.yarnrc.yml`), no install
scripts. Astro's telemetry is off in every script.

```bash
node .yarn/releases/yarn-4.14.1.cjs install
```

```bash
yarn build && yarn preview        # http://localhost:4321
yarn test                         # the report form and its Worker, and the privacy page still matches ../twisitter/PRIVACY.md
```

## Files

```
src/pages/index.astro        the landing page; its FAQ list also feeds the FAQPage data
src/pages/privacy.astro      renders src/text/privacy.md
src/pages/feedback.astro     the report form the extension's "Report a problem" opens
src/lib/                     the form's script, and the handler that keeps a private report, files it in
                             the reports repo, and the inbox: synced from the shared source (below)
worker/index.js              the Worker, for /api/* only, and the Durable Object that counts the
                             site's reports: synced from the shared source (below)
src/text/privacy.md          a copy of ../twisitter/PRIVACY.md: `yarn sync-privacy`
src/components/ReplyDemo.astro   the made-up thread, as you and as others see it
src/data/links.ts            store URLs: a button for each one set, "Coming soon" when none is
public/_headers              Cloudflare response headers
public/assets/twisitter-intro.mp4, .jpg   the intro video on the landing page and its poster: the
                             web copy and poster.jpg from ../twisitter-video, copied unchanged
scripts/prelaunch.mjs        builds dist-prelaunch: the privacy page and the form alone (the site before launch)
deploy/                      the Worker's config for `cf deploy`
scripts/make-images.mjs      renders favicon.ico, apple-touch-icon.png and assets/og-image.png
scripts/og-image.html        the social card's source
```

The report form's code is synced from the shared source
(`../extension-shared`, its `reports` module): `src/lib/` (the form's script and
the handler that keeps a private report, files it in the reports repo, and the
inbox), `worker/index.js` (the Worker and the Durable Object that counts
reports), and the tests in `test/` (all but `privacy.test.mjs`, which is this
site's). ghostedwatch.com runs the same Worker. Change them there, then
`node sync.mjs ../twisitter-site` there; a test here fails when a synced file
is edited here. `shared.json` holds this site's settings for them (the origin,
the names, the two repositories, the hourly caps), and `shared.lock.json` is
written by the sync.

`scripts/make-images.mjs` borrows Playwright from `../twisitter`, so the site
keeps one dependency. Run it after changing the mark or the card:

```bash
node scripts/make-images.mjs
```

## Deploy

twisitter.com is a Cloudflare Worker named `twisitter-site`. Its pages are
static files, and only `/api/*` runs its script (`worker/index.js`), for the
report form. Cloudflare serves static files whole, ignoring requests for part
of one (`Range`, checked 2026-11-21), so Chrome and Edge play and replay the
intro video but can't skip through it. `deploy/cloudflare.config.ts` gives it:
- the domain (Cloudflare made the DNS record and the certificate);
- no workers.dev address;
- the 404 page;
- `FEEDBACK`, a KV namespace: the private reports (`fb_*`);
- `LIMITS`, a Durable Object (`Limits` in `worker/index.js`, SQLite storage):
  the site's one counter of reports, so the caps in `shared.json` hold
  everywhere at once: 5 an hour per sender (a salted hash of the address, or
  its IPv6 /64), 30 kept and 10 filed as issues an hour from everyone together.
  It keeps only the current hour's counts, and an alarm drops them within two
  hours;
- two secrets, set with `cf workers secrets update`, never in a file:
  `GITHUB_TOKEN`, a fine-grained token with Actions read and write on the
  private reports repository only, and `FEEDBACK_KEY`, the inbox's key and the
  counts' salt.

Reports are filed in the private repository `shared.json` names
(`Twisitter/reports`, by `.github/workflows/file-report.yml` there). The inbox
is `/api/feedback`: open `/api/feedback?key=<FEEDBACK_KEY>` once, and it sets a
cookie for 30 days and takes the key out of the address. Without `GITHUB_TOKEN`
a report is still kept there.

A push to `main` deploys it. Cloudflare's builds for Workers, connected to this
repository on the Worker, run `npm run build:cloudflare` (fetch the full history
for the sitemap's dates, install, test, build: a failing test stops it) and then
`npm run deploy` (install the pinned `cf` and `wrangler` in `deploy/`, then
`cf deploy`). Both are scripts in `package.json`, so a change to either is a
commit here, not a setting in Cloudflare. They run with npm because the build's
Node (26, from `.nvmrc`) has no Corepack to put `yarn` on its path.

`deploy/package.json` pins `cf` and `wrangler` (cf 1.0.0-beta.12, wrangler
4.147.0), and `deploy/package-lock.json` pins everything they need, each older
than 7 days when locked. `cf` needs Node 22.23 or later. The build deploys with
a token Cloudflare made for it.

To deploy by hand instead, with `CLOUDFLARE_ACCOUNT_ID` set to the account that
holds twisitter.com:

```bash
yarn build && npm run deploy -- --dry-run && npm run deploy
```

Before launch (2026-11-15 to 11-20), `yarn build-prelaunch` built
`dist-prelaunch` instead: only the privacy page and the report form, with `/`
redirecting to `/privacy`, a `robots.txt` that disallowed everything, and
`noindex` on every response.

## Launch

- [x] `PRIVACY.md` dated 2026-11-16 and synced.
- [x] The privacy page alone at twisitter.com/privacy (2026-11-15), for the
      stores' privacy-policy URL.
- [x] Store URLs in `src/data/links.ts`: Chrome 2026-11-17, Firefox 2026-11-20.
- [x] Deploy the full site (`dist`).

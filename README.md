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
worker/index.js              the Worker's entry, for /api/* only: app.js and the Limits class
worker/app.js                routes /api/feedback to the shared handler (tests load this, not index.js)
worker/caps.js, limits.js    the hourly caps, counted once for the whole site by a Durable Object
src/text/privacy.md          a copy of ../twisitter/PRIVACY.md: `yarn sync-privacy`
src/components/ReplyDemo.astro   the made-up thread, as you and as others see it
src/data/links.ts            store URLs: a button for each one set, "Coming soon" when none is
public/_headers              Cloudflare response headers
scripts/prelaunch.mjs        builds dist-prelaunch: the privacy page and the form alone (the site before launch)
deploy/                      the Worker's config for `cf deploy`
scripts/make-images.mjs      renders favicon.ico, apple-touch-icon.png and assets/og-image.png
scripts/og-image.html        the social card's source
```

The report form's code is synced from the shared source
(`../extension-shared`, its `reports` module): `src/lib/report.js`,
`report-settings.js`, `feedback-form.js` and `feedback-handler.js`, with their
tests in `test/` (all but `feedback.test.mjs` and `privacy.test.mjs`, which
are this site's). Change them there, then `node sync.mjs ../twisitter-site`
there; a test here fails when a synced file is edited here. `shared.json` holds
this site's settings for them (the origin, the names, the two repositories, the
caps), and `shared.lock.json` is written by the sync.

`scripts/make-images.mjs` borrows Playwright from `../twisitter`, so the site
keeps one dependency. Run it after changing the mark or the card:

```bash
node scripts/make-images.mjs
```

## Deploy

twisitter.com is a Cloudflare Worker named `twisitter-site`. Its pages are
static files, and only `/api/*` runs its script (`worker/index.js`), for the
report form. `deploy/cloudflare.config.ts` gives it:
- the domain (Cloudflare made the DNS record and the certificate);
- no workers.dev address;
- the 404 page;
- `FEEDBACK`, a KV namespace: the private reports (`fb_*`);
- `LIMITS`, a Durable Object (`worker/limits.js`, SQLite storage): the site's
  one counter of reports, so the caps in `shared.json` (`worker/caps.js` counts
  them) hold everywhere at once: 5 an hour per sender (a salted hash of the
  address, or its IPv6 /64), 30 kept and 10 filed as issues an hour from
  everyone together. It keeps only the current hour's counts, and an alarm
  drops them within two hours;
- two secrets, set with `cf workers secrets update`, never in a file:
  `GITHUB_TOKEN`, a fine-grained token with Actions read and write on the
  private reports repository only, and `FEEDBACK_KEY`, the inbox's key and the
  counts' salt.

Reports are filed in the private repository `shared.json` names
(`Twisitter/reports`, by `.github/workflows/file-report.yml` there). The inbox
is `/api/feedback?key=<FEEDBACK_KEY>`. Without `GITHUB_TOKEN` a report is still
kept there.

`cf deploy` (Cloudflare's `cf` CLI, Node 22 or later) loads that config with
the `cf` and `wrangler` packages (cf 1.0.0-beta.12, wrangler 4.147.0). This site
doesn't install them, so point `deploy/node_modules` at an install that has
them, and set `CLOUDFLARE_ACCOUNT_ID` to the account that holds twisitter.com.

```bash
yarn build                                          # dist
rm -rf deploy/public && cp -R dist deploy/public
(cd deploy && cf deploy --dry-run) && (cd deploy && cf deploy)
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

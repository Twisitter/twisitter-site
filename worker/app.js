// twisitter.com's Worker. The pages are static files that Cloudflare serves
// without it: the deploy config's runWorkerFirst sends only /api/* here, which
// is the report form's handler and the inbox: the shared core
// (src/lib/feedback-handler.js, set up by shared.json's modules.reports), with
// the site's one counter of reports (limits.js). index.js exports this with the
// Durable Object class; tests load this file alone.
import shared from '../shared.json' with { type: 'json' }
import { reportsHandler } from '../src/lib/feedback-handler.js'

const { post, inbox } = reportsHandler(shared.modules.reports)

// The one counter for the whole site, a Durable Object (limits.js). When it
// can't be asked, the core turns the report away as the site's trouble.
const siteCounter = env => ({ admit: sender => env.LIMITS.get(env.LIMITS.idFromName('site')).admit(sender) })

export default {
    async fetch(request, env, ctx) {
        const { pathname } = new URL(request.url)
        if (pathname === '/api/feedback') {
            if (request.method === 'POST') return post(request, env, { waitUntil: p => ctx.waitUntil(p), counter: siteCounter(env) })
            if (request.method === 'GET') return inbox(request, env)
            return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, POST' } })
        }
        return new Response('Not found', { status: 404 })
    },
}

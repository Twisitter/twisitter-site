// twisitter.com's Worker. The pages are static files that Cloudflare serves
// without it: the deploy config's runWorkerFirst sends only /api/* here, which
// is the report form's handler and the inbox (feedback.js). index.js exports
// this with the Durable Object class; tests load this file alone.
import { getFeedback, postFeedback } from './feedback.js'

export default {
    async fetch(request, env, ctx) {
        const { pathname } = new URL(request.url)
        if (pathname === '/api/feedback') {
            if (request.method === 'POST') return postFeedback(request, env, ctx)
            if (request.method === 'GET') return getFeedback(request, env)
            return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, POST' } })
        }
        return new Response('Not found', { status: 404 })
    },
}

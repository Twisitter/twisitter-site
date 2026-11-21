import { bindings, defineConfig, exports } from "cf/config";

// twisitter.com as static files on Workers; Cloudflare makes the DNS record and
// certificate for the domain. Only /api/* (the report form) and the videos
// (/assets/*.mp4) run the Worker (worker/index.js): every page is served as a
// file, with public/_headers. Cloudflare's static files ignore a request for
// part of a file, so the Worker sends a video in the parts a browser asks for,
// which Chrome and Edge need to skip through it.
export default defineConfig({
  worker: {
    name: "twisitter-site",
    compatibilityDate: "2026-10-01",
    entrypoint: "../worker/index.js",
    domains: ["twisitter.com"],
    workersDev: false,
    assets: { notFoundHandling: "404-page", runWorkerFirst: ["/api/*", "/assets/*.mp4"] },
    // the site's one counter of reports (worker/limits.js), so the hourly caps
    // hold everywhere at once
    exports: { Limits: exports.durableObject({ storage: "sqlite" }) },
    env: {
      // the site's static files, which the Worker reads the videos from
      ASSETS: bindings.assets(),
      // the private reports (created by the first deploy, 2026-11-16)
      FEEDBACK: bindings.kv({ id: "2f760fa0d1544e7ba5a75b7f89f102eb" }),
      LIMITS: bindings.durableObject({ worker: "twisitter-site", exportName: "Limits" }),
      // set with `cf workers secrets update`, never in a file: a token with
      // Actions read and write on the private reports repository only (its
      // workflow opens the issue; shared.json names it, as
      // modules.reports.privateRepo), and the inbox's key
      GITHUB_TOKEN: bindings.secret(),
      FEEDBACK_KEY: bindings.secret(),
    },
  },
});

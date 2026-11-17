import { bindings, defineConfig, exports } from "cf/config";

// twisitter.com as static files on Workers; Cloudflare makes the DNS record and
// certificate for the domain. Only /api/* runs the Worker (worker/index.js),
// for the report form: every page is served as a file, with public/_headers.
export default defineConfig({
  worker: {
    name: "twisitter-site",
    compatibilityDate: "2026-10-01",
    entrypoint: "../worker/index.js",
    domains: ["twisitter.com"],
    workersDev: false,
    assets: { notFoundHandling: "404-page", runWorkerFirst: ["/api/*"] },
    // the site's one counter of reports (worker/limits.js), so the hourly caps
    // hold everywhere at once
    exports: { Limits: exports.durableObject({ storage: "sqlite" }) },
    env: {
      // the private reports (created by the first deploy, 2026-11-16)
      FEEDBACK: bindings.kv({ id: "2f760fa0d1544e7ba5a75b7f89f102eb" }),
      LIMITS: bindings.durableObject({ worker: "twisitter-site", exportName: "Limits" }),
      // where private reports are filed: its workflow opens the issue
      GITHUB_REPO: bindings.text("Twisitter/reports"),
      // set with `cf workers secrets update`, never in a file: a token with
      // Actions read and write on that repository only, and the inbox's key
      GITHUB_TOKEN: bindings.secret(),
      FEEDBACK_KEY: bindings.secret(),
    },
  },
});

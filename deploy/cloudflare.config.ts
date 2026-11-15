import { defineConfig } from "cf/config";

// twisitter.com as static files on Workers; Cloudflare makes the DNS record and
// certificate for the domain
export default defineConfig({
  worker: {
    name: "twisitter-site",
    compatibilityDate: "2026-10-01",
    domains: ["twisitter.com"],
    workersDev: false,
    assets: { notFoundHandling: "404-page" },
  },
});

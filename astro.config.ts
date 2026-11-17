import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://twisitter.com',
  output: 'static',
  build: {
    format: 'file',
    // the content policy allows stylesheets from the site only, so none inline
    inlineStylesheets: 'never',
  },
  // nor scripts (the report form's) or anything else as inline data: each is a
  // file of its own, which the policy's 'self' allows
  vite: { build: { assetsInlineLimit: 0 } },
})

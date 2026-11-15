import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://twisitter.com',
  output: 'static',
  build: {
    format: 'file',
    // the content policy allows stylesheets from the site only, so none inline
    inlineStylesheets: 'never',
  },
})

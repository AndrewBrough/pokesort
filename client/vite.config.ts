import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'

function commitHash(): string {
  try {
    return execSync('git rev-parse --short=7 HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

export default defineConfig({
  define: {
    'import.meta.env.VITE_COMMIT': JSON.stringify(commitHash()),
  },
  server: {
    port: 5173,
    proxy: {
      '/ws': {
        target: 'http://localhost:8787',
        ws: true,
      },
    },
    fs: {
      allow: ['.', '../shared'],
    },
  },
})

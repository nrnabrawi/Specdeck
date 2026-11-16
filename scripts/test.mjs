// Runs vitest under Electron's Node so native modules (better-sqlite3, node-pty), rebuilt for Electron, load.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const electron = require('electron')
const vitest = join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs')
const r = spawnSync(electron, [vitest, ...(process.argv.length > 2 ? process.argv.slice(2) : ['run'])], {
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
})
process.exit(r.status ?? 1)

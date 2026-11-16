// Run under Electron's Node: ELECTRON_RUN_AS_NODE=1 electron scripts/native-check.mjs
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')
const db = new Database(':memory:')
console.log('sqlite', db.prepare('select sqlite_version() v').get().v)
const pty = require('node-pty')
console.log('node-pty', typeof pty.spawn, 'abi', process.versions.modules, 'electron', process.versions.electron)

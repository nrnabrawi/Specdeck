import { existsSync } from 'node:fs'
import { delimiter, join } from 'node:path'
import type { AgentKey, AgentStatus } from '../shared/types'
import { run } from './exec'
import type { Store } from './db'

const LAUNCHABLE: { key: AgentKey; label: string }[] = [
  { key: 'claude', label: 'Claude Code' },
  { key: 'codex', label: 'OpenAI Codex' }
]
// Detected-only tools (AC-081); found by PATH lookup, never executed.
const OTHERS = [
  { key: 'cursor-agent', label: 'Cursor' },
  { key: 'gemini', label: 'Gemini CLI' },
  { key: 'opencode', label: 'opencode' },
  { key: 'aider', label: 'Aider' },
  { key: 'goose', label: 'Goose' },
  { key: 'amp', label: 'Amp' }
]

export function onPath(bin: string): boolean {
  const exts = process.platform === 'win32' ? (process.env.PATHEXT ?? '.EXE;.CMD').split(';').concat('') : ['']
  return (process.env.PATH ?? '').split(delimiter).some((d) => d && exts.some((e) => existsSync(join(d, bin + e))))
}

export async function detectAgents(cwd: string, store: Store): Promise<AgentStatus[]> {
  const launchable = await Promise.all(
    LAUNCHABLE.map(async (a): Promise<AgentStatus> => {
      const enabled = store.getSetting(`agent:${a.key}:enabled`) !== 'false'
      try {
        const out = await run(a.key, ['--version'], cwd, 8000)
        return { ...a, detected: true, launchable: true, enabled, version: out.trim().split('\n')[0] }
      } catch {
        return { ...a, detected: false, launchable: true, enabled }
      }
    })
  )
  const others = OTHERS.filter((o) => onPath(o.key)).map((o): AgentStatus => ({ ...o, detected: true, launchable: false, enabled: false }))
  return [...launchable, ...others]
}

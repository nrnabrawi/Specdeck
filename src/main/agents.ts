import type { AgentStatus } from '../shared/types'
import { run } from './exec'

const AGENTS: Pick<AgentStatus, 'key' | 'label'>[] = [
  { key: 'claude', label: 'Claude Code' },
  { key: 'codex', label: 'OpenAI Codex' }
]

export async function detectAgents(cwd: string): Promise<AgentStatus[]> {
  return Promise.all(
    AGENTS.map(async (a) => {
      try {
        const out = await run(a.key, ['--version'], cwd, 8000)
        return { ...a, detected: true, version: out.trim().split('\n')[0] }
      } catch {
        return { ...a, detected: false }
      }
    })
  )
}

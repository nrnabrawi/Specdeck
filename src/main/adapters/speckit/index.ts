import { existsSync } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { AgentKey, Command, MaintenanceInfo, SpecDoc, SpecSummary, Unit } from '../../../shared/types'
import { run } from '../../exec'
import type { FrameworkAdapter } from '../types'
import { parseTasks } from '../openspec/parse'

const ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const FILES = ['spec', 'plan', 'tasks'] as const

function assertId(id: string): string {
  if (!ID.test(id)) throw new Error(`Invalid id: ${id}`)
  return id
}

const specsDir = (root: string) => join(root, 'specs')

async function readOr(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return ''
  }
}

/** Feature folders are `specs/<NNN|YYYYMMDD-HHMMSS>-<name>/` holding spec.md (verified with specify 1.0.7 + a real /speckit-specify run). */
async function featureIds(root: string): Promise<string[]> {
  if (!existsSync(specsDir(root))) return []
  const ents = await readdir(specsDir(root), { withFileTypes: true })
  return ents.filter((e) => e.isDirectory() && ID.test(e.name) && existsSync(join(specsDir(root), e.name, 'spec.md'))).map((e) => e.name)
}

/** Stage = the next step to run, inferred from files (AC-033). Converge appends tasks, which moves a feature back to implement. */
export function inferStage(spec: string, hasPlan: boolean, tasks: { done: number; total: number } | null): string {
  if (!spec || /\[NEEDS CLARIFICATION/i.test(spec)) return 'specify'
  if (!hasPlan) return 'plan'
  if (!tasks) return 'tasks'
  return tasks.total > 0 && tasks.done === tasks.total ? 'converge' : 'implement'
}

const frCount = (md: string) => (md.match(/^-\s+\*\*FR-\d+/gm) ?? []).length
const title = (spec: string, fallback: string) =>
  /^#\s+(?:Feature Specification:\s*)?(.+)$/m.exec(spec)?.[1].trim() ?? fallback

async function readUnit(root: string, id: string): Promise<Unit> {
  const dir = join(specsDir(root), id)
  const spec = await readOr(join(dir, 'spec.md'))
  const tasksMd = await readOr(join(dir, 'tasks.md'))
  const tasks = parseTasks(tasksMd)
  const mtimes = await Promise.all(FILES.map((f) => stat(join(dir, `${f}.md`)).then((s) => s.mtimeMs, () => 0)))
  return {
    id,
    name: id,
    stage: inferStage(spec, existsSync(join(dir, 'plan.md')), tasksMd ? tasks : null),
    summary: title(spec, id),
    tasks,
    archived: false,
    requirements: frCount(spec),
    lastModified: Math.max(...mtimes)
  }
}

const quote = (s: string) => (/^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replace(/'/g, "'\\''")}'`)
const cmd = (bin: string, args: string[], cwd: string, mode: Command['mode'], meta?: Command['meta']): Command => ({
  bin,
  args,
  cwd,
  display: [bin, ...args.map(quote)].join(' '),
  mode,
  meta
})

// Verified 2026-11-16 (specify 1.0.7, integration.json invoke_separator "-"): skills live in .claude/skills (Claude) and
// .agents/skills (Codex) as speckit-<stage>; Claude Code invoked with /speckit-<stage> in a real run. Codex's "$" form is
// by analogy with the verified OpenSpec Codex run (not run for Spec Kit).
const AGENT = {
  claude: { skillsDir: ['.claude', 'skills'], prefix: '/', label: 'Claude Code' },
  codex: { skillsDir: ['.agents', 'skills'], prefix: '$', label: 'Codex' }
} as const
const STAGES = ['specify', 'plan', 'tasks', 'implement', 'converge']

export const speckitAdapter: FrameworkAdapter = {
  id: 'speckit',

  async detect(root) {
    const found = existsSync(join(root, '.specify'))
    return { found, evidence: found ? '.specify/ folder' : 'no .specify/ folder' }
  },

  async listUnits(root) {
    return Promise.all((await featureIds(root)).map((id) => readUnit(root, id)))
  },

  // AC-041/043: Spec Kit has no cross-feature specs; each feature's spec/plan/tasks file is browsable (ids "<feature>:<file>").
  async listSpecs(root) {
    const out: SpecSummary[] = []
    for (const f of await featureIds(root)) {
      for (const file of FILES) {
        const md = await readOr(join(specsDir(root), f, `${file}.md`))
        if (md) out.push({ id: `${f}:${file}`, requirementCount: file === 'spec' ? frCount(md) : 0 })
      }
    }
    return out
  },

  async readSpec(root, id) {
    const [feature, file] = id.split(':')
    assertId(feature ?? '')
    if (!FILES.includes(file as (typeof FILES)[number])) throw new Error(`Invalid id: ${id}`)
    const rel = `specs/${feature}/${file}.md`
    return { id, path: rel, raw: await readFile(join(root, rel), 'utf8'), purpose: '', requirements: [] } satisfies SpecDoc
  },

  async readDeltas() {
    return []
  },

  async deltasForSpec() {
    return []
  },

  async searchSpecs(root, query) {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const hits: string[] = []
    for (const s of await this.listSpecs(root)) {
      const [f, file] = s.id.split(':')
      if (s.id.toLowerCase().includes(q) || (await readOr(join(specsDir(root), f, `${file}.md`))).toLowerCase().includes(q)) hits.push(s.id)
    }
    return hits
  },

  initCommand(root, agents) {
    const key = agents[0] ?? 'claude'
    return cmd('specify', ['init', '--here', '--force', '--non-interactive', '--integration', key, '--script', 'sh'], root, 'exec')
  },

  stageCommand(root, unitName, stage, agent, input) {
    assertId(unitName)
    const text = input?.replace(/\s+/g, ' ').trim() ?? ''
    // 'create' = a new feature from the wizard: /speckit-specify <description>; unitName is only recorded with the run
    if (stage === 'create' && !text) throw new Error('Describe the feature first.')
    if (!STAGES.includes(stage) && stage !== 'create') throw new Error(`No command for stage "${stage}"`)
    const a = AGENT[agent as AgentKey]
    // An existing feature is in "specify" only while spec.md still has open questions, so the next step is clarify.
    const skill = `speckit-${stage === 'create' ? 'specify' : stage === 'specify' ? 'clarify' : stage}`
    if (!existsSync(join(root, ...a.skillsDir, skill, 'SKILL.md')))
      throw new Error(`${a.prefix}${skill} is not installed for ${a.label}. Initialise Spec Kit with this agent (specify init --integration ${agent}).`)
    // Skills resolve the feature from .specify/feature.json (the last created one), so name the target explicitly.
    const target = stage === 'create' ? text : `Feature directory: specs/${unitName}${text ? ` ${text}` : ''}`
    return cmd(agent, [`${a.prefix}${skill} ${target}`], root, 'pty', { agent, unitId: unitName, stage })
  },

  async maintenance(root) {
    const info: MaintenanceInfo = { cli: { installed: false }, facts: [], actions: [] }
    try {
      info.cli = { installed: true, version: (await run('specify', ['--version'], root)).trim().replace(/^specify\s+/i, '') }
    } catch {
      return info
    }
    try {
      const opts = JSON.parse(await readOr(join(root, '.specify', 'init-options.json')) || '{}')
      const integ = JSON.parse(await readOr(join(root, '.specify', 'integration.json')) || '{}')
      info.facts = [
        { label: 'Integration', value: String(integ.integration ?? opts.integration ?? 'unknown') },
        { label: 'Script type', value: String(opts.script ?? 'unknown') },
        { label: 'Project Spec Kit version', value: String(integ.version ?? opts.speckit_version ?? 'unknown') }
      ]
    } catch {
      // unreadable config: show CLI only
    }
    info.actions = [
      { id: 'integration-list', label: 'List integrations', description: 'Runs specify integration list.' },
      { id: 'extension-list', label: 'List extensions', description: 'Runs specify extension list.' }
    ]
    return info
  },

  async maintenanceCommand(root, actionId) {
    if (actionId === 'integration-list') return cmd('specify', ['integration', 'list'], root, 'exec')
    if (actionId === 'extension-list') return cmd('specify', ['extension', 'list'], root, 'exec')
    throw new Error(`Unknown action: ${actionId}`)
  }
}

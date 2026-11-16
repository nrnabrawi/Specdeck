import { existsSync } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import type { Delta, SpecDoc, SpecSummary, Unit } from '../../../shared/types'
import { run } from '../../exec'
import type { FrameworkAdapter } from '../types'
import { parseDeltas, parseSpec, parseTasks, proposalSummary } from './parse'

const ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})-/

function assertId(id: string): string {
  if (!ID.test(id)) throw new Error(`Invalid id: ${id}`)
  return id
}

const dirs = (root: string) => ({
  specs: join(root, 'openspec', 'specs'),
  changes: join(root, 'openspec', 'changes'),
  archive: join(root, 'openspec', 'changes', 'archive')
})

async function subdirs(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return []
  const ents = await readdir(dir, { withFileTypes: true })
  return ents.filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => e.name)
}

async function readOr(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return ''
  }
}

async function newestMtime(dir: string): Promise<number> {
  let max = (await stat(dir)).mtimeMs
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    max = Math.max(max, e.isDirectory() ? await newestMtime(p) : (await stat(p)).mtimeMs)
  }
  return max
}

interface StatusInfo {
  artifacts: { id: string; status: string }[]
  applyRequires: string[]
}

/** `openspec status --all --json`; null when the CLI is unavailable (stage then comes from files). */
async function cliStatus(root: string): Promise<Map<string, StatusInfo> | null> {
  try {
    const out = JSON.parse(await run('openspec', ['status', '--all', '--json'], root))
    return new Map((out.changes ?? []).map((c: StatusInfo & { changeName: string }) => [c.changeName, c]))
  } catch {
    return null
  }
}

function inferStage(info: StatusInfo | undefined, dir: string): string {
  const artifacts =
    info?.artifacts ??
    [
      { id: 'proposal', status: existsSync(join(dir, 'proposal.md')) ? 'done' : 'ready' },
      { id: 'tasks', status: existsSync(join(dir, 'tasks.md')) ? 'done' : 'ready' }
    ]
  if (artifacts[0] && artifacts[0].status !== 'done') return 'explore'
  const need = info?.applyRequires ?? ['tasks']
  return need.every((id) => artifacts.find((a) => a.id === id)?.status === 'done') ? 'apply' : 'propose'
}

async function readUnit(dir: string, id: string, archived: boolean, info?: StatusInfo): Promise<Unit> {
  const tasks = parseTasks(await readOr(join(dir, 'tasks.md')))
  const date = archived ? DATE_PREFIX.exec(id) : null
  return {
    id,
    name: date ? id.slice(date[0].length) : id,
    stage: archived ? 'archive' : inferStage(info, dir),
    summary: proposalSummary(await readOr(join(dir, 'proposal.md'))),
    tasks,
    archived,
    lastModified: date ? Date.UTC(+date[1], +date[2] - 1, +date[3]) : await newestMtime(dir)
  }
}

async function unitDir(root: string, unitId: string): Promise<{ dir: string; archived: boolean } | null> {
  assertId(unitId)
  const d = dirs(root)
  if (existsSync(join(d.changes, unitId)) && unitId !== 'archive') return { dir: join(d.changes, unitId), archived: false }
  if (existsSync(join(d.archive, unitId))) return { dir: join(d.archive, unitId), archived: true }
  return null
}

async function deltasIn(dir: string, unitId: string, archived: boolean, only?: string): Promise<Delta[]> {
  const out: Delta[] = []
  for (const spec of await subdirs(join(dir, 'specs'))) {
    if (only && spec !== only) continue
    const md = await readOr(join(dir, 'specs', spec, 'spec.md'))
    if (md) out.push(...parseDeltas(md, spec, unitId, archived))
  }
  return out
}

export const openspecAdapter: FrameworkAdapter = {
  id: 'openspec',

  async detect(root) {
    const found = existsSync(join(root, 'openspec'))
    return { found, evidence: found ? 'openspec/ folder' : 'no openspec/ folder' }
  },

  async listUnits(root) {
    const d = dirs(root)
    const status = await cliStatus(root)
    const active = (await subdirs(d.changes)).filter((n) => n !== 'archive')
    const units = await Promise.all(active.map((n) => readUnit(join(d.changes, n), n, false, status?.get(n))))
    const archived = await Promise.all((await subdirs(d.archive)).map((n) => readUnit(join(d.archive, n), n, true)))
    return [...units, ...archived]
  },

  async listSpecs(root) {
    const base = dirs(root).specs
    const out: SpecSummary[] = []
    for (const id of await subdirs(base)) {
      const md = await readOr(join(base, id, 'spec.md'))
      if (md) out.push({ id, requirementCount: parseSpec(md).requirements.length })
    }
    return out
  },

  async readSpec(root, id) {
    assertId(id)
    const path = join(dirs(root).specs, id, 'spec.md')
    if (!resolve(path).startsWith(resolve(dirs(root).specs) + sep)) throw new Error('Path escapes specs dir')
    const raw = await readFile(path, 'utf8')
    let parsed: { purpose: string; requirements: SpecDoc['requirements'] } = { purpose: '', requirements: [] }
    try {
      parsed = parseSpec(raw)
    } catch {
      // AC-042: parse failure falls back to raw text
    }
    return { id, path: `openspec/specs/${id}/spec.md`, raw, ...parsed }
  },

  async readDeltas(root, unitId) {
    const u = await unitDir(root, unitId)
    return u ? deltasIn(u.dir, unitId, u.archived) : []
  },

  async deltasForSpec(root, specId) {
    assertId(specId)
    const d = dirs(root)
    const out: Delta[] = []
    for (const n of (await subdirs(d.changes)).filter((n) => n !== 'archive'))
      out.push(...(await deltasIn(join(d.changes, n), n, false, specId)))
    for (const n of await subdirs(d.archive)) out.push(...(await deltasIn(join(d.archive, n), n, true, specId)))
    return out
  },

  async searchSpecs(root, query) {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const base = dirs(root).specs
    const hits: string[] = []
    for (const id of await subdirs(base)) {
      if (id.toLowerCase().includes(q) || (await readOr(join(base, id, 'spec.md'))).toLowerCase().includes(q)) hits.push(id)
    }
    return hits
  }
}

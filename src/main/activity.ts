import type { AgentKey, FeedItem, Run, Stats, Unit, UnitEvent } from '../shared/types'
import type { Store } from './db'
import { getAdapter } from './adapters'

const DAY = 86_400_000
const AGENT_LABEL: Record<AgentKey, string> = { claude: 'Claude Code', codex: 'Codex' }

type Snap = Record<string, { done: number; total: number; archived: boolean }>
type NewEvent = Omit<UnitEvent, 'id' | 'projectId'>

/** Compares units with the last snapshot and returns what changed (pure). Keyed by unit name (stable across OpenSpec's archive rename). */
export function diffUnits(prev: Snap | null, units: Unit[], now: number): { events: NewEvent[]; snap: Snap } {
  const snap: Snap = {}
  const events: NewEvent[] = []
  for (const u of units) {
    snap[u.name] = { done: u.tasks.done, total: u.tasks.total, archived: u.archived }
    if (!prev) continue // first sighting of the project is a baseline, not an event
    const p = prev[u.name] ?? { done: 0, total: 0, archived: false }
    if (!prev[u.name] && !u.archived) events.push({ ts: now, kind: 'created', unitId: u.name, text: 'appeared', n: 0 })
    if (u.tasks.done > p.done) events.push({ ts: now, kind: 'tasks', unitId: u.name, text: 'tasks completed', n: u.tasks.done - p.done })
    const complete = (t: { done: number; total: number }) => t.total > 0 && t.done === t.total
    if (complete(u.tasks) && !complete(p)) events.push({ ts: now, kind: 'done', unitId: u.name, text: 'all tasks complete', n: 0 })
    if (u.archived && !p.archived) events.push({ ts: now, kind: 'archived', unitId: u.name, text: 'archived', n: 0 })
  }
  return { events, snap }
}

/** Records Specdeck-observed events. Changes made while Specdeck was closed are stamped when it next looks. */
export class Recorder {
  private chain = new Map<string, Promise<void>>()
  constructor(private store: Store) {}

  record(projectId: string): Promise<void> {
    const next = (this.chain.get(projectId) ?? Promise.resolve()).then(() => this.once(projectId)).catch(() => undefined)
    this.chain.set(projectId, next)
    return next
  }

  private async once(projectId: string): Promise<void> {
    const p = this.store.get(projectId)
    if (!p) return
    const key = `snap:${projectId}`
    const raw = this.store.getSetting(key)
    const units = await getAdapter(p.framework).listUnits(p.path)
    const { events, snap } = diffUnits(raw ? (JSON.parse(raw) as Snap) : null, units, Date.now())
    if (events.length) this.store.addEvents(projectId, events)
    this.store.setSetting(key, JSON.stringify(snap))
  }
}

const runText = (r: Run) => {
  const who = AGENT_LABEL[r.agent]
  if (r.endedAt === null) return `${who} is running ${r.stage}`
  return r.exitCode === 0 ? `${who} finished ${r.stage}` : `${who} ended ${r.stage} (exit ${r.exitCode ?? 'unknown'})`
}

/** Feed = recorded events + runs + file-derived archives (OpenSpec archive folders carry their date). Newest first. */
export function buildFeed(events: UnitEvent[], runs: Run[], units: Unit[]): FeedItem[] {
  const out: FeedItem[] = []
  for (const e of events) {
    if (e.kind === 'created') out.push({ id: e.id, ts: e.ts, kind: 'proposal', unitId: e.unitId, text: `${e.unitId} appeared`, source: 'recorded' })
    if (e.kind === 'tasks') out.push({ id: e.id, ts: e.ts, kind: 'tasks', unitId: e.unitId, text: `${e.n} task${e.n === 1 ? '' : 's'} completed in ${e.unitId}`, source: 'recorded' })
    if (e.kind === 'done') out.push({ id: e.id, ts: e.ts, kind: 'tasks', unitId: e.unitId, text: `All tasks complete in ${e.unitId}`, source: 'recorded' })
    if (e.kind === 'archived') out.push({ id: e.id, ts: e.ts, kind: 'archive', unitId: e.unitId, text: `${e.unitId} archived`, source: 'recorded' })
  }
  for (const r of runs) out.push({ id: r.id, ts: r.startedAt, kind: 'run', unitId: r.unitId, text: `${runText(r)} on ${r.unitId}`, agent: r.agent, source: 'recorded' })
  const recorded = new Set(events.filter((e) => e.kind === 'archived').map((e) => e.unitId))
  for (const u of units)
    if (u.archived && !recorded.has(u.name)) out.push({ id: `file:${u.id}`, ts: u.lastModified, kind: 'archive', unitId: u.name, text: `${u.name} archived`, source: 'files' })
  return out.sort((a, b) => b.ts - a.ts)
}

const median = (xs: number[]) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10)
const weekStart = (ts: number) => {
  const d = new Date(ts)
  const back = (d.getUTCDay() + 6) % 7 // Monday = 0
  return dayKey(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back))
}

/** Stats from recorded data only (AC-070). */
export function computeStats(events: UnitEvent[], runs: Run[], units: Unit[], days: 14 | 30, now: number): Stats {
  const created = new Map<string, number>()
  for (const e of [...events].sort((a, b) => a.ts - b.ts)) if (e.kind === 'created' && !created.has(e.unitId)) created.set(e.unitId, e.ts)
  const points = events
    .filter((e) => e.kind === 'done' && created.has(e.unitId))
    .sort((a, b) => a.ts - b.ts)
    .map((e) => ({ ts: e.ts, hours: (e.ts - created.get(e.unitId)!) / 3_600_000, unitId: e.unitId }))

  const taskEvents = events.filter((e) => e.kind === 'tasks')
  const tasksDaily = Array.from({ length: days }, (_, i) => dayKey(now - (days - 1 - i) * DAY)).map((day) => ({
    day,
    n: taskEvents.filter((e) => dayKey(e.ts) === day).reduce((s, e) => s + e.n, 0)
  }))
  const tasksWeekly = Array.from({ length: 8 }, (_, i) => weekStart(now - (7 - i) * 7 * DAY)).map((week) => ({
    week,
    n: taskEvents.filter((e) => weekStart(e.ts) === week).reduce((s, e) => s + e.n, 0)
  }))

  const times = [...events.map((e) => e.ts), ...runs.map((r) => r.startedAt)]
  const finished = (r: Run) => r.endedAt !== null
  const agents = (['claude', 'codex'] as AgentKey[])
    .map((agent) => {
      const rs = runs.filter((r) => r.agent === agent)
      return {
        agent,
        runs: rs.length,
        finished: rs.filter(finished).length,
        succeeded: rs.filter((r) => finished(r) && r.exitCode === 0).length,
        medianMs: median(rs.filter(finished).map((r) => r.endedAt! - r.startedAt))
      }
    })
    .filter((a) => a.runs > 0)

  return {
    windowStart: times.length ? Math.min(...times) : null,
    cycle: { medianMs: median(points.map((p) => p.hours * 3_600_000)), points },
    tasksDaily,
    tasksWeekly,
    coverage: units.length ? { withSpec: units.filter((u) => u.requirements > 0).length, total: units.length } : null,
    agents
  }
}

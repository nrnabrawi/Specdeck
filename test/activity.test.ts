import { expect, test } from 'vitest'
import { buildFeed, computeStats, diffUnits } from '../src/main/activity'
import { Store } from '../src/main/db'
import type { Unit } from '../src/shared/types'

const H = 3_600_000
const unit = (name: string, done: number, total: number, extra: Partial<Unit> = {}): Unit => ({
  id: name, name, stage: 'apply', summary: '', tasks: { done, total, items: [] }, archived: false, requirements: 1, lastModified: 0, ...extra
})

test('first sighting is a baseline; later changes become events', () => {
  const first = diffUnits(null, [unit('a', 1, 3)], 100)
  expect(first.events).toEqual([])
  const next = diffUnits(first.snap, [unit('a', 3, 3), unit('b', 0, 0)], 200)
  expect(next.events.map((e) => [e.kind, e.unitId, e.n])).toEqual([
    ['tasks', 'a', 2],
    ['done', 'a', 0],
    ['created', 'b', 0]
  ])
  const arch = diffUnits(next.snap, [unit('a', 3, 3, { archived: true, id: '2026-01-01-a' }), unit('b', 0, 0)], 300)
  expect(arch.events.map((e) => [e.kind, e.unitId])).toEqual([['archived', 'a']])
})

test('events, runs and stats reconcile with the store tables', () => {
  const s = new Store(':memory:')
  const p = s.add('/tmp/x', 'x', 'openspec')
  const now = Date.UTC(2026, 10, 18, 12) // Wed 2026-11-18
  s.addEvents(p.id, [
    { ts: now - 10 * H, kind: 'created', unitId: 'a', text: '', n: 0 },
    { ts: now - 2 * H, kind: 'tasks', unitId: 'a', text: '', n: 3 },
    { ts: now - 2 * H, kind: 'done', unitId: 'a', text: '', n: 0 },
    { ts: now - 30 * H, kind: 'created', unitId: 'b', text: '', n: 0 },
    { ts: now - 28 * H, kind: 'done', unitId: 'b', text: '', n: 0 },
    { ts: now - 9 * 86_400_000, kind: 'tasks', unitId: 'c', text: '', n: 4 }
  ])
  const r1 = s.startRun({ projectId: p.id, agent: 'claude', unitId: 'a', stage: 'apply', command: 'c' })
  s.endRun(r1.id, 0)
  const r2 = s.startRun({ projectId: p.id, agent: 'claude', unitId: 'a', stage: 'apply', command: 'c' })
  s.endRun(r2.id, 129)
  s.startRun({ projectId: p.id, agent: 'codex', unitId: 'b', stage: 'explore', command: 'c' }) // never ended in this test
  const events = s.listEvents(p.id)
  const runs = s.listRuns(p.id)
  const units = [unit('a', 3, 3), unit('b', 0, 0, { requirements: 0 }), unit('old', 1, 1, { archived: true, id: '2026-01-01-old', lastModified: 5 })]

  const st = computeStats(events, runs, units, 14, now)
  // cycle: a = 8 h, b = 2 h → median 5 h; points reconcile with created/done rows
  expect(st.cycle.points.map((x) => [x.unitId, x.hours])).toEqual([['b', 2], ['a', 8]])
  expect(st.cycle.medianMs).toBe(5 * H)
  // tasks: 3 (today) + 4 (9 days ago) = all 7 task events, in both daily and weekly views
  expect(st.tasksDaily).toHaveLength(14)
  expect(st.tasksDaily.reduce((n, d) => n + d.n, 0)).toBe(7)
  expect(st.tasksDaily.at(-1)).toEqual({ day: '2026-11-18', n: 3 })
  expect(st.tasksWeekly.reduce((n, w) => n + w.n, 0)).toBe(7)
  expect(st.tasksWeekly.at(-1)).toEqual({ week: '2026-11-16', n: 3 })
  expect(st.coverage).toEqual({ withSpec: 2, total: 3 })
  expect(st.agents.find((a) => a.agent === 'claude')).toMatchObject({ runs: 2, finished: 2, succeeded: 1 })
  expect(st.agents.find((a) => a.agent === 'codex')).toMatchObject({ runs: 1, finished: 0, succeeded: 0 })
  expect(st.windowStart).toBe(now - 9 * 86_400_000)

  const feed = buildFeed(events, runs, units)
  expect(feed.filter((f) => f.kind === 'run')).toHaveLength(runs.length)
  expect(feed.filter((f) => f.kind === 'tasks')).toHaveLength(4) // 2 tasks events + 2 done events
  expect(feed.find((f) => f.source === 'files')).toMatchObject({ kind: 'archive', unitId: 'old' })
  expect(feed.map((f) => f.ts)).toEqual([...feed.map((f) => f.ts)].sort((a, b) => b - a))
})

test('empty data gives empty stats, not made-up numbers', () => {
  const st = computeStats([], [], [], 30, Date.now())
  expect(st).toMatchObject({ windowStart: null, coverage: null, agents: [], cycle: { medianMs: null, points: [] } })
  expect(st.tasksDaily.every((d) => d.n === 0)).toBe(true)
})

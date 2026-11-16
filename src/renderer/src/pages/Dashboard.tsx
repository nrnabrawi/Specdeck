import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Bars } from '@/components/Charts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader, QueryState, StageBadge, TaskProgress } from '@/components/bits'
import { useActiveProject, useActivity, useFrameworkMeta, useRunList, useSpecs, useStats, useUnits } from '@/lib/queries'

function Stat({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{sub}</CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { project } = useActiveProject()
  const meta = useFrameworkMeta(project)!
  const units = useUnits(project?.id)
  const specs = useSpecs(project?.id)
  const runs = useRunList(project?.id)
  const [days, setDays] = useState<14 | 30>(14)
  const stats = useStats(project?.id, days)
  const feed = useActivity(project?.id)
  const weekAgo = Date.now() - 7 * 86_400_000
  const weekRuns = (runs.data ?? []).filter((r) => r.startedAt >= weekAgo).length
  const lastAgent = (name: string) => {
    const r = (runs.data ?? []).find((x) => x.unitId === name)
    return r ? (r.agent === 'claude' ? 'Claude Code' : 'Codex') : '—'
  }
  const all = units.data ?? []
  const active = all.filter((u) => !u.archived)
  const done = active.reduce((n, u) => n + u.tasks.done, 0)
  const total = active.reduce((n, u) => n + u.tasks.total, 0)
  const ready = active.filter((u) => u.tasks.total > 0 && u.tasks.done === u.tasks.total).length
  const reqs = (specs.data ?? []).reduce((n, s) => n + s.requirementCount, 0)
  const stageLabel = (id: string) => meta.stages.find((s) => s.id === id)?.label ?? id
  const recent = (feed.data ?? []).slice(0, 5)
  const taskTotal = stats.data?.tasksDaily.reduce((n, d) => n + d.n, 0) ?? 0

  return (
    <>
      <PageHeader
        crumb={`${project!.name} / Dashboard`}
        title="Overview"
        actions={
          <Button asChild variant="outline">
            <Link to="/board">Open board</Link>
          </Button>
        }
      />
      <QueryState q={units.error ? units : specs}>
        <div className="grid grid-cols-4 gap-4">
          <Stat label={`Active ${meta.unitName}s`} value={active.length} sub={`${ready} ready to archive`} />
          <Stat label="Tasks done" value={`${done} / ${total}`} sub={total ? `${Math.round((done / total) * 100)}% complete` : 'No tasks yet'} />
          <Stat label="Specs" value={specs.data?.length ?? 0} sub={`${reqs} ${reqs === 1 ? 'requirement' : 'requirements'}`} />
          <Stat label="Agent runs" value={weekRuns} sub={weekRuns ? 'this week' : 'No runs this week'} />
        </div>
        <Card className="mt-4">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Tasks completed</CardTitle>
              <CardDescription>
                {stats.data?.windowStart ? `${taskTotal} in the last ${days} days · recorded since ${new Date(stats.data.windowStart).toLocaleDateString()}` : 'Recorded while Specdeck is open'}
              </CardDescription>
            </div>
            <ToggleGroup type="single" variant="outline" size="sm" value={String(days)} onValueChange={(v) => v && setDays(Number(v) as 14 | 30)} aria-label="Chart range">
              <ToggleGroupItem value="14">14 days</ToggleGroupItem>
              <ToggleGroupItem value="30">30 days</ToggleGroupItem>
            </ToggleGroup>
          </CardHeader>
          <CardContent>
            {taskTotal === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No completed tasks recorded in this range yet.</p>
            ) : (
              <Bars data={stats.data!.tasksDaily} x="day" label={`Tasks completed per day, last ${days} days`} />
            )}
          </CardContent>
        </Card>
        <div className="mt-4 grid grid-cols-[2fr_1fr] gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Active {meta.unitName}s</CardTitle>
              <CardDescription>In {meta.marker}{meta.id === 'openspec' ? 'changes/' : ''}</CardDescription>
            </CardHeader>
            <CardContent>
              {active.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No active {meta.unitName}s yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead className="w-48">Tasks</TableHead>
                      <TableHead>Agent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {active.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono">{u.name}</TableCell>
                        <TableCell>
                          <StageBadge id={u.stage} label={stageLabel(u.stage)} />
                        </TableCell>
                        <TableCell>
                          <TaskProgress done={u.tasks.done} total={u.tasks.total} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{lastAgent(u.name)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Recorded events and runs</CardDescription>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nothing yet.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {recent.map((i) => (
                    <li key={i.id} className="text-sm">
                      <div>{i.text}</div>
                      <div className="text-xs text-muted-foreground">{new Date(i.ts).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </QueryState>
    </>
  )
}

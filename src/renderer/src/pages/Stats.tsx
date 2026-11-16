import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader, QueryState } from '@/components/bits'
import { Bars, Cycle } from '@/components/Charts'
import { useActiveProject, useFrameworkMeta, useStats } from '@/lib/queries'

const fmtDur = (ms: number) => (ms < 3_600_000 ? `${Math.max(1, Math.round(ms / 60_000))} min` : ms < 48 * 3_600_000 ? `${(ms / 3_600_000).toFixed(1)} h` : `${(ms / 86_400_000).toFixed(1)} d`)
const AGENT = { claude: 'Claude Code', codex: 'Codex' }

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
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

export default function Stats() {
  const { project } = useActiveProject()
  const meta = useFrameworkMeta(project)!
  const q = useStats(project?.id, 30)
  const s = q.data
  const window = s?.windowStart ? `Recorded since ${new Date(s.windowStart).toLocaleDateString()}` : 'Nothing recorded yet'
  const weeklyTasks = s ? s.tasksWeekly.reduce((n, w) => n + w.n, 0) / s.tasksWeekly.length : 0
  const finished = s?.agents.reduce((n, a) => n + a.finished, 0) ?? 0
  const ok = s?.agents.reduce((n, a) => n + a.succeeded, 0) ?? 0

  return (
    <>
      <PageHeader crumb={`${project!.name} / Stats`} title="Stats" actions={<span className="text-sm text-muted-foreground">{window}</span>} />
      <QueryState q={q}>
        {s && (
          <>
            <div className="grid grid-cols-4 gap-4">
              <Stat label="Median cycle time" value={s.cycle.medianMs === null ? '—' : fmtDur(s.cycle.medianMs)} sub={s.cycle.points.length ? `${s.cycle.points.length} ${meta.unitName}${s.cycle.points.length === 1 ? '' : 's'}, first seen → tasks done` : `Needs a ${meta.unitName} seen and finished while Specdeck is open`} />
              <Stat label="Tasks per week" value={s.tasksWeekly.some((w) => w.n) ? weeklyTasks.toFixed(1) : '—'} sub="Average over the last 8 weeks" />
              <Stat label="Spec coverage" value={s.coverage ? `${Math.round((s.coverage.withSpec / s.coverage.total) * 100)}%` : '—'} sub={s.coverage ? `${s.coverage.withSpec} of ${s.coverage.total} ${meta.unitName}s have spec content` : `No ${meta.unitName}s yet`} />
              <Stat label="Agent success rate" value={finished ? `${Math.round((ok / finished) * 100)}%` : '—'} sub={finished ? `${ok} of ${finished} finished runs exited 0` : 'No finished runs yet'} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle>Cycle time</CardTitle><CardDescription>Hours from first seen to all tasks done</CardDescription></CardHeader>
                <CardContent>
                  {s.cycle.points.length ? <Cycle points={s.cycle.points} /> : <p className="py-12 text-center text-sm text-muted-foreground">Not enough data yet.</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Tasks per week</CardTitle><CardDescription>Tasks completed while Specdeck was watching</CardDescription></CardHeader>
                <CardContent>
                  {s.tasksWeekly.some((w) => w.n) ? <Bars data={s.tasksWeekly} x="week" label="Tasks completed per week" /> : <p className="py-12 text-center text-sm text-muted-foreground">Not enough data yet.</p>}
                </CardContent>
              </Card>
            </div>
            <Card className="mt-4">
              <CardHeader><CardTitle>By agent</CardTitle></CardHeader>
              <CardContent>
                {s.agents.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No agent runs recorded yet.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Runs</TableHead><TableHead>Finished</TableHead><TableHead>Exit 0</TableHead><TableHead>Median duration</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {s.agents.map((a) => (
                        <TableRow key={a.agent}>
                          <TableCell>{AGENT[a.agent]}</TableCell><TableCell>{a.runs}</TableCell><TableCell>{a.finished}</TableCell><TableCell>{a.succeeded}</TableCell>
                          <TableCell>{a.medianMs === null ? '—' : fmtDur(a.medianMs)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </QueryState>
    </>
  )
}

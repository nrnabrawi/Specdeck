import { useState } from 'react'
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { Info, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { PageHeader, QueryState, StageBadge, TaskProgress } from '@/components/bits'
import { unitWhen } from '@/lib/format'
import { useActiveProject, useAgents, useFrameworkMeta, useRunList, useUnits } from '@/lib/queries'
import { useRuns } from '@/lib/runs'
import { cn } from '@/lib/utils'
import { primaryAction } from '@/lib/stage'
import type { FrameworkMeta } from '@shared/frameworks'
import type { Run, Unit } from '@shared/types'

function UnitCard({ u, meta, lastAgent, busy, onAction }: { u: Unit; meta: FrameworkMeta; lastAgent?: string; busy: boolean; onAction: (u: Unit, s: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: u.id, data: { unit: u }, disabled: u.archived })
  const act = primaryAction(u, meta)
  return (
    <Card
      ref={setNodeRef}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={cn('gap-3 py-4', isDragging && 'z-10 opacity-80 shadow-lg')}
    >
      <CardContent className="flex flex-col gap-3 px-4">
        <div className="font-mono text-sm font-semibold" {...(u.archived ? {} : { ...listeners, ...attributes })} style={u.archived ? undefined : { cursor: 'grab' }}>
          {u.name}
        </div>
        {u.summary && <p className="line-clamp-2 text-sm text-muted-foreground">{u.summary}</p>}
        {u.tasks.items.slice(0, 2).map((t, i) => (
          <label key={i} className="flex items-center gap-2 text-sm">
            <Checkbox checked={t.done} disabled aria-label={t.text} />
            <span className={cn('min-w-0 truncate', t.done && 'text-muted-foreground line-through')}>{t.text}</span>
          </label>
        ))}
        <TaskProgress done={u.tasks.done} total={u.tasks.total} />
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">
            {u.archived ? 'Archived' : lastAgent ? lastAgent : 'Updated'} {unitWhen(u)}
          </span>
          {act && (
            <Button size="sm" variant="outline" className="w-full" disabled={busy} title={busy ? 'A run is already active in this project' : undefined} onClick={() => onAction(u, act.stage)}>
              {act.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Column({ id, label, count, children }: { id: string; label: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <section aria-label={label} className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        {label} <Badge variant="secondary">{count}</Badge>
      </h2>
      <div ref={setNodeRef} className={cn('flex min-h-24 flex-col gap-3 rounded-xl bg-muted/60 p-3', isOver && 'ring-2 ring-primary')}>
        {children}
      </div>
    </section>
  )
}

export default function Board() {
  const { project } = useActiveProject()
  const meta = useFrameworkMeta(project)!
  const units = useUnits(project?.id)
  const runs = useRunList(project?.id)
  const agents = useAgents()
  const { agent, setAgent, askToRun, dock } = useRuns()
  const [view, setView] = useState('board')
  const [filter, setFilter] = useState('')
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const rows = (units.data ?? []).filter((u) => (u.name + ' ' + u.summary).toLowerCase().includes(filter.toLowerCase()))
  const usable = (agents.data ?? []).filter((a) => a.launchable && a.detected && a.enabled)
  const busy = dock?.exitCode === undefined && !!dock
  const lastRun = new Map<string, Run>()
  for (const r of [...(runs.data ?? [])].reverse()) lastRun.set(r.unitId, r)
  const agentLabel = (u: Unit) => {
    const r = lastRun.get(u.name)
    return r ? (r.agent === 'claude' ? 'Claude Code' : 'Codex') : undefined
  }

  const act = (u: Unit, stage: string) => {
    if (stage === 'archive' && !(u.tasks.total > 0 && u.tasks.done === u.tasks.total)) {
      toast.error('Finish all tasks before archiving.')
      return
    }
    const title = stage === 'archive' ? `Archive ${u.name}` : `${stage[0].toUpperCase()}${stage.slice(1)} ${u.name}`
    void askToRun({ kind: 'stage', projectId: project!.id, unitId: u.name, stage, agent }, title)
  }

  // AC-032: dropping a card only opens the same confirmed action; it never moves files.
  const onDragEnd = (e: DragEndEvent) => {
    const u = e.active.data.current?.unit as Unit | undefined
    const target = e.over?.id as string | undefined
    if (!u || !target || target === u.stage) return
    if (busy) return void toast.error('A run is already active in this project.')
    act(u, target)
  }

  return (
    <>
      <PageHeader
        crumb={`${project!.name} / Board`}
        title={`${meta.unitName[0].toUpperCase()}${meta.unitName.slice(1)}s`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/wizard"><Plus /> New {meta.unitName}</Link>
            </Button>
            <Select value={agent} onValueChange={(v) => setAgent(v as 'claude' | 'codex')}>
              <SelectTrigger className="w-44" aria-label="Run with">
                <SelectValue placeholder="Run with…" />
              </SelectTrigger>
              <SelectContent>
                {usable.length === 0 && <SelectItem value={agent} disabled>No agent available</SelectItem>}
                {usable.map((a) => (
                  <SelectItem key={a.key} value={a.key}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Filter…" aria-label="Filter" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-40" />
            <ToggleGroup type="single" variant="outline" value={view} onValueChange={(v) => v && setView(v)} aria-label="View">
              <ToggleGroupItem value="board">Board</ToggleGroupItem>
              <ToggleGroupItem value="list">List</ToggleGroupItem>
            </ToggleGroup>
          </>
        }
      />
      <Alert className="mb-4">
        <Info />
        <AlertDescription>
          {meta.label} reads {meta.marker}. Stage buttons and card drops run the matching command with your chosen agent, after you confirm it.
        </AlertDescription>
      </Alert>
      <QueryState q={units}>
        {view === 'board' ? (
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${meta.stages.length}, minmax(0, 1fr))` }}>
              {meta.stages.map((s) => {
                const col = rows.filter((u) => u.stage === s.id)
                return (
                  <Column key={s.id} id={s.id} label={s.label} count={col.length}>
                    {col.map((u) => (
                      <UnitCard key={u.id} u={u} meta={meta} lastAgent={agentLabel(u)} busy={busy} onAction={act} />
                    ))}
                  </Column>
                )
              })}
            </div>
          </DndContext>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="w-48">Tasks</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => {
                const a = primaryAction(u, meta)
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono">{u.name}</TableCell>
                    <TableCell>
                      <StageBadge id={u.stage} label={meta.stages.find((s) => s.id === u.stage)?.label ?? u.stage} />
                    </TableCell>
                    <TableCell>
                      <TaskProgress done={u.tasks.done} total={u.tasks.total} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{agentLabel(u) ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{unitWhen(u)}</TableCell>
                    <TableCell>
                      {a && (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => act(u, a.stage)}>
                          {a.label}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </QueryState>
    </>
  )
}

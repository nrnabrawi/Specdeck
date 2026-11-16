import { useState } from 'react'
import { Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { PageHeader, QueryState, StageBadge, TaskProgress } from '@/components/bits'
import { unitWhen } from '@/lib/format'
import { useActiveProject, useFrameworkMeta, useUnits } from '@/lib/queries'
import type { Unit } from '@shared/types'

function UnitCard({ u }: { u: Unit }) {
  return (
    <Card className="gap-3 py-4">
      <CardContent className="flex flex-col gap-3 px-4">
        <div className="font-mono text-sm font-semibold">{u.name}</div>
        {u.summary && <p className="line-clamp-2 text-sm text-muted-foreground">{u.summary}</p>}
        {u.tasks.items.slice(0, 2).map((t, i) => (
          <label key={i} className="flex items-center gap-2 text-sm">
            <Checkbox checked={t.done} disabled aria-label={t.text} />
            <span className={t.done ? 'text-muted-foreground line-through' : ''}>{t.text}</span>
          </label>
        ))}
        <TaskProgress done={u.tasks.done} total={u.tasks.total} />
        <div className="text-xs text-muted-foreground">{u.archived ? 'Archived' : 'Updated'} {unitWhen(u)}</div>
      </CardContent>
    </Card>
  )
}

export default function Board() {
  const { project } = useActiveProject()
  const meta = useFrameworkMeta(project)!
  const units = useUnits(project?.id)
  const [view, setView] = useState('board')
  const [filter, setFilter] = useState('')
  const rows = (units.data ?? []).filter((u) => (u.name + ' ' + u.summary).toLowerCase().includes(filter.toLowerCase()))

  return (
    <>
      <PageHeader
        crumb={`${project!.name} / Board`}
        title={`${meta.unitName[0].toUpperCase()}${meta.unitName.slice(1)}s`}
        actions={
          <>
            <Input placeholder="Filter…" aria-label="Filter" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-48" />
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
          {meta.label} reads {meta.marker}. This view is read-only for now; stage actions arrive in a later milestone.
        </AlertDescription>
      </Alert>
      <QueryState q={units}>
        {view === 'board' ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${meta.stages.length}, minmax(0, 1fr))` }}>
            {meta.stages.map((s) => {
              const col = rows.filter((u) => u.stage === s.id)
              return (
                <section key={s.id} aria-label={s.label} className="flex flex-col gap-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    {s.label} <Badge variant="secondary">{col.length}</Badge>
                  </h2>
                  <div className="flex min-h-24 flex-col gap-3 rounded-xl bg-muted/60 p-3">
                    {col.map((u) => (
                      <UnitCard key={u.id} u={u} />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="w-48">Tasks</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono">{u.name}</TableCell>
                  <TableCell>
                    <StageBadge id={u.stage} label={meta.stages.find((s) => s.id === u.stage)?.label ?? u.stage} />
                  </TableCell>
                  <TableCell>
                    <TaskProgress done={u.tasks.done} total={u.tasks.total} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{unitWhen(u)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </QueryState>
    </>
  )
}

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DeltaCard } from '@/components/DeltaCard'
import { Markdown } from '@/components/Markdown'
import { PageHeader, QueryState } from '@/components/bits'
import { useActiveProject, useFrameworkMeta, useSpec, useSpecDeltas, useSpecSearch, useSpecs, useUnitDeltas, useUnits } from '@/lib/queries'
import { cn } from '@/lib/utils'
import type { Delta } from '@shared/types'

type Sel = { kind: 'spec' | 'unit'; id: string } | null

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <button className="flex w-full items-center gap-1 px-2 py-1 text-sm font-medium" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />} {title}
      </button>
      {open && <div className="ml-3 flex flex-col">{children}</div>}
    </div>
  )
}

function Leaf({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-current={active}
      className={cn('truncate rounded-md px-3 py-1.5 text-left text-sm hover:bg-accent', active && 'bg-accent font-medium')}
    >
      {children}
    </button>
  )
}

function counts(ds: Delta[]) {
  const c = (op: string) => ds.filter((d) => d.op === op).length
  return `${c('ADDED')} added · ${c('MODIFIED')} modified · ${c('REMOVED')} removed`
}

function SpecView({ projectId, id }: { projectId: string; id: string }) {
  const spec = useSpec(projectId, id)
  const deltas = useSpecDeltas(projectId, id)
  const units = useUnits(projectId)
  const pending = (deltas.data ?? []).filter((d) => !d.archived)
  const history = (deltas.data ?? []).filter((d) => d.archived)
  const touching = [...new Set(pending.map((d) => d.unitId))]

  return (
    <div className="grid grid-cols-[1fr_16rem] gap-6">
      <div>
        <QueryState q={spec}>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">{id}</h2>
            <p className="font-mono text-xs text-muted-foreground">{spec.data?.path}</p>
          </div>
          <Tabs defaultValue="spec" key={id}>
            <TabsList>
              <TabsTrigger value="spec">Spec</TabsTrigger>
              <TabsTrigger value="deltas">Deltas · {pending.length}</TabsTrigger>
              <TabsTrigger value="history">History · {history.length}</TabsTrigger>
            </TabsList>
            <TabsContent value="spec">
              <Markdown text={spec.data?.raw ?? ''} />
            </TabsContent>
            <TabsContent value="deltas" className="flex flex-col gap-3">
              {pending.length === 0 && <p className="text-sm text-muted-foreground">No pending deltas touch this spec.</p>}
              {pending.map((d, i) => (
                <DeltaCard key={i} d={d} />
              ))}
            </TabsContent>
            <TabsContent value="history" className="flex flex-col gap-3">
              {history.length === 0 && <p className="text-sm text-muted-foreground">No archived changes touched this spec.</p>}
              {history.map((d, i) => (
                <div key={i}>
                  <p className="mb-1 font-mono text-xs text-muted-foreground">{d.unitId}</p>
                  <DeltaCard d={d} />
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </QueryState>
      </div>
      <aside>
        <h3 className="mb-3 text-sm font-semibold">Changes touching this spec</h3>
        {touching.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
        <div className="flex flex-col gap-2">
          {touching.map((u) => (
            <Card key={u} className="py-3">
              <CardContent className="px-3">
                <div className="font-mono text-sm">{units.data?.find((x) => x.id === u)?.name ?? u}</div>
                <div className="text-xs text-muted-foreground">{counts(pending.filter((d) => d.unitId === u))}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </aside>
    </div>
  )
}

function UnitView({ projectId, id }: { projectId: string; id: string }) {
  const deltas = useUnitDeltas(projectId, id)
  return (
    <QueryState q={deltas}>
      <h2 className="mb-1 font-mono text-xl font-semibold">{id}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{counts(deltas.data ?? [])}</p>
      <div className="flex flex-col gap-3">
        {(deltas.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">This change has no spec deltas.</p>}
        {(deltas.data ?? []).map((d, i) => (
          <div key={i}>
            <p className="mb-1 font-mono text-xs text-muted-foreground">{d.spec}</p>
            <DeltaCard d={d} />
          </div>
        ))}
      </div>
    </QueryState>
  )
}

export default function Specs() {
  const { project } = useActiveProject()
  const meta = useFrameworkMeta(project)!
  const specs = useSpecs(project?.id)
  const units = useUnits(project?.id)
  const [sel, setSel] = useState<Sel>(null)
  const [q, setQ] = useState('')
  const hits = useSpecSearch(project?.id, q)

  const ql = q.trim().toLowerCase()
  const specList = useMemo(
    () => (specs.data ?? []).filter((s) => !ql || (hits.data ?? []).includes(s.id)),
    [specs.data, ql, hits.data]
  )
  const unitList = (units.data ?? []).filter((u) => !ql || u.name.toLowerCase().includes(ql))
  const current = sel ?? (specs.data?.[0] ? { kind: 'spec' as const, id: specs.data[0].id } : null)

  return (
    <>
      <PageHeader crumb={`${project!.name} / Specs`} title="Specs & deltas" actions={<Input placeholder="Search specs…" aria-label="Search specs" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />} />
      <QueryState q={specs.error ? specs : units}>
        <div className="grid grid-cols-[15rem_1fr] gap-6">
          <ScrollArea className="h-[calc(100vh-11rem)] rounded-lg border p-2">
            <div className="font-mono text-xs text-muted-foreground px-2 pb-1">{meta.marker}</div>
            <Group title="specs">
              {specList.map((s) => (
                <Leaf key={s.id} active={current?.kind === 'spec' && current.id === s.id} onClick={() => setSel({ kind: 'spec', id: s.id })}>
                  {s.id} <Badge variant="secondary" className="ml-1">{s.requirementCount}</Badge>
                </Leaf>
              ))}
              {specList.length === 0 && <span className="px-3 py-1 text-sm text-muted-foreground">No specs</span>}
            </Group>
            <Group title="changes">
              {unitList.filter((u) => !u.archived).map((u) => (
                <Leaf key={u.id} active={current?.kind === 'unit' && current.id === u.id} onClick={() => setSel({ kind: 'unit', id: u.id })}>
                  {u.name}
                </Leaf>
              ))}
            </Group>
            <Group title="archive">
              {unitList.filter((u) => u.archived).map((u) => (
                <Leaf key={u.id} active={current?.kind === 'unit' && current.id === u.id} onClick={() => setSel({ kind: 'unit', id: u.id })}>
                  {u.id}
                </Leaf>
              ))}
            </Group>
          </ScrollArea>
          <div className="min-w-0">
            {!current && <p className="text-sm text-muted-foreground">Select a spec or change.</p>}
            {current?.kind === 'spec' && <SpecView projectId={project!.id} id={current.id} />}
            {current?.kind === 'unit' && <UnitView projectId={project!.id} id={current.id} />}
          </div>
        </div>
      </QueryState>
    </>
  )
}

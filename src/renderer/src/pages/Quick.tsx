import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Settings } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Kbd } from '@/components/ui/kbd'
import { Progress } from '@/components/ui/progress'
import { useActiveProject, useFrameworkMeta, useUnits } from '@/lib/queries'
import { isReady, primaryAction } from '@/lib/stage'
import { cn } from '@/lib/utils'
import type { PanelAction } from '@shared/ipc'

const AGENT = { claude: 'Claude Code', codex: 'Codex' }
const initials = (n: string) => n.split(/[-_ ]/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?'
const ctrl = navigator.platform.includes('Mac') ? '⌘' : 'Ctrl+'

// Tray quick panel (AC-090). Commands are never run from here: they open the main window's confirm step (AC-003).
export default function Quick() {
  const { project, projects } = useActiveProject()
  const meta = useFrameworkMeta(project)
  const units = useUnits(project?.id)
  const qc = useQueryClient()
  const [switching, setSwitching] = useState(false)
  const [now, setNow] = useState(Date.now())
  const runs = useQuery({
    queryKey: ['p', project?.id, 'panel-runs'],
    enabled: !!project,
    refetchInterval: 5000,
    queryFn: () => window.specdeck.invoke('runs:list', { projectId: project!.id, sinceMs: Date.now() - 86_400_000 })
  })

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000)
    const off = [
      window.specdeck.onActiveChanged(() => void qc.invalidateQueries()),
      window.specdeck.onPtyExit(() => void qc.invalidateQueries({ queryKey: ['p'] }))
    ]
    return () => {
      clearInterval(t)
      off.forEach((f) => f())
    }
  }, [qc])

  const act = (a: PanelAction) => void window.specdeck.invoke('panel:action', a)
  const active = (units.data ?? []).filter((u) => !u.archived)
  const current = [...active].sort((a, b) => b.lastModified - a.lastModified)[0]
  const ready = active.find(isReady)
  const running = (runs.data ?? []).find((r) => r.endedAt === null)
  const next = current?.tasks.items.find((t) => !t.done)
  const action = current && meta ? primaryAction(current, meta) : null
  const runStage = action && ['apply', 'implement'].includes(action.stage) && next
  const stageLabel = meta?.stages.find((s) => s.id === current?.stage)?.label

  const runNext = () => {
    if (!current || !action) return
    const input = runStage ? `Only do this one task, then stop: ${next!.text}` : undefined
    act({ type: 'stage', projectId: project!.id, unitId: current.name, stage: action.stage, input, title: `${action.label}: ${current.name}` })
  }
  const archiveReady = () => ready && act({ type: 'stage', projectId: project!.id, unitId: ready.name, stage: 'archive', title: `Archive ${ready.name}` })
  const items = [
    { label: `New ${meta?.unitName ?? 'change'}`, key: 'n', run: () => act({ type: 'route', to: '/wizard' }), on: !!project },
    { label: 'Open board', key: 'b', run: () => act({ type: 'route', to: '/board' }), on: !!project },
    { label: `Archive ready ${meta?.unitName ?? 'change'}`, key: 'e', run: archiveReady, on: !!ready && !!meta?.stages.some((s) => s.id === 'archive') },
    { label: 'Switch project', key: 'p', run: () => setSwitching((s) => !s), on: projects.length > 1 }
  ]

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return void window.specdeck.invoke('panel:hide')
      if (!(e.ctrlKey || e.metaKey)) return
      const it = items.find((i) => i.key === e.key.toLowerCase())
      if (it?.on) {
        e.preventDefault()
        it.run()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const switchTo = async (id: string) => {
    await window.specdeck.invoke('active:set', { id })
    setSwitching(false)
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden rounded-xl border bg-background text-sm">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <div className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">{initials(project?.name ?? '')}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{project?.name ?? 'No project'}</div>
          <div className="text-xs text-muted-foreground">{meta?.label ?? 'Add a project in Specdeck'}</div>
        </div>
        <Button variant="outline" size="icon" aria-label="Open Add-ons" onClick={() => act({ type: 'route', to: '/addons' })}><Settings /></Button>
      </header>

      <div className="flex-1 overflow-auto p-4">
        {current && meta ? (
          <section aria-label="Current change" className="rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current {meta.unitName}</span>
              {stageLabel && <Badge variant="outline">{stageLabel}</Badge>}
            </div>
            <div className="mt-2 truncate font-mono text-base font-semibold">{current.name}</div>
            <div className="mt-3 flex items-center gap-3">
              <Progress aria-label="Task progress" value={current.tasks.total ? (current.tasks.done / current.tasks.total) * 100 : 0} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground tabular-nums">{current.tasks.total ? `${current.tasks.done}/${current.tasks.total}` : '—'}</span>
            </div>
            {next && (
              <label className="mt-3 flex items-start gap-2">
                <Checkbox disabled checked={false} aria-label={next.text} className="mt-0.5" />
                <span className="line-clamp-2"><span className="text-muted-foreground">Next: </span>{next.text}</span>
              </label>
            )}
            {action ? (
              <Button className="mt-3 w-full" onClick={runNext}>{runStage ? 'Run next task' : action.label}</Button>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">Nothing left to run here.</p>
            )}
          </section>
        ) : (
          <p className="rounded-xl border p-4 text-muted-foreground">{project ? `No active ${meta?.unitName ?? 'change'}s.` : 'Open Specdeck to add a project.'}</p>
        )}

        {running && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5" role="status">
            <span className="size-2 rounded-full bg-success" aria-hidden />
            <span className="flex-1">{AGENT[running.agent]} running, {Math.max(1, Math.round((now - running.startedAt) / 60000))} min</span>
            <Button variant="ghost" size="sm" onClick={() => window.specdeck.invoke('runs:stop', { runId: running.id }).then(() => qc.invalidateQueries({ queryKey: ['p'] }))}>Stop</Button>
          </div>
        )}

        <ul className="mt-3 flex flex-col">
          {items.map((i) => (
            <li key={i.key}>
              <button disabled={!i.on} onClick={i.run} className={cn('flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent')}>
                {i.label}
                <Kbd>{ctrl}{i.key.toUpperCase()}</Kbd>
              </button>
            </li>
          ))}
        </ul>
        {switching && (
          <ul className="mt-1 flex flex-col rounded-lg border p-1" aria-label="Projects">
            {projects.map((p) => (
              <li key={p.id}>
                <button onClick={() => switchTo(p.id)} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-accent">
                  {p.name}
                  {p.id === project?.id && <Check className="size-4" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="flex items-center justify-between border-t px-4 py-3">
        <span className="text-muted-foreground">{meta ? `${active.length} ${meta.unitName}${active.length === 1 ? '' : 's'} in flight` : ''}</span>
        <Button variant="outline" onClick={() => act({ type: 'route', to: '/' })}>Open Specdeck</Button>
      </footer>
    </div>
  )
}

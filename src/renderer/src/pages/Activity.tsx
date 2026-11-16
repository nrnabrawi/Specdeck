import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { PageHeader, QueryState } from '@/components/bits'
import { useActiveProject, useActivity } from '@/lib/queries'
import type { FeedItem, FeedKind } from '@shared/types'

const KINDS: [string, string][] = [['all', 'All'], ['proposal', 'Proposals'], ['tasks', 'Tasks'], ['run', 'Agent runs'], ['archive', 'Archives']]
const RANGES: [string, string, number][] = [['1', 'Last 24 hours', 86_400_000], ['7', 'Last 7 days', 7 * 86_400_000], ['30', 'Last 30 days', 30 * 86_400_000], ['0', 'All time', 0]]

const dayLabel = (ts: number) => new Date(ts).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
const timeLabel = (ts: number) => new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

export default function Activity() {
  const { project } = useActiveProject()
  const feed = useActivity(project?.id)
  const [kind, setKind] = useState<'all' | FeedKind>('all')
  const [range, setRange] = useState('7')
  const [agent, setAgent] = useState('all')

  const span = RANGES.find((r) => r[0] === range)![2]
  const items = (feed.data ?? []).filter(
    (i) => (kind === 'all' || i.kind === kind) && (!span || i.ts >= Date.now() - span) && (agent === 'all' || i.agent === agent)
  )
  const days = new Map<string, FeedItem[]>()
  for (const i of items) days.set(dayLabel(i.ts), [...(days.get(dayLabel(i.ts)) ?? []), i])

  return (
    <>
      <PageHeader
        crumb={`${project!.name} / Activity`}
        title="Activity"
        actions={
          <>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-40" aria-label="Time range"><SelectValue /></SelectTrigger>
              <SelectContent>{RANGES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={agent} onValueChange={setAgent}>
              <SelectTrigger className="w-36" aria-label="Agent"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All agents</SelectItem>
                <SelectItem value="claude">Claude Code</SelectItem>
                <SelectItem value="codex">Codex</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
      <ToggleGroup type="single" variant="outline" value={kind} onValueChange={(v) => v && setKind(v as typeof kind)} aria-label="Event type" className="mb-6">
        {KINDS.map(([v, l]) => <ToggleGroupItem key={v} value={v}>{l}</ToggleGroupItem>)}
      </ToggleGroup>
      <QueryState q={feed}>
        {items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No activity matches. Specdeck records changes it sees while it is open, and your agent runs.
          </p>
        ) : (
          [...days].map(([day, list]) => (
            <section key={day} className="mb-6" aria-label={day}>
              <h2 className="mb-2 text-sm font-semibold">{day}</h2>
              <ul className="flex flex-col divide-y rounded-lg border">
                {list.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="w-20 shrink-0 whitespace-nowrap text-xs text-muted-foreground tabular-nums">{timeLabel(i.ts)}</span>
                    <Badge variant="outline" className="w-24 justify-center">{KINDS.find((k) => k[0] === i.kind)?.[1]}</Badge>
                    <span className="flex-1">{i.text}</span>
                    {i.source === 'files' && <span className="text-xs text-muted-foreground">from files</span>}
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </QueryState>
    </>
  )
}

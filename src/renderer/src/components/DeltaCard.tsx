import { Badge } from '@/components/ui/badge'
import { OP_TONE } from '@/components/bits'
import { cn } from '@/lib/utils'
import type { Delta } from '@shared/types'

export function DeltaCard({ d }: { d: Delta }) {
  const r = d.requirement
  return (
    <article className={cn('rounded-xl border p-4', OP_TONE[d.op])}>
      <div className="flex items-center gap-3 text-foreground">
        <Badge variant="outline" className={cn('font-mono text-xs', OP_TONE[d.op])}>
          {d.op}
        </Badge>
        <h3 className="font-semibold">{r.name}</h3>
      </div>
      {d.renamedFrom && <p className="mt-2 text-sm text-foreground">Renamed from “{d.renamedFrom}”</p>}
      {r.text && <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{r.text}</p>}
      {r.scenarios.map((s, i) => (
        <div key={i} className="mt-3 rounded-lg bg-background/60 p-3 text-sm text-foreground">
          {s.steps.length ? (
            s.steps.map((st, j) => (
              <div key={j}>
                <span className="mr-2 font-mono text-xs text-muted-foreground">{st.keyword}</span>
                {st.text}
              </div>
            ))
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-xs">{s.raw}</pre>
          )}
        </div>
      ))}
    </article>
  )
}

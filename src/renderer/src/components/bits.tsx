import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import type { DeltaOp } from '@shared/types'

const STAGE_TONE: Record<string, string> = {
  explore: 'text-muted-foreground',
  propose: 'text-warn',
  apply: 'text-info',
  archive: 'text-success'
}

export function StageBadge({ id, label }: { id: string; label: string }) {
  return (
    <Badge variant="outline" className={STAGE_TONE[id] ?? ''}>
      {label}
    </Badge>
  )
}

export function TaskProgress({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <Progress aria-label="Task progress" value={total ? (done / total) * 100 : 0} className="h-1.5 flex-1" />
      <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">{total ? `${done}/${total}` : '—'}</span>
    </div>
  )
}

export const OP_TONE: Record<DeltaOp, string> = {
  ADDED: 'border-success/40 bg-success/10 text-success',
  MODIFIED: 'border-warn/40 bg-warn/10 text-warn',
  REMOVED: 'border-danger/40 bg-danger/10 text-danger',
  RENAMED: 'border-info/40 bg-info/10 text-info'
}

export function PageHeader({ crumb, title, actions }: { crumb: string; title: string; actions?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 pb-6">
      <div>
        <p className="text-sm text-muted-foreground">{crumb}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  )
}

/** Renders loading, error (incl. unsupported framework) or children. */
export function QueryState({
  q,
  children
}: {
  q: { isLoading: boolean; error: unknown }
  children: ReactNode
}) {
  if (q.isLoading) return <Skeleton className="h-40 w-full" />
  if (q.error) {
    const msg = q.error instanceof Error ? q.error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(q.error)
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>{msg.startsWith('UNSUPPORTED_FRAMEWORK') ? 'Not supported yet' : 'Could not read the project'}</AlertTitle>
        <AlertDescription>{msg.replace('UNSUPPORTED_FRAMEWORK: ', '')}</AlertDescription>
      </Alert>
    )
  }
  return <>{children}</>
}

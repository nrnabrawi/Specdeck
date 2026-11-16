import type { FrameworkMeta } from '@shared/frameworks'
import type { Unit } from '@shared/types'

export type StageAction = { stage: string; label: string }

/** Primary action per unit (AC-031): the stage command that moves it forward. OpenSpec units with all tasks done archive. */
export function primaryAction(u: Unit, meta: FrameworkMeta): StageAction | null {
  if (u.archived) return null
  const all = u.tasks.total > 0 && u.tasks.done === u.tasks.total
  const stage = meta.stages.some((s) => s.id === 'archive') && all && u.stage === 'apply' ? 'archive' : u.stage
  const label = meta.actions[stage]?.[u.tasks.done ? 1 : 0]
  return label ? { stage, label } : null
}

export const isReady = (u: Unit) => !u.archived && u.tasks.total > 0 && u.tasks.done === u.tasks.total

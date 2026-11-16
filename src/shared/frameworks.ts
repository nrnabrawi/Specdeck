import type { FrameworkId } from './types'

// UI strings and stage ids per framework (AC-002). Data comes from adapters.
export interface FrameworkMeta {
  id: FrameworkId
  label: string
  unitName: string
  marker: string
  blurb: string
  stages: { id: string; label: string }[]
  initHint: string
}

export const FRAMEWORKS: Record<FrameworkId, FrameworkMeta> = {
  openspec: {
    id: 'openspec',
    label: 'OpenSpec',
    unitName: 'change',
    marker: 'openspec/',
    blurb: 'A lightweight spec layer: propose a change, agree on the spec deltas, apply the tasks, then archive.',
    stages: [
      { id: 'explore', label: 'Explore' },
      { id: 'propose', label: 'Propose' },
      { id: 'apply', label: 'Apply' },
      { id: 'archive', label: 'Archive' }
    ],
    initHint: 'openspec init'
  },
  speckit: {
    id: 'speckit',
    label: 'GitHub Spec Kit',
    unitName: 'feature',
    marker: '.specify/',
    blurb: 'GitHub’s toolkit: a project constitution, then specify, plan, tasks, implement and converge per feature.',
    stages: [
      { id: 'specify', label: 'Specify' },
      { id: 'plan', label: 'Plan' },
      { id: 'tasks', label: 'Tasks' },
      { id: 'implement', label: 'Implement' },
      { id: 'converge', label: 'Converge' }
    ],
    initHint: 'specify init --here --integration <agent>'
  }
}

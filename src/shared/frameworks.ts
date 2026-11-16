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
  /** Board button label per stage: [first run, resume once tasks have started]. */
  actions: Record<string, [string, string]>
  /** Example stage command per agent, for the Add-ons page (actual commands come from the adapter). */
  commandExample: { claude: string; codex: string }
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
    initHint: 'openspec init',
    actions: {
      explore: ['Explore with agent', 'Explore with agent'],
      propose: ['Continue proposal', 'Continue proposal'],
      apply: ['Apply with agent', 'Continue apply'],
      archive: ['Archive', 'Archive']
    },
    commandExample: { claude: '/openspec-propose <name>', codex: '$openspec-propose <name>' }
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
    initHint: 'specify init --here --integration <agent>',
    actions: {
      specify: ['Clarify with agent', 'Clarify with agent'],
      plan: ['Plan with agent', 'Plan with agent'],
      tasks: ['Generate tasks', 'Generate tasks'],
      implement: ['Implement with agent', 'Continue implement'],
      converge: ['Converge with agent', 'Converge with agent']
    },
    commandExample: { claude: '/speckit-specify <description>', codex: '$speckit-specify <description>' }
  }
}

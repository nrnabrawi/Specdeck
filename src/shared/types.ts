export type FrameworkId = 'openspec' | 'speckit'

export interface Project {
  id: string
  path: string
  name: string
  framework: FrameworkId
  addedAt: number
}

export interface TaskItem {
  text: string
  done: boolean
}

export interface Unit {
  id: string // change folder name (archived: folder name incl. date prefix)
  name: string
  stage: string // one of the framework's stage ids
  summary: string
  tasks: { done: number; total: number; items: TaskItem[] }
  archived: boolean
  requirements: number // requirements/FRs in the unit's spec content (0 = none yet)
  lastModified: number // epoch ms
}

export interface SpecSummary {
  id: string
  requirementCount: number
}

export interface Scenario {
  raw: string
  steps: { keyword: string; text: string }[]
}

export interface Requirement {
  name: string
  text: string
  scenarios: Scenario[]
}

export interface SpecDoc {
  id: string
  path: string // relative to project root
  purpose: string
  requirements: Requirement[]
  raw: string
}

export type DeltaOp = 'ADDED' | 'MODIFIED' | 'REMOVED' | 'RENAMED'

export interface Delta {
  spec: string
  op: DeltaOp
  requirement: Requirement
  renamedFrom?: string
  unitId: string
  archived: boolean
}

export interface DetectResult {
  found: boolean
  evidence: string
}

export type AgentKey = 'claude' | 'codex'

export interface AgentStatus {
  key: string
  label: string
  detected: boolean
  launchable: boolean // only Claude Code and Codex are launchable in v1 (AC-081)
  enabled: boolean
  version?: string
}

/** A command Specdeck may run. `display` is exactly what the user confirms (AC-003). */
export interface Command {
  bin: string
  args: string[]
  cwd: string
  display: string
  mode: 'exec' | 'pty'
  meta?: { agent: AgentKey; unitId: string; stage: string }
}

export interface Run {
  id: string
  projectId: string
  agent: AgentKey
  unitId: string
  stage: string
  command: string
  startedAt: number
  endedAt: number | null
  exitCode: number | null
}

export interface MaintenanceInfo {
  cli: { installed: boolean; version?: string }
  facts: { label: string; value: string }[]
  actions: { id: string; label: string; description: string }[]
}

// Specdeck-observed event (SPEC §6); `n` = tasks completed for kind 'tasks'.
export type EventKind = 'created' | 'tasks' | 'done' | 'archived'
export interface UnitEvent {
  id: string
  projectId: string
  ts: number
  kind: EventKind
  unitId: string
  text: string
  n: number
}

export type FeedKind = 'proposal' | 'tasks' | 'run' | 'archive'
export interface FeedItem {
  id: string
  ts: number
  kind: FeedKind
  unitId: string
  text: string
  agent?: AgentKey
  source: 'recorded' | 'files'
}

export interface Stats {
  windowStart: number | null // earliest recorded event/run, or null when nothing recorded
  cycle: { medianMs: number | null; points: { ts: number; hours: number; unitId: string }[] }
  tasksDaily: { day: string; n: number }[] // last `days` days, oldest first
  tasksWeekly: { week: string; n: number }[] // last 8 weeks, oldest first (week = Monday, UTC)
  coverage: { withSpec: number; total: number } | null
  agents: { agent: AgentKey; runs: number; finished: number; succeeded: number; medianMs: number | null }[]
}

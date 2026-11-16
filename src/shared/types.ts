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

export interface AgentStatus {
  key: 'claude' | 'codex'
  label: string
  detected: boolean
  version?: string
}

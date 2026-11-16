import type { AgentKey, AgentStatus, Delta, FrameworkId, MaintenanceInfo, Project, Run, SpecDoc, FeedItem, Stats, SpecSummary, Unit } from './types'

export interface FrameworkDetection {
  id: FrameworkId
  found: boolean
  evidence: string
}

export type PreviewReq =
  | { kind: 'init'; path: string; framework: FrameworkId; agents: AgentKey[] }
  | { kind: 'stage'; projectId: string; unitId: string; stage: string; agent: AgentKey; input?: string }
  | { kind: 'maintenance'; projectId: string; actionId: string }

export interface Preview {
  token: string
  display: string
  cwd: string
  mode: 'exec' | 'pty'
}

export type RunResult = { mode: 'exec'; ok: boolean; exitCode: number | null; output: string } | { mode: 'pty'; runId: string }

export interface IpcMap {
  'projects:list': { arg: void; res: Project[] }
  'projects:add': { arg: { path: string; name: string; framework: FrameworkId }; res: Project }
  'projects:setFramework': { arg: { id: string; framework: FrameworkId }; res: Project }
  'projects:remove': { arg: { id: string }; res: void }
  'projects:pickFolder': { arg: void; res: string | null }
  'projects:detect': { arg: { path: string }; res: FrameworkDetection[] }
  'active:get': { arg: void; res: string | null }
  'active:set': { arg: { id: string | null }; res: void }
  'agents:detect': { arg: void; res: AgentStatus[] }
  'agents:setEnabled': { arg: { key: AgentKey; enabled: boolean }; res: void }
  'commands:preview': { arg: PreviewReq; res: Preview }
  'commands:run': { arg: { token: string }; res: RunResult }
  'runs:attach': { arg: { projectId: string }; res: { run: Run; buffer: string } | null }
  'runs:write': { arg: { runId: string; data: string }; res: void }
  'runs:resize': { arg: { runId: string; cols: number; rows: number }; res: void }
  'runs:stop': { arg: { runId: string }; res: void }
  'runs:list': { arg: { projectId: string; sinceMs?: number }; res: Run[] }
  'wizard:load': { arg: { projectId: string }; res: unknown }
  'wizard:save': { arg: { projectId: string; state: unknown }; res: { wrote: string[]; draftOnly: boolean } }
  'activity:list': { arg: { projectId: string }; res: FeedItem[] }
  'stats:get': { arg: { projectId: string; days: 14 | 30 }; res: Stats }
  'maintenance:get': { arg: { projectId: string }; res: MaintenanceInfo }
  'units:list': { arg: { projectId: string }; res: Unit[] }
  'specs:list': { arg: { projectId: string }; res: SpecSummary[] }
  'specs:read': { arg: { projectId: string; id: string }; res: SpecDoc }
  'specs:search': { arg: { projectId: string; query: string }; res: string[] }
  'deltas:forUnit': { arg: { projectId: string; unitId: string }; res: Delta[] }
  'deltas:forSpec': { arg: { projectId: string; specId: string }; res: Delta[] }
}

export type Channel = keyof IpcMap
export const CHANNELS: Channel[] = [
  'projects:list',
  'projects:add',
  'projects:setFramework',
  'projects:remove',
  'projects:pickFolder',
  'projects:detect',
  'active:get',
  'active:set',
  'agents:detect',
  'agents:setEnabled',
  'commands:preview',
  'commands:run',
  'runs:attach',
  'runs:write',
  'runs:resize',
  'runs:stop',
  'runs:list',
  'wizard:load',
  'wizard:save',
  'activity:list',
  'stats:get',
  'maintenance:get',
  'units:list',
  'specs:list',
  'specs:read',
  'specs:search',
  'deltas:forUnit',
  'deltas:forSpec'
]

export const PROJECT_CHANGED = 'project:changed'
export const PTY_DATA = 'pty:data'
export const PTY_EXIT = 'pty:exit'

export interface SpecdeckApi {
  invoke<C extends Channel>(channel: C, arg?: IpcMap[C]['arg']): Promise<IpcMap[C]['res']>
  onProjectChanged(cb: (projectId: string) => void): () => void
  onPtyData(cb: (e: { runId: string; data: string }) => void): () => void
  onPtyExit(cb: (e: { runId: string; exitCode: number | null }) => void): () => void
}

declare global {
  interface Window {
    specdeck: SpecdeckApi
  }
}

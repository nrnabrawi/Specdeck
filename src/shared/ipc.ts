import type { AgentStatus, Delta, FrameworkId, Project, SpecDoc, SpecSummary, Unit } from './types'

export interface FrameworkDetection {
  id: FrameworkId
  found: boolean
  evidence: string
}

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
  'units:list',
  'specs:list',
  'specs:read',
  'specs:search',
  'deltas:forUnit',
  'deltas:forSpec'
]

export const PROJECT_CHANGED = 'project:changed'

export interface SpecdeckApi {
  invoke<C extends Channel>(channel: C, arg?: IpcMap[C]['arg']): Promise<IpcMap[C]['res']>
  onProjectChanged(cb: (projectId: string) => void): () => void
}

declare global {
  interface Window {
    specdeck: SpecdeckApi
  }
}

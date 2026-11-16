import type { AgentKey, Command, DetectResult, Delta, MaintenanceInfo, SpecDoc, SpecSummary, Unit } from '../../shared/types'

// Adapter interface (docs/SPEC.md §7).
export interface FrameworkAdapter {
  id: 'openspec' | 'speckit'
  detect(root: string): Promise<DetectResult>
  listUnits(root: string): Promise<Unit[]>
  listSpecs(root: string): Promise<SpecSummary[]>
  readSpec(root: string, id: string): Promise<SpecDoc>
  readDeltas(root: string, unitId: string): Promise<Delta[]>
  deltasForSpec(root: string, specId: string): Promise<Delta[]>
  searchSpecs(root: string, query: string): Promise<string[]>
  initCommand(root: string, agents: AgentKey[]): Command
  /** Throws a user-readable Error when the stage/agent combination is not available. */
  stageCommand(root: string, unitName: string, stage: string, agent: AgentKey, input?: string): Command
  maintenance(root: string): Promise<MaintenanceInfo>
  maintenanceCommand(root: string, actionId: string): Promise<Command>
}

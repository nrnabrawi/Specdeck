import type { DetectResult, Delta, SpecDoc, SpecSummary, Unit } from '../../shared/types'

// M1 subset of the adapter interface (docs/SPEC.md §7); init/stage/maintenance commands land in M2.
export interface FrameworkAdapter {
  id: 'openspec' | 'speckit'
  detect(root: string): Promise<DetectResult>
  listUnits(root: string): Promise<Unit[]>
  listSpecs(root: string): Promise<SpecSummary[]>
  readSpec(root: string, id: string): Promise<SpecDoc>
  readDeltas(root: string, unitId: string): Promise<Delta[]>
  deltasForSpec(root: string, specId: string): Promise<Delta[]>
  searchSpecs(root: string, query: string): Promise<string[]>
}

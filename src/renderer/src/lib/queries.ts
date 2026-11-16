import { useQuery } from '@tanstack/react-query'
import { FRAMEWORKS } from '@shared/frameworks'
import type { Project } from '@shared/types'

const api = () => window.specdeck

export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: () => api().invoke('projects:list') })
}

export function useActiveId() {
  return useQuery({ queryKey: ['active'], queryFn: () => api().invoke('active:get') })
}

export function useActiveProject(): { project: Project | undefined; projects: Project[]; loading: boolean } {
  const projects = useProjects()
  const active = useActiveId()
  const list = projects.data ?? []
  const project = list.find((p) => p.id === active.data) ?? list[0]
  return { project, projects: list, loading: projects.isLoading || active.isLoading }
}

export const useFrameworkMeta = (p?: Project) => (p ? FRAMEWORKS[p.framework] : undefined)

// All project data keys start with ['p', projectId] so a file change invalidates them together.
export function useUnits(projectId?: string) {
  return useQuery({
    queryKey: ['p', projectId, 'units'],
    enabled: !!projectId,
    queryFn: () => api().invoke('units:list', { projectId: projectId! }),
    retry: false
  })
}

export function useSpecs(projectId?: string) {
  return useQuery({
    queryKey: ['p', projectId, 'specs'],
    enabled: !!projectId,
    queryFn: () => api().invoke('specs:list', { projectId: projectId! }),
    retry: false
  })
}

export function useSpec(projectId?: string, id?: string) {
  return useQuery({
    queryKey: ['p', projectId, 'spec', id],
    enabled: !!projectId && !!id,
    queryFn: () => api().invoke('specs:read', { projectId: projectId!, id: id! }),
    retry: false
  })
}

export function useSpecDeltas(projectId?: string, specId?: string) {
  return useQuery({
    queryKey: ['p', projectId, 'deltas-spec', specId],
    enabled: !!projectId && !!specId,
    queryFn: () => api().invoke('deltas:forSpec', { projectId: projectId!, specId: specId! }),
    retry: false
  })
}

export function useUnitDeltas(projectId?: string, unitId?: string) {
  return useQuery({
    queryKey: ['p', projectId, 'deltas-unit', unitId],
    enabled: !!projectId && !!unitId,
    queryFn: () => api().invoke('deltas:forUnit', { projectId: projectId!, unitId: unitId! }),
    retry: false
  })
}

export function useSpecSearch(projectId?: string, query = '') {
  return useQuery({
    queryKey: ['p', projectId, 'search', query],
    enabled: !!projectId && query.trim().length > 0,
    queryFn: () => api().invoke('specs:search', { projectId: projectId!, query }),
    retry: false
  })
}

export function useAgents() {
  return useQuery({ queryKey: ['agents'], queryFn: () => api().invoke('agents:detect'), staleTime: 60_000 })
}

export function useRunList(projectId?: string, sinceMs?: number) {
  return useQuery({
    queryKey: ['runs', projectId, sinceMs ?? 0],
    enabled: !!projectId,
    queryFn: () => window.specdeck.invoke('runs:list', { projectId: projectId!, sinceMs })
  })
}

export function useMaintenance(projectId?: string) {
  return useQuery({
    queryKey: ['p', projectId, 'maintenance'],
    enabled: !!projectId,
    queryFn: () => window.specdeck.invoke('maintenance:get', { projectId: projectId! }),
    retry: false
  })
}

export function useActivity(projectId?: string) {
  return useQuery({
    queryKey: ['p', projectId, 'activity'],
    enabled: !!projectId,
    queryFn: () => api().invoke('activity:list', { projectId: projectId! })
  })
}

export function useStats(projectId: string | undefined, days: 14 | 30) {
  return useQuery({
    queryKey: ['p', projectId, 'stats', days],
    enabled: !!projectId,
    queryFn: () => api().invoke('stats:get', { projectId: projectId!, days })
  })
}

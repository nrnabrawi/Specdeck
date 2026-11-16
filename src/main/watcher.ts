import { join } from 'node:path'
import { watch, type FSWatcher } from 'chokidar'
import { FRAMEWORKS } from '../shared/frameworks'
import type { Project } from '../shared/types'

// AC-110: refresh within 2 s of a file change; 250 ms debounce.
export class ProjectWatcher {
  private watchers = new Map<string, FSWatcher>()

  constructor(private onChange: (projectId: string) => void) {}

  sync(projects: Project[]): void {
    const ids = new Set(projects.map((p) => p.id))
    for (const [id, w] of this.watchers) {
      if (!ids.has(id)) {
        void w.close()
        this.watchers.delete(id)
      }
    }
    for (const p of projects) {
      if (this.watchers.has(p.id)) continue
      let timer: NodeJS.Timeout | undefined
      const fire = () => {
        clearTimeout(timer)
        timer = setTimeout(() => this.onChange(p.id), 250)
      }
      const w = watch(join(p.path, FRAMEWORKS[p.framework].marker), { ignoreInitial: true, depth: 8 })
      w.on('all', fire).on('error', () => undefined)
      this.watchers.set(p.id, w)
    }
  }

  async resync(projects: Project[]): Promise<void> {
    await Promise.all([...this.watchers.values()].map((w) => w.close()))
    this.watchers.clear()
    this.sync(projects)
  }
}

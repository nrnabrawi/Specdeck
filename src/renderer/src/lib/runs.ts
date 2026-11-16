import { toast } from 'sonner'
import { create } from 'zustand'
import type { Preview, PreviewReq, RunResult } from '@shared/ipc'

interface Confirm {
  title: string
  preview: Preview
  result: Extract<RunResult, { mode: 'exec' }> | null
  running: boolean
  onDone?: () => void
}

interface RunsUI {
  confirm: Confirm | null
  dock: { runId: string; label: string; exitCode?: number | null } | null
  agent: 'claude' | 'codex'
  setAgent: (a: 'claude' | 'codex') => void
  openDock: (d: NonNullable<RunsUI['dock']>) => void
  dockExited: (runId: string, exitCode: number | null) => void
  closeDock: () => void
  closeConfirm: () => void
  /** AC-003: shows the exact command and only runs it after the user confirms. */
  askToRun: (req: PreviewReq, title: string, label?: string, onDone?: () => void) => Promise<void>
  confirmRun: (label?: string) => Promise<void>
}

export const useRuns = create<RunsUI>((set, get) => ({
  confirm: null,
  dock: null,
  agent: 'claude',
  setAgent: (agent) => set({ agent }),
  openDock: (dock) => set({ dock }),
  dockExited: (runId, exitCode) => set((s) => (s.dock?.runId === runId ? { dock: { ...s.dock, exitCode } } : s)),
  closeDock: () => set({ dock: null }),
  closeConfirm: () => set({ confirm: null }),
  askToRun: async (req, title, _label, onDone) => {
    try {
      const preview = await window.specdeck.invoke('commands:preview', req)
      set({ confirm: { title, preview, result: null, running: false, onDone } })
    } catch (e) {
      toast.error(cleanError(e))
    }
  },
  confirmRun: async (label = 'Agent run') => {
    const c = get().confirm
    if (!c) return
    set({ confirm: { ...c, running: true } })
    try {
      const r = await window.specdeck.invoke('commands:run', { token: c.preview.token })
      if (r.mode === 'pty') {
        set({ confirm: null, dock: { runId: r.runId, label } })
      } else {
        set({ confirm: { ...c, running: false, result: r } })
        if (r.ok) toast.success('Command finished')
      }
      c.onDone?.()
    } catch (e) {
      set({ confirm: null })
      toast.error(cleanError(e))
    }
  }
}))

export function cleanError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  return m.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
}

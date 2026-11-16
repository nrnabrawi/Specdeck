import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useActiveProject } from '@/lib/queries'
import { useRuns } from '@/lib/runs'

// AC-100: embedded PTY terminal in the shell (a dock, not a new page).
function Term({ runId }: { runId: string }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const term = new Terminal({ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, theme: { background: '#0c0c0e' }, cursorBlink: true })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(host.current!)
    const sync = () => {
      fit.fit()
      void window.specdeck.invoke('runs:resize', { runId, cols: term.cols, rows: term.rows }).catch(() => undefined)
    }
    const ro = new ResizeObserver(sync)
    ro.observe(host.current!)
    sync()
    const offData = window.specdeck.onPtyData((e) => e.runId === runId && term.write(e.data))
    const offExit = window.specdeck.onPtyExit((e) => e.runId === runId && term.write(`\r\n\x1b[2m[process exited with code ${e.exitCode}]\x1b[0m\r\n`))
    const typed = term.onData((d) => void window.specdeck.invoke('runs:write', { runId, data: d }).catch(() => undefined))
    return () => {
      offData()
      offExit()
      typed.dispose()
      ro.disconnect()
      term.dispose()
    }
  }, [runId])
  return <div ref={host} className="h-full w-full" />
}

export function TerminalDock() {
  const { project } = useActiveProject()
  const { dock, openDock, dockExited, closeDock } = useRuns()
  const qc = useQueryClient()

  // Restore the dock for a run still active in this project (e.g. after a window reload).
  useEffect(() => {
    if (!project || dock) return
    void window.specdeck.invoke('runs:attach', { projectId: project.id }).then((a) => {
      if (a) openDock({ runId: a.run.id, label: a.run.command })
    })
  }, [project, dock, openDock])

  useEffect(
    () =>
      window.specdeck.onPtyExit((e) => {
        dockExited(e.runId, e.exitCode)
        void qc.invalidateQueries({ queryKey: ['runs'] })
        void qc.invalidateQueries({ queryKey: ['p'] })
      }),
    [dockExited, qc]
  )

  useEffect(() => void qc.invalidateQueries({ queryKey: ['runs'] }), [dock?.runId, qc])

  if (!dock) return null
  const running = dock.exitCode === undefined
  return (
    <section aria-label="Agent terminal" className="flex h-80 shrink-0 flex-col border-t bg-[#0c0c0e] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-sm">
        <span className="flex items-center gap-2">
          <span className={running ? 'size-2 rounded-full bg-success' : 'size-2 rounded-full bg-muted-foreground'} />
          {dock.label}
          {!running && <span className="text-white/60">exited ({dock.exitCode})</span>}
        </span>
        <span className="flex items-center gap-2">
          {running && (
            <Button size="sm" variant="secondary" onClick={() => void window.specdeck.invoke('runs:stop', { runId: dock.runId })}>
              Stop
            </Button>
          )}
          <Button size="icon-sm" variant="ghost" aria-label="Close terminal" disabled={running} onClick={closeDock} className="text-white hover:bg-white/10 hover:text-white">
            <X className="size-4" />
          </Button>
        </span>
      </header>
      <div className="min-h-0 flex-1 p-2">
        <Term runId={dock.runId} />
      </div>
    </section>
  )
}

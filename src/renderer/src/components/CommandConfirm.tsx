import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRuns } from '@/lib/runs'

// AC-003: every command is shown verbatim here before it runs.
export function CommandConfirm() {
  const { confirm, closeConfirm, confirmRun } = useRuns()
  const qc = useQueryClient()
  const close = () => {
    closeConfirm()
    void qc.invalidateQueries()
  }
  return (
    <Dialog open={!!confirm} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-xl">
        {confirm && (
          <>
            <DialogHeader>
              <DialogTitle>{confirm.title}</DialogTitle>
              <DialogDescription>
                {confirm.result ? 'Finished.' : confirm.preview.mode === 'pty' ? 'Specdeck will run this in the terminal panel:' : 'Specdeck will run this command now:'}
              </DialogDescription>
            </DialogHeader>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-sm whitespace-pre-wrap break-all" aria-label="Command">
              {confirm.preview.display}
            </pre>
            <p className="text-xs text-muted-foreground">
              in <span className="font-mono">{confirm.preview.cwd}</span>
            </p>
            {confirm.result && (
              <pre className="max-h-60 overflow-auto rounded-lg border p-3 font-mono text-xs whitespace-pre-wrap" aria-label="Output">
                {confirm.result.output || '(no output)'}
                {!confirm.result.ok && `\n\nExited with code ${confirm.result.exitCode ?? 'unknown'}`}
              </pre>
            )}
            <DialogFooter>
              {confirm.result ? (
                <Button onClick={close}>Close</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={close}>
                    Cancel
                  </Button>
                  <Button disabled={confirm.running} onClick={() => confirmRun(confirm.title)}>
                    {confirm.running ? 'Running…' : 'Run'}
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

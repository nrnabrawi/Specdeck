import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { FRAMEWORKS } from '@shared/frameworks'
import type { FrameworkId, Project } from '@shared/types'

// AC-013: change the framework of an existing project.
export function FrameworkDialog({ project, open, onOpenChange }: { project: Project; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const [fw, setFw] = useState<FrameworkId>(project.framework)
  const save = async () => {
    await window.specdeck.invoke('projects:setFramework', { id: project.id, framework: fw })
    await qc.invalidateQueries()
    onOpenChange(false)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Framework for {project.name}</DialogTitle>
          <DialogDescription>Only the view changes; no files in the repo are touched.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2" role="radiogroup" aria-label="Framework">
          {Object.values(FRAMEWORKS).map((f) => (
            <button
              key={f.id}
              role="radio"
              aria-checked={fw === f.id}
              onClick={() => setFw(f.id)}
              className={cn('rounded-lg border p-3 text-left text-sm', fw === f.id && 'border-primary ring-1 ring-primary')}
            >
              <div className="font-medium">{f.label}</div>
              <div className="text-muted-foreground">{f.blurb}</div>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={fw === project.framework}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

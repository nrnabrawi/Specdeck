import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAgents, useProjects } from '@/lib/queries'
import { useUI } from '@/lib/store'
import { cn } from '@/lib/utils'
import { FRAMEWORKS } from '@shared/frameworks'
import type { FrameworkDetection } from '@shared/ipc'
import type { FrameworkId } from '@shared/types'

const STEPS = ['Framework', 'Project', 'Agents'] as const
const baseName = (p: string) => p.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || p

// AC-010, 011, 014: add a project, detect and confirm the framework.
export default function Onboarding() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const skip = useUI((s) => s.skipOnboarding)
  const existing = useProjects().data ?? []
  const agents = useAgents()
  const [step, setStep] = useState(0)
  const [path, setPath] = useState<string | null>(null)
  const [det, setDet] = useState<FrameworkDetection[]>([])
  const [fw, setFw] = useState<FrameworkId | null>(null)
  const [name, setName] = useState('')
  const [err, setErr] = useState('')

  const pick = async () => {
    setErr('')
    const p = await window.specdeck.invoke('projects:pickFolder')
    if (!p) return
    try {
      const d = await window.specdeck.invoke('projects:detect', { path: p })
      const found = d.filter((x) => x.found)
      setPath(p)
      setDet(d)
      setName(baseName(p))
      setFw(found.length === 1 ? found[0].id : null) // both found: user must choose (AC-011)
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e))
    }
  }

  const finish = async () => {
    if (!path || !fw) return
    try {
      const p = await window.specdeck.invoke('projects:add', { path, name: name.trim() || baseName(path), framework: fw })
      await window.specdeck.invoke('active:set', { id: p.id })
      await qc.invalidateQueries()
      nav('/')
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e))
    }
  }

  const found = det.filter((d) => d.found)
  const meta = fw ? FRAMEWORKS[fw] : null
  const dup = !!path && existing.some((p) => p.path === path)

  return (
    <div className="mx-auto max-w-4xl p-8">
      <header className="mb-8 flex items-center justify-between">
        <ol className="flex gap-2" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === step ? 'step' : undefined}>
              <Badge variant={i === step ? 'default' : 'outline'}>
                {i + 1} · {s}
              </Badge>
            </li>
          ))}
        </ol>
        <Button
          variant="outline"
          onClick={() => {
            skip()
            nav('/')
          }}
        >
          Skip for now
        </Button>
      </header>

      {step === 0 && (
        <section>
          <h1 className="text-3xl font-semibold tracking-tight">Which spec-driven framework do you work with?</h1>
          <p className="mt-2 text-muted-foreground">Specdeck adapts its board and spec browser to the framework. You can change it later per project.</p>
          <div className="mt-6 flex items-center gap-3">
            <Button onClick={pick}>{path ? 'Choose another folder' : 'Choose project folder'}</Button>
            {path && <span className="font-mono text-sm text-muted-foreground">{path}</span>}
          </div>
          {err && (
            <Alert variant="destructive" className="mt-4">
              <TriangleAlert />
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          )}
          {path && (
            <>
              {found.length === 1 && (
                <Alert className="mt-4">
                  <CheckCircle2 />
                  <AlertTitle>Framework detected</AlertTitle>
                  <AlertDescription>
                    Found {found[0].evidence}, so {FRAMEWORKS[found[0].id].label} is pre-selected. Not right? Pick another below.
                  </AlertDescription>
                </Alert>
              )}
              {found.length === 2 && (
                <Alert variant="destructive" className="mt-4">
                  <TriangleAlert />
                  <AlertTitle>Both frameworks found</AlertTitle>
                  <AlertDescription>Mixing frameworks in one repo is not supported. Choose the one to use.</AlertDescription>
                </Alert>
              )}
              {found.length === 0 && (
                <Alert className="mt-4">
                  <TriangleAlert />
                  <AlertTitle>No framework found in this folder</AlertTitle>
                  <AlertDescription>Pick one to use. Initialising it from Specdeck is not available yet; run the init command yourself.</AlertDescription>
                </Alert>
              )}
              <div className="mt-4 grid grid-cols-2 gap-4" role="radiogroup" aria-label="Framework">
                {Object.values(FRAMEWORKS).map((f) => (
                  <button
                    key={f.id}
                    role="radio"
                    aria-checked={fw === f.id}
                    onClick={() => setFw(f.id)}
                    className={cn('rounded-xl border p-5 text-left', fw === f.id && 'border-primary ring-2 ring-primary')}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">{f.label}</span>
                      <Badge variant="outline" className={det.find((d) => d.id === f.id)?.found ? 'text-success' : ''}>
                        {det.find((d) => d.id === f.id)?.found ? 'Detected' : 'Available'}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{f.blurb}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {f.stages.map((s) => (
                        <Badge key={s.id} variant="secondary">
                          {s.label}
                        </Badge>
                      ))}
                    </div>
                    <code className="mt-3 block font-mono text-xs text-muted-foreground">$ {f.initHint}</code>
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="mt-6 flex justify-end">
            <Button disabled={!path || !fw} onClick={() => setStep(1)}>
              Continue{meta ? ` with ${meta.label}` : ''}
            </Button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section>
          <h1 className="text-3xl font-semibold tracking-tight">Name your project</h1>
          <label className="mt-6 block text-sm font-medium" htmlFor="pname">
            Project name
          </label>
          <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 max-w-sm" />
          <p className="mt-2 font-mono text-sm text-muted-foreground">{path}</p>
          {dup && <p className="mt-2 text-sm text-danger">This folder is already a project.</p>}
          <div className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button disabled={!name.trim() || dup} onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h1 className="text-3xl font-semibold tracking-tight">Agents</h1>
          <p className="mt-2 text-muted-foreground">Specdeck found these on your PATH. Launching them from Specdeck arrives in a later update.</p>
          <ul className="mt-6 flex flex-col gap-2">
            {(agents.data ?? []).map((a) => (
              <li key={a.key} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">{a.label}</div>
                  <div className="font-mono text-xs text-muted-foreground">{a.version ?? `${a.key} not found`}</div>
                </div>
                <Badge variant="outline" className={a.detected ? 'text-success' : ''}>
                  {a.detected ? 'Detected' : 'Not found'}
                </Badge>
              </li>
            ))}
          </ul>
          {err && <p className="mt-4 text-sm text-danger">{err}</p>}
          <div className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={finish}>Add project</Button>
          </div>
        </section>
      )}
    </div>
  )
}

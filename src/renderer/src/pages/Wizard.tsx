import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Markdown } from '@/components/Markdown'
import { PageHeader, QueryState } from '@/components/bits'
import { useActiveProject, useAgents, useFrameworkMeta, useUnits } from '@/lib/queries'
import { cleanError, useRuns } from '@/lib/runs'
import { cn } from '@/lib/utils'
import {
  emptyOpenspec, emptySpeckit, KEBAB, openspecDocs, proposeInput, openspecDraftSchema, speckitDraftSchema,
  type OpenspecDraft, type SpeckitDraft
} from '@shared/wizard'

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
      {error ? <span className="text-xs font-normal text-danger" role="alert">{error}</span> : hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
    </label>
  )
}

function Stepper({ steps, step, onStep }: { steps: string[]; step: number; onStep: (i: number) => void }) {
  return (
    <ol className="mb-6 flex gap-2" aria-label="Steps">
      {steps.map((s, i) => (
        <li key={s}>
          <button
            onClick={() => onStep(i)}
            aria-current={i === step ? 'step' : undefined}
            className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm', i === step ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent')}
          >
            <span className={cn('grid size-5 place-items-center rounded-full text-xs', i === step ? 'bg-primary-foreground text-primary' : 'bg-muted')}>{i + 1}</span>
            {s}
          </button>
        </li>
      ))}
    </ol>
  )
}

function Preview({ path, text }: { path: string; text: string }) {
  return (
    <Card>
      <Tabs defaultValue="preview">
        <CardHeader className="flex-row items-center justify-between">
          <TabsList>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <span className="truncate font-mono text-xs text-muted-foreground">{path}</span>
        </CardHeader>
        <CardContent>
          <TabsContent value="write"><pre className="whitespace-pre-wrap font-mono text-sm">{text || '(nothing to write yet)'}</pre></TabsContent>
          <TabsContent value="preview">{text ? <Markdown text={text} /> : <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>}</TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}

const OS_STEPS = ['Proposal', 'Specs', 'Design', 'Tasks']
const OS_FILES = ['proposal.md', 'specs/', 'design.md', 'tasks.md']

function OpenspecWizard({ d, set, step, nameError }: { d: OpenspecDraft; set: (d: OpenspecDraft) => void; step: number; nameError?: string }) {
  const up = (p: Partial<OpenspecDraft>) => set({ ...d, ...p })
  const setCap = (i: number, c: OpenspecDraft['specs'][number]) => up({ specs: d.specs.map((x, j) => (j === i ? c : x)) })
  if (step === 0)
    return (
      <>
        <Field label="Change name" hint="Kebab-case. Becomes the folder under openspec/changes/." error={nameError}>
          <Input value={d.name} onChange={(e) => up({ name: e.target.value })} className="font-mono" placeholder="add-sepa-payments" />
        </Field>
        <Field label="Why" hint="One or two sentences on the problem."><Textarea value={d.why} onChange={(e) => up({ why: e.target.value })} /></Field>
        <Field label="What changes" hint="Bullet the visible behavior changes, one per line."><Textarea value={d.what} onChange={(e) => up({ what: e.target.value })} /></Field>
        <Field label="Impact" hint="Optional: affected specs and code."><Textarea value={d.impact} onChange={(e) => up({ impact: e.target.value })} className="min-h-14" /></Field>
      </>
    )
  if (step === 1)
    return (
      <>
        {d.specs.length === 0 && <p className="text-sm text-muted-foreground">Add a capability to describe its spec deltas. Skip this step if the agent should write them.</p>}
        {d.specs.map((c, ci) => (
          <div key={ci} className="flex flex-col gap-3 rounded-lg border p-3">
            <div className="flex items-end gap-2">
              <Field label="Capability" hint="Folder under specs/, kebab-case." error={c.cap && !KEBAB.test(c.cap) ? 'Use kebab-case' : undefined}>
                <Input value={c.cap} className="font-mono" onChange={(e) => setCap(ci, { ...c, cap: e.target.value })} />
              </Field>
              <Button variant="ghost" size="icon" aria-label="Remove capability" onClick={() => up({ specs: d.specs.filter((_, j) => j !== ci) })}><Trash2 /></Button>
            </div>
            {c.reqs.map((r, ri) => {
              const setReq = (p: Partial<typeof r>) => setCap(ci, { ...c, reqs: c.reqs.map((x, j) => (j === ri ? { ...x, ...p } : x)) })
              return (
                <div key={ri} className="flex flex-col gap-2 rounded-md bg-muted/50 p-3">
                  <div className="flex gap-2">
                    <Select value={r.op} onValueChange={(v) => setReq({ op: v as 'ADDED' | 'MODIFIED' })}>
                      <SelectTrigger className="w-32" aria-label="Operation"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="ADDED">Added</SelectItem><SelectItem value="MODIFIED">Modified</SelectItem></SelectContent>
                    </Select>
                    <Input aria-label="Requirement name" placeholder="Requirement name" value={r.name} onChange={(e) => setReq({ name: e.target.value })} />
                    <Button variant="ghost" size="icon" aria-label="Remove requirement" onClick={() => setCap(ci, { ...c, reqs: c.reqs.filter((_, j) => j !== ri) })}><Trash2 /></Button>
                  </div>
                  <Textarea aria-label="Requirement text" placeholder="The system SHALL …" className="min-h-14" value={r.text} onChange={(e) => setReq({ text: e.target.value })} />
                  {r.scenarios.map((s, si) => {
                    const setSc = (p: Partial<typeof s>) => setReq({ scenarios: r.scenarios.map((x, j) => (j === si ? { ...x, ...p } : x)) })
                    return (
                      <div key={si} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                        <Input aria-label="Scenario name" placeholder="Scenario" value={s.name} onChange={(e) => setSc({ name: e.target.value })} />
                        <Input aria-label="WHEN" placeholder="WHEN …" value={s.when} onChange={(e) => setSc({ when: e.target.value })} />
                        <Input aria-label="THEN" placeholder="THEN …" value={s.then} onChange={(e) => setSc({ then: e.target.value })} />
                        <Button variant="ghost" size="icon" aria-label="Remove scenario" onClick={() => setReq({ scenarios: r.scenarios.filter((_, j) => j !== si) })}><Trash2 /></Button>
                      </div>
                    )
                  })}
                  <Button variant="outline" size="sm" className="self-start" onClick={() => setReq({ scenarios: [...r.scenarios, { name: '', when: '', then: '' }] })}><Plus /> Scenario</Button>
                </div>
              )
            })}
            <Button variant="outline" size="sm" className="self-start" onClick={() => setCap(ci, { ...c, reqs: [...c.reqs, { op: 'ADDED', name: '', text: '', scenarios: [] }] })}><Plus /> Requirement</Button>
          </div>
        ))}
        <Button variant="outline" className="self-start" onClick={() => up({ specs: [...d.specs, { cap: '', reqs: [] }] })}><Plus /> Capability</Button>
      </>
    )
  if (step === 2)
    return (
      <>
        <Field label="Context"><Textarea value={d.design.context} onChange={(e) => up({ design: { ...d.design, context: e.target.value } })} /></Field>
        <Field label="Decisions"><Textarea value={d.design.decisions} onChange={(e) => up({ design: { ...d.design, decisions: e.target.value } })} /></Field>
        <Field label="Risks / trade-offs"><Textarea value={d.design.risks} onChange={(e) => up({ design: { ...d.design, risks: e.target.value } })} /></Field>
      </>
    )
  return (
    <>
      {d.tasks.length === 0 && <p className="text-sm text-muted-foreground">Add a task group; each line becomes a checkbox in tasks.md.</p>}
      {d.tasks.map((g, gi) => (
        <div key={gi} className="flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex gap-2">
            <Input aria-label="Group name" placeholder="Group name" value={g.group} onChange={(e) => up({ tasks: d.tasks.map((x, j) => (j === gi ? { ...x, group: e.target.value } : x)) })} />
            <Button variant="ghost" size="icon" aria-label="Remove group" onClick={() => up({ tasks: d.tasks.filter((_, j) => j !== gi) })}><Trash2 /></Button>
          </div>
          <Textarea aria-label="Tasks, one per line" placeholder="One task per line" value={g.items.join('\n')} onChange={(e) => up({ tasks: d.tasks.map((x, j) => (j === gi ? { ...x, items: e.target.value.split('\n') } : x)) })} />
        </div>
      ))}
      <Button variant="outline" className="self-start" onClick={() => up({ tasks: [...d.tasks, { group: '', items: [] }] })}><Plus /> Task group</Button>
    </>
  )
}

const SK_STEPS = ['Specify', 'Plan', 'Tasks']

export default function Wizard() {
  const { project } = useActiveProject()
  const meta = useFrameworkMeta(project)!
  const isOs = meta.id === 'openspec'
  const units = useUnits(project?.id)
  const agents = useAgents()
  const { agent, setAgent, askToRun } = useRuns()
  const loaded = useQuery({ queryKey: ['wizard', project?.id, meta.id], queryFn: () => window.specdeck.invoke('wizard:load', { projectId: project!.id }), enabled: !!project })
  const [os, setOs] = useState<OpenspecDraft>(emptyOpenspec())
  const [sk, setSk] = useState<SpeckitDraft>(emptySpeckit())
  const [step, setStep] = useState(0)
  const [ready, setReady] = useState(false)
  const [lossy, setLossy] = useState<string[]>([])
  const [confirmReplace, setConfirmReplace] = useState<string[] | null>(null)

  useEffect(() => {
    if (loaded.isLoading || ready) return
    if (loaded.data) {
      const parsed = (isOs ? openspecDraftSchema : speckitDraftSchema).safeParse(loaded.data)
      if (parsed.success) (isOs ? setOs : setSk)(parsed.data as never)
    }
    setReady(true)
  }, [loaded.isLoading, loaded.data, isOs, ready])

  const usable = (agents.data ?? []).filter((a) => a.launchable && a.detected && a.enabled)
  const nameError = os.name && !KEBAB.test(os.name) ? 'Use kebab-case, e.g. add-sepa-payments' : undefined
  const exists = (units.data ?? []).some((u) => u.name === os.name)
  const steps = isOs ? OS_STEPS : SK_STEPS
  const features = (units.data ?? []).filter((u) => !u.archived)

  const docs = useMemo(() => (isOs ? openspecDocs(os) : []), [isOs, os])
  const stepDocs = docs.filter((x) => (step === 0 ? x.path === 'proposal.md' : step === 1 ? x.path.startsWith('specs/') : step === 2 ? x.path === 'design.md' : x.path === 'tasks.md'))
  const previewText = isOs ? stepDocs.map((x) => (step === 1 ? `<!-- ${x.path} -->\n\n` : '') + x.content).join('\n') : step === 0 ? sk.description : step === 1 ? sk.planNotes : sk.tasksNotes
  const previewPath = isOs ? (os.name ? `openspec/changes/${os.name}/${OS_FILES[step]}` : `openspec/changes/<name>/${OS_FILES[step]}`) : step === 0 ? 'Input to /speckit-specify' : `Input to /speckit-${step === 1 ? 'plan' : 'tasks'} for specs/${sk.feature || '<feature>'}/`

  const save = async (replace?: string[]) => {
    try {
      const r = await window.specdeck.invoke('wizard:save', { projectId: project!.id, state: isOs ? os : sk, replace })
      if (r.needsConfirm?.length) return setConfirmReplace(r.needsConfirm)
      setConfirmReplace(null)
      toast.success(r.draftOnly ? 'Draft saved in Specdeck. Nothing was written to your repo.' : r.wrote.length ? `Wrote ${r.wrote.length} file${r.wrote.length === 1 ? '' : 's'} to ${meta.marker}` : 'Nothing changed in your files.')
    } catch (e) {
      toast.error(cleanError(e))
    }
  }

  const loadExisting = async (name: string) => {
    try {
      const r = await window.specdeck.invoke('wizard:import', { projectId: project!.id, name })
      setOs(r.draft)
      setLossy(r.lossy)
      setStep(0)
      toast.success(`Loaded ${name} from its files.`)
    } catch (e) {
      toast.error(cleanError(e))
    }
  }

  const stepLossy = lossy.filter((f) => (step === 0 ? f === 'proposal.md' : step === 1 ? f.startsWith('specs/') : step === 2 ? f === 'design.md' : f === 'tasks.md'))

  const runAgent = () => {
    if (isOs) {
      if (!os.name || nameError) return void toast.error('Give the change a kebab-case name first.')
      if (exists) return void toast.error(`"${os.name}" already exists. Pick a new name, or use the Board to continue it.`)
      return void askToRun({ kind: 'stage', projectId: project!.id, unitId: os.name, stage: 'propose', agent, input: proposeInput(os) }, `Propose ${os.name}`)
    }
    if (step === 0) {
      if (!sk.description.trim()) return void toast.error('Describe the feature first.')
      return void askToRun({ kind: 'stage', projectId: project!.id, unitId: 'new-feature', stage: 'create', agent, input: sk.description }, 'Specify new feature')
    }
    if (!sk.feature) return void toast.error('Choose a feature first.')
    const stage = step === 1 ? 'plan' : 'tasks'
    void askToRun({ kind: 'stage', projectId: project!.id, unitId: sk.feature, stage, agent, input: step === 1 ? sk.planNotes : sk.tasksNotes }, `${stage} ${sk.feature}`)
  }

  const agentLabel = isOs ? 'Propose with agent' : step === 0 ? 'Specify with agent' : step === 1 ? 'Plan with agent' : 'Generate tasks'
  const showRun = isOs ? step === 0 : true
  const last = step === steps.length - 1

  return (
    <>
      <PageHeader crumb={`${project!.name} / Board / New ${meta.unitName}`} title={`New ${meta.unitName}`} />
      <QueryState q={loaded}>
        <Stepper steps={steps} step={step} onStep={setStep} />
        <div className="grid grid-cols-[1fr_1fr] items-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{steps[step]}</CardTitle>
              <CardDescription>
                {isOs ? `Saved to ${OS_FILES[step]} once the change exists.` : step === 0 ? 'Describe the feature. Your agent writes spec.md in specs/.' : 'Pick the feature, add optional notes for your agent.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {isOs && step === 0 && features.length > 0 && (
                <Field label="Start from an existing change" hint="Fills the form from its files. Files you do not change are left as they are.">
                  <Select value="" onValueChange={loadExisting}>
                    <SelectTrigger aria-label="Existing change"><SelectValue placeholder="Choose a change…" /></SelectTrigger>
                    <SelectContent>{features.map((u) => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              )}
              {isOs && stepLossy.length > 0 && (
                <Alert>
                  <AlertDescription>
                    {stepLossy.join(', ')} has content this form cannot show (other sections, checked tasks, extra scenario steps). If you change this step, saving replaces the file and asks you first.
                  </AlertDescription>
                </Alert>
              )}
              {isOs ? (
                <OpenspecWizard d={os} set={setOs} step={step} nameError={nameError} />
              ) : step === 0 ? (
                <Field label="Feature description" hint="What and why, not the tech stack."><Textarea value={sk.description} onChange={(e) => setSk({ ...sk, description: e.target.value })} className="min-h-32" /></Field>
              ) : (
                <>
                  <Field label="Feature">
                    <Select value={sk.feature} onValueChange={(v) => setSk({ ...sk, feature: v })}>
                      <SelectTrigger aria-label="Feature"><SelectValue placeholder="Choose a feature" /></SelectTrigger>
                      <SelectContent>{features.map((u) => <SelectItem key={u.id} value={u.id}>{u.id}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label={step === 1 ? 'Technical notes' : 'Notes for task generation'} hint="Optional. Passed to your agent as part of the command.">
                    <Textarea value={step === 1 ? sk.planNotes : sk.tasksNotes} onChange={(e) => setSk(step === 1 ? { ...sk, planNotes: e.target.value } : { ...sk, tasksNotes: e.target.value })} className="min-h-28" />
                  </Field>
                </>
              )}
              {showRun && (
                <div className="flex flex-col gap-1.5 text-sm font-medium">
                  Run with
                  <div className="flex gap-2">
                    <Select value={agent} onValueChange={(v) => setAgent(v as 'claude' | 'codex')}>
                      <SelectTrigger className="w-44" aria-label="Run with"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {usable.length === 0 && <SelectItem value={agent} disabled>No agent available</SelectItem>}
                        {usable.map((a) => <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input readOnly aria-label="Command" className="font-mono text-muted-foreground" value={meta.commandExample[agent].replace('<name>', os.name || '<name>').replace('<description>', '…')} />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => save()}>Save draft</Button>
                <div className="flex gap-2">
                  {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
                  {!last && <Button variant="outline" onClick={() => setStep(step + 1)}>Next: {steps[step + 1]}</Button>}
                  {showRun && <Button onClick={runAgent}>{agentLabel}</Button>}
                </div>
              </div>
            </CardContent>
          </Card>
          <Preview path={previewPath} text={previewText} />
        </div>
      </QueryState>
      <Dialog open={!!confirmReplace} onOpenChange={(o) => !o && setConfirmReplace(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace files with the form's version?</DialogTitle>
            <DialogDescription>
              These files contain content the form cannot show. Saving writes only what the form has, so anything else in them is lost:
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc pl-5 font-mono text-sm">{confirmReplace?.map((f) => <li key={f}>{f}</li>)}</ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReplace(null)}>Cancel</Button>
            <Button onClick={() => save(confirmReplace ?? [])}>Replace</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

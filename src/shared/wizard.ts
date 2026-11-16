import { z } from 'zod'

// Wizard drafts and the markdown they generate (AC-050..053). Pure: used by the renderer for preview and by main for writes.
export const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/
const kebab = z.string().max(60).refine((s) => s === '' || KEBAB.test(s), 'Use kebab-case, e.g. add-sepa-payments')
const text = (n: number) => z.string().max(n)

export const scenarioSchema = z.object({ name: text(120), when: text(500), then: text(500) })
export const requirementSchema = z.object({ op: z.enum(['ADDED', 'MODIFIED']), name: text(120), text: text(1000), scenarios: z.array(scenarioSchema).max(20) })
export const capabilitySchema = z.object({ cap: kebab, reqs: z.array(requirementSchema).max(30) })

export const openspecDraftSchema = z.object({
  name: kebab,
  why: text(2000),
  what: text(4000),
  impact: text(2000),
  specs: z.array(capabilitySchema).max(10),
  design: z.object({ context: text(4000), decisions: text(4000), risks: text(4000) }),
  tasks: z.array(z.object({ group: text(120), items: z.array(text(300)).max(50) })).max(20)
})
export type OpenspecDraft = z.infer<typeof openspecDraftSchema>

export const speckitDraftSchema = z.object({
  description: text(4000), // /speckit-specify input (new feature)
  feature: z.string().max(200), // existing feature folder for the Plan and Tasks steps
  planNotes: text(4000),
  tasksNotes: text(4000)
})
export type SpeckitDraft = z.infer<typeof speckitDraftSchema>

export const emptyOpenspec = (): OpenspecDraft => ({
  name: '', why: '', what: '', impact: '', specs: [], design: { context: '', decisions: '', risks: '' }, tasks: []
})
export const emptySpeckit = (): SpeckitDraft => ({ description: '', feature: '', planNotes: '', tasksNotes: '' })

const bullets = (s: string) =>
  s.split('\n').map((l) => l.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean).map((l) => `- ${l}`).join('\n')

export function proposalMd(d: OpenspecDraft): string {
  const parts = [`## Why\n${d.why.trim()}`, `## What Changes\n${bullets(d.what)}`]
  if (d.impact.trim()) parts.push(`## Impact\n${d.impact.trim()}`)
  return parts.join('\n\n') + '\n'
}

export function specMd(c: OpenspecDraft['specs'][number]): string {
  const block = (op: 'ADDED' | 'MODIFIED') => {
    const rs = c.reqs.filter((r) => r.op === op && r.name.trim())
    if (!rs.length) return ''
    const body = rs.map((r) => {
      const sc = r.scenarios.filter((s) => s.name.trim()).map((s) => `#### Scenario: ${s.name.trim()}\n- **WHEN** ${s.when.trim()}\n- **THEN** ${s.then.trim()}`)
      return [`### Requirement: ${r.name.trim()}`, r.text.trim(), ...sc].join('\n\n')
    })
    return `## ${op} Requirements\n${body.join('\n\n')}`
  }
  return [block('ADDED'), block('MODIFIED')].filter(Boolean).join('\n\n') + '\n'
}

export function designMd(d: OpenspecDraft['design']): string {
  const sec = (h: string, v: string) => (v.trim() ? `## ${h}\n${v.trim()}` : '')
  return [sec('Context', d.context), sec('Decisions', d.decisions), sec('Risks / Trade-offs', d.risks)].filter(Boolean).join('\n\n') + '\n'
}

export function tasksMd(groups: OpenspecDraft['tasks']): string {
  return (
    groups
      .map((g) => ({ ...g, items: g.items.map((i) => i.trim()).filter(Boolean) }))
      .filter((g) => g.group.trim() && g.items.length)
      .map((g, gi) => `## ${gi + 1}. ${g.group.trim()}\n${g.items.map((i, ii) => `- [ ] ${gi + 1}.${ii + 1} ${i}`).join('\n')}`)
      .join('\n\n') + '\n'
  )
}

/** Files a draft produces, relative to the change folder. Empty steps produce nothing. */
export function openspecDocs(d: OpenspecDraft): { path: string; content: string }[] {
  const out: { path: string; content: string }[] = []
  if (d.why.trim() && d.what.trim()) out.push({ path: 'proposal.md', content: proposalMd(d) })
  for (const c of d.specs) if (c.cap && specMd(c).trim()) out.push({ path: `specs/${c.cap}/spec.md`, content: specMd(c) })
  if (designMd(d.design).trim()) out.push({ path: 'design.md', content: designMd(d.design) })
  if (tasksMd(d.tasks).trim()) out.push({ path: 'tasks.md', content: tasksMd(d.tasks) })
  return out
}

/** One-line input appended to the agent command (shown verbatim in the confirm dialog). */
export function proposeInput(d: OpenspecDraft): string {
  const flat = (s: string) => s.replace(/\s+/g, ' ').trim()
  const what = bullets(d.what).split('\n').map((l) => flat(l.slice(2))).filter(Boolean).join('; ')
  const end = (s: string) => s.replace(/[.\s]+$/, '')
  return [d.why.trim() && `Why: ${end(flat(d.why))}`, what && `What changes: ${end(what)}`, d.impact.trim() && `Impact: ${end(flat(d.impact))}`].filter(Boolean).join('. ')
}

import { z } from 'zod'

// Wizard drafts and the markdown they generate (AC-050..053). Pure: used by the renderer for preview and by main for writes.
export const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/
const kebab = z.string().max(60).refine((s) => s === '' || KEBAB.test(s), 'Use kebab-case, e.g. add-sepa-payments')
// Imported agent-written files can be long, so field limits are generous.
const text = (n: number) => z.string().max(Math.max(n, 20000))

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

// ---- Import (load an existing change into the form). Parsers never throw; anything they cannot represent shows up as "lossy". ----

const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

function sections(md: string): Map<string, string> {
  const out = new Map<string, string>()
  let head: string | null = null
  let buf: string[] = []
  const flush = () => head !== null && out.set(head, buf.join('\n').trim())
  for (const line of md.split(/\r?\n/)) {
    const m = /^##\s+(.+?)\s*$/.exec(line)
    if (m) {
      flush()
      head = m[1]
      buf = []
    } else buf.push(line)
  }
  flush()
  return out
}

export function parseProposal(md: string): Pick<OpenspecDraft, 'why' | 'what' | 'impact'> {
  const s = sections(md)
  return { why: s.get('Why') ?? '', what: s.get('What Changes') ?? '', impact: s.get('Impact') ?? '' }
}

export function parseDesign(md: string): OpenspecDraft['design'] {
  const s = sections(md)
  return { context: s.get('Context') ?? '', decisions: s.get('Decisions') ?? '', risks: s.get('Risks / Trade-offs') ?? '' }
}

export function parseSpecDoc(md: string): OpenspecDraft['specs'][number]['reqs'] {
  const reqs: OpenspecDraft['specs'][number]['reqs'] = []
  let op: 'ADDED' | 'MODIFIED' | null = null
  let req: (typeof reqs)[number] | null = null
  let sc: (typeof reqs)[number]['scenarios'][number] | null = null
  const text: string[] = []
  const endText = () => {
    if (req && !sc) req.text = text.join('\n').trim()
    text.length = 0
  }
  for (const line of md.split(/\r?\n/)) {
    let m: RegExpExecArray | null
    if ((m = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements/.exec(line))) {
      endText()
      op = m[1] === 'ADDED' || m[1] === 'MODIFIED' ? m[1] : null
      req = sc = null
    } else if (op && (m = /^###\s+Requirement:\s*(.+?)\s*$/.exec(line))) {
      endText()
      req = { op, name: m[1], text: '', scenarios: [] }
      reqs.push(req)
      sc = null
    } else if (req && (m = /^####\s+Scenario:\s*(.+?)\s*$/.exec(line))) {
      endText()
      sc = { name: m[1], when: '', then: '' }
      req.scenarios.push(sc)
    } else if (sc && (m = /^\s*-\s+\*\*WHEN\*\*\s*(.*)$/.exec(line))) sc.when = m[1].trim()
    else if (sc && (m = /^\s*-\s+\*\*THEN\*\*\s*(.*)$/.exec(line))) sc.then = m[1].trim()
    else if (req && !sc) text.push(line)
  }
  endText()
  return reqs
}

export function parseTasksDoc(md: string): OpenspecDraft['tasks'] {
  const groups: OpenspecDraft['tasks'] = []
  for (const line of md.split(/\r?\n/)) {
    let m: RegExpExecArray | null
    if ((m = /^##\s+\d+\.\s+(.+?)\s*$/.exec(line))) groups.push({ group: m[1], items: [] })
    else if (groups.length && (m = /^\s*-\s+\[[ xX]\]\s+(?:\d+\.\d+\s+)?(.*)$/.exec(line))) groups.at(-1)!.items.push(m[1].trim())
  }
  return groups
}

/** What the form would write back for this file if the user changed nothing. */
export function regen(path: string, md: string): string {
  if (path === 'proposal.md') return proposalMd({ ...emptyOpenspec(), ...parseProposal(md) })
  if (path === 'design.md') return designMd(parseDesign(md))
  if (path === 'tasks.md') return tasksMd(parseTasksDoc(md))
  return specMd({ cap: 'x', reqs: parseSpecDoc(md) })
}

/** True when loading this file into the form and saving would change content (sections the form lacks, checked tasks, ...). */
export const isLossy = (path: string, md: string) => norm(regen(path, md)) !== norm(md)

export function importChange(name: string, files: Record<string, string>): { draft: OpenspecDraft; lossy: string[] } {
  const d = emptyOpenspec()
  d.name = name
  if (files['proposal.md'] !== undefined) Object.assign(d, parseProposal(files['proposal.md']))
  if (files['design.md'] !== undefined) d.design = parseDesign(files['design.md'])
  if (files['tasks.md'] !== undefined) d.tasks = parseTasksDoc(files['tasks.md'])
  for (const [path, md] of Object.entries(files).sort())
    if (/^specs\/[^/]+\/spec\.md$/.test(path)) d.specs.push({ cap: path.split('/')[1], reqs: parseSpecDoc(md) })
  return { draft: d, lossy: Object.entries(files).filter(([p, md]) => isLossy(p, md)).map(([p]) => p).sort() }
}

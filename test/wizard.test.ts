import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { openspecAdapter } from '../src/main/adapters/openspec'
import { speckitAdapter } from '../src/main/adapters/speckit'
import { Store } from '../src/main/db'
import { loadDraft, saveDraft, writeChangeDoc } from '../src/main/wizard'
import { emptyOpenspec, openspecDocs, proposeInput, type OpenspecDraft } from '../src/shared/wizard'

let root = ''
let outside = ''
beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'specdeck-wz-'))
  outside = mkdtempSync(join(tmpdir(), 'specdeck-out-'))
  execFileSync('openspec', ['init', '--tools', 'claude'], { cwd: root, stdio: 'pipe', shell: process.platform === 'win32' })
}, 60000)
afterAll(() => {
  rmSync(root, { recursive: true, force: true })
  rmSync(outside, { recursive: true, force: true })
})

const draft = (): OpenspecDraft => ({
  ...emptyOpenspec(),
  name: 'add-sepa-payments',
  why: 'EU customers want direct debit.',
  what: '- Add a SEPA mandate model\n- Collect by direct debit',
  impact: 'Affected specs: payments',
  specs: [{ cap: 'payments', reqs: [{ op: 'ADDED', name: 'SEPA mandate', text: 'The system SHALL store a SEPA mandate.', scenarios: [{ name: 'create', when: 'a customer signs a mandate', then: 'it is stored as pending' }] }] }],
  design: { context: 'No payments code yet.', decisions: '', risks: 'Provider choice open.' },
  tasks: [{ group: 'Mandates', items: ['Add model', 'Add API'] }]
})

test('draft only in app data while the change does not exist; files appear once it does', async () => {
  const store = new Store(':memory:')
  const p = store.add(root, 'wz', 'openspec')
  expect(await saveDraft(store, p, draft())).toEqual({ wrote: [], draftOnly: true })
  expect(existsSync(join(root, 'openspec/changes/add-sepa-payments'))).toBe(false)
  expect((loadDraft(store, p) as OpenspecDraft).name).toBe('add-sepa-payments')

  mkdirSync(join(root, 'openspec/changes/add-sepa-payments')) // what the agent's propose does
  const r = await saveDraft(store, p, draft())
  expect(r.draftOnly).toBe(false)
  expect(r.wrote.sort()).toEqual([
    'openspec/changes/add-sepa-payments/design.md',
    'openspec/changes/add-sepa-payments/proposal.md',
    'openspec/changes/add-sepa-payments/specs/payments/spec.md',
    'openspec/changes/add-sepa-payments/tasks.md'
  ])
  // real OpenSpec CLI accepts what the wizard wrote
  const out = JSON.parse(execFileSync('openspec', ['validate', 'add-sepa-payments', '--json'], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' }))
  expect(JSON.stringify(out)).toContain('"valid":true')
  const u = (await openspecAdapter.listUnits(root)).find((x) => x.name === 'add-sepa-payments')!
  expect(u.tasks).toMatchObject({ done: 0, total: 2 })
  expect((await openspecAdapter.readDeltas(root, 'add-sepa-payments'))[0]).toMatchObject({ op: 'ADDED', spec: 'payments' })
})

test('write scope: nothing outside the change folder, nothing but its markdown docs', async () => {
  for (const rel of ['../x.md', '../../x.md', 'specs/../../x.md', 'notes.md', 'specs/Bad Name/spec.md', '/etc/passwd', 'specs/a/b/spec.md'])
    await expect(writeChangeDoc(root, 'add-sepa-payments', rel, 'x')).rejects.toThrow()
  for (const name of ['../evil', 'Bad', 'archive/x', 'missing-change']) await expect(writeChangeDoc(root, name, 'proposal.md', 'x')).rejects.toThrow()
  // a symlinked specs/ folder must not redirect a write elsewhere
  symlinkSync(outside, join(root, 'openspec/changes/add-sepa-payments/specs/link'))
  await expect(writeChangeDoc(root, 'add-sepa-payments', 'specs/link/spec.md', 'x')).rejects.toThrow()
  expect(existsSync(join(outside, 'spec.md'))).toBe(false)
  expect(readFileSync(join(root, 'openspec/changes/add-sepa-payments/proposal.md'), 'utf8')).toContain('## Why')
})

test('invalid drafts are rejected before anything is stored', async () => {
  const store = new Store(':memory:')
  const p = store.add(root, 'wz', 'openspec')
  await expect(saveDraft(store, p, { ...draft(), name: 'Not Kebab' })).rejects.toThrow()
  await expect(saveDraft(store, p, { nope: 1 })).rejects.toThrow()
  expect(loadDraft(store, p)).toBeNull()
})

test('empty steps write nothing; agent input is one line', () => {
  expect(openspecDocs({ ...emptyOpenspec(), name: 'x' })).toEqual([])
  expect(proposeInput(draft())).toBe('Why: EU customers want direct debit. What changes: Add a SEPA mandate model; Collect by direct debit. Impact: Affected specs: payments')
})

test('agent commands carry the wizard text as one visible argument', () => {
  const inp = proposeInput({ ...draft(), why: 'Line one\nline two' })
  const c = openspecAdapter.stageCommand(root, 'add-sepa-payments', 'propose', 'claude', inp)
  expect(c.args).toHaveLength(1)
  expect(c.args[0].startsWith('/openspec-propose add-sepa-payments Why: Line one line two')).toBe(true)
  expect(c.args[0]).not.toContain('\n')
  expect(openspecAdapter.stageCommand(root, 'add-sepa-payments', 'propose', 'claude').args[0]).toBe('/openspec-propose add-sepa-payments')
})

test('Spec Kit create uses /speckit-specify <description>; empty description is refused', () => {
  const sk = mkdtempSync(join(tmpdir(), 'specdeck-wzsk-'))
  try {
    execFileSync('specify', ['init', '--here', '--force', '--non-interactive', '--integration', 'claude', '--script', 'sh'], { cwd: sk, stdio: 'pipe' })
    expect(speckitAdapter.stageCommand(sk, 'sepa', 'create', 'claude', 'Pay by\nSEPA').args[0]).toBe('/speckit-specify Pay by SEPA')
    expect(() => speckitAdapter.stageCommand(sk, 'sepa', 'create', 'claude', '  ')).toThrow()
    expect(speckitAdapter.stageCommand(sk, '001-x', 'plan', 'claude', 'Use SQLite').args[0]).toBe('/speckit-plan Feature directory: specs/001-x Use SQLite')
  } finally {
    rmSync(sk, { recursive: true, force: true })
  }
}, 60000)

// ---- Loading existing changes (files below are real /openspec-propose output, openspec 1.12.0 + claude 2.1.325) ----
import { cpSync, readFileSync as rf } from 'node:fs'
import { importChange } from '../src/shared/wizard'
import { loadChange } from '../src/main/wizard'

test('wizard-written files round-trip exactly through import', () => {
  const d = draft()
  const files = Object.fromEntries(openspecDocs(d).map((x) => [x.path, x.content]))
  const r = importChange(d.name, files)
  expect(r.lossy).toEqual([])
  expect(r.draft).toEqual(d)
})

test('agent-written files load, and sections the form cannot show are flagged', async () => {
  const dir = join(root, 'openspec/changes/agent-made')
  cpSync(join(__dirname, 'fixtures/openspec-agent'), dir, { recursive: true })
  const { draft: d, lossy } = await loadChange(root, 'agent-made')
  expect(d.why).toContain('EU customers want to pay by SEPA direct debit')
  expect(d.what.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(3)
  expect(d.specs.map((s) => s.cap)).toEqual(['invoice-collection', 'sepa-mandates'])
  expect(d.specs[0].reqs[0]).toMatchObject({ op: 'ADDED', name: 'Collect due invoices by direct debit' })
  expect(d.specs[0].reqs[0].scenarios[0]).toMatchObject({ name: 'Active mandate' })
  expect(d.tasks.length).toBeGreaterThan(2)
  expect(lossy).toContain('design.md') // Goals / Non-Goals, Migration Plan, Open Questions
  expect(lossy).toContain('proposal.md') // Capabilities section
})

test('saving an unchanged loaded change rewrites nothing; edits ask before replacing lossy files', async () => {
  const store = new Store(':memory:')
  const p = store.add(root, 'wz', 'openspec')
  const file = (f: string) => join(root, 'openspec/changes/agent-made', f)
  const before = { design: rf(file('design.md'), 'utf8'), proposal: rf(file('proposal.md'), 'utf8'), tasks: rf(file('tasks.md'), 'utf8') }
  const { draft: d } = await loadChange(root, 'agent-made')

  expect((await saveDraft(store, p, d)).wrote).toEqual([])
  expect(rf(file('design.md'), 'utf8')).toBe(before.design)

  // edit a file the form represents fully (tasks): written directly, others untouched
  const t = { ...d, tasks: [...d.tasks, { group: 'Docs', items: ['Write the runbook'] }] }
  expect((await saveDraft(store, p, t)).wrote).toEqual(['openspec/changes/agent-made/tasks.md'])
  expect(rf(file('tasks.md'), 'utf8')).toContain('Write the runbook')
  expect(rf(file('design.md'), 'utf8')).toBe(before.design)

  // edit a lossy file: nothing written until approved
  const e = { ...t, design: { ...d.design, risks: d.design.risks + '\n- New risk' } }
  const ask = await saveDraft(store, p, e)
  expect(ask).toMatchObject({ wrote: [], needsConfirm: ['design.md'] })
  expect(rf(file('design.md'), 'utf8')).toBe(before.design)
  const ok = await saveDraft(store, p, e, ['design.md'])
  expect(ok.wrote).toEqual(['openspec/changes/agent-made/design.md'])
  expect(rf(file('design.md'), 'utf8')).toContain('New risk')
})

test('loadChange rejects bad or missing names', async () => {
  await expect(loadChange(root, '../x')).rejects.toThrow()
  await expect(loadChange(root, 'nope-nope')).rejects.toThrow()
})

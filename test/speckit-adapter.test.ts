import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { speckitAdapter as a } from '../src/main/adapters/speckit'

// Repo from the real `specify init`; feature files are real output of /speckit-specify, -plan, -tasks (specify 1.0.7, claude).
const FEATURE = '001-todo-list-json-flag'
const fx = (f: string) => join(__dirname, 'fixtures', 'speckit', f)
let root = ''
const feature = (...files: string[]) => {
  const dir = join(root, 'specs', FEATURE)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  for (const f of files) copyFileSync(fx(f), join(dir, f))
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'specdeck-sk-'))
  for (const agent of ['claude', 'codex'])
    execFileSync('specify', ['init', '--here', '--force', '--non-interactive', '--integration', agent, '--script', 'sh', '--ignore-agent-tools'], { cwd: root, stdio: 'pipe' })
}, 120000)
afterAll(() => rmSync(root, { recursive: true, force: true }))

test('detects .specify/ and has no units before the first feature', async () => {
  expect((await a.detect(root)).found).toBe(true)
  expect(await a.listUnits(root)).toEqual([])
})

test('stage follows the files: specify → plan → tasks → implement → converge', async () => {
  const stage = async () => (await a.listUnits(root))[0].stage
  feature('spec.md')
  expect(await stage()).toBe('plan')
  feature('spec.md', 'plan.md')
  expect(await stage()).toBe('tasks')
  feature('spec.md', 'plan.md', 'tasks.md')
  const [u] = await a.listUnits(root)
  expect(u).toMatchObject({ id: FEATURE, stage: 'implement', summary: 'Todo List JSON Output Flag' })
  expect(u.tasks.total).toBe(15)
  writeFileSync(join(root, 'specs', FEATURE, 'tasks.md'), readFileSync(fx('tasks.md'), 'utf8').replace(/- \[ \]/g, '- [x]'))
  expect(await stage()).toBe('converge')
  writeFileSync(join(root, 'specs', FEATURE, 'spec.md'), readFileSync(fx('spec.md'), 'utf8') + '\n- **FR-099**: [NEEDS CLARIFICATION: how?]\n')
  expect(await stage()).toBe('specify')
})

test('lists and reads spec/plan/tasks per feature, rejects bad ids', async () => {
  feature('spec.md', 'plan.md', 'tasks.md')
  const specs = await a.listSpecs(root)
  expect(specs.map((s) => s.id)).toEqual([`${FEATURE}:spec`, `${FEATURE}:plan`, `${FEATURE}:tasks`])
  expect(specs[0].requirementCount).toBe(8)
  expect((await a.readSpec(root, `${FEATURE}:plan`)).raw).toContain('Implementation Plan')
  await expect(a.readSpec(root, `${FEATURE}:../../secret`)).rejects.toThrow()
  expect(await a.searchSpecs(root, 'unittest')).toContain(`${FEATURE}:plan`)
})

test('stage commands use the installed skill per agent and name the feature', () => {
  expect(a.stageCommand(root, FEATURE, 'plan', 'claude')).toMatchObject({
    bin: 'claude',
    mode: 'pty',
    display: `claude '/speckit-plan Feature directory: specs/${FEATURE}'`
  })
  expect(a.stageCommand(root, FEATURE, 'implement', 'codex').display).toBe(`codex '$speckit-implement Feature directory: specs/${FEATURE}'`)
  expect(a.stageCommand(root, FEATURE, 'specify', 'claude').args[0]).toContain('/speckit-clarify')
  expect(() => a.stageCommand(root, 'bad name', 'plan', 'claude')).toThrow()
  expect(() => a.stageCommand(root, FEATURE, 'archive', 'claude')).toThrow()
})

test('init and maintenance commands are the verified CLI forms', async () => {
  expect(a.initCommand(root, ['codex']).display).toBe('specify init --here --force --non-interactive --integration codex --script sh')
  const m = await a.maintenance(root)
  expect(m.cli.installed).toBe(true)
  expect(m.facts.find((f) => f.label === 'Integration')?.value).toBe('codex')
  expect((await a.maintenanceCommand(root, 'extension-list')).display).toBe('specify extension list')
  await expect(a.maintenanceCommand(root, 'nope')).rejects.toThrow()
})

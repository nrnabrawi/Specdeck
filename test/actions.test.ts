import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { openspecAdapter as a } from '../src/main/adapters/openspec'
import { CommandService } from '../src/main/commands'
import { Store } from '../src/main/db'
import { PtyManager, type PtyLike } from '../src/main/pty'
import { makeOpenspecRepo } from './openspec-fixture'

let root = ''
beforeAll(() => {
  root = makeOpenspecRepo()
}, 60000)
afterAll(() => rmSync(root, { recursive: true, force: true }))

test('stage commands use the skill names installed by the real init', () => {
  const c = a.stageCommand(root, 'apply-me', 'apply', 'claude')
  expect(c).toMatchObject({ bin: 'claude', args: ['/openspec-apply-change apply-me'], mode: 'pty', cwd: root })
  expect(c.display).toBe("claude '/openspec-apply-change apply-me'")
  expect(a.stageCommand(root, 'x', 'propose', 'codex').args).toEqual(['$openspec-propose x'])
  expect(a.stageCommand(root, 'apply-me', 'archive', 'claude')).toMatchObject({ bin: 'openspec', args: ['archive', 'apply-me', '--yes'], mode: 'exec' })
})

test('rejects bad names, unknown stages and missing skills', () => {
  expect(() => a.stageCommand(root, '../x', 'apply', 'claude')).toThrow('Invalid id')
  expect(() => a.stageCommand(root, 'x', 'bogus', 'claude')).toThrow('No command')
  expect(() => a.stageCommand('/nonexistent-dir', 'x', 'apply', 'claude')).toThrow('not installed')
})

test('init and maintenance commands', async () => {
  expect(a.initCommand('/r', ['claude', 'codex']).display).toBe('openspec init --tools claude,codex')
  expect(a.initCommand('/r', []).args).toEqual(['init', '--tools', 'none'])
  const m = await a.maintenance(root)
  expect(m.cli.installed).toBe(true)
  expect(m.facts.map((f) => f.label)).toEqual(['Profile', 'Delivery', 'Workflows', 'Telemetry'])
  expect(m.actions.map((x) => x.id)).toContain('update')
  expect((await a.maintenanceCommand(root, 'update')).display).toBe('openspec update')
  await expect(a.maintenanceCommand(root, 'rm-rf')).rejects.toThrow('Unknown action')
})

class FakePty implements PtyLike {
  data: (d: string) => void = () => undefined
  exit: (e: { exitCode: number }) => void = () => undefined
  killed = false
  onData(cb: (d: string) => void) { this.data = cb }
  onExit(cb: (e: { exitCode: number }) => void) { this.exit = cb }
  write() { /* unused */ }
  resize() { /* unused */ }
  kill() { this.killed = true; this.exit({ exitCode: 143 }) }
}

test('PtyManager records the run lifecycle and allows one active run per project (AC-101, 102)', () => {
  const store = new Store(':memory:')
  const p = store.add('/x', 'x', 'openspec')
  const events: string[] = []
  const fake = new FakePty()
  const m = new PtyManager(store, (ch) => events.push(ch), () => fake)
  const cmd = { bin: 'claude', args: ['/openspec-apply-change u'], cwd: '/x', display: 'claude ...', mode: 'pty' as const, meta: { agent: 'claude' as const, unitId: 'u', stage: 'apply' } }
  const run = m.start(p.id, cmd)
  expect(() => m.start(p.id, cmd)).toThrow('already active')
  fake.data('hello')
  expect(m.attach(p.id)?.buffer).toBe('hello')
  m.stop(run.id)
  const [r] = store.listRuns(p.id)
  expect(r).toMatchObject({ agent: 'claude', unitId: 'u', stage: 'apply', exitCode: 143 })
  expect(r.endedAt).not.toBeNull()
  expect(m.attach(p.id)).toBeNull()
  expect(events).toEqual(['pty:data', 'pty:exit'])
})

test('real node-pty run streams output and records exit code', async () => {
  if (process.platform === 'win32') return
  const store = new Store(':memory:')
  const p = store.add('/tmp', 'tmp', 'openspec')
  let out = ''
  const done = new Promise<number>((res) => {
    const m = new PtyManager(store, (ch, payload) => {
      if (ch === 'pty:data') out += (payload as { data: string }).data
      else res((payload as { exitCode: number }).exitCode)
    })
    m.start(p.id, { bin: 'sh', args: ['-c', 'echo hello-pty; exit 3'], cwd: '/tmp', display: 'sh', mode: 'pty', meta: { agent: 'claude', unitId: 'u', stage: 'apply' } })
  })
  expect(await done).toBe(3)
  expect(out).toContain('hello-pty')
  expect(store.listRuns(p.id)[0].exitCode).toBe(3)
})

test('CommandService: confirmed tokens are single-use and run exactly the previewed command', async () => {
  const store = new Store(':memory:')
  const p = store.add(root, 'fx', 'openspec')
  const svc = new CommandService(store, new PtyManager(store, () => undefined))
  const pv = await svc.preview({ kind: 'stage', projectId: p.id, unitId: 'old-one', stage: 'archive', agent: 'claude' })
  expect(pv).toMatchObject({ display: 'openspec archive old-one --yes', mode: 'exec' })
  await expect(svc.run('00000000-0000-4000-8000-000000000000')).rejects.toThrow('expired')
  const r = await svc.run(pv.token)
  expect(r.mode).toBe('exec')
  await expect(svc.run(pv.token)).rejects.toThrow('expired') // single use
  const mt = await svc.preview({ kind: 'maintenance', projectId: p.id, actionId: 'update' })
  expect(mt.display).toBe('openspec update')
})

test('CommandService init runs the real openspec init and creates the framework folder (AC-012)', async () => {
  const { mkdtempSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const dir = mkdtempSync(join(tmpdir(), 'specdeck-init-'))
  const svc = new CommandService(new Store(':memory:'), new PtyManager(new Store(':memory:'), () => undefined))
  const pv = await svc.preview({ kind: 'init', path: dir, framework: 'openspec', agents: ['claude'] })
  const r = await svc.run(pv.token)
  expect(r).toMatchObject({ mode: 'exec', ok: true })
  expect(existsSync(join(dir, 'openspec', 'config.yaml'))).toBe(true)
  rmSync(dir, { recursive: true, force: true })
})

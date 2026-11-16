import { rmSync } from 'node:fs'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { openspecAdapter as a } from '../src/main/adapters/openspec'
import { makeOpenspecRepo } from './openspec-fixture'

let root = ''
beforeAll(() => {
  root = makeOpenspecRepo()
}, 60000)
afterAll(() => rmSync(root, { recursive: true, force: true }))

test('detects openspec/ folder', async () => {
  expect((await a.detect(root)).found).toBe(true)
  expect((await a.detect('/nonexistent-dir-xyz')).found).toBe(false)
})

test('lists units with inferred stages and task progress', async () => {
  const units = await a.listUnits(root)
  const by = Object.fromEntries(units.map((u) => [u.name, u]))
  expect(by['explore-me'].stage).toBe('explore')
  expect(by['propose-me'].stage).toBe('propose')
  expect(by['apply-me'].stage).toBe('apply')
  expect(by['apply-me'].tasks).toMatchObject({ done: 1, total: 3 })
  expect(by['apply-me'].summary).toBe('Pay by SEPA.')
  expect(by['old-one']).toMatchObject({ stage: 'archive', archived: true })
  expect(by['old-one'].id).toMatch(/^\d{4}-\d{2}-\d{2}-old-one$/)
})

test('lists specs created by the real archive', async () => {
  expect(await a.listSpecs(root)).toEqual([{ id: 'auth', requirementCount: 1 }])
  const doc = await a.readSpec(root, 'auth')
  expect(doc.path).toBe('openspec/specs/auth/spec.md')
  expect(doc.requirements[0]).toMatchObject({ name: 'Login' })
  expect(doc.requirements[0].scenarios[0].steps).toEqual([
    { keyword: 'WHEN', text: 'a user logs in' },
    { keyword: 'THEN', text: 'a session exists' }
  ])
})

test('reads ADDED/MODIFIED/REMOVED/RENAMED deltas', async () => {
  const d = await a.readDeltas(root, 'apply-me')
  expect(d.map((x) => `${x.op}:${x.requirement.name}`)).toEqual([
    'ADDED:SEPA',
    'MODIFIED:Login',
    'REMOVED:Legacy',
    'RENAMED:New name'
  ])
  expect(d[3].renamedFrom).toBe('Old name')
  expect(d[0].requirement.scenarios[0].steps[0].keyword).toBe('WHEN')
})

test('deltasForSpec includes archived history', async () => {
  const d = await a.deltasForSpec(root, 'auth')
  expect(d.some((x) => x.archived && x.requirement.name === 'Login')).toBe(true)
  expect(d.some((x) => !x.archived && x.unitId === 'apply-me')).toBe(true)
})

test('search matches spec text; rejects path traversal ids', async () => {
  expect(await a.searchSpecs(root, 'session exists')).toEqual(['auth'])
  expect(await a.searchSpecs(root, 'zzz')).toEqual([])
  await expect(a.readSpec(root, '../etc')).rejects.toThrow('Invalid id')
})

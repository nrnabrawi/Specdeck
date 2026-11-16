import { expect, test } from 'vitest'
import { FRAMEWORKS } from '@shared/frameworks'
import type { Unit } from '@shared/types'
import { isReady, primaryAction } from './stage'

const u = (stage: string, done: number, total: number, archived = false): Unit => ({
  id: 'x', name: 'x', stage, summary: '', tasks: { done, total, items: [] }, archived, requirements: 0, lastModified: 0
})

test('OpenSpec: apply with all tasks done archives; otherwise the stage action', () => {
  const m = FRAMEWORKS.openspec
  expect(primaryAction(u('apply', 3, 3), m)).toEqual({ stage: 'archive', label: 'Archive' })
  expect(primaryAction(u('apply', 1, 3), m)).toEqual({ stage: 'apply', label: 'Continue apply' })
  expect(primaryAction(u('apply', 0, 3), m)?.label).toBe('Apply with agent')
  expect(primaryAction(u('explore', 0, 0), m)?.stage).toBe('explore')
  expect(primaryAction(u('apply', 3, 3, true), m)).toBeNull()
})

test('Spec Kit: no archive stage; implement and converge keep their own actions', () => {
  const m = FRAMEWORKS.speckit
  expect(primaryAction(u('implement', 2, 15), m)?.stage).toBe('implement')
  expect(primaryAction(u('converge', 15, 15), m)?.stage).toBe('converge')
  expect(isReady(u('converge', 15, 15))).toBe(true)
  expect(isReady(u('implement', 0, 0))).toBe(false)
})

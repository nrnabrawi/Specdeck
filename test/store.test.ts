import { expect, test } from 'vitest'
import { Store } from '../src/main/db'

test('projects persist, active id clears on remove', () => {
  const s = new Store(':memory:')
  const p = s.add('/x/acme', 'acme', 'openspec')
  s.setActive(p.id)
  expect(s.list()).toHaveLength(1)
  expect(s.getActive()).toBe(p.id)
  expect(s.setFramework(p.id, 'speckit').framework).toBe('speckit')
  expect(() => s.add('/x/acme', 'dup', 'openspec')).toThrow()
  s.remove(p.id)
  expect(s.list()).toEqual([])
  expect(s.getActive()).toBeNull()
})

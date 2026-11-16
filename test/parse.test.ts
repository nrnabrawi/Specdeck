import { expect, test } from 'vitest'
import { parseDeltas, parseSpec, parseTasks } from '../src/main/adapters/openspec/parse'

test('ignores requirement headers inside code fences', () => {
  const md = '## Requirements\n### Requirement: A\nText\n```\n### Requirement: Fake\n```\n'
  expect(parseSpec(md).requirements.map((r) => r.name)).toEqual(['A'])
})

test('malformed input yields empty results, not throws', () => {
  expect(parseSpec('not a spec').requirements).toEqual([])
  expect(parseDeltas('garbage', 's', 'u', false)).toEqual([])
})

test('counts tasks', () => {
  expect(parseTasks('- [x] a\n- [ ] b\n- [X] c').done).toBe(2)
})

import { expect, test } from 'vitest'
import { timeAgo } from './format'

test('timeAgo buckets', () => {
  const now = 1_000_000_000
  expect(timeAgo(now - 5_000, now)).toBe('just now')
  expect(timeAgo(now - 12 * 60_000, now)).toBe('12 min ago')
  expect(timeAgo(now - 2 * 3_600_000, now)).toBe('2 h ago')
  expect(timeAgo(now - 24 * 3_600_000, now)).toBe('Yesterday')
  expect(timeAgo(now - 3 * 86_400_000, now)).toBe('3 days ago')
})

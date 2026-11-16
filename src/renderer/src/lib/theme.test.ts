import { expect, test } from 'vitest'
import { nextTheme } from './theme'

test('nextTheme toggles light and dark', () => {
  expect(nextTheme('light')).toBe('dark')
  expect(nextTheme('dark')).toBe('light')
})

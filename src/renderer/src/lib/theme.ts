export type Theme = 'light' | 'dark'

export function nextTheme(t: Theme): Theme {
  return t === 'light' ? 'dark' : 'light'
}

export function applyTheme(t: Theme): void {
  document.documentElement.classList.toggle('dark', t === 'dark')
}

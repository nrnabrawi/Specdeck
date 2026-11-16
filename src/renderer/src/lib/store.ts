import { create } from 'zustand'
import { applyTheme, type Theme } from './theme'

function initialTheme(): Theme {
  try {
    const t = localStorage.getItem('theme')
    if (t === 'light' || t === 'dark') return t
  } catch {
    // storage unavailable: fall through
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface UI {
  theme: Theme
  setTheme: (t: Theme) => void
  onboardingSkipped: boolean
  skipOnboarding: () => void
  paletteOpen: boolean
  setPaletteOpen: (o: boolean) => void
}

export const useUI = create<UI>((set) => ({
  theme: initialTheme(),
  setTheme: (theme) => {
    applyTheme(theme)
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // ignore
    }
    set({ theme })
  },
  onboardingSkipped: false,
  skipOnboarding: () => set({ onboardingSkipped: true }),
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen })
}))

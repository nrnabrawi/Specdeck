import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { applyTheme, nextTheme, type Theme } from '@/lib/theme'

export default function App() {
  const [theme, setTheme] = useState<Theme>('light')
  const toggle = () => {
    const t = nextTheme(theme)
    applyTheme(t)
    setTheme(t)
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-2xl font-semibold">Specdeck</h1>
      <Button onClick={toggle}>{theme === 'light' ? 'Switch to dark' : 'Switch to light'}</Button>
    </main>
  )
}

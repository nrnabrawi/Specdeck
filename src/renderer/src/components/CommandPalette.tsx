import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { useUI } from '@/lib/store'
import { useActiveProject } from '@/lib/queries'

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, theme, setTheme } = useUI()
  const { projects, project } = useActiveProject()
  const nav = useNavigate()
  const qc = useQueryClient()

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(!useUI.getState().paletteOpen)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [setPaletteOpen])

  const go = (to: string) => () => {
    setPaletteOpen(false)
    nav(to)
  }
  const switchTo = (id: string) => async () => {
    await window.specdeck.invoke('active:set', { id })
    await qc.invalidateQueries({ queryKey: ['active'] })
    setPaletteOpen(false)
  }

  return (
    <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen} title="Command palette" description="Search pages and actions">
      <CommandInput placeholder="Search or run command" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Go to">
          <CommandItem onSelect={go('/')}>Dashboard</CommandItem>
          <CommandItem onSelect={go('/board')}>Board</CommandItem>
          <CommandItem onSelect={go('/specs')}>Specs</CommandItem>
          <CommandItem onSelect={go('/addons')}>Add-ons</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Projects">
          {projects
            .filter((p) => p.id !== project?.id)
            .map((p) => (
              <CommandItem key={p.id} onSelect={switchTo(p.id)}>
                Switch to {p.name}
              </CommandItem>
            ))}
          <CommandItem onSelect={go('/onboarding')}>Add project…</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Appearance">
          <CommandItem onSelect={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>Toggle light/dark</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

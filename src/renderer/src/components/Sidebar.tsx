import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Check, ChevronsUpDown, LayoutDashboard, Columns3, FileText, Moon, Sun, Plus, Plug, Activity as ActivityIcon, BarChart3 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Kbd } from '@/components/ui/kbd'
import { Button } from '@/components/ui/button'
import { FrameworkDialog } from '@/components/FrameworkDialog'
import { useUI } from '@/lib/store'
import { useActiveProject, useAgents } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { FRAMEWORKS } from '@shared/frameworks'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/board', label: 'Board', icon: Columns3 },
  { to: '/specs', label: 'Specs', icon: FileText },
  { to: '/activity', label: 'Activity', icon: ActivityIcon },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
  { to: '/addons', label: 'Add-ons', icon: Plug }
]

const initials = (n: string) => n.split(/[-_ ]/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?'

export function Sidebar() {
  const { project, projects } = useActiveProject()
  const agents = useAgents()
  const { theme, setTheme, setPaletteOpen } = useUI()
  const qc = useQueryClient()
  const nav = useNavigate()
  const [fwOpen, setFwOpen] = useState(false)
  const found = agents.data?.filter((a) => a.detected) ?? []

  const switchTo = async (id: string) => {
    await window.specdeck.invoke('active:set', { id })
    await qc.invalidateQueries({ queryKey: ['active'] })
  }
  const remove = async () => {
    if (!project || !window.confirm(`Remove ${project.name} from Specdeck? Files in the repo are not touched.`)) return
    await window.specdeck.invoke('projects:remove', { id: project.id })
    await qc.invalidateQueries()
  }

  return (
    <aside className="flex w-62 shrink-0 flex-col gap-4 border-r bg-sidebar p-3">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg border bg-card p-2 text-left">
          <span aria-hidden className="grid size-9 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            {project ? initials(project.name) : 'S'}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{project?.name ?? 'No project'}</span>
            <span className="block truncate text-xs text-muted-foreground">{project ? FRAMEWORKS[project.framework].label : 'Add one to start'}</span>
          </span>
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60" align="start">
          {projects.map((p) => (
            <DropdownMenuItem key={p.id} onSelect={() => switchTo(p.id)}>
              <span className="flex-1 truncate">{p.name}</span>
              {p.id === project?.id && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
          {projects.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem onSelect={() => nav('/onboarding')}>
            <Plus className="size-4" /> Add project…
          </DropdownMenuItem>
          {project && <DropdownMenuItem onSelect={() => setFwOpen(true)}>Change framework…</DropdownMenuItem>}
          {project && <DropdownMenuItem onSelect={remove}>Remove from Specdeck</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" className="justify-between font-normal text-muted-foreground" onClick={() => setPaletteOpen(true)}>
        Search or run command <Kbd>Ctrl K</Kbd>
      </Button>

      <nav className="flex flex-col gap-1" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent', isActive && 'bg-accent font-medium text-foreground')
            }
          >
            <Icon className="size-4" /> {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <div className="rounded-lg border bg-card p-3 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <span className={cn('size-2 rounded-full', found.length ? 'bg-success' : 'bg-muted-foreground')} />
            {found.length ? `${found[0].label} detected` : 'No agent detected'}
          </div>
          <div className="text-xs text-muted-foreground">
            {found.length > 1 ? `${found.slice(1).map((a) => a.label).join(', ')} also detected` : 'Claude Code and Codex are supported'}
          </div>
        </div>
        <Button variant="ghost" size="sm" className="justify-start" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </Button>
      </div>
      {project && <FrameworkDialog key={project.id + project.framework} project={project} open={fwOpen} onOpenChange={setFwOpen} />}
    </aside>
  )
}

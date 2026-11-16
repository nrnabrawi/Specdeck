import { useEffect } from 'react'
import { HashRouter, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CommandPalette } from '@/components/CommandPalette'
import { CommandConfirm } from '@/components/CommandConfirm'
import { Sidebar } from '@/components/Sidebar'
import { TerminalDock } from '@/components/TerminalDock'
import { useActiveProject } from '@/lib/queries'
import { useUI } from '@/lib/store'
import { applyTheme } from '@/lib/theme'
import Board from '@/pages/Board'
import Activity from '@/pages/Activity'
import Wizard from '@/pages/Wizard'
import Stats from '@/pages/Stats'
import Addons from '@/pages/Addons'
import Dashboard from '@/pages/Dashboard'
import Onboarding from '@/pages/Onboarding'
import Specs from '@/pages/Specs'

const client = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } })

function Shell() {
  const { project, loading } = useActiveProject()
  const skipped = useUI((s) => s.onboardingSkipped)
  const nav = useNavigate()
  const qc = useQueryClient()

  // AC-110: file changes in a project refresh its data.
  useEffect(() => window.specdeck.onProjectChanged((id) => void qc.invalidateQueries({ queryKey: ['p', id] })), [qc])

  if (loading) return null
  if (!project && !skipped) return <Navigate to="/onboarding" replace />
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
      <main className="min-h-0 flex-1 overflow-auto px-8 py-6">
        {project ? (
          <Outlet />
        ) : (
          <div className="grid h-full place-items-center text-center">
            <div>
              <h1 className="text-2xl font-semibold">No project yet</h1>
              <p className="mt-1 text-muted-foreground">Add a folder that uses OpenSpec or Spec Kit.</p>
              <Button className="mt-4" onClick={() => nav('/onboarding')}>
                Add project
              </Button>
            </div>
          </div>
        )}
      </main>
      <TerminalDock />
      </div>
      <CommandPalette />
    </div>
  )
}

export default function App() {
  const theme = useUI((s) => s.theme)
  useEffect(() => applyTheme(theme), [theme])
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <HashRouter>
          <Routes>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route element={<Shell />}>
              <Route index element={<Dashboard />} />
              <Route path="board" element={<Board />} />
              <Route path="specs" element={<Specs />} />
              <Route path="wizard" element={<Wizard />} />
              <Route path="activity" element={<Activity />} />
              <Route path="stats" element={<Stats />} />
              <Route path="addons" element={<Addons />} />
            </Route>
          </Routes>
        </HashRouter>
        <CommandConfirm />
        <Toaster theme={theme} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

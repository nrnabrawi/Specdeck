import { useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { PageHeader, QueryState } from '@/components/bits'
import { useActiveProject, useAgents, useFrameworkMeta, useMaintenance } from '@/lib/queries'
import { useRuns } from '@/lib/runs'

// AC-080, 081, 082.
export default function Addons() {
  const { project } = useActiveProject()
  const meta = useFrameworkMeta(project)!
  const agents = useAgents()
  const maint = useMaintenance(project?.id)
  const askToRun = useRuns((s) => s.askToRun)
  const qc = useQueryClient()
  const launchable = (agents.data ?? []).filter((a) => a.launchable)
  const others = (agents.data ?? []).filter((a) => !a.launchable)

  const toggle = async (key: 'claude' | 'codex', enabled: boolean) => {
    await window.specdeck.invoke('agents:setEnabled', { key, enabled })
    await qc.invalidateQueries({ queryKey: ['agents'] })
  }

  return (
    <>
      <PageHeader crumb={`${project!.name} / Add-ons`} title="Add-ons & agents" />
      <h2 className="text-lg font-semibold">Agents</h2>
      <p className="mb-3 text-sm text-muted-foreground">Choose which agents Specdeck can launch. The command shown is the form used for the first stage.</p>
      <Card className="gap-0 py-0">
        {launchable.map((a, i) => (
          <div key={a.key} className={`grid grid-cols-[14rem_1fr_auto_auto] items-center gap-4 p-4 ${i ? 'border-t' : ''}`}>
            <div>
              <div className="font-medium">{a.label}</div>
              <div className="font-mono text-xs text-muted-foreground">{a.version ?? `${a.key} CLI`}</div>
            </div>
            <code className="font-mono text-sm text-muted-foreground">{meta.commandExample[a.key as 'claude' | 'codex']}</code>
            <Badge variant="outline" className={a.detected ? 'text-success' : ''}>
              {a.detected ? 'Detected' : 'Not found'}
            </Badge>
            <Switch checked={a.enabled && a.detected} disabled={!a.detected} onCheckedChange={(v) => toggle(a.key as 'claude' | 'codex', v)} aria-label={`Enable ${a.label}`} />
          </div>
        ))}
        {others.map((a) => (
          <div key={a.key} className="grid grid-cols-[14rem_1fr_auto] items-center gap-4 border-t p-4">
            <div className="font-medium">{a.label}</div>
            <span className="text-sm text-muted-foreground">Detected on PATH. Launching it from Specdeck is not supported in v1.</span>
            <Badge variant="outline">Detected</Badge>
          </div>
        ))}
      </Card>

      <h2 className="mt-8 text-lg font-semibold">{meta.label}</h2>
      <QueryState q={maint}>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {meta.label} CLI
                <Badge variant="outline" className={maint.data?.cli.installed ? 'text-success' : 'text-danger'}>
                  {maint.data?.cli.installed ? 'Installed' : 'Not found'}
                </Badge>
              </CardTitle>
              <CardDescription>{maint.data?.cli.version ? `Version ${maint.data.cli.version}` : 'Install it with npm or Homebrew, then reopen this page.'}</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
                {(maint.data?.facts ?? []).map((f) => (
                  <div key={f.label} className="contents">
                    <dt className="text-muted-foreground">{f.label}</dt>
                    <dd className="font-mono">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Maintenance</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {(maint.data?.actions ?? []).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">{a.description}</p>
                  <Button
                    variant="outline"
                    onClick={() => askToRun({ kind: 'maintenance', projectId: project!.id, actionId: a.id }, a.label, undefined, () => void qc.invalidateQueries({ queryKey: ['p', project!.id, 'maintenance'] }))}
                  >
                    {a.label}
                  </Button>
                </div>
              ))}
              {maint.data?.actions.length === 0 && <p className="text-sm text-muted-foreground">No actions available.</p>}
            </CardContent>
          </Card>
        </div>
      </QueryState>
    </>
  )
}

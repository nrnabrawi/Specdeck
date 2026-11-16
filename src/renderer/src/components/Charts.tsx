import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const axis = { stroke: 'var(--muted-foreground)', fontSize: 11 }
const tip = { contentStyle: { background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--popover-foreground)' } }

export function Bars({ data, x, label }: { data: { n: number; [k: string]: string | number }[]; x: string; label: string }) {
  return (
    <div role="img" aria-label={label} className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey={x} {...axis} tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
          <YAxis {...axis} allowDecimals={false} width={28} />
          <Tooltip {...tip} cursor={{ fill: 'var(--muted)' }} formatter={(v) => [v, 'Tasks']} />
          <Bar dataKey="n" fill="var(--info)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function Cycle({ points }: { points: { ts: number; hours: number; unitId: string }[] }) {
  const data = points.map((p) => ({ ...p, day: new Date(p.ts).toISOString().slice(0, 10) }))
  return (
    <div role="img" aria-label="Cycle time per completed unit, hours" className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="day" {...axis} tickFormatter={(v: string) => v.slice(5)} />
          <YAxis {...axis} width={52} tickFormatter={(v: number) => `${+v.toFixed(2)}h`} />
          <Tooltip {...tip} formatter={(v) => [`${Number(v).toFixed(1)} h`, 'Cycle time']} labelFormatter={(_, p) => p[0]?.payload.unitId ?? ''} />
          <Line dataKey="hours" stroke="var(--info)" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

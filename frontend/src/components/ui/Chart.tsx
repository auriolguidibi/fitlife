import {
  Area,
  AreaChart,
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  Line,
  LineChart as RLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const axisStyle = { fontSize: 11, fill: 'rgba(255,255,255,0.4)' }

const tooltipStyle = {
  background: '#0B1711',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  fontSize: 12,
  color: '#fff',
}

interface Point {
  label: string
  [key: string]: number | string
}

export function LineChart({
  data,
  dataKey,
  color = '#22C55E',
  unit,
  height = 200,
}: {
  data: Point[]
  dataKey: string
  color?: string
  unit?: string
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RLineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number) => [`${v}${unit ?? ''}`, '']}
          labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={3}
          dot={{ r: 3, fill: color }}
          activeDot={{ r: 5 }}
        />
      </RLineChart>
    </ResponsiveContainer>
  )
}

export function AreaChartCard({
  data,
  dataKey,
  color = '#22C55E',
  unit,
  height = 200,
}: {
  data: Point[]
  dataKey: string
  color?: string
  unit?: string
  height?: number
}) {
  const id = `grad-${dataKey}`
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number) => [`${v}${unit ?? ''}`, '']}
          labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
        />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} fill={`url(#${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function BarChart({
  data,
  dataKey,
  color = '#22C55E',
  unit,
  height = 200,
}: {
  data: Point[]
  dataKey: string
  color?: string
  unit?: string
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number) => [`${v}${unit ?? ''}`, '']}
          labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
        />
        <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} maxBarSize={36} />
      </RBarChart>
    </ResponsiveContainer>
  )
}

export function MiniSparkline({ data, dataKey, color = '#22C55E' }: { data: Point[]; dataKey: string; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={48}>
      <RLineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
      </RLineChart>
    </ResponsiveContainer>
  )
}

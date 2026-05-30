import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SensorData, SensorKey } from '@/types/sensor'
import { SENSOR_META } from '@/types/sensor'

interface SensorChartProps {
  data: SensorData[]
  sensorKeys: SensorKey[]
  title?: string
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4', '#f97316']

export function SensorChart({ data, sensorKeys, title = '센서 추이' }: SensorChartProps) {
  const chartData = data.map((d) => ({
    time: new Date(d.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    ...Object.fromEntries(sensorKeys.map((k) => [k, d[k]])),
  }))

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%" minHeight={260}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
              tickLine={false}
              axisLine={false}
            />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              labelStyle={{ fontWeight: 600 }}
            />
            {sensorKeys.length > 1 && <Legend iconType="circle" iconSize={8} />}
            {sensorKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={`${SENSOR_META[key].label}(${SENSOR_META[key].unit})`}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

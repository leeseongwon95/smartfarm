import { useState } from 'react'
import { useSensorTimeSeries } from '@/hooks/useSensorData'
import { SensorChart } from '@/components/dashboard/SensorChart'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ZONES, SENSOR_META } from '@/types/sensor'
import type { SensorKey } from '@/types/sensor'

const SENSOR_KEYS: SensorKey[] = ['temperature', 'humidity', 'co2', 'light', 'soilMoisture', 'ec', 'ph']

export function History() {
  const [zone, setZone] = useState<string>(ZONES[0])
  const [sensorKey, setSensorKey] = useState<SensorKey>('temperature')
  const { data } = useSensorTimeSeries(zone)

  const tableData = data ? [...data].reverse().slice(0, 48) : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">히스토리</h1>
        <div className="flex gap-2">
          <Select value={zone} onChange={(e) => setZone(e.target.value)} className="w-32">
            {ZONES.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </Select>
          <Select value={sensorKey} onChange={(e) => setSensorKey(e.target.value as SensorKey)} className="w-36">
            {SENSOR_KEYS.map((k) => (
              <option key={k} value={k}>{SENSOR_META[k].label}</option>
            ))}
          </Select>
        </div>
      </div>

      <SensorChart
        data={data ?? []}
        sensorKeys={[sensorKey]}
        title={`${SENSOR_META[sensorKey].label} 추이 — ${zone} (최근 24시간)`}
      />

      {/* 데이터 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">데이터 로그</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">시각</th>
                  <th className="pb-2 pr-4 font-medium">온도(°C)</th>
                  <th className="pb-2 pr-4 font-medium">습도(%)</th>
                  <th className="pb-2 pr-4 font-medium">CO₂(ppm)</th>
                  <th className="pb-2 pr-4 font-medium">토양수분(%)</th>
                  <th className="pb-2 pr-4 font-medium">EC(mS/cm)</th>
                  <th className="pb-2 font-medium">pH</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                      {new Date(row.timestamp).toLocaleString('ko-KR', {
                        month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2 pr-4 tabular-nums">{row.temperature.toFixed(1)}</td>
                    <td className="py-2 pr-4 tabular-nums">{row.humidity.toFixed(1)}</td>
                    <td className="py-2 pr-4 tabular-nums">{row.co2.toFixed(0)}</td>
                    <td className="py-2 pr-4 tabular-nums">{row.soilMoisture.toFixed(1)}</td>
                    <td className="py-2 pr-4 tabular-nums">{row.ec.toFixed(2)}</td>
                    <td className="py-2 tabular-nums">{row.ph.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import { useState } from 'react'
import { useSensorLatest, useSensorTimeSeries, useAlerts, useThresholds } from '@/hooks/useSensorData'
import { useSensorSimulator } from '@/hooks/useSensorSimulator'
import { SensorCard } from '@/components/dashboard/SensorCard'
import { SensorChart } from '@/components/dashboard/SensorChart'
import { AlertList } from '@/components/dashboard/AlertList'
import { Select } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ZONES, SENSOR_META } from '@/types/sensor'
import type { SensorKey, SensorData, AlertLevel, ThresholdConfig } from '@/types/sensor'

const SENSOR_KEYS_THRESHOLD: SensorKey[] = ['temperature', 'humidity', 'co2', 'light', 'soilMoisture', 'ec', 'ph']

function getZoneWorstLevel(data: SensorData, thresholds: ThresholdConfig): AlertLevel {
  let worst: AlertLevel = 'normal'
  for (const key of SENSOR_KEYS_THRESHOLD) {
    const t = thresholds[key]
    const v = data[key] as number
    if (v < t.min || v > t.max) return 'danger'
    if (v < t.warningMin || v > t.warningMax) worst = 'warning'
  }
  return worst
}

const zoneLevelStyle: Record<AlertLevel, { badge: 'normal' | 'warning' | 'danger'; label: string; ring: string }> = {
  normal:  { badge: 'normal',  label: '정상', ring: '' },
  warning: { badge: 'warning', label: '경고', ring: 'ring-1 ring-amber-300' },
  danger:  { badge: 'danger',  label: '위험', ring: 'ring-1 ring-red-400'   },
}

const SENSOR_KEYS: SensorKey[] = ['temperature', 'humidity', 'co2', 'light', 'soilMoisture', 'ec', 'ph']

export function Dashboard() {
  const [selectedZone, setSelectedZone] = useState<string>(ZONES[0])
  useSensorSimulator()
  const { data: latestAll } = useSensorLatest()
  const { data: timeSeries } = useSensorTimeSeries(selectedZone)
  const { data: alerts } = useAlerts()
  const { data: thresholds } = useThresholds()

  const latestForZone = latestAll?.find((d) => d.zone === selectedZone)

  const lastUpdated = latestForZone
    ? new Date(latestForZone.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '-'

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">스마트팜 대시보드</h1>
          <p className="text-sm text-muted-foreground mt-0.5">마지막 업데이트: {lastUpdated}</p>
        </div>
        <Select
          value={selectedZone}
          onChange={(e) => setSelectedZone(e.target.value)}
          className="w-40"
        >
          {ZONES.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </Select>
      </div>

      {/* 센서 카드 그리드 */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">현재 센서 값 — {selectedZone}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
          {SENSOR_KEYS.map((key) => (
            <SensorCard
              key={key}
              sensorKey={key}
              value={latestForZone?.[key] as number ?? 0}
              zone={selectedZone}
              thresholds={thresholds}
            />
          ))}
        </div>
      </section>

      {/* 차트 및 알람 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 flex flex-col min-h-[420px]">
          <Tabs defaultValue="temp-hum" className="flex flex-col flex-1">
            <TabsList className="mb-1 shrink-0">
              <TabsTrigger value="temp-hum">온도 / 습도</TabsTrigger>
              <TabsTrigger value="co2-light">CO₂ / 조도</TabsTrigger>
              <TabsTrigger value="soil-ec-ph">토양 / EC / pH</TabsTrigger>
            </TabsList>
            <TabsContent value="temp-hum" className="flex-1">
              <SensorChart
                data={timeSeries ?? []}
                sensorKeys={['temperature', 'humidity']}
                title={`온도 · 습도 추이 — ${selectedZone}`}
              />
            </TabsContent>
            <TabsContent value="co2-light" className="flex-1">
              <SensorChart
                data={timeSeries ?? []}
                sensorKeys={['co2', 'light']}
                title={`CO₂ · 조도 추이 — ${selectedZone}`}
              />
            </TabsContent>
            <TabsContent value="soil-ec-ph" className="flex-1">
              <SensorChart
                data={timeSeries ?? []}
                sensorKeys={['soilMoisture', 'ec', 'ph']}
                title={`토양수분 · EC · pH 추이 — ${selectedZone}`}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex flex-col">
          <AlertList alerts={alerts ?? []} />
        </div>
      </div>

      {/* 구역별 요약 */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">구역별 현황</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ZONES.map((zone) => {
            const data = latestAll?.find((d) => d.zone === zone)
            const level = data && thresholds ? getZoneWorstLevel(data, thresholds) : 'normal'
            const ls = zoneLevelStyle[level]
            return (
              <div
                key={zone}
                onClick={() => setSelectedZone(zone)}
                className={`cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md ${ls.ring} ${
                  selectedZone === zone ? 'border-primary bg-accent ring-1 ring-primary' : 'bg-card'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-sm">{zone}</p>
                  <Badge variant={ls.badge}>{ls.label}</Badge>
                </div>
                {data ? (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {(['temperature', 'humidity', 'co2', 'soilMoisture'] as SensorKey[]).map((key) => (
                      <div key={key} className="flex items-baseline gap-1">
                        <span className="text-xs text-muted-foreground">{SENSOR_META[key].label}</span>
                        <span className="text-sm font-semibold tabular-nums">
                          {(data[key] as number).toFixed(key === 'co2' ? 0 : 1)}
                        </span>
                        <span className="text-xs text-muted-foreground">{SENSOR_META[key].unit}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">데이터 없음</p>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

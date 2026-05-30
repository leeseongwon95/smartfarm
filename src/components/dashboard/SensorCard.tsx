import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AlertLevel, SensorKey } from '@/types/sensor'
import { SENSOR_META } from '@/types/sensor'
import type { ThresholdConfig } from '@/types/sensor'

interface SensorCardProps {
  sensorKey: SensorKey
  value: number
  zone: string
  thresholds?: ThresholdConfig
}

function getAlertLevel(key: SensorKey, value: number, thresholds?: ThresholdConfig): AlertLevel {
  if (!thresholds) return 'normal'
  const t = thresholds[key]
  if (!t.enabled) return 'normal'
  if (value < t.min || value > t.max) return 'danger'
  if (value < t.warningMin || value > t.warningMax) return 'warning'
  return 'normal'
}

const levelConfig: Record<
  AlertLevel,
  { badgeVariant: 'normal' | 'warning' | 'danger'; label: string; cardBg: string; topBar: string; valueColor: string }
> = {
  normal:  { badgeVariant: 'normal',  label: '정상', cardBg: 'bg-card',           topBar: 'bg-emerald-400', valueColor: 'text-emerald-700' },
  warning: { badgeVariant: 'warning', label: '경고', cardBg: 'bg-amber-50',        topBar: 'bg-amber-400',   valueColor: 'text-amber-700'   },
  danger:  { badgeVariant: 'danger',  label: '위험', cardBg: 'bg-red-50',          topBar: 'bg-red-500',     valueColor: 'text-red-700'     },
}

export function SensorCard({ sensorKey, value, thresholds }: SensorCardProps) {
  const meta = SENSOR_META[sensorKey]
  const level = getAlertLevel(sensorKey, value, thresholds)
  const config = levelConfig[level]

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md h-28 flex flex-col ${config.cardBg}`}>
      {/* 상단 상태 바 */}
      <div className={`h-1.5 w-full shrink-0 ${config.topBar}`} />
      <div className="flex flex-col justify-between flex-1 px-3 pt-2 pb-3">
        {/* 레이블 + 배지 */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <span>{meta.icon}</span>
            {meta.label}
          </span>
          <Badge variant={config.badgeVariant} className="text-[10px] px-1.5 py-0">{config.label}</Badge>
        </div>
        {/* 숫자 + 단위 */}
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-black tabular-nums tracking-tight leading-none ${config.valueColor}`}>
            {typeof value === 'number' ? value.toFixed(sensorKey === 'co2' || sensorKey === 'light' ? 0 : 1) : '-'}
          </span>
          <span className="text-xs font-semibold text-muted-foreground">{meta.unit}</span>
        </div>
      </div>
    </Card>
  )
}

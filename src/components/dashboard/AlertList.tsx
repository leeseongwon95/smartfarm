import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useResetAlerts } from '@/hooks/useSensorData'
import type { Alert, AlertLevel } from '@/types/sensor'

interface AlertListProps {
  alerts: Alert[]
}

const levelMap: Record<
  AlertLevel,
  { variant: 'warning' | 'danger' | 'normal'; label: string; bg: string; bar: string }
> = {
  normal:  { variant: 'normal',  label: '정상', bg: 'bg-emerald-50', bar: 'bg-emerald-400' },
  warning: { variant: 'warning', label: '경고', bg: 'bg-amber-50',   bar: 'bg-amber-400'   },
  danger:  { variant: 'danger',  label: '위험', bg: 'bg-red-50',     bar: 'bg-red-500'     },
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

export function AlertList({ alerts }: AlertListProps) {
  const resetAlerts = useResetAlerts()

  return (
    <Card className="flex flex-col flex-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            🔔 알람 현황
            {alerts.filter((a) => a.level === 'danger').length > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                위험 {alerts.filter((a) => a.level === 'danger').length}
              </span>
            )}
          </CardTitle>
          {alerts.length > 0 && (
            <Button
              variant="outline"
              className="h-7 text-xs px-2 text-muted-foreground"
              disabled={resetAlerts.isPending}
              onClick={() => resetAlerts.mutate()}
            >
              {resetAlerts.isPending ? '처리 중' : '전체 해제'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-hidden">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">모든 센서가 정상입니다.</p>
        ) : (
          <ul className="space-y-3 h-full max-h-[460px] overflow-y-auto pr-1">
            {alerts.map((alert) => {
              const lm = levelMap[alert.level]
              return (
                <li
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 rounded-lg overflow-hidden relative ${lm.bg}`}
                >
                  {/* 좌측 상태 바 */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${lm.bar}`} />
                  <div className="pl-2 flex items-start gap-3 w-full">
                    <Badge variant={lm.variant} className="mt-0.5 shrink-0">
                      {lm.label}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-snug">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {alert.zone} · {timeAgo(alert.timestamp)}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

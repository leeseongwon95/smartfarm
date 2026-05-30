import { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useThresholds, useSaveThresholds } from '@/hooks/useSensorData'
import { showToast } from '@/components/ui/toast'
import { supabase } from '@/lib/supabase'
import { SENSOR_META, ZONES } from '@/types/sensor'
import type { SensorKey, SensorThreshold, ThresholdConfig } from '@/types/sensor'
import { Badge } from '@/components/ui/badge'
import { useQueryClient } from '@tanstack/react-query'

const SENSOR_KEYS: SensorKey[] = ['temperature', 'humidity', 'co2', 'light', 'soilMoisture', 'ec', 'ph']

const SENSOR_LABEL: Record<string, string> = {
  temperature: '온도', humidity: '습도', co2: 'CO₂',
  light: '조도', soilMoisture: '토양수분', ec: 'EC', ph: 'pH',
}

// 슬라이더 범위 정의
const SLIDER_RANGE: Record<SensorKey, { min: number; max: number; step: number }> = {
  temperature:  { min: 0,   max: 60,     step: 0.5 },
  humidity:     { min: 0,   max: 100,    step: 1   },
  co2:          { min: 0,   max: 2000,   step: 10  },
  light:        { min: 0,   max: 120000, step: 1000},
  soilMoisture: { min: 0,   max: 100,    step: 1   },
  ec:           { min: 0,   max: 5,      step: 0.1 },
  ph:           { min: 0,   max: 14,     step: 0.1 },
}

async function reEvaluateAlerts(config: ThresholdConfig) {
  await supabase.from('alerts').update({ resolved: true }).eq('resolved', false)

  const zones = ['A구역', 'B구역', 'C구역', 'D구역']
  const latestRows = await Promise.all(
    zones.map((zone) =>
      supabase.from('sensor_logs').select('*').eq('zone', zone)
        .order('timestamp', { ascending: false }).limit(1).single()
    )
  )

  const now = new Date().toISOString()
  const checkKeys: SensorKey[] = ['temperature', 'humidity', 'co2', 'soilMoisture', 'ec', 'ph']
  const newAlerts: { zone: string; sensor_type: string; level: string; message: string; timestamp: string }[] = []

  for (const result of latestRows) {
    if (!result.data) continue
    const r = result.data as Record<string, unknown>
    const zone = r.zone as string

    for (const key of checkKeys) {
      const t = config[key]
      if (!t.enabled) continue

      const val = Number(key === 'soilMoisture' ? r.soil_moisture : r[key])

      let level: string | null = null
      if (val < t.min || val > t.max) level = 'danger'
      else if (val < t.warningMin || val > t.warningMax) level = 'warning'

      if (level) {
        newAlerts.push({
          zone, sensor_type: key, level,
          message: `${zone} ${SENSOR_LABEL[key]} ${level === 'danger' ? '위험 수준' : '경고 범위'} (${val})`,
          timestamp: now,
        })
      }
    }
  }

  if (newAlerts.length > 0) await supabase.from('alerts').insert(newAlerts)
}

// 토글 스위치
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
        checked ? 'bg-primary' : 'bg-muted-foreground/30'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

type RawFields = Record<'min' | 'warningMin' | 'warningMax' | 'max', string>
type AllRaw = Record<SensorKey, RawFields>

function toRaw(t: SensorThreshold): RawFields {
  return { min: String(t.min), warningMin: String(t.warningMin), warningMax: String(t.warningMax), max: String(t.max) }
}
function configToAllRaw(c: ThresholdConfig): AllRaw {
  return Object.fromEntries(
    (Object.keys(c) as SensorKey[]).map((k) => [k, toRaw(c[k])])
  ) as AllRaw
}

const HANDLES = [
  { field: 'min'        as const, label: '위험 하한', sublabel: '이하 위험', dotColor: 'bg-red-500',   lineColor: 'border-red-400'   },
  { field: 'warningMin' as const, label: '경고 하한', sublabel: '이하 경고', dotColor: 'bg-amber-400', lineColor: 'border-amber-400' },
  { field: 'warningMax' as const, label: '경고 상한', sublabel: '초과 경고', dotColor: 'bg-amber-400', lineColor: 'border-amber-400' },
  { field: 'max'        as const, label: '위험 상한', sublabel: '초과 위험', dotColor: 'bg-red-500',   lineColor: 'border-red-400'   },
]

function ThresholdSlider({
  sensorKey,
  threshold,
  raw,
  onCommit,
  onRawChange,
  onBlur,
}: {
  sensorKey: SensorKey
  threshold: SensorThreshold
  raw: RawFields
  onCommit: (field: keyof RawFields, val: number) => void
  onRawChange: (field: keyof RawFields, val: string) => void
  onBlur: (field: keyof RawFields) => void
}) {
  const range = SLIDER_RANGE[sensorKey]
  const meta = SENSOR_META[sensorKey]
  const disabled = !threshold.enabled
  const trackRef = useRef<HTMLDivElement>(null)

  const pct = (v: number) =>
    Math.min(100, Math.max(0, ((v - range.min) / (range.max - range.min)) * 100))

  const pctToVal = (p: number) => {
    const raw = range.min + (p / 100) * (range.max - range.min)
    return Math.round(raw / range.step) * range.step
  }

  function startDrag(field: keyof RawFields, e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const track = trackRef.current
    if (!track) return

    function move(clientX: number) {
      const rect = track!.getBoundingClientRect()
      const p = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
      onCommit(field, pctToVal(p))
    }

    function onMouseMove(ev: MouseEvent) { move(ev.clientX) }
    function onTouchMove(ev: TouchEvent) { move(ev.touches[0].clientX) }
    function cleanup() {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', cleanup)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', cleanup)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', cleanup)
    window.addEventListener('touchmove', onTouchMove)
    window.addEventListener('touchend', cleanup)
  }

  const segments = [
    { from: 0,                        to: pct(threshold.min),        bg: 'bg-red-400'     },
    { from: pct(threshold.min),       to: pct(threshold.warningMin), bg: 'bg-amber-300'   },
    { from: pct(threshold.warningMin),to: pct(threshold.warningMax), bg: 'bg-emerald-300' },
    { from: pct(threshold.warningMax),to: pct(threshold.max),        bg: 'bg-amber-300'   },
    { from: pct(threshold.max),       to: 100,                       bg: 'bg-red-400'     },
  ]

  return (
    <div className={disabled ? 'opacity-40 pointer-events-none select-none' : ''}>
      <div className="flex justify-between text-[11px] font-medium mb-1 px-0.5">
        <span className="text-red-500">위험</span>
        <span className="text-amber-500">경고</span>
        <span className="text-emerald-600">정상</span>
        <span className="text-amber-500">경고</span>
        <span className="text-red-500">위험</span>
      </div>

      {/* 색상 트랙 + 드래그 핸들 */}
      <div ref={trackRef} className="relative h-5 mb-8 cursor-pointer">
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-3 rounded-full overflow-hidden flex">
          {segments.map((s, i) => (
            <div key={i} className={s.bg} style={{ width: `${Math.max(0, s.to - s.from)}%` }} />
          ))}
        </div>
        {HANDLES.map(({ field, dotColor }) => (
          <div
            key={field}
            onMouseDown={(e) => startDrag(field, e)}
            onTouchStart={(e) => startDrag(field, e)}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md cursor-grab active:cursor-grabbing ${dotColor}`}
            style={{ left: `${pct(threshold[field] as number)}%`, zIndex: 20 }}
          />
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {HANDLES.map(({ field, label, sublabel, dotColor, lineColor }) => (
          <div key={field} className={`rounded-lg border-2 ${lineColor} bg-background p-2 flex flex-col gap-1`}>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
              <span className="text-[11px] font-semibold text-foreground">{label}</span>
            </div>
            <input
              type="number"
              value={raw[field]}
              step={range.step}
              onChange={(e) => onRawChange(field, e.target.value)}
              onBlur={() => onBlur(field)}
              className="w-full text-sm font-bold tabular-nums bg-transparent outline-none border-b border-muted pb-0.5"
            />
            <span className="text-[10px] text-muted-foreground">{sublabel} · {meta.unit}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Settings() {
  const { data: savedThresholds } = useThresholds()
  const [config, setConfig] = useState<ThresholdConfig | null>(null)
  const [allRaw, setAllRaw] = useState<AllRaw | null>(null)
  const saveThresholds = useSaveThresholds()
  const queryClient = useQueryClient()

  // savedThresholds 로드되면 초기화 (한 번만)
  const effectiveConfig = config ?? savedThresholds
  const effectiveRaw = allRaw ?? (savedThresholds ? configToAllRaw(savedThresholds) : null)

  function updateConfig(key: SensorKey, t: SensorThreshold) {
    setConfig((prev) => ({ ...(prev ?? savedThresholds!), [key]: t }))
  }

  function handleToggle(key: SensorKey, enabled: boolean) {
    if (!effectiveConfig) return
    const updated = { ...effectiveConfig[key], enabled }
    updateConfig(key, updated)
    // raw는 숫자값만 관리 — enabled 바뀌어도 raw 유지
  }

  function handleCommit(key: SensorKey, field: keyof RawFields, val: number) {
    if (!effectiveConfig) return
    const prev = effectiveConfig[key]
    const next = { ...prev, [field]: val }
    if (field === 'min')        next.warningMin = Math.max(val, next.warningMin)
    if (field === 'warningMin') { next.min = Math.min(val, next.min); next.warningMax = Math.max(val, next.warningMax) }
    if (field === 'warningMax') { next.max = Math.max(val, next.max); next.warningMin = Math.min(val, next.warningMin) }
    if (field === 'max')        next.warningMax = Math.min(val, next.warningMax)
    updateConfig(key, next)
    setAllRaw((r) => ({ ...(r ?? configToAllRaw(savedThresholds!)), [key]: toRaw(next) }))
  }

  function handleRawChange(key: SensorKey, field: keyof RawFields, val: string) {
    setAllRaw((r) => ({
      ...(r ?? configToAllRaw(savedThresholds!)),
      [key]: { ...(r ?? configToAllRaw(savedThresholds!))[key], [field]: val },
    }))
    const parsed = parseFloat(val)
    if (val !== '' && !isNaN(parsed)) handleCommit(key, field, parsed)
  }

  function handleBlur(key: SensorKey, field: keyof RawFields) {
    if (!effectiveRaw) return
    const raw = effectiveRaw[key]
    const range = SLIDER_RANGE[key]
    const parsed = parseFloat(raw[field])
    const fallback = field === 'max' || field === 'warningMax' ? range.max : range.min
    const final = isNaN(parsed) || raw[field] === '' ? fallback : parsed
    handleCommit(key, field, final)
  }

  const [savingKeys, setSavingKeys] = useState<Set<SensorKey>>(new Set())
  const [savingAll, setSavingAll] = useState(false)

  const saveOne = useCallback(async (key: SensorKey) => {
    if (!effectiveConfig || !savedThresholds) return
    setSavingKeys((s) => new Set(s).add(key))
    try {
      const partial = { ...savedThresholds, [key]: effectiveConfig[key] }
      await saveThresholds.mutateAsync(partial)
      await reEvaluateAlerts(partial)
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      showToast(`${SENSOR_META[key].label} 저장됨`)
    } catch {
      showToast(`${SENSOR_META[key].label} 저장 실패`, 'error')
    } finally {
      setSavingKeys((s) => { const n = new Set(s); n.delete(key); return n })
    }
  }, [effectiveConfig, savedThresholds, saveThresholds, queryClient])

  async function handleSaveAll() {
    if (!effectiveConfig) return
    setSavingAll(true)
    try {
      await saveThresholds.mutateAsync(effectiveConfig)
      await reEvaluateAlerts(effectiveConfig)
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['sensor'] })
      showToast('전체 임계값 저장됨')
    } catch {
      showToast('저장 실패', 'error')
    } finally {
      setSavingAll(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 상단 고정 전체 저장 바 */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-b flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">설정</h1>
          <p className="text-xs text-muted-foreground">센서별 저장 또는 전체 일괄 저장</p>
        </div>
        <Button onClick={handleSaveAll} disabled={savingAll}>
          {savingAll ? '저장 중...' : '전체 저장'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>센서 임계값 설정</CardTitle>
          <CardDescription>슬라이더로 경고/위험 범위를 조정하고 센서별로 바로 저장할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {effectiveConfig && effectiveRaw && SENSOR_KEYS.map((key) => {
            const meta = SENSOR_META[key]
            const t = effectiveConfig[key]
            const saving = savingKeys.has(key)
            return (
              <div key={key} className="pb-6 border-b last:border-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{meta.icon}</span>
                    <span className="font-semibold text-sm">{meta.label}</span>
                    {meta.unit && <span className="text-xs text-muted-foreground">({meta.unit})</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t.enabled ? '알람 활성' : '알람 꺼짐'}</span>
                      <Toggle checked={t.enabled} onChange={(v) => handleToggle(key, v)} />
                    </div>
                    <Button
                      variant="outline"
                      className="h-7 text-xs px-3"
                      disabled={saving}
                      onClick={() => saveOne(key)}
                    >
                      {saving ? '저장 중...' : '저장'}
                    </Button>
                  </div>
                </div>
                <ThresholdSlider
                  sensorKey={key}
                  threshold={t}
                  raw={effectiveRaw[key]}
                  onCommit={(field, val) => handleCommit(key, field, val)}
                  onRawChange={(field, val) => handleRawChange(key, field, val)}
                  onBlur={(field) => handleBlur(key, field)}
                />
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>구역 관리</CardTitle>
          <CardDescription>현재 등록된 구역 목록입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {ZONES.map((zone) => (
              <li key={zone} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="font-medium">{zone}</span>
                <Badge variant="normal">활성</Badge>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-4">구역 추가/삭제는 PLC 연동 후 지원 예정입니다.</p>
        </CardContent>
      </Card>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import type { SensorData } from '@/types/sensor'
import { ZONES } from '@/types/sensor'

const DRIFT: Record<string, number> = {
  temperature:  0.3,
  humidity:     1.0,
  co2:          15,
  light:        200,
  soilMoisture: 0.5,
  ec:           0.05,
  ph:           0.05,
}

const BOUNDS: Record<string, [number, number]> = {
  temperature:  [0,  60],
  humidity:     [0,  100],
  co2:          [300, 2000],
  light:        [0,  120000],
  soilMoisture: [0,  100],
  ec:           [0,  5],
  ph:           [4,  9],
}

const DECIMAL: Record<string, number> = {
  temperature:  1,
  humidity:     1,
  co2:          0,
  light:        0,
  soilMoisture: 1,
  ec:           2,
  ph:           2,
}

function driftValue(key: string, prev: number): number {
  const d = DRIFT[key] ?? 0
  const [lo, hi] = BOUNDS[key] ?? [0, 9999]
  const next = prev + (Math.random() * 2 - 1) * d
  const dec = DECIMAL[key] ?? 1
  return parseFloat(Math.min(hi, Math.max(lo, next)).toFixed(dec))
}

function driftRow(row: SensorData): SensorData {
  return {
    ...row,
    timestamp: new Date().toISOString(),
    temperature:  driftValue('temperature',  row.temperature),
    humidity:     driftValue('humidity',     row.humidity),
    co2:          driftValue('co2',          row.co2),
    light:        driftValue('light',        row.light),
    soilMoisture: driftValue('soilMoisture', row.soilMoisture),
    ec:           driftValue('ec',           row.ec),
    ph:           driftValue('ph',           row.ph),
  }
}

export function useLiveSensor(baseData: SensorData[] | undefined): SensorData[] {
  const [live, setLive] = useState<SensorData[]>([])
  const liveRef = useRef<SensorData[]>([])

  // baseData(DB 최신값)가 바뀌면 live 초기화
  useEffect(() => {
    if (!baseData?.length) return
    // 빠진 구역은 기존 live값 유지
    const merged = ZONES.map((zone) => {
      const fresh = baseData.find((d) => d.zone === zone)
      const current = liveRef.current.find((d) => d.zone === zone)
      return fresh ?? current
    }).filter(Boolean) as SensorData[]
    liveRef.current = merged
    setLive(merged)
  }, [baseData])

  // 5초마다 소폭 변동
  useEffect(() => {
    const id = setInterval(() => {
      if (!liveRef.current.length) return
      const next = liveRef.current.map(driftRow)
      liveRef.current = next
      setLive([...next])
    }, 5000)
    return () => clearInterval(id)
  }, [])

  return live
}

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { defaultThresholds } from '@/mocks/sensorData'
import { ZONES } from '@/types/sensor'
import type { ThresholdConfig } from '@/types/sensor'

const INTERVAL_MS = 30_000

const SENSOR_LABEL: Record<string, string> = {
  temperature: '온도', humidity: '습도', co2: 'CO₂',
  soilMoisture: '토양수분', ec: 'EC', ph: 'pH',
}

function rand(min: number, max: number, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

function generateReading(zone: string) {
  return {
    zone,
    timestamp: new Date().toISOString(),
    temperature:   rand(18, 35),
    humidity:      rand(45, 95),
    co2:           rand(350, 1400, 0),
    light:         rand(3000, 90000, 0),
    soil_moisture: rand(25, 85),
    ec:            rand(0.8, 4.0),
    ph:            rand(5.0, 8.0),
  }
}

async function fetchThresholds(): Promise<ThresholdConfig> {
  const { data, error } = await supabase.from('thresholds').select('*')
  if (error || !data?.length) return defaultThresholds
  const config: Partial<ThresholdConfig> = {}
  for (const row of data) {
    const key = row.sensor_key as keyof ThresholdConfig
    config[key] = {
      min: Number(row.min_val),
      max: Number(row.max_val),
      warningMin: Number(row.warning_min),
      warningMax: Number(row.warning_max),
      enabled: row.enabled !== false,
    }
  }
  return { ...defaultThresholds, ...config }
}

async function getLastInsertedAt(): Promise<Date | null> {
  const { data } = await supabase
    .from('sensor_logs')
    .select('timestamp')
    .order('timestamp', { ascending: false })
    .limit(1)
    .single()
  return data ? new Date(data.timestamp as string) : null
}

async function insertReadingsAndAlerts() {
  const [readings, thresholds] = await Promise.all([
    Promise.resolve(ZONES.map((zone) => generateReading(zone))),
    fetchThresholds(),
  ])

  const { error } = await supabase.from('sensor_logs').insert(readings)
  if (error) { console.error('sensor insert error', error); return }

  const now = new Date().toISOString()
  const newAlerts: { zone: string; sensor_type: string; level: string; message: string; timestamp: string }[] = []

  for (const r of readings) {
    const checks: [string, number, typeof thresholds.temperature][] = [
      ['temperature',  r.temperature,   thresholds.temperature],
      ['humidity',     r.humidity,      thresholds.humidity],
      ['co2',          r.co2,           thresholds.co2],
      ['soilMoisture', r.soil_moisture, thresholds.soilMoisture],
      ['ec',           r.ec,            thresholds.ec],
      ['ph',           r.ph,            thresholds.ph],
    ]
    for (const [key, val, th] of checks) {
      if (th.enabled === false) continue
      let level: string | null = null
      if (val < th.min || val > th.max) level = 'danger'
      else if (val < th.warningMin || val > th.warningMax) level = 'warning'

      if (level) {
        newAlerts.push({
          zone: r.zone, sensor_type: key, level,
          message: `${r.zone} ${SENSOR_LABEL[key] ?? key} ${level === 'danger' ? '위험 수준' : '경고 범위'} (${val})`,
          timestamp: now,
        })
      }
    }
  }

  if (newAlerts.length > 0) {
    await supabase.from('alerts').insert(newAlerts)
  }
}

export function useSensorSimulator() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const run = async () => {
      const last = await getLastInsertedAt()
      const elapsed = last ? Date.now() - last.getTime() : Infinity
      if (elapsed >= INTERVAL_MS * 0.8) {
        await insertReadingsAndAlerts()
        queryClient.invalidateQueries({ queryKey: ['sensor'] })
        queryClient.invalidateQueries({ queryKey: ['alerts'] })
      }
    }

    run()

    const id = setInterval(async () => {
      await insertReadingsAndAlerts()
      queryClient.invalidateQueries({ queryKey: ['sensor'] })
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    }, INTERVAL_MS)

    return () => clearInterval(id)
  }, [queryClient])
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { defaultThresholds } from '@/mocks/sensorData'
import type { SensorData, Alert, ThresholdConfig } from '@/types/sensor'

// ---------- sensor_logs → SensorData 변환 ----------
function rowToSensorData(row: Record<string, unknown>): SensorData {
  return {
    id: row.id as string,
    zone: row.zone as string,
    timestamp: row.timestamp as string,
    temperature: Number(row.temperature),
    humidity: Number(row.humidity),
    co2: Number(row.co2),
    light: Number(row.light),
    soilMoisture: Number(row.soil_moisture),
    ec: Number(row.ec),
    ph: Number(row.ph),
  }
}

// ---------- 시계열 (최근 24시간) ----------
export const useSensorTimeSeries = (zone: string) =>
  useQuery<SensorData[]>({
    queryKey: ['sensor', 'timeseries', zone],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from('sensor_logs')
        .select('*')
        .eq('zone', zone)
        .gte('timestamp', since)
        .order('timestamp', { ascending: true })
        .limit(48)
      if (error) throw error
      return (data ?? []).map(rowToSensorData)
    },
    refetchInterval: 30 * 60 * 1000, // 차트는 30분마다 갱신
  })

// ---------- 전체 구역 최신값 ----------
export const useSensorLatest = () =>
  useQuery<SensorData[]>({
    queryKey: ['sensor', 'latest'],
    queryFn: async () => {
      const zones = ['A구역', 'B구역', 'C구역', 'D구역']
      const rows = await Promise.all(
        zones.map(async (zone) => {
          const { data, error } = await supabase
            .from('sensor_logs')
            .select('*')
            .eq('zone', zone)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single()
          if (error) return null
          return rowToSensorData(data as Record<string, unknown>)
        })
      )
      return rows.filter(Boolean) as SensorData[]
    },
    refetchInterval: 5000,
  })

// ---------- 특정 구역 최신값 ----------
export const useSensorLatestByZone = (zone: string) =>
  useQuery<SensorData>({
    queryKey: ['sensor', 'latest', zone],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sensor_logs')
        .select('*')
        .eq('zone', zone)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()
      if (error) throw error
      return rowToSensorData(data as Record<string, unknown>)
    },
    refetchInterval: 5000,
  })

// ---------- 알람 ----------
export const useAlerts = () =>
  useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('resolved', false)
        .order('timestamp', { ascending: false })
        .limit(20)
      if (error) throw error
      return (data ?? []).map((row) => ({
        id: row.id as string,
        zone: row.zone as string,
        sensorType: row.sensor_type as keyof SensorData,
        level: row.level as Alert['level'],
        message: row.message as string,
        timestamp: row.timestamp as string,
      }))
    },
    refetchInterval: 10000,
  })

// ---------- 임계값 읽기 ----------
export const useThresholds = () =>
  useQuery<ThresholdConfig>({
    queryKey: ['thresholds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('thresholds')
        .select('*')
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
    },
    staleTime: 30000,
  })

// ---------- 알람 전체 초기화 ----------
export const useResetAlerts = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('alerts')
        .update({ resolved: true })
        .eq('resolved', false)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}

// ---------- 임계값 저장 ----------
export const useSaveThresholds = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (config: ThresholdConfig) => {
      const rows = (Object.entries(config) as [keyof ThresholdConfig, ThresholdConfig[keyof ThresholdConfig]][]).map(
        ([key, t]) => ({
          sensor_key: key,
          min_val: t.min,
          max_val: t.max,
          warning_min: t.warningMin,
          warning_max: t.warningMax,
          enabled: t.enabled,
        })
      )
      const { error } = await supabase
        .from('thresholds')
        .upsert(rows, { onConflict: 'sensor_key' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thresholds'] })
    },
  })
}

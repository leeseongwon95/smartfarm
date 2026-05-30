import type { SensorData, Alert, ThresholdConfig } from '@/types/sensor'

function rand(min: number, max: number, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

function generateTimeSeries(zone: string): SensorData[] {
  const now = new Date()
  const INTERVAL_MIN = 10
  const TOTAL_POINTS = 24 * 60 / INTERVAL_MIN // 144개
  return Array.from({ length: TOTAL_POINTS }, (_, i) => {
    const ts = new Date(now.getTime() - (TOTAL_POINTS - 1 - i) * INTERVAL_MIN * 60 * 1000)
    return {
      id: `${zone}-${i}`,
      zone,
      timestamp: ts.toISOString(),
      temperature: rand(18, 32),
      humidity: rand(50, 90),
      co2: rand(400, 1200, 0),
      light: rand(5000, 80000, 0),
      soilMoisture: rand(30, 80),
      ec: rand(1.0, 3.5),
      ph: rand(5.5, 7.5),
    }
  })
}

const ZONES = ['A구역', 'B구역', 'C구역', 'D구역']

export const mockTimeSeriesData: Record<string, SensorData[]> = Object.fromEntries(
  ZONES.map((zone) => [zone, generateTimeSeries(zone)])
)

export function getMockLatestData(): SensorData[] {
  return ZONES.map((zone) => {
    const series = mockTimeSeriesData[zone]
    return series[series.length - 1]
  })
}

export function getMockSensorData(zone: string): SensorData[] {
  return mockTimeSeriesData[zone] ?? mockTimeSeriesData['A구역']
}

export function getMockLatestByZone(zone: string): SensorData {
  const series = getMockSensorData(zone)
  return series[series.length - 1]
}

export const mockAlerts: Alert[] = [
  {
    id: 'alert-1',
    sensorType: 'temperature',
    level: 'warning',
    message: 'A구역 온도가 경고 범위(30°C 초과)입니다.',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    zone: 'A구역',
  },
  {
    id: 'alert-2',
    sensorType: 'co2',
    level: 'danger',
    message: 'B구역 CO₂ 농도가 위험 수준(1200ppm 초과)입니다.',
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    zone: 'B구역',
  },
  {
    id: 'alert-3',
    sensorType: 'humidity',
    level: 'warning',
    message: 'C구역 습도가 낮습니다(50% 미만).',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    zone: 'C구역',
  },
  {
    id: 'alert-4',
    sensorType: 'ph',
    level: 'warning',
    message: 'D구역 pH가 정상 범위를 벗어났습니다.',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    zone: 'D구역',
  },
]

export const defaultThresholds: ThresholdConfig = {
  temperature: { min: 10, max: 40, warningMin: 15, warningMax: 32, enabled: true },
  humidity:    { min: 30, max: 90,  warningMin: 40, warningMax: 80, enabled: true },
  co2:         { min: 300, max: 2000, warningMin: 400, warningMax: 1000, enabled: true },
  light:       { min: 0, max: 120000, warningMin: 5000, warningMax: 90000, enabled: true },
  soilMoisture:{ min: 10, max: 100, warningMin: 30, warningMax: 80, enabled: true },
  ec:          { min: 0.5, max: 5.0, warningMin: 1.0, warningMax: 3.5, enabled: true },
  ph:          { min: 4.0, max: 9.0, warningMin: 5.5, warningMax: 7.5, enabled: true },
}

export type SensorData = {
  id: string
  zone: string
  timestamp: string
  temperature: number
  humidity: number
  co2: number
  light: number
  soilMoisture: number
  ec: number
  ph: number
}

export type AlertLevel = 'normal' | 'warning' | 'danger'

export type Alert = {
  id: string
  sensorType: keyof SensorData
  level: AlertLevel
  message: string
  timestamp: string
  zone: string
}

export type SensorThreshold = {
  min: number
  max: number
  warningMin: number
  warningMax: number
  enabled: boolean
}

export type ThresholdConfig = {
  temperature: SensorThreshold
  humidity: SensorThreshold
  co2: SensorThreshold
  light: SensorThreshold
  soilMoisture: SensorThreshold
  ec: SensorThreshold
  ph: SensorThreshold
}

export const ZONES = ['A구역', 'B구역', 'C구역', 'D구역'] as const
export type Zone = (typeof ZONES)[number]

export type SensorKey = 'temperature' | 'humidity' | 'co2' | 'light' | 'soilMoisture' | 'ec' | 'ph'

export const SENSOR_META: Record<SensorKey, { label: string; unit: string; icon: string }> = {
  temperature: { label: '온도', unit: '°C', icon: '🌡️' },
  humidity: { label: '습도', unit: '%', icon: '💧' },
  co2: { label: 'CO₂', unit: 'ppm', icon: '💨' },
  light: { label: '조도', unit: 'lux', icon: '☀️' },
  soilMoisture: { label: '토양수분', unit: '%', icon: '🌱' },
  ec: { label: 'EC', unit: 'mS/cm', icon: '⚡' },
  ph: { label: 'pH', unit: '', icon: '🧪' },
}

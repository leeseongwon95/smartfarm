import { createClient } from 'jsr:@supabase/supabase-js@2'

const ZONES = ['A구역', 'B구역', 'C구역', 'D구역']

const SENSOR_LABEL: Record<string, string> = {
  temperature: '온도', humidity: '습도', co2: 'CO₂',
  soilMoisture: '토양수분', ec: 'EC', ph: 'pH',
}

const THRESHOLDS: Record<string, { min: number; max: number; warnMin: number; warnMax: number }> = {
  temperature:  { min: 10,  max: 40,   warnMin: 15,  warnMax: 32   },
  humidity:     { min: 30,  max: 100,  warnMin: 50,  warnMax: 90   },
  co2:          { min: 300, max: 2000, warnMin: 400, warnMax: 1000 },
  soilMoisture: { min: 10,  max: 100,  warnMin: 30,  warnMax: 80   },
  ec:           { min: 0.5, max: 5.0,  warnMin: 1.0, warnMax: 3.5  },
  ph:           { min: 4.0, max: 9.0,  warnMin: 5.5, warnMax: 7.5  },
}

function rand(min: number, max: number, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const now = new Date().toISOString()

  const readings = ZONES.map((zone) => ({
    zone,
    timestamp: now,
    temperature:   rand(18, 35),
    humidity:      rand(45, 95),
    co2:           rand(350, 1400, 0),
    light:         rand(3000, 90000, 0),
    soil_moisture: rand(25, 85),
    ec:            rand(0.8, 4.0),
    ph:            rand(5.0, 8.0),
  }))

  const { error: insertErr } = await supabase.from('sensor_logs').insert(readings)
  if (insertErr) {
    return new Response(JSON.stringify({ error: insertErr.message }), { status: 500 })
  }

  // 임계값 초과 시 알람 자동 생성
  const alerts: { zone: string; sensor_type: string; level: string; message: string; timestamp: string }[] = []

  for (const r of readings) {
    const checks: [string, number][] = [
      ['temperature',  r.temperature],
      ['humidity',     r.humidity],
      ['co2',          r.co2],
      ['soilMoisture', r.soil_moisture],
      ['ec',           r.ec],
      ['ph',           r.ph],
    ]
    for (const [key, val] of checks) {
      const th = THRESHOLDS[key]
      if (val < th.min || val > th.max) {
        alerts.push({ zone: r.zone, sensor_type: key, level: 'danger', message: `${r.zone} ${SENSOR_LABEL[key] ?? key} 위험 수준 (${val})`, timestamp: now })
      } else if (val < th.warnMin || val > th.warnMax) {
        alerts.push({ zone: r.zone, sensor_type: key, level: 'warning', message: `${r.zone} ${SENSOR_LABEL[key] ?? key} 경고 범위 (${val})`, timestamp: now })
      }
    }
  }

  if (alerts.length > 0) {
    await supabase.from('alerts').insert(alerts)
  }

  return new Response(
    JSON.stringify({ ok: true, inserted: readings.length, alerts: alerts.length }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})

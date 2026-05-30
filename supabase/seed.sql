-- 기존 데이터 초기화
truncate table sensor_logs;
truncate table alerts;

-- 최근 24시간 센서 로그 (구역별 10분 간격, 144개)
do $$
declare
  zones text[] := array['A구역','B구역','C구역','D구역'];
  z text;
  i int;
  total int := 144; -- 24h * 6 (10분 간격)
  ts timestamptz;
begin
  foreach z in array zones loop
    for i in 0..(total - 1) loop
      ts := now() - ((total - 1 - i) * interval '10 minutes');
      insert into sensor_logs (zone, timestamp, temperature, humidity, co2, light, soil_moisture, ec, ph)
      values (
        z,
        ts,
        round((18 + random() * 14)::numeric, 1),
        round((40 + random() * 40)::numeric, 1),
        round((400 + random() * 800)::numeric, 0),
        round((5000 + random() * 75000)::numeric, 0),
        round((30 + random() * 50)::numeric, 1),
        round((1.0 + random() * 2.5)::numeric, 2),
        round((5.5 + random() * 2.0)::numeric, 2)
      );
    end loop;
  end loop;
end $$;

-- 더미 알람
insert into alerts (zone, sensor_type, level, message, timestamp) values
  ('A구역', 'temperature', 'warning', 'A구역 온도 경고 범위 (30.5)',  now() - interval '5 minutes'),
  ('B구역', 'co2',         'danger',  'B구역 CO₂ 위험 수준 (1250)',   now() - interval '12 minutes'),
  ('C구역', 'humidity',    'warning', 'C구역 습도 경고 범위 (38.2)',   now() - interval '30 minutes'),
  ('D구역', 'ph',          'warning', 'D구역 pH 경고 범위 (7.6)',      now() - interval '1 hour');

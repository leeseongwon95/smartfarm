-- 최근 24시간 더미 센서 로그 (구역별 1시간 간격)
do $$
declare
  zones text[] := array['A구역','B구역','C구역','D구역'];
  z text;
  i int;
  ts timestamptz;
begin
  foreach z in array zones loop
    for i in 0..23 loop
      ts := now() - ((23 - i) * interval '1 hour');
      insert into sensor_logs (zone, timestamp, temperature, humidity, co2, light, soil_moisture, ec, ph)
      values (
        z,
        ts,
        round((18 + random() * 14)::numeric, 1),
        round((50 + random() * 40)::numeric, 1),
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
  ('A구역', 'temperature', 'warning', 'A구역 온도가 경고 범위(30°C 초과)입니다.',  now() - interval '5 minutes'),
  ('B구역', 'co2',         'danger',  'B구역 CO₂ 농도가 위험 수준(1200ppm 초과)입니다.', now() - interval '12 minutes'),
  ('C구역', 'humidity',    'warning', 'C구역 습도가 낮습니다(50% 미만).',           now() - interval '30 minutes'),
  ('D구역', 'ph',          'warning', 'D구역 pH가 정상 범위를 벗어났습니다.',        now() - interval '1 hour');

-- 센서 로그 테이블
create table if not exists sensor_logs (
  id           uuid primary key default gen_random_uuid(),
  zone         text not null,
  timestamp    timestamptz not null default now(),
  temperature  numeric(5,1),
  humidity     numeric(5,1),
  co2          numeric(7,0),
  light        numeric(9,0),
  soil_moisture numeric(5,1),
  ec           numeric(4,2),
  ph           numeric(4,2)
);

create index on sensor_logs (zone, timestamp desc);

-- 임계값 테이블 (구역별 or 공통)
create table if not exists thresholds (
  id            serial primary key,
  sensor_key    text not null unique,
  min_val       numeric,
  max_val       numeric,
  warning_min   numeric,
  warning_max   numeric
);

-- 알람 테이블
create table if not exists alerts (
  id          uuid primary key default gen_random_uuid(),
  zone        text not null,
  sensor_type text not null,
  level       text not null check (level in ('normal','warning','danger')),
  message     text not null,
  timestamp   timestamptz not null default now(),
  resolved    boolean default false
);

create index on alerts (timestamp desc);

-- RLS 비활성화 (개발용 — 나중에 auth 붙이면 활성화)
alter table sensor_logs disable row level security;
alter table thresholds disable row level security;
alter table alerts disable row level security;

-- 기본 임계값 시드
insert into thresholds (sensor_key, min_val, max_val, warning_min, warning_max) values
  ('temperature',  10,  40,   15,   32),
  ('humidity',     30, 100,   50,   90),
  ('co2',         300, 2000, 400, 1000),
  ('light',         0, 120000, 5000, 90000),
  ('soilMoisture', 10, 100,   30,   80),
  ('ec',          0.5,  5.0,  1.0,  3.5),
  ('ph',          4.0,  9.0,  5.5,  7.5)
on conflict (sensor_key) do nothing;

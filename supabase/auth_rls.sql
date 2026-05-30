-- RLS 활성화
alter table sensor_logs enable row level security;
alter table thresholds enable row level security;
alter table alerts enable row level security;

-- sensor_logs: 인증된 사용자만 읽기/쓰기
create policy "auth read sensor_logs"  on sensor_logs for select using (auth.role() = 'authenticated');
create policy "auth insert sensor_logs" on sensor_logs for insert with check (auth.role() = 'authenticated');

-- thresholds: 인증된 사용자만 읽기/쓰기
create policy "auth read thresholds"   on thresholds for select using (auth.role() = 'authenticated');
create policy "auth update thresholds" on thresholds for update using (auth.role() = 'authenticated');
create policy "auth insert thresholds" on thresholds for insert with check (auth.role() = 'authenticated');

-- alerts: 인증된 사용자만 읽기/쓰기
create policy "auth read alerts"   on alerts for select using (auth.role() = 'authenticated');
create policy "auth insert alerts" on alerts for insert with check (auth.role() = 'authenticated');
create policy "auth update alerts" on alerts for update using (auth.role() = 'authenticated');

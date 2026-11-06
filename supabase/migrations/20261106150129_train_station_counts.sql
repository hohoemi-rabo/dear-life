-- 031 電車の本数：駅ごと・向きごとの1日の本数と、その出典（全国鉄道運行本数データ）
--
-- 電車の時刻（iida_jr_timetable）は飯田市の許可が出るまで公開しない（026）。そのあいだも「何本走っているか」は出したいので、
-- オープンデータの本数を別の出典として入れる（2026-11-06 まさゆきさん決定）。時刻が公開されたら、画面は時刻から数えた本数に切りかわる。
-- 飯田線の駅をすべて入れ、どの地区の駅かは screen_data() が facilities（kind = 'train_station'）と駅名で結びつけて決める。
-- 中身は npm run train-counts:sql が作るマイグレーション（*_train_counts_data.sql）で入れる

create table public.train_station_counts (
  id bigint generated always as identity primary key,
  line_name text not null,
  station_name text not null,
  direction text not null check (direction in ('上り', '下り')),
  departures_per_day integer not null check (departures_per_day >= 0),
  source_id text not null references public.data_sources (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, line_name, station_name, direction)
);

comment on table public.train_station_counts is '駅ごと・向きごとの1日の発車本数（031）。平日の定期列車だけで、特急など運賃のほかに料金の要る列車と通過する列車は数えない。行は npm run train-counts:sql で作る';
comment on column public.train_station_counts.station_name is 'facilities（kind = train_station）の name と同じ駅名';
comment on column public.train_station_counts.direction is '上り：豊橋方面／下り：辰野方面（飯田線）';
comment on column public.train_station_counts.departures_per_day is 'その駅を発車する本数（その駅止まりの列車は数えない）';

create index train_station_counts_source_id_idx on public.train_station_counts (source_id);

create trigger train_station_counts_set_updated_at before update on public.train_station_counts
  for each row execute function public.set_updated_at();

alter table public.train_station_counts enable row level security;
revoke all on table public.train_station_counts from anon, authenticated, service_role;
grant select, insert, update, delete on table public.train_station_counts to service_role;
grant select on table public.train_station_counts to anon;
create policy "anon can read train station counts of published sources" on public.train_station_counts
  for select to anon
  using (exists (select 1 from public.data_sources s where s.id = source_id and s.is_published));

-- 出典：ページに「データのライセンスはCC-BY 4.0、ODbLとします」とある。クレジットに作成者・データ名・両方のライセンスを書けば、
-- どちらにも従える。クレジットと対象時点は取り込みのたびに *_train_counts_data.sql が入れ直す
insert into public.data_sources (id, name, publisher, source_url, license, is_published)
values (
  'railway_honsu',
  '全国鉄道運行本数データ',
  '地域・交通データ研究所（西澤明）',
  'https://gtfs-gis.jp/railway_honsu/',
  'CC BY 4.0、ODbL',
  true
);

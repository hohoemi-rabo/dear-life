-- 026 電車：冬・車0台の「おでかけ」の電車の便と本数
--
-- 場面にはバス（bus_outings）の便と並べて出す（2026-10-23 まさゆきさん決定）。形は bus_outings にそろえる。
-- 電車の時刻表には曜日の区別がないので、時刻表を見た日（service_date）と有効期間の終わり（valid_until）は持たない。
-- ダイヤの時点は data_sources.period_label（「2026年3月14日改正のダイヤ」）で出す。
-- 特急は特急券が要るので、便にも本数にも入れない。中身は npm run train:sql が作る *_train_data.sql で入れる

create table public.train_outings (
  id bigint generated always as identity primary key,
  district_id text not null references public.districts (id),
  sort_order smallint not null check (sort_order > 0),
  origin_station_name text not null,
  destination_station_name text not null,
  depart_after text not null check (depart_after ~ '^\d{2}:\d{2}$'),
  return_after text not null check (return_after ~ '^\d{2}:\d{2}$'),
  status text not null check (status in ('available', 'no_outbound', 'no_return')),
  outbound_departure text check (outbound_departure ~ '^\d{2}:\d{2}$'),
  outbound_arrival text check (outbound_arrival ~ '^\d{2}:\d{2}$'),
  outbound_train_type text,
  return_departure text check (return_departure ~ '^\d{2}:\d{2}$'),
  return_arrival text check (return_arrival ~ '^\d{2}:\d{2}$'),
  return_train_type text,
  next_return_departure text check (next_return_departure ~ '^\d{2}:\d{2}$'),
  next_return_arrival text check (next_return_arrival ~ '^\d{2}:\d{2}$'),
  next_return_train_type text,
  outbound_trips_per_day smallint not null check (outbound_trips_per_day >= 0),
  return_trips_per_day smallint not null check (return_trips_per_day >= 0),
  origin_departures_per_day smallint not null check (origin_departures_per_day >= 0),
  source_id text not null references public.data_sources (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (district_id, sort_order),
  constraint train_outings_trips_match_status check (
    (outbound_departure is not null) = (status <> 'no_outbound')
    and (return_departure is not null) = (status = 'available')
    and (next_return_departure is null or return_departure is not null)
    and (outbound_departure is null) = (outbound_arrival is null)
    and (outbound_departure is null) = (outbound_train_type is null)
    and (return_departure is null) = (return_arrival is null)
    and (return_departure is null) = (return_train_type is null)
    and (next_return_departure is null) = (next_return_arrival is null)
    and (next_return_departure is null) = (next_return_train_type is null)
  )
);

comment on table public.train_outings is '冬・車0台の場面の、電車のおでかけ（026・要件 6.3）。乗る駅から行き先への直通の列車だけ（特急を除く）。行は npm run train:sql で作る';
comment on column public.train_outings.sort_order is '地区の中での並び順。場面には 1 を使う';
comment on column public.train_outings.status is 'available：行き・帰りとも見つかった／no_outbound：行きの便がない／no_return：帰りの便がない';
comment on column public.train_outings.outbound_train_type is '普通・快速 みすず など（元の時刻表の表記）';
comment on column public.train_outings.outbound_trips_per_day is '1日の、乗る駅から行き先への直通の列車の数（特急を除く）';
comment on column public.train_outings.return_trips_per_day is '1日の、行き先から乗る駅への直通の列車の数（特急を除く）';
comment on column public.train_outings.origin_departures_per_day is '1日に乗る駅を発車する列車の数（上り・下りの合計、特急を除く）';

create index train_outings_source_id_idx on public.train_outings (source_id);

create trigger train_outings_set_updated_at before update on public.train_outings
  for each row execute function public.set_updated_at();

alter table public.train_outings enable row level security;
revoke all on table public.train_outings from anon, authenticated, service_role;
grant select, insert, update, delete on table public.train_outings to service_role;
grant select on table public.train_outings to anon;
create policy "anon can read train outings of published sources" on public.train_outings
  for select to anon
  using (exists (select 1 from public.data_sources s where s.id = source_id and s.is_published));

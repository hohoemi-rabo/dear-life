-- 036 用事の場所（市役所・病院など）へ、地区のバス停から乗りかえなしで行けるか。
-- バス停の名前は画面に出さず、「{地区}のバス停{N}か所のうち{M}か所から、1日{最少}〜{最多}本（バス停によって違う）」と伝える
-- （2026-11-11 まさゆきさん）。行は npm run bus:sql で作る（行き先は data/bus_errands.csv）

create table public.bus_errands (
  id bigint generated always as identity primary key,
  district_id text not null references public.districts (id),
  sort_order smallint not null check (sort_order > 0),
  place_name text not null check (place_name <> ''),
  kind text not null check (kind in ('市役所', '病院', '駅')),
  day_type text not null check (day_type in ('平日', '土曜', '日曜')),
  service_date date not null,
  district_stop_count smallint not null check (district_stop_count > 0),
  reachable_stop_count smallint not null check (reachable_stop_count >= 0),
  min_trips_per_day smallint check (min_trips_per_day > 0),
  max_trips_per_day smallint,
  valid_until date not null,
  source_id text not null references public.data_sources (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (district_id, place_name),
  constraint bus_errands_reach_within_district check (reachable_stop_count <= district_stop_count),
  -- 行けるバス停があるときだけ本数の幅を持ち、少ない方が多い方を超えない
  constraint bus_errands_trips_match_reach check (
    (min_trips_per_day is null) = (reachable_stop_count = 0)
    and (max_trips_per_day is null) = (reachable_stop_count = 0)
    and (min_trips_per_day is null or min_trips_per_day <= max_trips_per_day)
  ),
  constraint bus_errands_date_within_validity check (service_date <= valid_until)
);

comment on table public.bus_errands is '用事の場所へ、地区のバス停から乗りかえなしで行けるバス停の数と1日の本数の幅（036）。行は npm run bus:sql で作る';
comment on column public.bus_errands.place_name is '画面に出す行き先の呼び方（バス停の名前ではない）';
comment on column public.bus_errands.service_date is '時刻表を見た日（冬の平日に当たる日）';
comment on column public.bus_errands.reachable_stop_count is '行きと帰りの両方に乗りかえなしの便があるバス停の数';
comment on column public.bus_errands.min_trips_per_day is 'そのバス停ごとの、行きの直通便の数のいちばん少ないもの';
comment on column public.bus_errands.max_trips_per_day is 'そのバス停ごとの、行きの直通便の数のいちばん多いもの';

create index bus_errands_source_id_idx on public.bus_errands (source_id);

create trigger bus_errands_set_updated_at before update on public.bus_errands
  for each row execute function public.set_updated_at();

alter table public.bus_errands enable row level security;
revoke all on table public.bus_errands from anon, authenticated, service_role;
grant select, insert, update, delete on table public.bus_errands to service_role;
grant select on table public.bus_errands to anon;
create policy "anon can read bus errands of published sources" on public.bus_errands
  for select to anon
  using (exists (select 1 from public.data_sources s where s.id = source_id and s.is_published));

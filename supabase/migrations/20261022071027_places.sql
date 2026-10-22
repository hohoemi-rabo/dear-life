-- 003 場所と人口：施設の点・学区の範囲・地区の人口
-- どれも出典（data_sources）の利用条件を確かめて公開したものだけ anon が読める

create type public.facility_kind as enum (
  'school',
  'childcare',
  'evacuation_site',
  'public_facility',
  'bus_stop',
  'train_station'
);

create type public.school_level as enum ('elementary', 'junior_high');

-- facilities：学校・保育施設・避難場所・公共施設・バス停・駅の点 --------

create table public.facilities (
  id bigint generated always as identity primary key,
  kind public.facility_kind not null,
  subkind text,
  name text not null,
  address text,
  town_name text,
  district_id text references public.districts (id),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  source_id text not null references public.data_sources (id),
  source_key text not null,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, source_key),
  check ((latitude is null) = (longitude is null))
);

comment on table public.facilities is '施設の点（008・009・010・026）。地区は住所の町名で振り分ける（要件 7.2）';
comment on column public.facilities.subkind is '元データの区分（例：小学校、保育所、認定こども園）';
comment on column public.facilities.town_name is '住所から取り出した町名（004）';
comment on column public.facilities.district_id is '対象4地区のどれか。対象外・振り分けられないものは null';
comment on column public.facilities.source_key is '元データでの識別子。取り直しのとき同じ行を更新するために使う';
comment on column public.facilities.attributes is '種類ごとの追加の項目（例：避難場所の対象の災害）';

create index facilities_district_kind_idx on public.facilities (district_id, kind);
create index facilities_kind_idx on public.facilities (kind);

create trigger facilities_set_updated_at before update on public.facilities
  for each row execute function public.set_updated_at();

alter table public.facilities enable row level security;
revoke all on table public.facilities from anon, authenticated, service_role;
grant select, insert, update, delete on table public.facilities to service_role;
grant select on table public.facilities to anon;
create policy "anon can read facilities of published sources" on public.facilities
  for select to anon
  using (exists (select 1 from public.data_sources s where s.id = source_id and s.is_published));

-- school_districts：小学校区・中学校区の範囲 -----------------------------

create table public.school_districts (
  id bigint generated always as identity primary key,
  level public.school_level not null,
  school_name text not null,
  geometry jsonb not null check (geometry ->> 'type' in ('Polygon', 'MultiPolygon')),
  source_id text not null references public.data_sources (id),
  source_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, source_key)
);

comment on table public.school_districts is '小学校区・中学校区の範囲（XKT004・XKT005。008）。地区とは範囲が違うので混ぜて表示しない（要件 7.2）';
comment on column public.school_districts.geometry is 'GeoJSON の Polygon / MultiPolygon（経度・緯度の順）';

create trigger school_districts_set_updated_at before update on public.school_districts
  for each row execute function public.set_updated_at();

alter table public.school_districts enable row level security;
revoke all on table public.school_districts from anon, authenticated, service_role;
grant select, insert, update, delete on table public.school_districts to service_role;
grant select on table public.school_districts to anon;
create policy "anon can read school districts of published sources" on public.school_districts
  for select to anon
  using (exists (select 1 from public.data_sources s where s.id = source_id and s.is_published));

-- population：地区の人口と年齢構成 ---------------------------------------

create table public.population (
  district_id text not null references public.districts (id),
  as_of date not null,
  total integer not null check (total >= 0),
  age_0_14 integer check (age_0_14 >= 0),
  age_15_64 integer check (age_15_64 >= 0),
  age_65_plus integer check (age_65_plus >= 0),
  source_id text not null references public.data_sources (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (district_id, as_of),
  -- 国勢調査には年齢不詳があるので、合計は total 以下になる
  check (coalesce(age_0_14, 0) + coalesce(age_15_64, 0) + coalesce(age_65_plus, 0) <= total)
);

comment on table public.population is '地区の人口と年齢構成（011）';
comment on column public.population.as_of is '対象時点（国勢調査なら調査日）';

create index population_source_id_idx on public.population (source_id);

create trigger population_set_updated_at before update on public.population
  for each row execute function public.set_updated_at();

alter table public.population enable row level security;
revoke all on table public.population from anon, authenticated, service_role;
grant select, insert, update, delete on table public.population to service_role;
grant select on table public.population to anon;
create policy "anon can read population of published sources" on public.population
  for select to anon
  using (exists (select 1 from public.data_sources s where s.id = source_id and s.is_published));

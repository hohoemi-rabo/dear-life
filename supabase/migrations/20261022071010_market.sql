-- 003 相場：不動産取引（生データ・非公開）と地区ごとの集計結果

-- 土地／中古戸建て（築20年以内）／中古戸建て（築21年以上）（要件 5章-4・5）
create type public.market_category as enum ('land', 'house_built_within_20y', 'house_built_over_20y');

-- real_estate_transactions：XIT001 の取引（006 で Worker が入れる） -------

create table public.real_estate_transactions (
  id bigint generated always as identity primary key,
  trade_year smallint not null check (trade_year between 2000 and 2100),
  trade_quarter smallint not null check (trade_quarter between 1 and 4),
  property_type text not null,
  town_name text not null,
  district_code text,
  district_id text references public.districts (id),
  trade_price bigint check (trade_price >= 0),
  unit_price_per_sqm numeric check (unit_price_per_sqm >= 0),
  area_sqm numeric check (area_sqm > 0),
  building_year smallint check (building_year between 1800 and 2100),
  use text,
  circumstances text,
  is_excluded boolean not null default false,
  raw jsonb not null,
  fetched_at timestamptz not null default now()
);

-- 取引に固有の ID がなく、同じ内容の取引が複数あり得るため、重複は四半期ごとに消して入れ直すことで防ぐ（006）
comment on table public.real_estate_transactions is '不動産情報ライブラリ XIT001 の取引（生データ）。四半期ごとに入れ直す。画面には出さない';
comment on column public.real_estate_transactions.property_type is '種類（例：宅地(土地)、宅地(土地と建物)）';
comment on column public.real_estate_transactions.town_name is 'API の地区名（町名）';
comment on column public.real_estate_transactions.district_code is 'API の DistrictCode';
comment on column public.real_estate_transactions.district_id is '対応表で振り分けた対象地区。対象外・対応表にない町名は null';
comment on column public.real_estate_transactions.unit_price_per_sqm is '㎡単価（API で空のときは null。集計で総額÷面積で補う）';
comment on column public.real_estate_transactions.building_year is '建築年（西暦）。不明は null';
comment on column public.real_estate_transactions.use is '用途';
comment on column public.real_estate_transactions.circumstances is '取引の事情等';
comment on column public.real_estate_transactions.is_excluded is '調停・競売等／関係者間取引／隣地の購入なら true（要件 5章-3）。行は残し、データについてで除外件数を出す';
comment on column public.real_estate_transactions.raw is 'API の1行をそのまま';

create index real_estate_transactions_period_idx on public.real_estate_transactions (trade_year, trade_quarter);
create index real_estate_transactions_district_type_idx on public.real_estate_transactions (district_id, property_type)
  where not is_excluded;

alter table public.real_estate_transactions enable row level security;
revoke all on table public.real_estate_transactions from anon, authenticated, service_role;
grant select, insert, update, delete on table public.real_estate_transactions to service_role;

-- market_stats：地区×種類の真ん中の値・幅・件数（007 の SQL 関数が書く） --

create table public.market_stats (
  district_id text not null references public.districts (id),
  category public.market_category not null,
  period_from text not null check (period_from ~ '^\d{4}Q[1-4]$'),
  period_to text not null check (period_to ~ '^\d{4}Q[1-4]$'),
  sample_count integer not null check (sample_count >= 0),
  median_value numeric,
  p25_value numeric,
  p75_value numeric,
  source_id text not null references public.data_sources (id),
  computed_at timestamptz not null default now(),
  primary key (district_id, category),
  check (period_from <= period_to),
  constraint market_stats_value_iff_samples check ((sample_count = 0) = (median_value is null))
);

comment on table public.market_stats is '地区ごとの参考相場（要件 5章）。件数0なら値は null（該当なし）';
comment on column public.market_stats.period_from is '対象期間の最初の四半期（例：2021Q1）';
comment on column public.market_stats.median_value is '真ん中の値。土地は㎡単価（円）、中古戸建ては総額（円）';
comment on column public.market_stats.p25_value is '下位25%の値（土地のみ）';
comment on column public.market_stats.p75_value is '上位25%の値（土地のみ）';

create index market_stats_source_id_idx on public.market_stats (source_id);

alter table public.market_stats enable row level security;
revoke all on table public.market_stats from anon, authenticated, service_role;
grant select, insert, update, delete on table public.market_stats to service_role;
grant select on table public.market_stats to anon;
create policy "anon can read market stats of published sources" on public.market_stats
  for select to anon
  using (exists (select 1 from public.data_sources s where s.id = source_id and s.is_published));

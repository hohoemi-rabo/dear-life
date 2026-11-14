-- 041 いまの街と：6都市の不動産取引と相場
--
-- 飯田の real_estate_transactions は「その年を全部消して入れ直す」作りなので、都市の取引は別の表に入れる（2026-11-14 まさゆきさん決定）。
-- 都市は件数が多い（東京23区は飯田の数百倍）ので、API の1行まるごと（raw）は持たず、相場の計算に使う列と、土地・土地と建物の取引だけを残す。
-- 集計の決まり（除外・地区のない取引・土地の㎡単価の補い方・中古戸建ての用途と築年数の分け方）は、地区と都市で同じビュー market_samples を使い、ずれないようにする

-- compare_city_transactions：都市の取引（Worker の city_transactions が区・市のコードごとに入れる） --

create table public.compare_city_transactions (
  id bigint generated always as identity primary key,
  city_id text not null references public.compare_cities (id) on delete cascade,
  reinfolib_code text not null check (reinfolib_code ~ '^\d{5}$'),
  trade_year smallint not null check (trade_year between 2000 and 2100),
  trade_quarter smallint not null check (trade_quarter between 1 and 4),
  property_type text not null check (property_type in ('宅地(土地)', '宅地(土地と建物)')),
  trade_price bigint check (trade_price >= 0),
  unit_price_per_sqm numeric check (unit_price_per_sqm >= 0),
  area_sqm numeric check (area_sqm > 0),
  building_year smallint check (building_year between 1800 and 2100),
  use text,
  is_excluded boolean not null default false
);

comment on table public.compare_city_transactions is '都市の不動産取引（041）。XIT001 の土地・土地と建物の取引だけを、相場の計算に使う列で持つ。区・市のコード×年ごとに入れ直す。画面には出さない';
comment on column public.compare_city_transactions.is_excluded is '調停・競売等／関係者間取引／隣地の購入なら true（飯田と同じ。要件 5章-3）';

create index compare_city_transactions_code_year_idx on public.compare_city_transactions (reinfolib_code, trade_year);
create index compare_city_transactions_city_idx on public.compare_city_transactions (city_id);

alter table public.compare_city_transactions enable row level security;
revoke all on table public.compare_city_transactions from anon, authenticated, service_role;
grant select, insert, update, delete on table public.compare_city_transactions to service_role;

-- compare_city_fetches：コード×年をいつ・どの四半期まで出ている時点で取ったか（数日に分けて取る進み具合） --

create table public.compare_city_fetches (
  reinfolib_code text not null check (reinfolib_code ~ '^\d{5}$'),
  trade_year smallint not null check (trade_year between 2000 and 2100),
  known_latest text not null check (known_latest ~ '^\d{4}Q[1-4]$'),
  row_count integer not null check (row_count >= 0),
  fetched_at timestamptz not null default now(),
  primary key (reinfolib_code, trade_year)
);

comment on table public.compare_city_fetches is '都市の取引を取ったコード×年（041）。known_latest はそのとき公開済みだった最新の四半期。新しい四半期が出たら、その年からを取り直す';

alter table public.compare_city_fetches enable row level security;
revoke all on table public.compare_city_fetches from anon, authenticated, service_role;
grant select, insert, update, delete on table public.compare_city_fetches to service_role;

-- compare_city_market_stats：都市×種類の相場（market_stats と同じ形） ------

create table public.compare_city_market_stats (
  city_id text not null references public.compare_cities (id) on delete cascade,
  category public.market_category not null,
  period_from text not null check (period_from ~ '^\d{4}Q[1-4]$'),
  period_to text not null check (period_to ~ '^\d{4}Q[1-4]$'),
  sample_count integer not null check (sample_count >= 0),
  median_value numeric,
  p25_value numeric,
  p75_value numeric,
  source_id text not null references public.data_sources (id),
  computed_at timestamptz not null default now(),
  primary key (city_id, category),
  check (period_from <= period_to),
  constraint compare_city_market_stats_value_iff_samples check ((sample_count = 0) = (median_value is null))
);

comment on table public.compare_city_market_stats is '都市ごとの参考相場（041）。地区の market_stats と同じ決まりで集計する。全部のコード×年を取り終えた都市だけ行がある（ない都市は「データ未取得」）';

create index compare_city_market_stats_source_id_idx on public.compare_city_market_stats (source_id);

alter table public.compare_city_market_stats enable row level security;
revoke all on table public.compare_city_market_stats from anon, authenticated, service_role;
grant select, insert, update, delete on table public.compare_city_market_stats to service_role;
grant select on table public.compare_city_market_stats to anon;
create policy "anon can read market stats of published compare cities" on public.compare_city_market_stats
  for select to anon
  using (
    exists (select 1 from public.compare_cities c where c.id = city_id and c.is_published)
    and exists (select 1 from public.data_sources s where s.id = source_id and s.is_published)
  );

-- market_samples：相場の計算に入れる取引の値（地区と都市で同じ決まり） ----

create view public.market_samples with (security_invoker = true) as
with trades as (
  -- 除外する取引（5章-3）と、対象4地区に振り分けられなかった取引（5章-2）を外す
  select 'district'::text as area_kind, t.district_id as area_id, t.trade_year, t.trade_quarter, t.property_type,
    t.use, t.building_year, t.trade_price, t.unit_price_per_sqm, t.area_sqm
  from public.real_estate_transactions as t
  where not t.is_excluded and t.district_id is not null
  union all
  select 'city'::text, c.city_id, c.trade_year, c.trade_quarter, c.property_type,
    c.use, c.building_year, c.trade_price, c.unit_price_per_sqm, c.area_sqm
  from public.compare_city_transactions as c
  where not c.is_excluded
)
-- 土地：㎡単価が空の行は総額÷面積で補う（5章-4）
select area_kind, area_id, trade_year, trade_quarter, 'land'::public.market_category as category,
  coalesce(unit_price_per_sqm, trade_price::numeric / area_sqm) as value
from trades
where property_type = '宅地(土地)'
union all
-- 中古戸建て：用途に「住宅」を含むか空欄。築年数＝取引年−建築年で分け、建築年が不明なものは入れない（5章-5）
select area_kind, area_id, trade_year, trade_quarter,
  case when trade_year - building_year <= 20
    then 'house_built_within_20y'::public.market_category
    else 'house_built_over_20y'::public.market_category
  end,
  trade_price::numeric
from trades
where property_type = '宅地(土地と建物)'
  and (use is null or use like '%住宅%')
  and building_year is not null;

comment on view public.market_samples is '相場（中央値・幅・件数）の計算に入れる取引の値（007・041）。area_kind は district（4地区）か city（比べる都市）。地区と都市で同じ決まりにするため、集計の関数はどちらもここから読む';

revoke all on table public.market_samples from anon, authenticated, service_role;
grant select on table public.market_samples to service_role;

-- refresh_market_stats：取引の選び方を market_samples に移す（ほかは 20261027134032_market_summary.sql と同じ） --

create or replace function public.refresh_market_stats(p_period_from text, p_period_to text)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  from_index integer;
  to_index integer;
  written integer;
begin
  if p_period_from !~ '^\d{4}Q[1-4]$' or p_period_to !~ '^\d{4}Q[1-4]$' then
    raise exception '対象期間は 2021Q1 の形で渡す（%〜%）', p_period_from, p_period_to;
  end if;
  -- 四半期を通し番号にして比べる（年×4＋四半期−1）
  from_index := left(p_period_from, 4)::integer * 4 + right(p_period_from, 1)::integer - 1;
  to_index := left(p_period_to, 4)::integer * 4 + right(p_period_to, 1)::integer - 1;
  if from_index > to_index then
    raise exception '対象期間の始まり（%）が終わり（%）より後になっている', p_period_from, p_period_to;
  end if;

  with stats as (
    select area_id as district_id, category,
      count(value)::integer as sample_count,
      percentile_cont(0.5) within group (order by value) as median_value,
      percentile_cont(0.25) within group (order by value) as p25_value,
      percentile_cont(0.75) within group (order by value) as p75_value
    from public.market_samples
    where area_kind = 'district'
      and value is not null
      and trade_year * 4 + trade_quarter - 1 between from_index and to_index
    group by area_id, category
  )
  -- 取引のない地区×種類も件数0の行にして、「データ未取得」と「該当なし」を区別できるようにする
  insert into public.market_stats as m (
    district_id, category, period_from, period_to, sample_count, median_value, p25_value, p75_value, source_id, computed_at
  )
  select d.id, c.category, p_period_from, p_period_to,
    coalesce(s.sample_count, 0),
    s.median_value,
    -- 幅は土地だけに出す（5章-4）
    case when c.category = 'land' then s.p25_value end,
    case when c.category = 'land' then s.p75_value end,
    'reinfolib_xit001',
    now()
  from public.districts as d
  cross join unnest(enum_range(null::public.market_category)) as c (category)
  left join stats as s on s.district_id = d.id and s.category = c.category
  on conflict (district_id, category) do update set
    period_from = excluded.period_from,
    period_to = excluded.period_to,
    sample_count = excluded.sample_count,
    median_value = excluded.median_value,
    p25_value = excluded.p25_value,
    p75_value = excluded.p75_value,
    source_id = excluded.source_id,
    computed_at = excluded.computed_at;
  get diagnostics written = row_count;

  -- 外した理由は、取引の事情（「調停・競売等、私道を含む取引」のように「、」でつながる）に含まれる語で数える。
  -- is_excluded を決める Worker（workers/ingest/src/jobs/transactions.ts の EXCLUDED_CIRCUMSTANCES）と同じ分け方
  with period_trades as (
    select t.district_id, t.is_excluded,
      array(select btrim(part) from unnest(string_to_array(coalesce(t.circumstances, ''), '、')) as part) as reasons
    from public.real_estate_transactions as t
    where t.trade_year * 4 + t.trade_quarter - 1 between from_index and to_index
  )
  insert into public.market_summary as ms (
    id, period_from, period_to, citywide_count, district_count, excluded_count,
    mediation_count, related_party_count, adjacent_land_count, source_id, computed_at
  )
  select true, p_period_from, p_period_to,
    count(*)::integer,
    count(*) filter (where district_id is not null)::integer,
    count(*) filter (where district_id is not null and is_excluded)::integer,
    count(*) filter (where district_id is not null and is_excluded and '調停・競売等' = any (reasons))::integer,
    count(*) filter (where district_id is not null and is_excluded and '関係者間取引' = any (reasons))::integer,
    count(*) filter (where district_id is not null and is_excluded and '隣地の購入' = any (reasons))::integer,
    'reinfolib_xit001',
    now()
  from period_trades
  on conflict (id) do update set
    period_from = excluded.period_from,
    period_to = excluded.period_to,
    citywide_count = excluded.citywide_count,
    district_count = excluded.district_count,
    excluded_count = excluded.excluded_count,
    mediation_count = excluded.mediation_count,
    related_party_count = excluded.related_party_count,
    adjacent_land_count = excluded.adjacent_land_count,
    source_id = excluded.source_id,
    computed_at = excluded.computed_at;

  return written;
end;
$$;

-- replace_compare_city_transactions：1つのコードの、渡した年の取引を入れ直し、取った記録を残す --

create function public.replace_compare_city_transactions(p_code text, p_years smallint[], p_known_latest text, p_rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_city text;
  inserted integer;
begin
  select city_id into target_city from public.compare_city_codes where reinfolib_code = p_code;
  if target_city is null then
    raise exception 'コード % は compare_city_codes にない', p_code;
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'p_rows は配列で渡す';
  end if;
  if coalesce(array_length(p_years, 1), 0) = 0 then
    raise exception '取り直す年を1つ以上渡す';
  end if;
  -- 渡した年以外の行が混ざっていたら、消した年と入れた年がずれるので止める
  if exists (select 1 from jsonb_array_elements(p_rows) as r where not ((r ->> 'trade_year')::smallint = any (p_years))) then
    raise exception '渡した年（%）以外の取引が含まれている', p_years;
  end if;

  delete from public.compare_city_transactions where reinfolib_code = p_code and trade_year = any (p_years);

  insert into public.compare_city_transactions (
    city_id, reinfolib_code, trade_year, trade_quarter, property_type, trade_price, unit_price_per_sqm, area_sqm, building_year, use, is_excluded
  )
  select target_city, p_code, r.trade_year, r.trade_quarter, r.property_type, r.trade_price, r.unit_price_per_sqm, r.area_sqm, r.building_year, r.use, r.is_excluded
  from jsonb_to_recordset(p_rows) as r (
    trade_year smallint,
    trade_quarter smallint,
    property_type text,
    trade_price bigint,
    unit_price_per_sqm numeric,
    area_sqm numeric,
    building_year smallint,
    use text,
    is_excluded boolean
  );
  get diagnostics inserted = row_count;

  insert into public.compare_city_fetches (reinfolib_code, trade_year, known_latest, row_count, fetched_at)
  select p_code, y.year,
    p_known_latest,
    (select count(*)::integer from public.compare_city_transactions as t where t.reinfolib_code = p_code and t.trade_year = y.year),
    now()
  from unnest(p_years) as y (year)
  on conflict (reinfolib_code, trade_year) do update set
    known_latest = excluded.known_latest,
    row_count = excluded.row_count,
    fetched_at = excluded.fetched_at;

  return inserted;
end;
$$;

comment on function public.replace_compare_city_transactions(text, smallint[], text, jsonb) is
  '1つの区・市のコードについて、渡した年の取引を消して入れ直し、compare_city_fetches に取った記録を残す（041）。入れた行数を返す';

revoke execute on function public.replace_compare_city_transactions(text, smallint[], text, jsonb) from public, anon, authenticated;
grant execute on function public.replace_compare_city_transactions(text, smallint[], text, jsonb) to service_role;

-- refresh_compare_city_market_stats：都市の相場を、地区と同じ期間・同じ決まりで入れ直す --

create function public.refresh_compare_city_market_stats(p_period_from text, p_period_to text)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  from_index integer;
  to_index integer;
  from_year integer;
  to_year integer;
  complete_ids text[];
  written integer;
begin
  if p_period_from !~ '^\d{4}Q[1-4]$' or p_period_to !~ '^\d{4}Q[1-4]$' then
    raise exception '対象期間は 2021Q1 の形で渡す（%〜%）', p_period_from, p_period_to;
  end if;
  from_index := left(p_period_from, 4)::integer * 4 + right(p_period_from, 1)::integer - 1;
  to_index := left(p_period_to, 4)::integer * 4 + right(p_period_to, 1)::integer - 1;
  if from_index > to_index then
    raise exception '対象期間の始まり（%）が終わり（%）より後になっている', p_period_from, p_period_to;
  end if;
  from_year := left(p_period_from, 4)::integer;
  to_year := left(p_period_to, 4)::integer;

  -- 対象期間より前の年と、コードの一覧から外したコードの取引は、もう使わないので消す（Supabase の容量を空けておく）
  delete from public.compare_city_transactions as t
  where t.trade_year < from_year
     or not exists (select 1 from public.compare_city_codes as c where c.reinfolib_code = t.reinfolib_code);
  delete from public.compare_city_fetches as f
  where f.trade_year < from_year
     or not exists (select 1 from public.compare_city_codes as c where c.reinfolib_code = f.reinfolib_code);

  -- 取り終えていない都市（どれかのコード×年がまだ）は、一部の区だけの値にならないよう行を消して「データ未取得」にする
  select coalesce(array_agg(done.city_id), '{}') into complete_ids
  from (
    select c.city_id
    from public.compare_city_codes as c
    group by c.city_id
    having bool_and(
      (select count(*) from public.compare_city_fetches as f
       where f.reinfolib_code = c.reinfolib_code and f.trade_year between from_year and to_year) = to_year - from_year + 1
    )
  ) as done;

  delete from public.compare_city_market_stats as m where not (m.city_id = any (complete_ids));

  with stats as (
    select area_id as city_id, category,
      count(value)::integer as sample_count,
      percentile_cont(0.5) within group (order by value) as median_value,
      percentile_cont(0.25) within group (order by value) as p25_value,
      percentile_cont(0.75) within group (order by value) as p75_value
    from public.market_samples
    where area_kind = 'city'
      and value is not null
      and trade_year * 4 + trade_quarter - 1 between from_index and to_index
    group by area_id, category
  )
  insert into public.compare_city_market_stats as m (
    city_id, category, period_from, period_to, sample_count, median_value, p25_value, p75_value, source_id, computed_at
  )
  select cc.city_id, c.category, p_period_from, p_period_to,
    coalesce(s.sample_count, 0),
    s.median_value,
    -- 幅は土地だけ（地区と同じ。5章-4）
    case when c.category = 'land' then s.p25_value end,
    case when c.category = 'land' then s.p75_value end,
    'reinfolib_xit001',
    now()
  from unnest(complete_ids) as cc (city_id)
  cross join unnest(enum_range(null::public.market_category)) as c (category)
  left join stats as s on s.city_id = cc.city_id and s.category = c.category
  on conflict (city_id, category) do update set
    period_from = excluded.period_from,
    period_to = excluded.period_to,
    sample_count = excluded.sample_count,
    median_value = excluded.median_value,
    p25_value = excluded.p25_value,
    p75_value = excluded.p75_value,
    source_id = excluded.source_id,
    computed_at = excluded.computed_at;
  get diagnostics written = row_count;
  return written;
end;
$$;

comment on function public.refresh_compare_city_market_stats(text, text) is
  '指定した期間（地区の相場と同じ期間を渡す）の取引から、都市×種類の相場を compare_city_market_stats に入れ直す（041）。取り終えていない都市の行は消す。書いた行数を返す';

revoke execute on function public.refresh_compare_city_market_stats(text, text) from public, anon, authenticated;
grant execute on function public.refresh_compare_city_market_stats(text, text) to service_role;

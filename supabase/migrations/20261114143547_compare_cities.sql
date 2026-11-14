-- 041 いまの街と、くらべる：移住元に多い6都市と飯田市を、同じ出典・同じ定義の数字で並べるための入れ物
--
-- - compare_cities：比べる都市（飯田市も1行）。行は npm run compare:sql（data/compare/cities.csv）で入れる
-- - compare_city_stats：都市×指標の値。値はまさゆきさんが data/compare/stats.csv に手で入れる。空なら value は null（画面は「データ未取得」）
-- - compare_city_codes：都市の不動産取引を XIT001 で取るときの市区町村コード（Worker だけが読む）
-- 気象・水害・人口の出典は、国勢調査も含めてここで足す。国勢調査は既存の estat_census_small_area（町丁・字等の値を地区に合計したもの）とは
-- 集計がちがう（市区町村の人口等基本集計）ので、クレジットを正しく書くために別の行にする

create table public.compare_cities (
  id text primary key check (id ~ '^[a-z0-9_]+$'),
  name text not null,
  census_code text not null check (census_code ~ '^\d{5}$'),
  jma_station text not null,
  sort_order integer not null unique,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.compare_cities is '地区くらべ「いまの街と」で比べる都市と、飯田市（041）。行は npm run compare:sql で入れる';
comment on column public.compare_cities.id is 'コード上の識別子（tokyo・yokohama・…・iida）。iida は比べられる側（飯田市）';
comment on column public.compare_cities.name is '画面に出す名前（例：東京23区）';
comment on column public.compare_cities.census_code is '国勢調査の市区町村コード（東京23区は特別区部の 13100）';
comment on column public.compare_cities.jma_station is '平年値をとる気象官署の名前';
comment on column public.compare_cities.is_published is 'true の都市だけ画面から読める';

create trigger compare_cities_set_updated_at before update on public.compare_cities
  for each row execute function public.set_updated_at();

alter table public.compare_cities enable row level security;
revoke all on table public.compare_cities from anon, authenticated, service_role;
grant select, insert, update, delete on table public.compare_cities to service_role;
grant select on table public.compare_cities to anon;
create policy "anon can read published compare cities" on public.compare_cities
  for select to anon
  using (is_published);

create table public.compare_city_stats (
  city_id text not null references public.compare_cities (id) on delete cascade,
  metric_key text not null check (
    metric_key in ('precip_annual', 'rain30_days', 'wind10_days', 'snow_depth_max', 'flood_damage_10y', 'pop_density', 'under15_ratio')
  ),
  value numeric check (value >= 0),
  unit text not null,
  period_label text,
  source_id text references public.data_sources (id),
  checked_on date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (city_id, metric_key),
  -- 値を入れたら、対象期間・出典・確認日も必ず入れる（すべての数字に出典・対象時点・確認日。要件 7.2）。
  -- 値が空の行は、手で埋める前のひな形なので空のままでよい
  constraint compare_city_stats_value_has_source check (
    value is null or (coalesce(period_label, '') <> '' and source_id is not null and checked_on is not null)
  ),
  -- 割合は 0〜100
  check (metric_key <> 'under15_ratio' or value <= 100)
);

comment on table public.compare_city_stats is '都市×指標の値（041）。まさゆきさんが data/compare/stats.csv に手で入れ、npm run compare:sql で入れる。value が null なら「データ未取得」';
comment on column public.compare_city_stats.metric_key is 'precip_annual：1年の降水量／rain30_days：日降水量30mm以上の日数／wind10_days：日最大風速10m/s以上の日数／snow_depth_max：最深積雪／flood_damage_10y：水害の一般資産等被害額の直近10年の合計／pop_density：人口密度／under15_ratio：15歳未満の割合';
comment on column public.compare_city_stats.value is '値。単位は unit。水害被害額は万円（統計の千円から換算）';
comment on column public.compare_city_stats.period_label is '対象期間・対象時点（例：1991〜2020年、2014〜2023年、2020年10月1日現在）';
comment on column public.compare_city_stats.checked_on is 'まさゆきさんが値を確かめた日';
comment on column public.compare_city_stats.note is '備考（例：東京23区の水害被害額を特別区部の行で取ったか、23区の合計にしたか）';

create index compare_city_stats_source_id_idx on public.compare_city_stats (source_id);

create trigger compare_city_stats_set_updated_at before update on public.compare_city_stats
  for each row execute function public.set_updated_at();

alter table public.compare_city_stats enable row level security;
revoke all on table public.compare_city_stats from anon, authenticated, service_role;
grant select, insert, update, delete on table public.compare_city_stats to service_role;
grant select on table public.compare_city_stats to anon;
-- 公開した都市の行だけ。出典の付いた行は、その出典を公開するまで見えない（見えない行は画面で「データ未取得」）
create policy "anon can read stats of published compare cities" on public.compare_city_stats
  for select to anon
  using (
    exists (select 1 from public.compare_cities c where c.id = city_id and c.is_published)
    and (source_id is null or exists (select 1 from public.data_sources s where s.id = source_id and s.is_published))
  );

create table public.compare_city_codes (
  city_id text not null references public.compare_cities (id) on delete cascade,
  reinfolib_code text not null check (reinfolib_code ~ '^\d{5}$'),
  created_at timestamptz not null default now(),
  primary key (city_id, reinfolib_code)
);

comment on table public.compare_city_codes is '都市の不動産取引を XIT001 で取るときの市区町村コード（041）。政令市の市のコードが使えなければ区のコードを並べる。Worker だけが読む';

alter table public.compare_city_codes enable row level security;
revoke all on table public.compare_city_codes from anon, authenticated, service_role;
grant select, insert, update, delete on table public.compare_city_codes to service_role;

-- 出典。クレジットは各サイトの出典の記載例に合わせる（2026-11-14 に確かめた）
-- - 気象庁ホームページは「公共データ利用規約（第1.0版）」（https://www.jma.go.jp/jma/kishou/info/coment.html）。記載例「出典：気象庁ホームページ（URL）」
-- - e-Stat は「政府標準利用規約（第2.0版）」に準拠し CC BY 4.0 互換（https://www.e-stat.go.jp/terms-of-use）
-- 確認日は値を入れたときに compare:sql が stats.csv の確認日から入れる
insert into public.data_sources (id, name, publisher, source_url, license, credit_text, period_label, is_published)
values
  (
    'jma_climate_normals',
    '過去の気象データ検索 平年値（1991〜2020年）',
    '気象庁',
    'https://www.data.jma.go.jp/stats/etrn/index.php',
    '公共データ利用規約（第1.0版）',
    '出典：気象庁ホームページ（https://www.data.jma.go.jp/stats/etrn/index.php）の平年値を加工して作成（各都市の気象官署の値を抜き出し）',
    '1991〜2020年の平年値',
    true
  ),
  (
    'mlit_flood_statistics',
    '水害統計調査 水害原因別市区町村別一般資産等被害額',
    '国土交通省',
    'https://www.e-stat.go.jp/stat-search/files?toukei=00600590',
    '政府標準利用規約（第2.0版）（CC BY 4.0 互換）',
    '出典：「水害統計調査」（国土交通省）（政府統計の総合窓口（e-Stat） https://www.e-stat.go.jp/）を加工して作成（市ごとの一般資産等被害額を10年分合計し、千円を万円に換算）',
    null,
    true
  ),
  (
    'estat_census_basic',
    '令和2年国勢調査 人口等基本集計',
    '総務省統計局',
    'https://www.e-stat.go.jp/stat-search/files?toukei=00200521&tstat=000001136464',
    '政府標準利用規約（第2.0版）（CC BY 4.0 互換）',
    '出典：「令和2年国勢調査 人口等基本集計」（総務省統計局）（政府統計の総合窓口（e-Stat） https://www.e-stat.go.jp/）を加工して作成（市ごとの人口密度と15歳未満の割合を抜き出し）',
    '2020年10月1日現在（令和2年国勢調査）',
    true
  );

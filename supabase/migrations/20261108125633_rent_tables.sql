-- 034 借りて住むときの参考になる国の統計：地区の借家の世帯数と、飯田市の家賃の平均
--
-- 不動産情報ライブラリには家賃がない（売買の取引だけ）。「借りる」を選んだ人に数字を出すため、次の2つを入れる（2026-11-08 まさゆきさん決定）。
-- - housing_tenure：国勢調査 小地域集計の住宅の所有の関係別一般世帯数を、町丁・字等から4地区に合計したもの
-- - rent_averages：住宅・土地統計調査の、飯田市の民営借家の1か月あたりの家賃の平均（市全体の値。地区には分けられない）
-- 中身は npm run rent:sql が作るマイグレーション（*_rent_data.sql）で入れる

create table public.housing_tenure (
  district_id text not null references public.districts (id),
  as_of date not null,
  households_in_housing integer not null check (households_in_housing >= 0),
  owner_occupied integer not null check (owner_occupied >= 0),
  private_rented integer not null check (private_rented >= 0),
  source_id text not null references public.data_sources (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (district_id, as_of),
  -- 公営の借家・給与住宅・間借りの欄はなく、残りに入る
  check (owner_occupied + private_rented <= households_in_housing)
);

comment on table public.housing_tenure is '地区の住宅の所有の関係別一般世帯数（034）。国勢調査の町丁・字等の値を4地区に合計した。行は npm run rent:sql で作る';
comment on column public.housing_tenure.households_in_housing is '住宅に住む一般世帯の数（持ち家・民営借家のほか、公営の借家・給与住宅・間借りを含む）';
comment on column public.housing_tenure.private_rented is '民営の借家に住む一般世帯の数';

create index housing_tenure_source_id_idx on public.housing_tenure (source_id);

create trigger housing_tenure_set_updated_at before update on public.housing_tenure
  for each row execute function public.set_updated_at();

alter table public.housing_tenure enable row level security;
revoke all on table public.housing_tenure from anon, authenticated, service_role;
grant select, insert, update, delete on table public.housing_tenure to service_role;
grant select on table public.housing_tenure to anon;
create policy "anon can read housing tenure of published sources" on public.housing_tenure
  for select to anon
  using (exists (select 1 from public.data_sources s where s.id = source_id and s.is_published));

create table public.rent_averages (
  id bigint generated always as identity primary key,
  building_type text not null check (building_type in ('all', 'detached', 'apartment_wooden', 'apartment_non_wooden')),
  average_rent integer not null check (average_rent > 0),
  as_of date not null,
  source_id text not null references public.data_sources (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, building_type)
);

comment on table public.rent_averages is '飯田市の民営借家（専用住宅）の1か月あたりの家賃の平均（034）。延べ面積の総数・家賃0円を含まない。行は npm run rent:sql で作る';
comment on column public.rent_averages.building_type is 'all：民営借家全体／detached：一戸建／apartment_wooden：共同住宅（木造）／apartment_non_wooden：共同住宅（木造以外）';
comment on column public.rent_averages.average_rent is '1か月あたりの家賃の平均（円）。抽出の調査からの推計値';

create index rent_averages_source_id_idx on public.rent_averages (source_id);

create trigger rent_averages_set_updated_at before update on public.rent_averages
  for each row execute function public.set_updated_at();

alter table public.rent_averages enable row level security;
revoke all on table public.rent_averages from anon, authenticated, service_role;
grant select, insert, update, delete on table public.rent_averages to service_role;
grant select on table public.rent_averages to anon;
create policy "anon can read rent averages of published sources" on public.rent_averages
  for select to anon
  using (exists (select 1 from public.data_sources s where s.id = source_id and s.is_published));

-- 出典。どちらも政府標準利用規約で、出典を書けば使える（飯田市のオープンデータではないので市の了承はいらない）。
-- クレジットと対象時点は取り込みのたびに *_rent_data.sql が入れ直す
insert into public.data_sources (id, name, publisher, source_url, license, is_published)
values
  (
    'estat_census_housing_tenure',
    '国勢調査 小地域集計（町丁・字等別）住宅の所有の関係別一般世帯数',
    '総務省統計局',
    'https://www.e-stat.go.jp/gis/statmap-search?type=1',
    '政府標準利用規約（第2.0版）（CC BY 4.0 互換）',
    true
  ),
  (
    'estat_housing_land_survey_rent',
    '住宅・土地統計調査 民営借家の1か月当たり家賃',
    '総務省統計局',
    'https://www.e-stat.go.jp/stat-search/database?statdisp_id=0004021532',
    '政府標準利用規約（第2.0版）（CC BY 4.0 互換）',
    true
  );

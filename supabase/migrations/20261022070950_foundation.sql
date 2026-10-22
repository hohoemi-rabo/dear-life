-- 003 土台：権限の既定値・共通の型・更新日時・地区・出典・取得の記録・町名→地区の対応表
--
-- 権限のルール（要件 9.4・CLAUDE.md）
--   anon          : select のみ（画面に見せる表だけ）＋読み取りポリシー
--   service_role  : select, insert, update, delete（定期取得の Worker）
--   authenticated : 何も与えない（ログイン機能がない）

-- Supabase は public の新しいテーブル・関数に anon / authenticated の全権限を既定で付ける（2026-10-30 まで）。
-- 付けすぎを防ぐため既定を外し、テーブル・関数ごとに必要な権限だけを明示する
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public;

-- RLS を自動で有効にするイベントトリガー（ensure_rls）の関数。Supabase がプロジェクト作成時に public に置いたもので、
-- 既定のままだと SECURITY DEFINER のまま /rest/v1/rpc から呼べてしまう（advisors の警告）。
-- イベントトリガーの実行には EXECUTE 権限が要らないので、呼び出しの権限だけを外す。PGlite のテストでは存在しないので確かめてから行う
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;

-- 共通の型 ---------------------------------------------------------------

-- まさゆきさんが Table Editor で選ぶ値は、選択肢がそのまま読めるよう日本語にする
create type public.season as enum ('春', '夏', '秋', '冬');

-- 中心市街地の元の地区名（公民館の単位。要件 2.1・7.1）
create type public.chushin_area as enum ('丸山', '東野', '橋北', '橋南');

create type public.ingest_status as enum ('running', 'succeeded', 'failed');

-- 更新日時 ---------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- districts：対象の4地区 -------------------------------------------------

create table public.districts (
  id text primary key check (id ~ '^[a-z_]+$'),
  name text not null unique,
  sort_order smallint not null unique,
  area_description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.districts is '対象の4地区（要件 2.1）。行はマイグレーションで入れる';
comment on column public.districts.area_description is '地区の範囲の説明（画面に出す）';

create trigger districts_set_updated_at before update on public.districts
  for each row execute function public.set_updated_at();

alter table public.districts enable row level security;
revoke all on table public.districts from anon, authenticated, service_role;
grant select, insert, update, delete on table public.districts to service_role;
grant select on table public.districts to anon;
create policy "anon can read districts" on public.districts
  for select to anon using (true);

-- data_sources：データごとの出典・対象時点・取得日/確認日 ---------------

create table public.data_sources (
  id text primary key check (id ~ '^[a-z0-9_]+$'),
  name text not null,
  publisher text not null,
  source_url text check (source_url ~ '^https?://'),
  license text,
  credit_text text,
  period_label text,
  fetched_at timestamptz,
  checked_on date,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.data_sources is 'データごとの出典（要件 7.2・7.3）。fetched_at も checked_on も空なら「データ未取得」';
comment on column public.data_sources.id is 'コード上の識別子（例：reinfolib_xit001、iida_evacuation_sites）';
comment on column public.data_sources.name is 'データ名（画面に出す）';
comment on column public.data_sources.publisher is '提供元';
comment on column public.data_sources.license is 'ライセンス（例：PDL1.0、CC BY 4.0）';
comment on column public.data_sources.credit_text is '画面に出すクレジット表記（要件 7.3）';
comment on column public.data_sources.period_label is '対象期間・対象時点の表記（例：2021年第1四半期〜2026年第1四半期）';
comment on column public.data_sources.fetched_at is '自動取得した日時';
comment on column public.data_sources.checked_on is '手作業で確かめた日';
comment on column public.data_sources.is_published is '利用条件を確かめたものだけ true。false のデータは画面から読めない（データ未取得の扱い）';

create trigger data_sources_set_updated_at before update on public.data_sources
  for each row execute function public.set_updated_at();

alter table public.data_sources enable row level security;
revoke all on table public.data_sources from anon, authenticated, service_role;
grant select, insert, update, delete on table public.data_sources to service_role;
grant select on table public.data_sources to anon;
create policy "anon can read published data sources" on public.data_sources
  for select to anon using (is_published);

-- ingest_runs：定期取得の実行記録（非公開） -------------------------------

create table public.ingest_runs (
  id bigint generated always as identity primary key,
  job text not null,
  source_id text references public.data_sources (id),
  status public.ingest_status not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_written integer check (rows_written >= 0),
  external_calls integer check (external_calls >= 0),
  error_message text,
  progress jsonb,
  constraint ingest_runs_finished_iff_done check ((status = 'running') = (finished_at is null))
);

comment on table public.ingest_runs is '定期取得の実行記録（005）。画面には出さない';
comment on column public.ingest_runs.job is '実行した処理の名前（例：transactions、school_districts）';
comment on column public.ingest_runs.progress is '数日に分けて取り込むときの続きの位置（9.3 の呼び出し回数の上限のため）';

create index ingest_runs_job_started_at_idx on public.ingest_runs (job, started_at desc);
create index ingest_runs_source_id_idx on public.ingest_runs (source_id);

alter table public.ingest_runs enable row level security;
revoke all on table public.ingest_runs from anon, authenticated, service_role;
grant select, insert, update, delete on table public.ingest_runs to service_role;

-- town_district_map：町名 → 地区（004 で CSV から入れる） ---------------

create table public.town_district_map (
  town_name text primary key,
  city_district text not null,
  district_id text references public.districts (id),
  chushin_area public.chushin_area,
  certainty text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint town_district_map_chushin_area_only_chushin check (chushin_area is null or district_id = 'chushin')
);

comment on table public.town_district_map is '町名→地区の対応表（data/iida_district_map.csv。要件 2.1）。対象外の地区の町名も入れる';
comment on column public.town_district_map.city_district is '飯田市の地区名（対象外の地区も含む。例：松尾）';
comment on column public.town_district_map.district_id is '対象4地区のときだけ入る。対象外は null（集計から外す）';
comment on column public.town_district_map.chushin_area is '中心市街地の元の地区名。わかるものだけ';

create index town_district_map_district_id_idx on public.town_district_map (district_id);

create trigger town_district_map_set_updated_at before update on public.town_district_map
  for each row execute function public.set_updated_at();

alter table public.town_district_map enable row level security;
revoke all on table public.town_district_map from anon, authenticated, service_role;
grant select, insert, update, delete on table public.town_district_map to service_role;
grant select on table public.town_district_map to anon;
create policy "anon can read town district map" on public.town_district_map
  for select to anon using (true);

-- unmapped_towns：対応表にない町名（非公開） ------------------------------

create table public.unmapped_towns (
  town_name text not null,
  source_id text not null references public.data_sources (id),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  occurrences integer not null default 1 check (occurrences >= 1),
  resolved_at timestamptz,
  primary key (town_name, source_id)
);

comment on table public.unmapped_towns is '対応表にない町名の記録（要件 5章-2）。管理者への通知に使う。画面には出さない';
comment on column public.unmapped_towns.resolved_at is '対応表に町名を足して反映した日時';

create index unmapped_towns_source_id_idx on public.unmapped_towns (source_id);

alter table public.unmapped_towns enable row level security;
revoke all on table public.unmapped_towns from anon, authenticated, service_role;
grant select, insert, update, delete on table public.unmapped_towns to service_role;

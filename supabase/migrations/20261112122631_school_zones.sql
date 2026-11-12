-- 039 町名ごとに通う公立の小学校・中学校（通学区域）。カルテの子育て・学校の「学区」のタブと、地区くらべ・くらしの学区に出す。
-- 飯田市教育委員会「飯田市立小学校及び中学校の通学区域に関する規則」の別表から作る。
-- 国の学区の範囲（school_districts。XKT004・XKT005）は線の細かさの誤差で境目の町を取り違えるので、通う学校はこちらで決め、
-- 国の範囲は地図の塗り分けにだけ使う（2026-11-12 まさゆきさん）。
-- 市全体の町を入れ、画面は4地区だけを出す。中身は npm run school-zones:sql が作るマイグレーション（*_school_zones_data.sql）で入れる

create table public.school_zones (
  town_name text not null,
  -- 対応表（town_district_map）の地区名。4地区の外の町も入れる
  city_district text not null,
  -- 対象4地区のときだけ入る
  district_id text references public.districts (id),
  -- 2校のときは「どちらかを選べる」か、町の一部で分かれる（is_partial）
  elementary_schools text[] not null check (cardinality(elementary_schools) >= 1),
  junior_high_schools text[] not null check (cardinality(junior_high_schools) >= 1),
  -- 別表で「〇〇の一部」と書かれた町。番地ごとの分け方は別表に書いていない
  is_partial boolean not null,
  -- 別表に初めて出た順
  sort_order smallint not null,
  source_id text not null references public.data_sources (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (source_id, town_name)
);

comment on table public.school_zones is '町名ごとに通う公立の小学校・中学校（039）。市の通学区域の規則の別表から npm run school-zones:sql で作る';
comment on column public.school_zones.is_partial is '別表で「〇〇の一部」と書かれた町。学校は町の中の場所によって分かれる';

create index school_zones_district_id_idx on public.school_zones (district_id);

create trigger school_zones_set_updated_at before update on public.school_zones
  for each row execute function public.set_updated_at();

alter table public.school_zones enable row level security;
revoke all on table public.school_zones from anon, authenticated, service_role;
grant select, insert, update, delete on table public.school_zones to service_role;
grant select on table public.school_zones to anon;
create policy "anon can read school zones of published sources" on public.school_zones
  for select to anon
  using (exists (select 1 from public.data_sources s where s.id = source_id and s.is_published));

-- 出典。市の規則は著作権の対象にならない（著作権法13条1号）ので、出典を書いて使う（2026-11-12 まさゆきさん了承）。
-- クレジットと対象時点は取り込みのたびに *_school_zones_data.sql が入れ直す
insert into public.data_sources (id, name, publisher, source_url, license, is_published)
values (
  'iida_school_zone_rule',
  '飯田市立小学校及び中学校の通学区域に関する規則 別表',
  '飯田市教育委員会',
  'https://www.city.iida.lg.jp/reiki_int/reiki_honbun/e706RG00000252.html',
  '著作権の対象外（著作権法第13条第1号）',
  true
);

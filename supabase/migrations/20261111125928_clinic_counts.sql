-- 037 地区の診療所（クリニック）の数。カルテの交通「用事の場所」に「診療所（クリニック）{N}か所」と出す（バスの本数は出さない）。
-- 厚生労働省「医療情報ネット（ナビイ）」のオープンデータで、飯田市の診療所を住所で4地区に振り分けて数える
-- （Google マップで数えた目安は、地図の情報を写して使うことを利用規約が制限しているので使わない。2026-11-11 まさゆきさん）。
-- 中身は npm run clinics:sql が作るマイグレーション（*_clinic_counts_data.sql）で入れる

create table public.clinic_counts (
  district_id text not null references public.districts (id),
  as_of date not null,
  clinic_count smallint not null check (clinic_count >= 0),
  -- 健診の施設と、施設に住む人のための診療所（data/clinic_exclusions.csv）。数には入れない
  excluded_count smallint not null check (excluded_count >= 0),
  source_id text not null references public.data_sources (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (district_id, source_id)
);

comment on table public.clinic_counts is '地区の診療所（クリニック）の数（037）。国の医療機関の一覧を住所で4地区に振り分けた。行は npm run clinics:sql で作る';
comment on column public.clinic_counts.as_of is '国の一覧の時点（年2回、6月1日・12月1日）';
comment on column public.clinic_counts.excluded_count is '一覧にあるが数えなかった診療所の数（健診の施設・施設に住む人のための診療所）';

create index clinic_counts_source_id_idx on public.clinic_counts (source_id);

create trigger clinic_counts_set_updated_at before update on public.clinic_counts
  for each row execute function public.set_updated_at();

alter table public.clinic_counts enable row level security;
revoke all on table public.clinic_counts from anon, authenticated, service_role;
grant select, insert, update, delete on table public.clinic_counts to service_role;
grant select on table public.clinic_counts to anon;
create policy "anon can read clinic counts of published sources" on public.clinic_counts
  for select to anon
  using (exists (select 1 from public.data_sources s where s.id = source_id and s.is_published));

-- 出典。公共データ利用規約（PDL1.0）で、出典を書けば使える（飯田市のオープンデータではないので市の了承はいらない）。
-- クレジットと対象時点は取り込みのたびに *_clinic_counts_data.sql が入れ直す
insert into public.data_sources (id, name, publisher, source_url, license, is_published)
values (
  'mhlw_medical_clinics',
  '医療情報ネット（ナビイ）オープンデータ 診療所の施設票',
  '厚生労働省',
  'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryou/newpage_43373.html',
  '公共データ利用規約（第1.0版）（PDL1.0）',
  true
);

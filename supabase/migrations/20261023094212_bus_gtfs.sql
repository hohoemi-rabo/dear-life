-- 010 バス（GTFS-JP）：冬・車0台の「おでかけ」の便と本数、取り込んだフィードの版、出典
--
-- バス停は facilities（kind = 'bus_stop'）に入れる。便と本数は取り込みのときに計算して bus_outings に入れ、画面では計算しない（要件 6.3）。
-- 中身は npm run bus:sql が作るマイグレーション（*_bus_gtfs_data.sql）で入れる（手順は docs/010_ingest-bus-gtfs.md）

-- bus_outings：地区ごとのおでかけの便と本数 -------------------------------

create table public.bus_outings (
  id bigint generated always as identity primary key,
  district_id text not null references public.districts (id),
  sort_order smallint not null check (sort_order > 0),
  day_type text not null check (day_type in ('平日', '土曜', '日曜')),
  service_date date not null,
  origin_stop_name text not null,
  destination_stop_name text not null,
  depart_after text not null check (depart_after ~ '^\d{2}:\d{2}$'),
  return_after text not null check (return_after ~ '^\d{2}:\d{2}$'),
  status text not null check (status in ('available', 'no_outbound', 'no_return')),
  outbound_departure text check (outbound_departure ~ '^\d{2}:\d{2}$'),
  outbound_arrival text check (outbound_arrival ~ '^\d{2}:\d{2}$'),
  outbound_route_name text,
  return_departure text check (return_departure ~ '^\d{2}:\d{2}$'),
  return_arrival text check (return_arrival ~ '^\d{2}:\d{2}$'),
  return_route_name text,
  next_return_departure text check (next_return_departure ~ '^\d{2}:\d{2}$'),
  next_return_arrival text check (next_return_arrival ~ '^\d{2}:\d{2}$'),
  next_return_route_name text,
  outbound_trips_per_day smallint not null check (outbound_trips_per_day >= 0),
  return_trips_per_day smallint not null check (return_trips_per_day >= 0),
  origin_departures_per_day smallint not null check (origin_departures_per_day >= 0),
  valid_until date not null,
  source_id text not null references public.data_sources (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (district_id, sort_order),
  constraint bus_outings_trips_match_status check (
    (outbound_departure is not null) = (status <> 'no_outbound')
    and (return_departure is not null) = (status = 'available')
    and (next_return_departure is null or return_departure is not null)
    and (outbound_departure is null) = (outbound_arrival is null)
    and (outbound_departure is null) = (outbound_route_name is null)
    and (return_departure is null) = (return_arrival is null)
    and (return_departure is null) = (return_route_name is null)
    and (next_return_departure is null) = (next_return_arrival is null)
    and (next_return_departure is null) = (next_return_route_name is null)
  ),
  constraint bus_outings_date_within_validity check (service_date <= valid_until)
);

comment on table public.bus_outings is '冬・車0台の場面のおでかけ（010・要件 6.3）。乗り場から行き先への直通便だけ。行は npm run bus:sql で作る';
comment on column public.bus_outings.sort_order is '地区の中での並び順。場面には 1 を使う';
comment on column public.bus_outings.service_date is '時刻表を見た日（冬の、その曜日に当たる日）。画面に「◯月◯日（土）の時刻表」と出す';
comment on column public.bus_outings.depart_after is '行きはこの時刻以降に出る便（HH:MM）';
comment on column public.bus_outings.return_after is '帰りはこの時刻以降（かつ行きの到着より後）に出る便（HH:MM）';
comment on column public.bus_outings.status is 'available：行き・帰りとも見つかった／no_outbound：行きの便がない／no_return：帰りの便がない。どちらも「この条件で使える便は見つかりませんでした」';
comment on column public.bus_outings.outbound_departure is '時刻は GTFS の書き方（HH:MM）。翌日にかかる便は 24 時以上になる';
comment on column public.bus_outings.outbound_trips_per_day is 'その日の、乗り場から行き先への直通便の数';
comment on column public.bus_outings.return_trips_per_day is 'その日の、行き先から乗り場への直通便の数';
comment on column public.bus_outings.origin_departures_per_day is 'その日に乗り場から乗れる便の数（行き先を問わない）';
comment on column public.bus_outings.valid_until is '使ったフィードの有効期間の終わり（いちばん早いもの）。過ぎたら画面は「データ未取得」にする';

create index bus_outings_source_id_idx on public.bus_outings (source_id);

create trigger bus_outings_set_updated_at before update on public.bus_outings
  for each row execute function public.set_updated_at();

alter table public.bus_outings enable row level security;
revoke all on table public.bus_outings from anon, authenticated, service_role;
grant select, insert, update, delete on table public.bus_outings to service_role;
grant select on table public.bus_outings to anon;
create policy "anon can read bus outings of published sources" on public.bus_outings
  for select to anon
  using (exists (select 1 from public.data_sources s where s.id = source_id and s.is_published));

-- gtfs_feeds：取り込んだフィードの版（非公開） ----------------------------

-- 定期取得の Worker が、GTFS データリポジトリに新しい版が出たかをこれと比べて確かめる
create table public.gtfs_feeds (
  feed_id text primary key,
  organization_id text not null,
  feed_name text not null,
  source_id text not null references public.data_sources (id),
  file_uid text not null,
  feed_version text,
  valid_from date not null,
  valid_to date not null check (valid_from <= valid_to),
  published_at timestamptz not null,
  imported_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.gtfs_feeds is '取り込んだ GTFS のフィードと版（010）。新しい版が出たかの確認に使う。画面には出さない';
comment on column public.gtfs_feeds.file_uid is 'GTFS データリポジトリの gtfs_file_uid（版ごとに変わる）';
comment on column public.gtfs_feeds.published_at is 'リポジトリで公開された日時';

create index gtfs_feeds_source_id_idx on public.gtfs_feeds (source_id);

create trigger gtfs_feeds_set_updated_at before update on public.gtfs_feeds
  for each row execute function public.set_updated_at();

alter table public.gtfs_feeds enable row level security;
revoke all on table public.gtfs_feeds from anon, authenticated, service_role;
grant select, insert, update, delete on table public.gtfs_feeds to service_role;

-- 出典 ---------------------------------------------------------------------

-- 3つのフィード（市民バス・信南交通・飯田☆中津川線）をまとめて1つの出典にする（どれも同じ提供元・CC BY 4.0）。
-- クレジット・対象期間は取り込みのたびに *_bus_gtfs_data.sql が書き直す。
-- 公開フラグは、画面にクレジットを出せるようになったら（022）立てる
insert into public.data_sources (id, name, publisher, source_url, license)
values (
  'gtfs_minamishinshu_bus',
  '南信州のバスの時刻表（GTFS-JP）',
  '南信州地域交通問題協議会（南信州広域連合）',
  'https://gtfs-data.jp/',
  'CC BY 4.0'
);

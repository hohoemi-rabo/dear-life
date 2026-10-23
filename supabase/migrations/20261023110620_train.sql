-- 026 電車（JR飯田線）：4地区の駅ごとの発車時刻と、駅・時刻の出典
--
-- 駅は facilities（kind = 'train_station'）に入れる。時刻は駅と出典（利用条件）が違うので、別の表に分ける。
-- 中身は npm run train:sql が作るマイグレーション（*_train_data.sql）で入れる（手順は docs/026_train-stations-timetable.md）

-- train_departures：駅ごとの発車時刻 ---------------------------------------

create table public.train_departures (
  id bigint generated always as identity primary key,
  district_id text not null references public.districts (id),
  station_name text not null,
  direction text not null check (direction in ('上り', '下り')),
  departure text not null check (departure ~ '^\d{2}:\d{2}$'),
  train_type text not null,
  train_id text not null,
  source_id text not null references public.data_sources (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (station_name, direction, train_id)
);

comment on table public.train_departures is '4地区の駅を発車する列車（026）。その駅止まり・通過の列車は入れない。行は npm run train:sql で作る';
comment on column public.train_departures.station_name is 'facilities（kind = train_station）の name と同じ駅名';
comment on column public.train_departures.direction is '上り：豊橋方面／下り：辰野方面';
comment on column public.train_departures.departure is '発車時刻（HH:MM）。平日・土休日の区別はない（元の時刻表に区別がないため）';
comment on column public.train_departures.train_type is '普通・快速 みすず・特急 ワイドビュー伊那路2号 など（元の時刻表の表記）';
comment on column public.train_departures.train_id is '時刻の CSV の列の名前（U01・D01 など）。同じ列車を駅どうしで結びつける';

create index train_departures_district_id_idx on public.train_departures (district_id);
create index train_departures_source_id_idx on public.train_departures (source_id);

create trigger train_departures_set_updated_at before update on public.train_departures
  for each row execute function public.set_updated_at();

alter table public.train_departures enable row level security;
revoke all on table public.train_departures from anon, authenticated, service_role;
grant select, insert, update, delete on table public.train_departures to service_role;
grant select on table public.train_departures to anon;
create policy "anon can read train departures of published sources" on public.train_departures
  for select to anon
  using (exists (select 1 from public.data_sources s where s.id = source_id and s.is_published));

-- 出典 ---------------------------------------------------------------------

-- 駅：SENA のサイトの基本のライセンスが CC BY 2.1 JP（利用規約 第1条）。公開フラグは、画面にクレジットを出せるようになったら（022）立てる。
-- 時刻：飯田市のページの PDF をもとにした。まさゆきさんが市の許可を取るまで公開しない（ライセンスは許可の中身が決まってから書く）
insert into public.data_sources (id, name, publisher, source_url, license)
values
  (
    'sena_iida_line_stations',
    'JR飯田線の駅',
    '三遠南信地域連携ビジョン推進会議（SENA）',
    'https://sena-opendata.jp/dataset/detail/35',
    'CC BY 2.1 JP'
  ),
  (
    'iida_jr_timetable',
    'JR飯田線 時刻表（上片桐〜平岡）',
    '飯田市',
    'https://www.city.iida.lg.jp/soshiki/10/p0182.html',
    null
  );

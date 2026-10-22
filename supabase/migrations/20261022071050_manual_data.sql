-- 003 手入力データ：支援制度と地区の行事（012。まさゆきさんが Table Editor で入力する）
-- 選択肢は Table Editor でそのまま選べるよう日本語の enum にする。公開フラグが立ったものだけ anon が読める

create type public.support_category as enum ('移住', '子育て', '住まい', 'その他');

create type public.event_scope as enum ('地区全体', '区ごと');

create type public.event_participation as enum ('自由参加', '区や組ごと', '未確認');

-- 行事の絵の種類（013 のドット絵に対応させる）
create type public.event_art as enum ('祭り', '運動会', '文化祭', 'その他');

-- support_programs：移住・子育て関連の支援制度 ---------------------------

create table public.support_programs (
  id bigint generated always as identity primary key,
  name text not null,
  summary text not null,
  category public.support_category not null,
  official_url text not null check (official_url ~ '^https?://'),
  checked_on date not null,
  sort_order smallint not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.support_programs is '支援制度（要件 7章）。「対象になります」と判定せず、必ず公式ページへつなぐ。月に1回確認して checked_on を更新する';
comment on column public.support_programs.name is '制度名';
comment on column public.support_programs.summary is '概要（評価や判定を書かない）';
comment on column public.support_programs.official_url is '公式ページのリンク';
comment on column public.support_programs.checked_on is '公式サイトで最後に確かめた日';
comment on column public.support_programs.sort_order is '画面での並び順（小さいほど先）';
comment on column public.support_programs.is_published is '確認が済んだら true にする。true の行だけ画面に出る';

create trigger support_programs_set_updated_at before update on public.support_programs
  for each row execute function public.set_updated_at();

alter table public.support_programs enable row level security;
revoke all on table public.support_programs from anon, authenticated, service_role;
grant select, insert, update, delete on table public.support_programs to service_role;
grant select on table public.support_programs to anon;
create policy "anon can read published support programs" on public.support_programs
  for select to anon using (is_published);

-- district_events：地区の行事（要件 7.1） --------------------------------

create table public.district_events (
  id bigint generated always as identity primary key,
  district_id text not null references public.districts (id),
  chushin_area public.chushin_area,
  name text not null,
  season public.season not null,
  timing_note text not null,
  scope public.event_scope not null,
  participation public.event_participation not null default '未確認',
  participation_note text,
  is_for_children boolean not null default false,
  art public.event_art not null default 'その他',
  source_note text not null,
  checked_on date not null,
  sort_order smallint not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 中心市街地の行事は公民館ごとなので、元の地区名を必ず持つ（要件 2.1）
  constraint district_events_chushin_area_required check ((district_id = 'chushin') = (chushin_area is not null))
);

comment on table public.district_events is '地区の行事（要件 7.1）。個人名・個人の連絡先、「義務」「負担が重い」などの評価を書かない';
comment on column public.district_events.chushin_area is '中心市街地のときの元の地区名（丸山・東野・橋北・橋南）。ほかの地区では空';
comment on column public.district_events.name is '行事名（地区で使われている名前）';
comment on column public.district_events.timing_note is '時期（例：例年10月ごろ）。日付は年によって変わるので持たない';
comment on column public.district_events.scope is '地区全体／区（分館）ごと。区ごとなら画面で「区によって違います」と出す';
comment on column public.district_events.participation is '参加のしかた。わからなければ「未確認」';
comment on column public.district_events.participation_note is '参加のしかたの補足（事実だけ）';
comment on column public.district_events.is_for_children is '子ども向けの行事なら true（秋は子どもありのとき優先して出す）';
comment on column public.district_events.art is '行事の絵の種類';
comment on column public.district_events.source_note is '出典：資料名と年度、または問い合わせ先';
comment on column public.district_events.checked_on is '最後に確かめた日';
comment on column public.district_events.sort_order is '同じ地区・季節の中での並び順（小さいほど先）';
comment on column public.district_events.is_published is '確認が済んだら true にする。true の行だけ画面に出る';

create index district_events_district_season_idx on public.district_events (district_id, season);

create trigger district_events_set_updated_at before update on public.district_events
  for each row execute function public.set_updated_at();

alter table public.district_events enable row level security;
revoke all on table public.district_events from anon, authenticated, service_role;
grant select, insert, update, delete on table public.district_events to service_role;
grant select on table public.district_events to anon;
create policy "anon can read published district events" on public.district_events
  for select to anon using (is_published);

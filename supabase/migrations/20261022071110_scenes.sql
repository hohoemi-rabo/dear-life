-- 003 場面のひな形（要件 6章・9.5。017 で中身を下書きし、まさゆきさんが確認して公開する）

create type public.sentence_kind as enum ('データ', '地区の情報', '想定');

create type public.housing_choice as enum ('買う・新しめ', '買う・古め', '借りる');

-- 場面の分岐は「0台」と「1台以上・未選択」の2つ（要件 4章）
create type public.car_choice as enum ('車なし', '車あり・未選択');

create type public.karte_card as enum ('住まい', '子育て・学校', '交通', '防災', '人口', '支援制度');

-- scene_templates：季節×条件ごとのひな形 ---------------------------------

create table public.scene_templates (
  id bigint generated always as identity primary key,
  season public.season not null,
  has_children boolean,
  car public.car_choice,
  housing public.housing_choice,
  title text not null,
  reviewed_on date,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 同じ条件のひな形は1つだけ（同じ条件なら何度見ても同じ文章。要件 6.3）
  constraint scene_templates_condition_unique unique nulls not distinct (season, has_children, car, housing),
  constraint scene_templates_review_before_publish check (not is_published or reviewed_on is not null)
);

comment on table public.scene_templates is '場面のひな形（要件 6.3）。条件の列が空なら「どちらでも」';
comment on column public.scene_templates.has_children is '子どもあり＝true、なし＝false、空＝どちらでも';
comment on column public.scene_templates.car is '車の条件。空＝どちらでも';
comment on column public.scene_templates.housing is '家の条件。空＝どちらでも';
comment on column public.scene_templates.title is '管理用の名前（例：春・子どもあり・入園入学）';
comment on column public.scene_templates.reviewed_on is 'まさゆきさんが確認した日。公開するには必須';
comment on column public.scene_templates.is_published is '確認が済んだら true にする。true のひな形だけ画面に出る';

create trigger scene_templates_set_updated_at before update on public.scene_templates
  for each row execute function public.set_updated_at();

alter table public.scene_templates enable row level security;
revoke all on table public.scene_templates from anon, authenticated, service_role;
grant select, insert, update, delete on table public.scene_templates to service_role;
grant select on table public.scene_templates to anon;
create policy "anon can read published scene templates" on public.scene_templates
  for select to anon using (is_published);

-- scene_sentences：ひな形の文（3〜5文） -----------------------------------

create table public.scene_sentences (
  id bigint generated always as identity primary key,
  template_id bigint not null references public.scene_templates (id) on delete cascade,
  position smallint not null check (position >= 1),
  kind public.sentence_kind not null,
  body text not null,
  karte_card public.karte_card,
  has_children boolean,
  car public.car_choice,
  housing public.housing_choice,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, position),
  -- 想定の文には数字・差し込み部分を入れない（要件 6.4）。施設名・評価が入っていないかは 017 のチェックで見る
  constraint scene_sentences_assumption_plain check (kind <> '想定' or body !~ '[0-9０-９{}｛｝]')
);

comment on table public.scene_sentences is 'ひな形の文。差し込み部分は本文の {地区名} {件数} などで表し、別の列には持たない';
comment on column public.scene_sentences.position is '文の並び順（1から）';
comment on column public.scene_sentences.kind is 'データ＝出典の印／地区の情報＝確認日／想定＝見た目を変える（要件 6.4）';
comment on column public.scene_sentences.karte_card is '「カルテで確かめる」で移るカード（F-14）。空ならリンクなし';
comment on column public.scene_sentences.has_children is 'この文だけの追加の条件（空＝条件なし）';
comment on column public.scene_sentences.car is 'この文だけの追加の条件（空＝条件なし）';
comment on column public.scene_sentences.housing is 'この文だけの追加の条件（例：冬・買う・古めの古い家の寒さ。空＝条件なし）';

create trigger scene_sentences_set_updated_at before update on public.scene_sentences
  for each row execute function public.set_updated_at();

alter table public.scene_sentences enable row level security;
revoke all on table public.scene_sentences from anon, authenticated, service_role;
grant select, insert, update, delete on table public.scene_sentences to service_role;
grant select on table public.scene_sentences to anon;
create policy "anon can read sentences of published scene templates" on public.scene_sentences
  for select to anon
  using (exists (select 1 from public.scene_templates t where t.id = template_id and t.is_published));

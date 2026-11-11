-- 037 用事の場所をエリアごとに：行き先の種類に 小学校・中学校・店 を足し、駅をやめる（駅はその駅を出る電車の本数を出すため、バスでは数えない）。
-- そばにバス停がない店は、バスでは数えずに「そばにバス停がないため、バスでは数えていません」と出す（has_stop）。
-- 店の名前と住所は各店の公式ページで確かめ、そのページを official_url に持つ（2026-11-11 まさゆきさん）。
-- 行は npm run bus:sql が入れ直す（行き先は data/bus_errands.csv）。古い行は種類の制約に合わないので先に消す

delete from public.bus_errands;

alter table public.bus_errands
  drop constraint bus_errands_kind_check,
  add column has_stop boolean not null default true,
  add column official_url text,
  add constraint bus_errands_kind_check check (kind in ('市役所', '病院', '小学校', '中学校', '店')),
  -- バス停がないのは店だけ。バス停がなければ行けるバス停も 0
  add constraint bus_errands_no_stop_only_store check (has_stop or (kind = '店' and reachable_stop_count = 0)),
  -- 公式ページは店のときだけ持つ
  add constraint bus_errands_official_url_only_store check ((kind = '店') = (official_url is not null)),
  add constraint bus_errands_official_url_https check (official_url is null or official_url like 'https://%');

alter table public.bus_errands alter column has_stop drop default;

comment on column public.bus_errands.has_stop is 'そばにバス停があるか。false の店はバスで数えていない（037）';
comment on column public.bus_errands.official_url is '店の名前と住所を確かめた公式ページ（店のときだけ。037）';

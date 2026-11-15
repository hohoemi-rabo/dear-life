-- 地区くらべ「いまの街と」（041）：水害被害額を「直近10年の合計（万円）」から「1人あたり・1年あたり（円）」に変える（2026-11-16 まさゆきさん）。
-- 被害額は街が大きいほど大きくなり、東京23区と飯田市をそのまま並べると「大きな街は水害が多い」ように見えるため、人口で割る。
-- 1年あたり＝直近10年の平均。1人あたり＝令和2年国勢調査の人口で割る。値はまだ入っていない（どの行も null）
alter table public.compare_city_stats drop constraint compare_city_stats_metric_key_check;

update public.compare_city_stats
set metric_key = 'flood_damage_per_person', unit = '円'
where metric_key = 'flood_damage_10y';

alter table public.compare_city_stats add constraint compare_city_stats_metric_key_check check (
  metric_key in ('precip_annual', 'rain30_days', 'wind10_days', 'snow_depth_max', 'flood_damage_per_person', 'pop_density', 'under15_ratio')
);

comment on column public.compare_city_stats.metric_key is 'precip_annual：1年の降水量／rain30_days：日降水量30mm以上の日数／wind10_days：日最大風速10m/s以上の日数／snow_depth_max：最深積雪／flood_damage_per_person：水害の一般資産等被害額の1人あたり・1年あたり（直近10年の平均を令和2年国勢調査の人口で割る）／pop_density：人口密度／under15_ratio：15歳未満の割合';
comment on column public.compare_city_stats.value is '値。単位は unit。水害被害額は円（1人あたり・1年あたり）';

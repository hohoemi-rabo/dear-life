-- 007 market_stats が要件 5.1（data/iida_district_summary.csv の4地区）と一致するかを確かめる。
-- 2021Q1〜2026Q1 で集計したあとに Supabase MCP の execute_sql などで流す。一致しない行だけが返る（0行なら全項目一致）。
-- 5.1 の値は CSV と同じく円単位の整数（戸建ては万円）に丸めて比べる
with expected (district_id, category, sample_count, median_value, p25_value, p75_value) as (
  values
    ('kamisato', 'land', 202, 28000, 19000, 33000),
    ('kamisato', 'house_built_within_20y', 9, 39000000, null, null),
    ('kamisato', 'house_built_over_20y', 39, 8600000, null, null),
    ('chushin', 'land', 117, 31000, 17000, 39000),
    ('chushin', 'house_built_within_20y', 6, 27500000, null, null),
    ('chushin', 'house_built_over_20y', 68, 7000000, null, null),
    ('kanae', 'land', 96, 24000, 17000, 30000),
    ('kanae', 'house_built_within_20y', 12, 33500000, null, null),
    ('kanae', 'house_built_over_20y', 38, 6250000, null, null),
    ('igara', 'land', 90, 12500, 4600, 19750),
    ('igara', 'house_built_within_20y', 11, 25000000, null, null),
    ('igara', 'house_built_over_20y', 34, 6500000, null, null)
),
actual as (
  select district_id, category::text as category, period_from, period_to, sample_count,
    -- CSV は戸建てを万円で出しているので、戸建ては万円に丸めてから円に戻す
    case when category = 'land' then round(median_value) else round(median_value / 10000) * 10000 end as median_value,
    round(p25_value) as p25_value,
    round(p75_value) as p75_value
  from public.market_stats
)
select e.district_id, e.category,
  a.period_from || '〜' || a.period_to as period,
  e.sample_count as expected_count, a.sample_count as actual_count,
  e.median_value as expected_median, a.median_value as actual_median,
  e.p25_value as expected_p25, a.p25_value as actual_p25,
  e.p75_value as expected_p75, a.p75_value as actual_p75
from expected as e
left join actual as a using (district_id, category)
where a.district_id is null
  or a.period_from <> '2021Q1' or a.period_to <> '2026Q1'
  or a.sample_count <> e.sample_count
  or a.median_value is distinct from e.median_value
  or a.p25_value is distinct from e.p25_value
  or a.p75_value is distinct from e.p75_value
order by e.district_id, e.category;

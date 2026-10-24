-- 007 相場の集計：real_estate_transactions から地区ごとの相場を計算して market_stats に入れ直す（要件 5章-1〜5・9.3）
--
-- 計算方法は aggregate_iida.py に合わせる。pandas の median()・quantile() は線形補間なので percentile_cont を使う。
-- 値は丸めずに保存し、丸め（「2.8万円」など）は画面で行う

create function public.refresh_market_stats(p_period_from text, p_period_to text)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  from_index integer;
  to_index integer;
  written integer;
begin
  if p_period_from !~ '^\d{4}Q[1-4]$' or p_period_to !~ '^\d{4}Q[1-4]$' then
    raise exception '対象期間は 2021Q1 の形で渡す（%〜%）', p_period_from, p_period_to;
  end if;
  -- 四半期を通し番号にして比べる（年×4＋四半期−1）
  from_index := left(p_period_from, 4)::integer * 4 + right(p_period_from, 1)::integer - 1;
  to_index := left(p_period_to, 4)::integer * 4 + right(p_period_to, 1)::integer - 1;
  if from_index > to_index then
    raise exception '対象期間の始まり（%）が終わり（%）より後になっている', p_period_from, p_period_to;
  end if;

  with target as (
    -- 除外する取引（5章-3）と、対象4地区に振り分けられなかった取引（5章-2）を外す
    select t.*
    from public.real_estate_transactions as t
    where not t.is_excluded
      and t.district_id is not null
      and t.trade_year * 4 + t.trade_quarter - 1 between from_index and to_index
  ),
  samples as (
    -- 土地：㎡単価が空の行は総額÷面積で補う（5章-4）
    select district_id, 'land'::public.market_category as category,
      coalesce(unit_price_per_sqm, trade_price::numeric / area_sqm) as value
    from target
    where property_type = '宅地(土地)'
    union all
    -- 中古戸建て：用途に「住宅」を含むか空欄。築年数＝取引年−建築年で分け、建築年が不明なものは入れない（5章-5）
    select district_id,
      case when trade_year - building_year <= 20
        then 'house_built_within_20y'::public.market_category
        else 'house_built_over_20y'::public.market_category
      end,
      trade_price::numeric
    from target
    where property_type = '宅地(土地と建物)'
      and (use is null or use like '%住宅%')
      and building_year is not null
  ),
  stats as (
    select district_id, category,
      count(value)::integer as sample_count,
      percentile_cont(0.5) within group (order by value) as median_value,
      percentile_cont(0.25) within group (order by value) as p25_value,
      percentile_cont(0.75) within group (order by value) as p75_value
    from samples
    where value is not null
    group by district_id, category
  )
  -- 取引のない地区×種類も件数0の行にして、「データ未取得」と「該当なし」を区別できるようにする
  insert into public.market_stats as m (
    district_id, category, period_from, period_to, sample_count, median_value, p25_value, p75_value, source_id, computed_at
  )
  select d.id, c.category, p_period_from, p_period_to,
    coalesce(s.sample_count, 0),
    s.median_value,
    -- 幅は土地だけに出す（5章-4）
    case when c.category = 'land' then s.p25_value end,
    case when c.category = 'land' then s.p75_value end,
    'reinfolib_xit001',
    now()
  from public.districts as d
  cross join unnest(enum_range(null::public.market_category)) as c (category)
  left join stats as s on s.district_id = d.id and s.category = c.category
  on conflict (district_id, category) do update set
    period_from = excluded.period_from,
    period_to = excluded.period_to,
    sample_count = excluded.sample_count,
    median_value = excluded.median_value,
    p25_value = excluded.p25_value,
    p75_value = excluded.p75_value,
    source_id = excluded.source_id,
    computed_at = excluded.computed_at;
  get diagnostics written = row_count;
  return written;
end;
$$;

comment on function public.refresh_market_stats(text, text) is
  '指定した期間（両端を含む。例：2021Q1〜2026Q1）の取引から、地区×種類の相場を market_stats に入れ直す（007）。書いた行数を返す';

revoke execute on function public.refresh_market_stats(text, text) from public, anon, authenticated;
grant execute on function public.refresh_market_stats(text, text) to service_role;

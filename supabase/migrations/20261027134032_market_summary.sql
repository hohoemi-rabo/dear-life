-- 022 データについて：相場の集計で外した取引の件数を market_summary に入れ、screen_data() で画面に渡す（要件 5章-3・F-08）。
-- 取引の表（real_estate_transactions）は anon から読めないので、集計のときに件数だけを残す。
-- あわせて、不動産情報ライブラリの利用規約（PDL1.0 に関する重要情報）と国土数値情報の利用規約の出典記載例に合わせ、
-- 3つの出典のクレジットを直す。API 利用約款 第7条の文言は出典ごとではなくサービス全体の表示なので、画面（src/lib/credits.ts）で出す

-- market_summary：対象期間の取引の件数と、外した取引の理由ごとの件数（1行だけ） --

create table public.market_summary (
  id boolean primary key default true check (id),
  period_from text not null check (period_from ~ '^\d{4}Q[1-4]$'),
  period_to text not null check (period_to ~ '^\d{4}Q[1-4]$'),
  citywide_count integer not null check (citywide_count >= 0),
  district_count integer not null check (district_count >= 0),
  excluded_count integer not null check (excluded_count >= 0),
  mediation_count integer not null check (mediation_count >= 0),
  related_party_count integer not null check (related_party_count >= 0),
  adjacent_land_count integer not null check (adjacent_land_count >= 0),
  source_id text not null references public.data_sources (id),
  computed_at timestamptz not null default now(),
  check (period_from <= period_to),
  check (district_count <= citywide_count and excluded_count <= district_count)
);

comment on table public.market_summary is '相場の集計（007）の対象期間の取引件数と、外した取引の件数（要件 5章-3）。データについてページ（022）で出す。1行だけ';
comment on column public.market_summary.citywide_count is '対象期間の飯田市全体の取引件数（外した取引も含む）';
comment on column public.market_summary.district_count is 'そのうち4地区に振り分けた取引の件数（外した取引も含む）';
comment on column public.market_summary.excluded_count is '4地区の取引のうち、調停・競売等／関係者間取引／隣地の購入のどれかに当たり、集計から外した件数';
comment on column public.market_summary.mediation_count is '外した取引のうち「調停・競売等」の件数。1件が複数の理由に当たることがあるので、3つの合計は excluded_count と一致しないことがある';

create index market_summary_source_id_idx on public.market_summary (source_id);

alter table public.market_summary enable row level security;
revoke all on table public.market_summary from anon, authenticated, service_role;
grant select, insert, update, delete on table public.market_summary to service_role;
grant select on table public.market_summary to anon;
create policy "anon can read market summary of published sources" on public.market_summary
  for select to anon
  using (exists (select 1 from public.data_sources s where s.id = source_id and s.is_published));

-- refresh_market_stats：相場を入れ直すのと同じ期間で、件数も数え直す（ほかは 20261024063022_market_stats_refresh.sql と同じ）

create or replace function public.refresh_market_stats(p_period_from text, p_period_to text)
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

  -- 外した理由は、取引の事情（「調停・競売等、私道を含む取引」のように「、」でつながる）に含まれる語で数える。
  -- is_excluded を決める Worker（workers/ingest/src/jobs/transactions.ts の EXCLUDED_CIRCUMSTANCES）と同じ分け方
  with period_trades as (
    select t.district_id, t.is_excluded,
      array(select btrim(part) from unnest(string_to_array(coalesce(t.circumstances, ''), '、')) as part) as reasons
    from public.real_estate_transactions as t
    where t.trade_year * 4 + t.trade_quarter - 1 between from_index and to_index
  )
  insert into public.market_summary as ms (
    id, period_from, period_to, citywide_count, district_count, excluded_count,
    mediation_count, related_party_count, adjacent_land_count, source_id, computed_at
  )
  select true, p_period_from, p_period_to,
    count(*)::integer,
    count(*) filter (where district_id is not null)::integer,
    count(*) filter (where district_id is not null and is_excluded)::integer,
    count(*) filter (where district_id is not null and is_excluded and '調停・競売等' = any (reasons))::integer,
    count(*) filter (where district_id is not null and is_excluded and '関係者間取引' = any (reasons))::integer,
    count(*) filter (where district_id is not null and is_excluded and '隣地の購入' = any (reasons))::integer,
    'reinfolib_xit001',
    now()
  from period_trades
  on conflict (id) do update set
    period_from = excluded.period_from,
    period_to = excluded.period_to,
    citywide_count = excluded.citywide_count,
    district_count = excluded.district_count,
    excluded_count = excluded.excluded_count,
    mediation_count = excluded.mediation_count,
    related_party_count = excluded.related_party_count,
    adjacent_land_count = excluded.adjacent_land_count,
    source_id = excluded.source_id,
    computed_at = excluded.computed_at;

  return written;
end;
$$;

comment on function public.refresh_market_stats(text, text) is
  '指定した期間（両端を含む。例：2021Q1〜2026Q1）の取引から、地区×種類の相場を market_stats に、外した取引の件数を market_summary に入れ直す（007・022）。market_stats に書いた行数を返す';

-- 今の相場と同じ期間で件数を入れておく（相場がまだなければ何もしない）
select public.refresh_market_stats(period_from, period_to)
from (select period_from, period_to from public.market_stats limit 1) as current_period;

-- クレジット：不動産情報ライブラリの利用規約の出典記載例（「出典：国土交通省 不動産情報ライブラリ（URL）」と、加工したときの追加記載）
update public.data_sources
set credit_text = '出典：国土交通省 不動産情報ライブラリ（https://www.reinfolib.mlit.go.jp/）。「不動産価格（取引価格・成約価格）情報」（国土交通省）をもとに、地区ごとの真ん中の値・幅・件数を計算して作成'
where id = 'reinfolib_xit001';

-- 学区は国土数値情報なので、不動産情報ライブラリの利用規約ではなく国土数値情報の利用規約の記載例に合わせる。
-- 飯田市の学区は「オープンデータ公開・利用条件なし」（国土数値情報の市区町村別の利用条件の一覧、R5。2026-10-27 確認）
update public.data_sources
set credit_text = '出典：「国土数値情報（小学校区データ）」（国土交通省）（https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A27-2023.html）をもとに作成（不動産情報ライブラリの API で取得し、学区を地区ごとにまとめた）',
  license = '国土数値情報ダウンロードサイトコンテンツ利用規約（CC BY 4.0（一部制限）。飯田市は利用条件なし）'
where id = 'reinfolib_xkt004';

update public.data_sources
set credit_text = '出典：「国土数値情報（中学校区データ）」（国土交通省）（https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A32-2023.html）をもとに作成（不動産情報ライブラリの API で取得し、学区を地区ごとにまとめた）',
  license = '国土数値情報ダウンロードサイトコンテンツ利用規約（CC BY 4.0（一部制限）。飯田市は利用条件なし）'
where id = 'reinfolib_xkt005';

-- screen_data()：外した取引の件数（market_summary）を足す（ほかは 20261026134804_scene_sentence_fallback_source.sql と同じ）
create or replace function public.screen_data()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with
  -- 施設の欄と、画面に出す出典。学校・保育施設は市のデータを出す（XKT006・XKT007 は抜けの確認用。008・009）
  facility_sections (section, kind, source_id) as (
    values
      ('schools', 'school'::public.facility_kind, 'iida_education'),
      ('childcare', 'childcare'::public.facility_kind, 'iida_childcare'),
      ('after_school_clubs', 'after_school_club'::public.facility_kind, 'iida_childcare'),
      ('evacuation_sites', 'evacuation_site'::public.facility_kind, 'iida_evacuation'),
      ('public_facilities', 'public_facility'::public.facility_kind, 'iida_public_facilities'),
      ('bus_stops', 'bus_stop'::public.facility_kind, 'gtfs_minamishinshu_bus'),
      ('train_stations', 'train_station'::public.facility_kind, 'sena_iida_line_stations')
  ),
  facility_items as (
    select
      f.district_id,
      fs.section,
      jsonb_agg(
        jsonb_build_object('name', f.name, 'subkind', f.subkind, 'address', f.address)
          -- 夏の大雨の場面で、洪水・土砂災害に使える避難場所を選べるようにする
          || case when f.kind = 'evacuation_site' then jsonb_build_object('hazards', coalesce(f.attributes -> 'hazards', '[]'::jsonb)) else '{}'::jsonb end
        -- 並びは固定する（同じ条件なら同じ施設を例に出すため。照合順序の違いで本番とテストの並びが変わらないよう "C" にする）
        order by f.subkind collate "C" nulls first, f.name collate "C", f.id
      ) as items
    from public.facilities f
    join facility_sections fs on fs.kind = f.kind and fs.source_id = f.source_id
    where f.district_id is not null
    group by f.district_id, fs.section
  ),
  -- 駅ごと・向きごとの1日の本数と始発・最終。特急は特急券が要るので数えない（026。おでかけの本数と同じ数え方）
  train_departure_items as (
    select
      t.district_id,
      jsonb_agg(
        jsonb_build_object(
          'station_name', t.station_name,
          'direction', t.direction,
          'trips_per_day', t.trips_per_day,
          'first_departure', t.first_departure,
          'last_departure', t.last_departure
        )
        order by t.station_name collate "C", t.direction collate "C"
      ) as items
    from (
      select district_id, station_name, direction, count(*) as trips_per_day, min(departure) as first_departure, max(departure) as last_departure
      from public.train_departures
      where source_id = 'iida_jr_timetable' and train_type not like '特急%'
      group by district_id, station_name, direction
    ) t
    group by t.district_id
  )
  select jsonb_build_object(
    'generated_at', now(),
    'sources', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'name', s.name,
          'publisher', s.publisher,
          'source_url', s.source_url,
          'license', s.license,
          'credit_text', s.credit_text,
          'period_label', s.period_label,
          'checked_on', s.checked_on,
          'fetched_at', s.fetched_at
        )
        order by s.id collate "C"
      )
      from public.data_sources s
    ), '[]'::jsonb),
    -- 相場の集計で外した取引の件数（022）。出典が相場と同じなので、相場と一緒に公開される
    'market_summary', jsonb_build_object(
      'source_id', 'reinfolib_xit001',
      'items', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'period_from', ms.period_from,
            'period_to', ms.period_to,
            'citywide_count', ms.citywide_count,
            'district_count', ms.district_count,
            'excluded_count', ms.excluded_count,
            'mediation_count', ms.mediation_count,
            'related_party_count', ms.related_party_count,
            'adjacent_land_count', ms.adjacent_land_count
          )
        )
        from public.market_summary ms
        where ms.source_id = 'reinfolib_xit001'
      ), '[]'::jsonb)
    ),
    'districts', (
      select jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'name', d.name,
          'area_description', d.area_description,
          'market', jsonb_build_object(
            'source_id', 'reinfolib_xit001',
            'items', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'category', m.category,
                  'median_value', m.median_value,
                  'p25_value', m.p25_value,
                  'p75_value', m.p75_value,
                  'sample_count', m.sample_count,
                  'period_from', m.period_from,
                  'period_to', m.period_to
                )
                order by m.category
              )
              from public.market_stats m
              where m.district_id = d.id and m.source_id = 'reinfolib_xit001'
            ), '[]'::jsonb)
          ),
          'elementary_school_districts', jsonb_build_object(
            'source_id', 'reinfolib_xkt004',
            'items', coalesce((
              select jsonb_agg(jsonb_build_object('school_name', sd.school_name) order by sd.school_name collate "C")
              from public.school_districts sd
              where sd.district_id = d.id and sd.level = 'elementary' and sd.source_id = 'reinfolib_xkt004'
            ), '[]'::jsonb)
          ),
          'junior_high_school_districts', jsonb_build_object(
            'source_id', 'reinfolib_xkt005',
            'items', coalesce((
              select jsonb_agg(jsonb_build_object('school_name', sd.school_name) order by sd.school_name collate "C")
              from public.school_districts sd
              where sd.district_id = d.id and sd.level = 'junior_high' and sd.source_id = 'reinfolib_xkt005'
            ), '[]'::jsonb)
          ),
          'facilities', (
            select jsonb_object_agg(
              fs.section,
              jsonb_build_object('source_id', fs.source_id, 'items', coalesce(fi.items, '[]'::jsonb))
            )
            from facility_sections fs
            left join facility_items fi on fi.section = fs.section and fi.district_id = d.id
          ),
          'train_departures', jsonb_build_object(
            'source_id', 'iida_jr_timetable',
            'items', coalesce((select tdi.items from train_departure_items tdi where tdi.district_id = d.id), '[]'::jsonb)
          ),
          -- いちばん新しい対象時点の1行だけ
          'population', jsonb_build_object(
            'source_id', 'estat_census_small_area',
            'items', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'as_of', p.as_of,
                  'total', p.total,
                  'age_0_14', p.age_0_14,
                  'age_15_64', p.age_15_64,
                  'age_65_plus', p.age_65_plus
                )
              )
              from (
                select * from public.population
                where district_id = d.id and source_id = 'estat_census_small_area'
                order by as_of desc
                limit 1
              ) p
            ), '[]'::jsonb)
          ),
          -- おでかけは場面とカルテで使う並び順1だけ（010・026）
          'bus_outing', jsonb_build_object(
            'source_id', 'gtfs_minamishinshu_bus',
            'items', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'day_type', b.day_type,
                  'service_date', b.service_date,
                  'valid_until', b.valid_until,
                  'origin_name', b.origin_stop_name,
                  'destination_name', b.destination_stop_name,
                  'status', b.status,
                  'outbound_departure', b.outbound_departure,
                  'outbound_arrival', b.outbound_arrival,
                  'outbound_line', b.outbound_route_name,
                  'return_departure', b.return_departure,
                  'return_arrival', b.return_arrival,
                  'return_line', b.return_route_name,
                  'next_return_departure', b.next_return_departure,
                  'next_return_arrival', b.next_return_arrival,
                  'next_return_line', b.next_return_route_name,
                  'outbound_trips_per_day', b.outbound_trips_per_day,
                  'return_trips_per_day', b.return_trips_per_day,
                  'origin_departures_per_day', b.origin_departures_per_day
                )
              )
              from public.bus_outings b
              where b.district_id = d.id and b.sort_order = 1 and b.source_id = 'gtfs_minamishinshu_bus'
            ), '[]'::jsonb)
          ),
          'train_outing', jsonb_build_object(
            'source_id', 'iida_jr_timetable',
            'items', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'origin_name', t.origin_station_name,
                  'destination_name', t.destination_station_name,
                  'status', t.status,
                  'outbound_departure', t.outbound_departure,
                  'outbound_arrival', t.outbound_arrival,
                  'outbound_line', t.outbound_train_type,
                  'return_departure', t.return_departure,
                  'return_arrival', t.return_arrival,
                  'return_line', t.return_train_type,
                  'next_return_departure', t.next_return_departure,
                  'next_return_arrival', t.next_return_arrival,
                  'next_return_line', t.next_return_train_type,
                  'outbound_trips_per_day', t.outbound_trips_per_day,
                  'return_trips_per_day', t.return_trips_per_day,
                  'origin_departures_per_day', t.origin_departures_per_day
                )
              )
              from public.train_outings t
              where t.district_id = d.id and t.sort_order = 1 and t.source_id = 'iida_jr_timetable'
            ), '[]'::jsonb)
          ),
          -- 行事は手入力で出典の行を持たない。公開フラグの立ったものだけが RLS で入る
          'events', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'season', e.season,
                'name', e.name,
                'chushin_area', e.chushin_area,
                'timing_note', e.timing_note,
                'scope', e.scope,
                'participation', e.participation,
                'participation_note', e.participation_note,
                'is_for_children', e.is_for_children,
                'art', e.art,
                'source_note', e.source_note,
                'checked_on', e.checked_on
              )
              order by e.season, e.sort_order, e.id
            )
            from public.district_events e
            where e.district_id = d.id
          ), '[]'::jsonb)
        )
        order by d.sort_order
      )
      from public.districts d
    ),
    'support_programs', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'name', sp.name,
          'summary', sp.summary,
          'category', sp.category,
          'official_url', sp.official_url,
          'checked_on', sp.checked_on
        )
        order by sp.sort_order, sp.id
      )
      from public.support_programs sp
    ), '[]'::jsonb),
    -- ひな形は地区によらない。公開したひな形とその文だけが RLS で入る（017 が差し込みに使う）
    'scene_templates', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', st.id,
          'season', st.season,
          'title', st.title,
          'has_children', st.has_children,
          'car', st.car,
          'housing', st.housing,
          'sentences', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'position', ss.position,
                'kind', ss.kind,
                'body', ss.body,
                'karte_card', ss.karte_card,
                'has_children', ss.has_children,
                'car', ss.car,
                'housing', ss.housing,
                'fallback_body', ss.fallback_body,
                'source_id', ss.source_id
              )
              order by ss.position
            )
            from public.scene_sentences ss
            where ss.template_id = st.id
          ), '[]'::jsonb)
        )
        order by st.season, st.id
      )
      from public.scene_templates st
    ), '[]'::jsonb)
  );
$$;

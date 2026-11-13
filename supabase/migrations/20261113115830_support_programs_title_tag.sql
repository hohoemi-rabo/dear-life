-- 040 支援制度の詳細（見本 docs/design/karte-detail-support.png）：制度ごとに、誰が見ても分かる題と札を持つ。
-- 題・札は Table Editor で制度と一緒に入れる（012。入れていない制度は、画面では正式な名前を太字にして札なしで出す）。
-- 並びは 2026-11-13 まさゆきさんが決めた順（子育ては相談が最初）。screen_data() は 20261112123130_screen_data_school_zones.sql に title・tag を足しただけ

alter table public.support_programs
  add column title text check (title is null or char_length(btrim(title)) > 0),
  add column tag text check (tag is null or char_length(btrim(tag)) between 1 and 6);

comment on column public.support_programs.title is '画面の1行の題（誰が見ても分かる言葉。役所の言葉は使わない。条件のあるお金は「調べる」「知る」と書き、言い切らない）。空なら制度名を出す';
comment on column public.support_programs.tag is '題の上の札（「相談」「お金」など6文字まで。お金の制度は「お金」にそろえる）。空なら札を出さない';

update public.support_programs sp
set title = v.title, tag = v.tag, sort_order = v.sort_order
from (
  values
    ('移住相談（結いターン移住定住推進課）', '移住のことを、市の窓口に相談する', '相談', 1),
    ('お試し移住体験「結いターンシップ」', '数日間、飯田で働いて暮らしてみる', '体験', 2),
    ('移住支援金（UIJターン就業・創業移住支援事業補助金）', '都市部から移住して働く人への支援金を調べる', 'お金', 3),
    ('飯田市空き家バンク', '市が紹介している空き家を探す', '家探し', 4),
    ('空き家バンクの空き家の改修・引越しの補助', '空き家の修理や引っ越しにかかるお金の補助を調べる', 'お金', 5),
    ('結婚新生活支援事業補助金', '結婚して新しく住む家のお金の補助を調べる', 'お金', 6),
    ('子育て相談（こども課）', '子育ての悩みを、市の窓口に相談する', '相談', 7),
    ('妊婦のための支援給付', '妊娠したときにもらえるお金と相談を知る', '妊娠', 8),
    ('産後ケア事業', '出産後のお母さんと赤ちゃんのケアを受ける', '出産後', 9),
    ('児童手当', '子どもを育てる家庭への手当を知る', 'お金', 10),
    ('子どもの医療費の助成（福祉医療制度）', '子どもの病院代の補助を知る', 'お金', 11),
    ('こども誰でも通園制度', '保育園に通っていない子を、ときどき預ける', '預ける', 12),
    ('病児保育施設「おひさまはるる」', '子どもが病気で登園できない日に預ける', '預ける', 13)
) as v (name, title, tag, sort_order)
where sp.name = v.name;

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
  ),
  -- 駅ごと・向きごとの1日の本数（全国鉄道運行本数データ。平日・特急を除く。031）。
  -- 飯田線の駅をすべて持っているので、4地区の駅（facilities）と駅名で結びつけて地区を決める
  train_count_items as (
    select
      f.district_id,
      jsonb_agg(
        jsonb_build_object('station_name', c.station_name, 'direction', c.direction, 'trips_per_day', c.departures_per_day)
        order by c.station_name collate "C", c.direction collate "C"
      ) as items
    from public.train_station_counts c
    join public.facilities f on f.kind = 'train_station' and f.source_id = 'sena_iida_line_stations' and f.name = c.station_name
    where c.source_id = 'railway_honsu' and c.line_name = '飯田線' and f.district_id is not null
    group by f.district_id
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
    -- 飯田市の民営借家の家賃の平均（034）。地区には分けられないので地区の外に置く
    'rent', jsonb_build_object(
      'source_id', 'estat_housing_land_survey_rent',
      'items', coalesce((
        select jsonb_agg(
          jsonb_build_object('building_type', r.building_type, 'average_rent', r.average_rent, 'as_of', r.as_of)
          order by r.building_type collate "C"
        )
        from public.rent_averages r
        where r.source_id = 'estat_housing_land_survey_rent'
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
          -- 町名ごとに通う公立の小学校・中学校（039）
          'school_zones', jsonb_build_object(
            'source_id', 'iida_school_zone_rule',
            'items', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'town_name', z.town_name,
                  'elementary_schools', to_jsonb(z.elementary_schools),
                  'junior_high_schools', to_jsonb(z.junior_high_schools),
                  'is_partial', z.is_partial
                )
                order by z.sort_order
              )
              from public.school_zones z
              where z.district_id = d.id and z.source_id = 'iida_school_zone_rule'
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
          'train_counts', jsonb_build_object(
            'source_id', 'railway_honsu',
            'items', coalesce((select tci.items from train_count_items tci where tci.district_id = d.id), '[]'::jsonb)
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
          -- いちばん新しい対象時点の1行だけ（034）
          'housing_tenure', jsonb_build_object(
            'source_id', 'estat_census_housing_tenure',
            'items', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'as_of', h.as_of,
                  'households_in_housing', h.households_in_housing,
                  'owner_occupied', h.owner_occupied,
                  'private_rented', h.private_rented
                )
              )
              from (
                select * from public.housing_tenure
                where district_id = d.id and source_id = 'estat_census_housing_tenure'
                order by as_of desc
                limit 1
              ) h
            ), '[]'::jsonb)
          ),
          -- おでかけは場面とカルテで使う並び順1だけ（010・026）。
          -- バスは乗り場の名前と時刻を画面に出さないので渡さない。行き先の呼び方と、地区のバス停のうち乗りかえなしで行き帰りできる数だけ（036）
          'bus_outing', jsonb_build_object(
            'source_id', 'gtfs_minamishinshu_bus',
            'items', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'day_type', b.day_type,
                  'service_date', b.service_date,
                  'valid_until', b.valid_until,
                  'destination_place_name', b.destination_place_name,
                  'district_stop_count', b.district_stop_count,
                  'reachable_stop_count', b.reachable_stop_count
                )
              )
              from public.bus_outings b
              where b.district_id = d.id and b.sort_order = 1 and b.source_id = 'gtfs_minamishinshu_bus'
            ), '[]'::jsonb)
          ),
          -- 用事の場所（036）。並びは data/bus_errands.csv の順
          'bus_errands', jsonb_build_object(
            'source_id', 'gtfs_minamishinshu_bus',
            'items', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'place_name', e.place_name,
                  'kind', e.kind,
                  'has_stop', e.has_stop,
                  'official_url', e.official_url,
                  'day_type', e.day_type,
                  'service_date', e.service_date,
                  'valid_until', e.valid_until,
                  'district_stop_count', e.district_stop_count,
                  'reachable_stop_count', e.reachable_stop_count,
                  'min_trips_per_day', e.min_trips_per_day,
                  'max_trips_per_day', e.max_trips_per_day
                )
                order by e.sort_order
              )
              from public.bus_errands e
              where e.district_id = d.id and e.source_id = 'gtfs_minamishinshu_bus'
            ), '[]'::jsonb)
          ),
          -- 診療所（クリニック）の数（037）。バスの本数は出さない
          'clinic_count', jsonb_build_object(
            'source_id', 'mhlw_medical_clinics',
            'items', coalesce((
              select jsonb_agg(jsonb_build_object('as_of', c.as_of, 'clinic_count', c.clinic_count))
              from public.clinic_counts c
              where c.district_id = d.id and c.source_id = 'mhlw_medical_clinics'
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
          'title', sp.title,
          'tag', sp.tag,
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

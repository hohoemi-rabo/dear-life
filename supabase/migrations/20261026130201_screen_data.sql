-- 015 画面が読むデータ：えらぶ・くらし・カルテ・地区くらべで使うものを、4地区分まとめて1回で返す screen_data()
--
-- 画面は GET /rest/v1/rpc/screen_data で呼ぶ（GET にしたのは、024 の Service Worker が Cache API に残せるようにするため）。
-- security invoker なので、anon から呼ぶと各テーブルの RLS がそのまま効く。未公開の出典のデータ・未公開の行事などは入らない。
--
-- 「該当なし」と「データ未取得」の区別（F-09）：出典のあるデータは、欄ごとに { source_id, items } で返す。
-- 画面は source_id が sources（公開済みの出典だけが入る）にあるかを見て、なければ「データ未取得」、あって items が空なら「該当なし」にする。
-- どの欄がどの出典のデータかは、この関数だけで決める（画面には同じ対応を書かない）。
--
-- 地図（021）で使う緯度経度・学区の範囲は大きいので、ここには入れない

create function public.screen_data()
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
                'housing', ss.housing
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

comment on function public.screen_data() is
  '画面（anon）が読むデータを4地区分まとめて返す（015）。RLS が効くので、未公開の出典のデータは入らない。欄ごとの { source_id, items } で「該当なし」と「データ未取得」を見分ける';

revoke execute on function public.screen_data() from public, anon, authenticated, service_role;
grant execute on function public.screen_data() to anon;

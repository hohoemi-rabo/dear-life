-- 021 地図の画面が読むデータ：4地区の施設の位置と、4地区の小学校区の範囲を1回で返す map_data()
--
-- screen_data()（015）に入れると、地図を開かない画面でも学区の範囲（約100KB）を読むことになるので分けた。
-- 画面は GET /rest/v1/rpc/map_data で呼ぶ（screen_data と同じく、024 の Service Worker が Cache API に残せるように GET にする）。
-- security invoker なので、anon から呼ぶと各テーブルの RLS がそのまま効き、未公開の出典のデータは入らない。
--
-- 「該当なし」と「データ未取得」の区別は screen_data にそろえる：欄ごとに { source_id, items } で返し、
-- 画面は source_id が sources（公開済みの出典だけが入る）にあるかで見分ける。どの欄がどの出典かはこの関数だけで決める。
-- 学校・保育施設は市のデータを出す（XKT006・XKT007 は公開しても入れない。008・009）
--
-- 座標は小数6桁（約10cm）に丸める。地図の位置は目安なので十分で、応答が半分ほどになる

create function public.map_data()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with
  -- 地図に出す施設の種類（要件 F-06 の学校・保育・バス停・避難場所に、放課後児童クラブと駅を足す）
  facility_sections (section, kind, source_id) as (
    values
      ('schools', 'school'::public.facility_kind, 'iida_education'),
      ('childcare', 'childcare'::public.facility_kind, 'iida_childcare'),
      ('after_school_clubs', 'after_school_club'::public.facility_kind, 'iida_childcare'),
      ('evacuation_sites', 'evacuation_site'::public.facility_kind, 'iida_evacuation'),
      ('bus_stops', 'bus_stop'::public.facility_kind, 'gtfs_minamishinshu_bus'),
      ('train_stations', 'train_station'::public.facility_kind, 'sena_iida_line_stations')
  ),
  facility_items as (
    select
      f.district_id,
      fs.section,
      jsonb_agg(
        jsonb_build_object(
          'name', f.name,
          'subkind', f.subkind,
          'address', f.address,
          'latitude', round(f.latitude::numeric, 6),
          'longitude', round(f.longitude::numeric, 6)
        )
        order by f.subkind collate "C" nulls first, f.name collate "C", f.id
      ) as items
    from public.facilities f
    join facility_sections fs on fs.kind = f.kind and fs.source_id = f.source_id
    -- 位置のない施設（市のデータで緯度経度が空のもの）は地図に置けないので入れない
    where f.district_id is not null and f.latitude is not null
    group by f.district_id, fs.section
  ),
  -- 学区の範囲。Polygon も MultiPolygon の形にそろえ、座標を丸める（並びは with ordinality で保つ）
  school_district_items as (
    select
      sd.district_id,
      jsonb_agg(
        jsonb_build_object(
          'school_name', sd.school_name,
          'geometry', jsonb_build_object(
            'type', 'MultiPolygon',
            'coordinates', (
              select jsonb_agg(
                (
                  select jsonb_agg(
                    (
                      select jsonb_agg(
                        jsonb_build_array(round((pt.value ->> 0)::numeric, 6), round((pt.value ->> 1)::numeric, 6))
                        order by pt.ordinality
                      )
                      from jsonb_array_elements(ring.value) with ordinality as pt
                    )
                    order by ring.ordinality
                  )
                  from jsonb_array_elements(polygon.value) with ordinality as ring
                )
                order by polygon.ordinality
              )
              from jsonb_array_elements(
                case sd.geometry ->> 'type'
                  when 'Polygon' then jsonb_build_array(sd.geometry -> 'coordinates')
                  else sd.geometry -> 'coordinates'
                end
              ) with ordinality as polygon
            )
          )
        )
        order by sd.school_name collate "C"
      ) as items
    from public.school_districts sd
    where sd.district_id is not null and sd.level = 'elementary' and sd.source_id = 'reinfolib_xkt004'
    group by sd.district_id
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
          'facilities', (
            select jsonb_object_agg(
              fs.section,
              jsonb_build_object('source_id', fs.source_id, 'items', coalesce(fi.items, '[]'::jsonb))
            )
            from facility_sections fs
            left join facility_items fi on fi.section = fs.section and fi.district_id = d.id
          ),
          'elementary_school_districts', jsonb_build_object(
            'source_id', 'reinfolib_xkt004',
            'items', coalesce((select sdi.items from school_district_items sdi where sdi.district_id = d.id), '[]'::jsonb)
          )
        )
        order by d.sort_order
      )
      from public.districts d
    )
  );
$$;

comment on function public.map_data() is
  '地図の画面（anon）が読む、4地区の施設の位置と小学校区の範囲（021）。RLS が効くので、未公開の出典のデータは入らない。欄ごとの { source_id, items } で「該当なし」と「データ未取得」を見分ける';

revoke execute on function public.map_data() from public, anon, authenticated, service_role;
grant execute on function public.map_data() to anon;

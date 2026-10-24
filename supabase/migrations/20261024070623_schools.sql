-- 008 学区・学校・保育施設：学区の地区・施設の入れ直し・学区の入れ直し・出典
--
-- 学校（XKT006）と保育園・幼稚園等（XKT007）は、住所の町名で4地区に振り分けた点を facilities に入れる（要件 7.2）。
-- 学区（XKT004・XKT005）はタイルごとに切られて返ってくるので、学校ごとにまとめて school_districts に入れる。
-- どの地区の「主な学区」かは、学区の学校がある地区で決める（学校の点は XKT006 から入れたもの）

-- 学区の地区 ---------------------------------------------------------------

alter table public.school_districts add column district_id text not null references public.districts (id);

comment on column public.school_districts.district_id is
  '学区の学校がある地区。この地区の「主な学区」として学校名を並べる（要件 7.2）。学区の範囲は地区と違うので、地区の範囲の情報として混ぜない';
comment on column public.school_districts.source_key is '学校コード（XKT006 の学校と同じコード）';
comment on column public.school_districts.geometry is
  'GeoJSON の MultiPolygon（経度・緯度の順）。API がタイルの境目で切った切れ端をそのまま並べているので、地図では境目の線を引かない（021）';

create index school_districts_district_level_idx on public.school_districts (district_id, level);

-- 施設の入れ直し -----------------------------------------------------------

-- 取り直しのたびに、その出典の行を消して入れ直す（API に消えた施設を残さないため）。
-- 0件で呼ばれたら、取得の失敗とみなして消さない
create function public.replace_facilities(p_source_id text, p_rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted integer;
begin
  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'p_rows は配列で渡す';
  end if;
  if jsonb_array_length(p_rows) = 0 then
    raise exception '% の施設が0件なので、入れ直さない', p_source_id;
  end if;

  delete from public.facilities where source_id = p_source_id;

  insert into public.facilities (
    kind, subkind, name, address, town_name, district_id, latitude, longitude, source_id, source_key, attributes
  )
  select
    r.kind, r.subkind, r.name, r.address, r.town_name, r.district_id, r.latitude, r.longitude, p_source_id, r.source_key,
    coalesce(r.attributes, '{}'::jsonb)
  from jsonb_to_recordset(p_rows) as r (
    kind public.facility_kind,
    subkind text,
    name text,
    address text,
    town_name text,
    district_id text,
    latitude double precision,
    longitude double precision,
    source_key text,
    attributes jsonb
  );
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

comment on function public.replace_facilities(text, jsonb) is
  '指定した出典の施設を消して、渡した行を入れる（008）。0件なら何もせずに失敗する';

revoke execute on function public.replace_facilities(text, jsonb) from public, anon, authenticated;
grant execute on function public.replace_facilities(text, jsonb) to service_role;

-- 学区の入れ直し -----------------------------------------------------------

-- p_tiles は API の応答（GeoJSON の FeatureCollection）をタイルの数だけ並べた配列。Worker は中身を読まずにそのまま渡す
-- （応答が大きく、Worker で読むと CPU 時間の上限に近づくため）。
-- p_bounds は取ったタイル全体の範囲 {west, south, east, north}。学区がその端に届いていたら、
-- 範囲の外にも広がっていて切れている（取るタイルを広げる必要がある）ので、入れずに失敗する
create function public.replace_school_districts(
  p_level public.school_level,
  p_source_id text,
  p_tiles jsonb,
  p_bounds jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  -- タイルの端に届いているとみなす幅（度）。API の座標はタイルの中の格子に丸められていて、端ちょうどにはならないため
  edge_margin constant double precision := 0.001;
  merged jsonb;
  problem text;
  inserted integer;
begin
  if jsonb_typeof(p_tiles) is distinct from 'array' then
    raise exception 'p_tiles は配列で渡す';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_tiles) as t, jsonb_array_elements(t -> 'features') as f
    where f -> 'geometry' ->> 'type' not in ('Polygon', 'MultiPolygon')
  ) then
    raise exception '学区に Polygon・MultiPolygon 以外の形がある';
  end if;

  -- 学校ごとに、タイルの切れ端を1つの MultiPolygon にまとめる。4地区にある学校の学区だけを残す
  with pieces as (
    select
      coalesce(f -> 'properties' ->> 'A27_003', f -> 'properties' ->> 'A32_003') as code,
      coalesce(f -> 'properties' ->> 'A27_004_ja', f -> 'properties' ->> 'A32_004_ja') as school_name,
      case f -> 'geometry' ->> 'type'
        when 'Polygon' then jsonb_build_array(f -> 'geometry' -> 'coordinates')
        else f -> 'geometry' -> 'coordinates'
      end as polygons
    from jsonb_array_elements(p_tiles) as t, jsonb_array_elements(t -> 'features') as f
  ),
  schools as (
    select distinct on (s.attributes ->> 'school_code') s.attributes ->> 'school_code' as code, s.district_id
    from public.facilities as s
    where s.source_id = 'reinfolib_xkt006' and s.district_id is not null
    order by s.attributes ->> 'school_code', s.district_id
  )
  select jsonb_agg(jsonb_build_object('code', g.code, 'school_name', g.school_name, 'district_id', g.district_id, 'polygons', g.polygons))
  into merged
  from (
    select p.code, min(p.school_name) as school_name, s.district_id, jsonb_agg(polygon) as polygons
    from pieces as p
    join schools as s on s.code = p.code
    cross join lateral jsonb_array_elements(p.polygons) as polygon
    group by p.code, s.district_id
  ) as g;

  if merged is null then
    raise exception '4地区の学校の学区が1つもない（学校の点を先に取り込む）';
  end if;

  select string_agg(missing.name, '、' order by missing.sort_order) into problem
  from public.districts as missing
  where not exists (
    select 1 from jsonb_to_recordset(merged) as r (district_id text) where r.district_id = missing.id
  );
  if problem is not null then
    raise exception '学区のない地区がある：%', problem;
  end if;

  select string_agg(edge.school_name, '、' order by edge.school_name) into problem
  from (
    select r.school_name
    from jsonb_to_recordset(merged) as r (school_name text, polygons jsonb),
      jsonb_array_elements(r.polygons) as polygon,
      jsonb_array_elements(polygon) as ring,
      jsonb_array_elements(ring) as point
    group by r.school_name
    having min((point ->> 0)::double precision) <= (p_bounds ->> 'west')::double precision + edge_margin
      or max((point ->> 0)::double precision) >= (p_bounds ->> 'east')::double precision - edge_margin
      or min((point ->> 1)::double precision) <= (p_bounds ->> 'south')::double precision + edge_margin
      or max((point ->> 1)::double precision) >= (p_bounds ->> 'north')::double precision - edge_margin
  ) as edge;
  if problem is not null then
    raise exception '取ったタイルの端まで届いている学区がある（範囲の外で切れている）：%', problem;
  end if;

  delete from public.school_districts where source_id = p_source_id;

  insert into public.school_districts (level, school_name, geometry, source_id, source_key, district_id)
  select p_level, r.school_name, jsonb_build_object('type', 'MultiPolygon', 'coordinates', r.polygons), p_source_id, r.code, r.district_id
  from jsonb_to_recordset(merged) as r (code text, school_name text, district_id text, polygons jsonb);
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

comment on function public.replace_school_districts(public.school_level, text, jsonb, jsonb) is
  '学区の API の応答から、4地区にある学校の学区を学校ごとにまとめて入れ直す（008）。学区のない地区や、取った範囲の端で切れた学区があれば何もせずに失敗する';

revoke execute on function public.replace_school_districts(public.school_level, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.replace_school_districts(public.school_level, text, jsonb, jsonb) to service_role;

-- 出典 ---------------------------------------------------------------------

-- 4つとも不動産情報ライブラリの API なので、クレジットは XIT001 と同じ利用約款 第7条の文言（006）。
-- 対象時点は API 操作説明の一覧に書かれた国土数値情報の年度（2026-10-24 に確認）。毎年の取り直しのときに確かめ直す（008）。
-- 公開フラグは、画面にクレジットを出せるようになったら（022）立てる
insert into public.data_sources (id, name, publisher, source_url, license, credit_text, period_label)
select
  s.id, s.name, '国土交通省 不動産情報ライブラリ', 'https://www.reinfolib.mlit.go.jp/',
  '不動産情報ライブラリ API 利用約款（無償・商用可。クレジットの表示が必要）',
  'このサービスは、国土交通省の不動産情報ライブラリのAPI機能を使用していますが、提供情報の最新性、正確性、完全性等が保証されたものではありません',
  s.period_label
from (values
  ('reinfolib_xkt004', '小学校区（国土数値情報）', '令和5年度'),
  ('reinfolib_xkt005', '中学校区（国土数値情報）', '令和5年度'),
  ('reinfolib_xkt006', '学校（国土数値情報）', '令和5年度'),
  ('reinfolib_xkt007', '保育園・幼稚園等（国土数値情報の学校・福祉施設）', '令和5年度')
) as s (id, name, period_label);

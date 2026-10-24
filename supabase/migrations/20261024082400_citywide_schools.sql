-- 008・009 学校と学区を市全体に広げる（2026-10-24 まさゆきさんと決定。画面は今までどおり4地区だけを出す）
--
-- 学校は市「教育機関一覧」（iida_education）を画面に出す。学校コードが XKT006 とすべて一致し、緯度経度もあるので、
-- 市全体を CSV 1つでまかなえる。XKT006（reinfolib_xkt006）は公開せず、市のデータの抜けを確かめるのに使う。
-- 学区は市全体を入れる。学区の地区は、学区の学校コードを iida_education の学校に当てて決める（4地区の外は地区なし）

-- 学区の地区：4地区の外の学校の学区は null ----------------------------------

alter table public.school_districts alter column district_id drop not null;

comment on column public.school_districts.district_id is
  '学区の学校がある地区（4地区の外は null）。この地区の「主な学区」として学校名を並べる（要件 7.2）。学区の範囲は地区と違うので、地区の範囲の情報として混ぜない';
comment on column public.school_districts.source_key is '学校コード（教育機関一覧・XKT006 の学校と同じコード）';

-- 学区の入れ直し：市全体の学区を入れる ---------------------------------------

create or replace function public.replace_school_districts(
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

  -- 学校ごとに、タイルの切れ端を1つの MultiPolygon にまとめる。地区は教育機関一覧の学校から決める
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
    select distinct on (s.source_key) s.source_key as code, s.district_id
    from public.facilities as s
    where s.source_id = 'iida_education'
    order by s.source_key, s.district_id
  )
  select jsonb_agg(jsonb_build_object('code', g.code, 'school_name', g.school_name, 'district_id', g.district_id, 'polygons', g.polygons))
  into merged
  from (
    select p.code, min(p.school_name) as school_name, s.district_id, jsonb_agg(polygon) as polygons
    from pieces as p
    left join schools as s on s.code = p.code
    cross join lateral jsonb_array_elements(p.polygons) as polygon
    group by p.code, s.district_id
  ) as g;

  if merged is null then
    raise exception '学区が1つもない';
  end if;

  select string_agg(missing.name, '、' order by missing.sort_order) into problem
  from public.districts as missing
  where not exists (
    select 1 from jsonb_to_recordset(merged) as r (district_id text) where r.district_id = missing.id
  );
  if problem is not null then
    raise exception '学区のない地区がある：%（教育機関一覧の学校を先に取り込む）', problem;
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
  '学区の API の応答から、市全体の学区を学校ごとにまとめて入れ直す（008）。地区は教育機関一覧の学校から決める。学区のない地区や、取った範囲の端で切れた学区があれば何もせずに失敗する';

-- 出典 ---------------------------------------------------------------------

-- クレジットと更新日は取り込みのたびに *_education_data.sql が入れ直す。
-- 公開フラグは、画面にクレジットを出せるようになったら（022）立てる
insert into public.data_sources (id, name, publisher, source_url, license)
values (
  'iida_education',
  '教育機関一覧',
  '飯田市',
  'https://www.city.iida.lg.jp/soshiki/168/opendata.html',
  'PDL1.0'
);

-- 008・009 市のデータの抜けの確認：国のデータ（公開しない）にあって、画面に出す市のデータにないものを出す。0行なら抜けはない。
--   学校：XKT006 の学校コードが、市「教育機関一覧」（iida_education）にない
--   保育施設：XKT007 の施設の 150m 以内に、市「子育て施設」（iida_childcare）の保育施設がない
-- 市のデータを取り込み直したとき（npm run education:sql・childcare:sql）と、XKT006・XKT007 を毎年取り直したあとに、
-- Supabase MCP の execute_sql で流す。行が出たら、その施設が市のデータにない理由（新しくできた・閉じた・位置が違う・市の一覧の対象外）を確かめる
select '学校' as kind, x.district_id, x.subkind, x.name, x.address
from public.facilities as x
where x.source_id = 'reinfolib_xkt006'
  and not exists (
    select 1 from public.facilities as c
    where c.source_id = 'iida_education' and c.source_key = x.attributes ->> 'school_code'
  )
union all
select '保育施設', x.district_id, x.subkind, x.name, x.address
from public.facilities as x
where x.source_id = 'reinfolib_xkt007'
  and not exists (
    select 1
    from public.facilities as c
    where c.source_id = 'iida_childcare'
      and c.kind = 'childcare'
      -- 飯田あたり（北緯35.5度）で、緯度1度 ≒ 111km・経度1度 ≒ 91km
      and sqrt(power((c.latitude - x.latitude) * 111000, 2) + power((c.longitude - x.longitude) * 91000, 2)) <= 150
  )
order by kind, district_id nulls last, name;

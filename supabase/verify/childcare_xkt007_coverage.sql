-- 009 市「子育て施設」の抜けの確認：XKT007（国土数値情報。公開しない）の4地区の施設のうち、
-- 市のデータに近い施設（150m 以内）がないものを出す。0行なら、市のデータに抜けはない。
-- 市のデータを取り込み直したときと、XKT007 を毎年取り直したあと（008）に、Supabase MCP の execute_sql で流す。
-- 行が出たら、その施設が市のデータにない理由（新しくできた・閉じた・位置が違う）を確かめる
select x.district_id, x.subkind, x.name, x.address
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
order by x.district_id, x.name;

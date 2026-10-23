-- 006 不動産取引価格の取り込み：価格情報区分の列・年ごとの入れ直し・取り込み済みの四半期・出典
--
-- XIT001 は年だけを指定すると、その年の公開済みの四半期をまとめて返す。取引に固有の ID がないので、
-- 同じ取引を二重に入れないよう、年ごとに消して入れ直す（1回の呼び出しで、1つのトランザクションの中で）

-- 価格情報区分 -----------------------------------------------------------

-- 5.1 の基準にした CSV（1,313件）は「不動産取引価格情報」と「成約価格情報」の両方を含んでいた（2026-10-23 に API と照合）。
-- 両方を取り込み、どちらの行かを残す
alter table public.real_estate_transactions add column price_category text not null;

comment on column public.real_estate_transactions.price_category is '価格情報区分（不動産取引価格情報／成約価格情報）';
comment on table public.real_estate_transactions is '不動産情報ライブラリ XIT001 の取引（生データ）。年ごとに入れ直す。画面には出さない';

-- 年ごとの入れ直し -------------------------------------------------------

create function public.replace_real_estate_transactions(p_year smallint, p_rows jsonb)
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
  -- 別の年の行が混ざっていたら、消した年と入れた年がずれるので止める
  if exists (select 1 from jsonb_array_elements(p_rows) as r where (r ->> 'trade_year')::smallint is distinct from p_year) then
    raise exception '% 年以外の取引が含まれている', p_year;
  end if;

  delete from public.real_estate_transactions where trade_year = p_year;

  insert into public.real_estate_transactions (
    trade_year, trade_quarter, price_category, property_type, town_name, district_code, district_id,
    trade_price, unit_price_per_sqm, area_sqm, building_year, use, circumstances, is_excluded, raw
  )
  select
    r.trade_year, r.trade_quarter, r.price_category, r.property_type, r.town_name, r.district_code, r.district_id,
    r.trade_price, r.unit_price_per_sqm, r.area_sqm, r.building_year, r.use, r.circumstances, r.is_excluded, r.raw
  from jsonb_to_recordset(p_rows) as r (
    trade_year smallint,
    trade_quarter smallint,
    price_category text,
    property_type text,
    town_name text,
    district_code text,
    district_id text,
    trade_price bigint,
    unit_price_per_sqm numeric,
    area_sqm numeric,
    building_year smallint,
    use text,
    circumstances text,
    is_excluded boolean,
    raw jsonb
  );
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

comment on function public.replace_real_estate_transactions(smallint, jsonb) is
  '指定した年の取引を消して、渡した行を入れる（006）。年をまたぐ行が混ざっていたら何もせずに失敗する';

revoke execute on function public.replace_real_estate_transactions(smallint, jsonb) from public, anon, authenticated;
grant execute on function public.replace_real_estate_transactions(smallint, jsonb) to service_role;

-- 取り込み済みの四半期 ---------------------------------------------------

-- 新しい四半期が出たかの判定と、取り込みの抜けの確認に使う（PostgREST の select では集計できないため）
create function public.real_estate_transaction_quarters()
returns table (trade_year smallint, trade_quarter smallint, row_count integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select t.trade_year, t.trade_quarter, count(*)::integer
  from public.real_estate_transactions as t
  group by t.trade_year, t.trade_quarter
  order by t.trade_year, t.trade_quarter;
$$;

comment on function public.real_estate_transaction_quarters() is '取り込み済みの四半期と件数（006）';

revoke execute on function public.real_estate_transaction_quarters() from public, anon, authenticated;
grant execute on function public.real_estate_transaction_quarters() to service_role;

-- 出典 ---------------------------------------------------------------------

-- クレジットは利用約款（API 利用約款 第7条）の文言をそのまま（2026-10-23 に約款のページから写した）。
-- 公開フラグは、画面にクレジットを出せるようになったら（022）立てる
insert into public.data_sources (id, name, publisher, source_url, license, credit_text)
values (
  'reinfolib_xit001',
  '不動産価格（取引価格・成約価格）情報',
  '国土交通省 不動産情報ライブラリ',
  'https://www.reinfolib.mlit.go.jp/',
  '不動産情報ライブラリ API 利用約款（無償・商用可。クレジットの表示が必要）',
  'このサービスは、国土交通省の不動産情報ライブラリのAPI機能を使用していますが、提供情報の最新性、正確性、完全性等が保証されたものではありません'
);

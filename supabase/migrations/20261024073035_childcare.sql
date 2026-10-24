-- 009 飯田市オープンデータ「子育て施設」：放課後児童クラブの種類・出典
--
-- 子育て施設は市のデータを画面に出す（名前・種類が XKT007 より新しく、XKT007 にない施設も入っているため。
-- 2026-10-24 まさゆきさんと決定）。XKT007（reinfolib_xkt007）は公開せず、市のデータの抜けを確かめるのに使う（008）。
-- 中身は npm run childcare:sql が作る *_childcare_data.sql で入れる

-- 放課後児童クラブは小学生の放課後の預け先なので、保育施設（childcare）と数を混ぜないよう種類を分ける
alter type public.facility_kind add value 'after_school_club';

-- 出典。クレジットと更新日は取り込みのたびに *_childcare_data.sql が入れ直す。
-- 公開フラグは、画面にクレジットを出せるようになったら（022）立てる
insert into public.data_sources (id, name, publisher, source_url, license)
values (
  'iida_childcare',
  '子育て施設',
  '飯田市',
  'https://www.city.iida.lg.jp/soshiki/168/opendata.html',
  'PDL1.0'
);

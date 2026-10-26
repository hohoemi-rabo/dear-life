-- 009 飯田市オープンデータ「公共施設一覧」：出典
--
-- 暮らしに関係する種類だけを facilities（kind = 'public_facility'）に市全体で入れ、画面には4地区だけを出す
-- （載せる種類は 2026-10-26 にまさゆきさんと決定。src/lib/city/public-facilities.ts）。
-- 中身は npm run public-facilities:sql が作る *_public_facilities_data.sql で入れる

-- クレジットと更新日は取り込みのたびに *_public_facilities_data.sql が入れ直す。
-- 公開フラグは、画面にクレジットを出せるようになったら（022）立てる
insert into public.data_sources (id, name, publisher, source_url, license)
values (
  'iida_public_facilities',
  '公共施設一覧',
  '飯田市',
  'https://www.city.iida.lg.jp/soshiki/168/opendata.html',
  'PDL1.0'
);

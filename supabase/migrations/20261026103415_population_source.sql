-- 011 地区の人口：出典（e-Stat「国勢調査 小地域集計」）
--
-- 町丁・字等の年齢別人口を4地区ごとに合計して population に入れる。
-- 中身は npm run population:sql が作る *_population_data.sql で入れる

-- クレジットと対象時点は取り込みのたびに *_population_data.sql が入れ直す。
-- 公開フラグは、画面にクレジットを出せるようになったら（022）立てる
insert into public.data_sources (id, name, publisher, source_url, license)
values (
  'estat_census_small_area',
  '国勢調査 小地域集計（町丁・字等別）',
  '総務省統計局',
  'https://www.e-stat.go.jp/gis/statmap-search?type=1',
  '政府標準利用規約（第2.0版）（CC BY 4.0 互換）'
);

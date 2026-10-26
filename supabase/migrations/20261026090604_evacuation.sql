-- 009 飯田市オープンデータ「指定緊急避難場所一覧」：出典
--
-- 避難場所は facilities（kind = 'evacuation_site'）に市全体を入れ、画面には4地区だけを出す。
-- 中身は npm run evacuation:sql が作る *_evacuation_data.sql で入れる

-- クレジットと更新日は取り込みのたびに *_evacuation_data.sql が入れ直す。
-- 公開フラグは、画面にクレジットを出せるようになったら（022）立てる
insert into public.data_sources (id, name, publisher, source_url, license)
values (
  'iida_evacuation',
  '指定緊急避難場所一覧',
  '飯田市',
  'https://www.city.iida.lg.jp/soshiki/168/opendata.html',
  'PDL1.0'
);

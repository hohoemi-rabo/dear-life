-- 011 e-Stat「令和2年国勢調査 小地域集計」の年齢別人口を、4地区ごとに合計して入れる。
-- このファイルは npm run population:sql で作る。手で編集しない（手順は docs/011_population.md）
-- 表：https://www.e-stat.go.jp/gis/statmap-search/data?statsId=T001082&code=20&downloadType=2
-- 合計した町丁・字等：
--   kamisato：上郷
--   kanae：鼎
--   igara：伊賀良
--   chushin：育良町、大門町、桜町、伝馬町、大王路、小伝馬町、江戸町、仲ノ町、二本松、馬場町、浜井町、江戸浜町、東栄町、東中央通、中央通り、松尾町、通り町、本町、知久町、扇町、大久保町、銀座、長姫町、主税町、追手町、常盤町、水の手町、愛宕町、箕瀬町、大通、曙町、旭町、白山通り、松川町、砂払町、正永町、丸山町、白山町、滝の沢、今宮町、元町、中央通り、東和町、吾妻町、鈴加町、錦町、東新町、諏訪町、宮の上、宮の前、高羽町、松尾町

update public.data_sources set
  credit_text = '出典：「令和2年国勢調査 小地域集計」（総務省統計局）（政府統計の総合窓口（e-Stat） https://www.e-stat.go.jp/）を加工して作成（町丁・字等の人口を地区ごとに合計）',
  period_label = '2020年10月1日現在（令和2年国勢調査）',
  checked_on = '2026-10-26'::date
where id = 'estat_census_small_area';

delete from public.population where source_id = 'estat_census_small_area';
insert into public.population (district_id, as_of, total, age_0_14, age_15_64, age_65_plus, source_id) values
  ('kamisato', '2020-10-01'::date, 13534, 1769, 7445, 4116, 'estat_census_small_area'),
  ('kanae', '2020-10-01'::date, 13135, 1727, 7126, 4052, 'estat_census_small_area'),
  ('igara', '2020-10-01'::date, 13285, 1860, 7420, 3888, 'estat_census_small_area'),
  ('chushin', '2020-10-01'::date, 14633, 1610, 7620, 5153, 'estat_census_small_area');

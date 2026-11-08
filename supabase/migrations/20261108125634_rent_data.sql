-- 034 借りて住むときの参考になる国の統計を入れる。
-- このファイルは npm run rent:sql で作る。手で編集しない（手順は docs/034_rent-and-renters.md）
-- 世帯数の表：https://www.e-stat.go.jp/gis/statmap-search/data?statsId=T001085&code=20&downloadType=2
-- 家賃の表：e-Stat 統計表ID 0004021532（飯田市・延べ面積の総数・家賃0円を含まない）
-- 世帯数を合計した町丁・字等：
--   kamisato：上郷
--   kanae：鼎
--   igara：伊賀良
--   chushin：育良町、大門町、桜町、伝馬町、大王路、小伝馬町、江戸町、仲ノ町、二本松、馬場町、浜井町、江戸浜町、東栄町、東中央通、中央通り、松尾町、通り町、本町、知久町、扇町、大久保町、銀座、長姫町、主税町、追手町、常盤町、水の手町、愛宕町、箕瀬町、大通、曙町、旭町、白山通り、松川町、砂払町、正永町、丸山町、白山町、滝の沢、今宮町、元町、中央通り、東和町、吾妻町、鈴加町、錦町、東新町、諏訪町、宮の上、宮の前、高羽町、松尾町

update public.data_sources set
  credit_text = '出典：「令和2年国勢調査 小地域集計」（総務省統計局）（政府統計の総合窓口（e-Stat） https://www.e-stat.go.jp/）を加工して作成（町丁・字等の世帯数を地区ごとに合計）',
  period_label = '2020年10月1日現在（令和2年国勢調査）',
  checked_on = '2026-11-08'::date
where id = 'estat_census_housing_tenure';

update public.data_sources set
  credit_text = '出典：「令和5年住宅・土地統計調査 住宅及び世帯に関する基本集計」（総務省統計局）（政府統計の総合窓口（e-Stat） https://www.e-stat.go.jp/）を加工して作成（飯田市の民営借家の家賃の平均を抜き出し）',
  period_label = '2023年10月1日現在（令和5年住宅・土地統計調査）',
  checked_on = '2026-11-08'::date
where id = 'estat_housing_land_survey_rent';

delete from public.housing_tenure where source_id = 'estat_census_housing_tenure';
insert into public.housing_tenure (district_id, as_of, households_in_housing, owner_occupied, private_rented, source_id) values
  ('kamisato', '2020-10-01'::date, 5550, 3599, 1697, 'estat_census_housing_tenure'),
  ('kanae', '2020-10-01'::date, 5292, 3549, 1511, 'estat_census_housing_tenure'),
  ('igara', '2020-10-01'::date, 4969, 3591, 1062, 'estat_census_housing_tenure'),
  ('chushin', '2020-10-01'::date, 6431, 4203, 1748, 'estat_census_housing_tenure');

delete from public.rent_averages where source_id = 'estat_housing_land_survey_rent';
insert into public.rent_averages (building_type, average_rent, as_of, source_id) values
  ('all', 50043, '2023-10-01'::date, 'estat_housing_land_survey_rent'),
  ('detached', 51671, '2023-10-01'::date, 'estat_housing_land_survey_rent'),
  ('apartment_wooden', 43392, '2023-10-01'::date, 'estat_housing_land_survey_rent'),
  ('apartment_non_wooden', 51483, '2023-10-01'::date, 'estat_housing_land_survey_rent');

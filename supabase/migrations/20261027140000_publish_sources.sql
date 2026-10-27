-- 022 データについて：クレジットを画面（データについてページ・全画面の下）に出せるようになったので、出典を公開する（要件 7.3・F-09）。
-- 公開しないもの：
--   iida_jr_timetable（電車の時刻）……飯田市の許可を取るまで公開しない（026）
--   reinfolib_xkt006・reinfolib_xkt007（国の学校・保育施設）……画面には市のデータを出し、抜けの確かめにだけ使う（008・009）
update public.data_sources
set is_published = true
where id in (
  'reinfolib_xit001',
  'reinfolib_xkt004',
  'reinfolib_xkt005',
  'iida_education',
  'iida_childcare',
  'iida_evacuation',
  'iida_public_facilities',
  'gtfs_minamishinshu_bus',
  'sena_iida_line_stations',
  'estat_census_small_area',
  'rakuen_shinshu_iida_sheet'
);

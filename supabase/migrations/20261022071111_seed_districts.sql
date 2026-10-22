-- 003 対象の4地区（要件 2.1）。並び順は画面の表記「上郷・鼎・伊賀良・中心市街地」に合わせる

insert into public.districts (id, name, sort_order, area_description) values
  ('kamisato', '上郷', 1, '上郷飯沼・上郷黒田・上郷別府'),
  ('kanae', '鼎', 2, '鼎'),
  ('igara', '伊賀良', 3, '大瀬木・北方・中村・三日市場・上殿岡・下殿岡'),
  ('chushin', '中心市街地', 4, '丸山・東野・橋北・橋南をまとめたもの。上飯田を含み、羽場は含めない');

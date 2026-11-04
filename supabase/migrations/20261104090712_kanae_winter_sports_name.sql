-- 鼎の冬季スポーツ大会に、競技名を入れる（2026-11-04 まさゆきさん）。
-- 元の資料（飯田市の公民館活動、令和7年度）にも「冬季スポーツ大会（ボッチャ）」とある（docs/012 の表）。
-- 画面の絵とピンは行事名で引くので、EVENT_ILLUSTS・EVENT_PINS と同じ名前にする。
update public.district_events
set name = '冬季スポーツ大会（ボッチャ）'
where district_id = 'kanae'
  and name = '冬季スポーツ大会';

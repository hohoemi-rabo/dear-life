-- 037 地区の診療所（クリニック）の数を入れる。
-- このファイルは npm run clinics:sql で作る。手で編集しない（手順は docs/037_errand-places-by-district.md）
-- 表：https://www.mhlw.go.jp/content/11121000/02-1_clinic_facility_info_20260601.csv.zip
-- 数えた診療所（除いたものは data/clinic_exclusions.csv）：
--   kamisato（13か所）：回生堂皮膚科クリニック、フルタ眼科医院、のむら内科医院、安達整形外科医院、慶友整形外科、飯田市立高松診療所、いちはし内科医院、クリニックやながわ、こばやしクリニック泌尿器科皮フ科、かみさと耳鼻咽喉科医院、しばたファミリークリニック、エルムクリニック、南信州ハートクリニック
--   kanae（8か所）：飯田中央眼科、村松眼科医院、宮入皮膚科医院、羽生循環器科内科、曽我医院、飯田橋木下医院、木下クリニック、宝クリニック
--   igara（5か所）：清水医院、横田医院、まるやまファミリークリニック、山岡整形外科、くまがいクリニック
--   chushin（20か所）：上松医院、波多野医院、宮澤医院、ささき医院、すきがら医院、飯田市休日夜間急患診療所、医療法人　慶耳会　中島耳鼻咽喉科医院、源田内科医院、加藤医院、渡辺医院、久田小児科医院、矢澤内科・循環器科医院、古島内科胃腸科医院、森山医院、矢高眼科医院、おおぎ整形外科、浦野耳鼻咽喉科医院、後藤医院　※呼称：伝馬町後藤医院、飯田病院附属仲ノ町診療所、西澤産婦人科クリニック

update public.data_sources set
  credit_text = '出典：厚生労働省「医療情報ネット（ナビイ）」オープンデータ（診療所の施設票）（https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryou/newpage_43373.html）を加工して作成（飯田市の診療所を住所で地区ごとに数え、健診の施設と、施設に住む人のための診療所を除いた）',
  period_label = '2026年6月1日時点',
  checked_on = '2026-11-11'::date
where id = 'mhlw_medical_clinics';

delete from public.clinic_counts where source_id = 'mhlw_medical_clinics';
insert into public.clinic_counts (district_id, as_of, clinic_count, excluded_count, source_id) values
  ('kamisato', '2026-06-01'::date, 13, 1, 'mhlw_medical_clinics'),
  ('kanae', '2026-06-01'::date, 8, 0, 'mhlw_medical_clinics'),
  ('igara', '2026-06-01'::date, 5, 1, 'mhlw_medical_clinics'),
  ('chushin', '2026-06-01'::date, 20, 0, 'mhlw_medical_clinics');

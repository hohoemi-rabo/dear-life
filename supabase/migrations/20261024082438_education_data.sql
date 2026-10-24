-- 009 飯田市オープンデータ「教育機関一覧」の学校を、市の CSV にそろえる。
-- このファイルは npm run education:sql で作る。手で編集しない（手順は docs/009_ingest-city-opendata.md）
-- CSV：https://www.city.iida.lg.jp/uploaded/attachment/72005.csv

update public.data_sources set
  credit_text = '出典：飯田市（https://www.city.iida.lg.jp/soshiki/168/opendata.html）、PDL1.0（https://www.digital.go.jp/resources/open_data/public_data_license_v1.0）（2026年10月24日に利用）。「教育機関一覧」（飯田市）（https://www.city.iida.lg.jp/soshiki/168/opendata.html）を加工して作成（幼保連携型認定こども園を除いた）',
  period_label = '更新日の記載なし',
  checked_on = '2026-10-24'::date
where id = 'iida_education';

delete from public.facilities where source_id = 'iida_education';
insert into public.facilities (kind, subkind, name, address, town_name, district_id, latitude, longitude, source_id, source_key, attributes) values
  ('school'::public.facility_kind, '小学校', '浜井場小学校', '長野県飯田市小伝馬町一丁目3503', '小伝馬町', 'chushin', 35.519039, 137.83164, 'iida_education', 'B120220500037', '{"school_code":"B120220500037","school_type_code":"B1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '小学校', '追手町小学校', '長野県飯田市追手町二丁目673-1', '追手町', 'chushin', 35.513064, 137.829096, 'iida_education', 'B120220500028', '{"school_code":"B120220500028","school_type_code":"B1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '小学校', '丸山小学校', '長野県飯田市今宮町二丁目113-1', '今宮町', 'chushin', 35.520765, 137.816573, 'iida_education', 'B120220500019', '{"school_code":"B120220500019","school_type_code":"B1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '小学校', '座光寺小学校', '長野県飯田市座光寺1717-3', '座光寺', null, 35.536957, 137.855123, 'iida_education', 'B120220500046', '{"school_code":"B120220500046","school_type_code":"B1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '小学校', '松尾小学校', '長野県飯田市松尾城3800-1', '松尾城', null, 35.495067, 137.844584, 'iida_education', 'B120220500055', '{"school_code":"B120220500055","school_type_code":"B1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '小学校', '下久堅小学校', '長野県飯田市下久堅知久平940-1', '下久堅知久平', null, 35.476164, 137.850512, 'iida_education', 'B120220500108', '{"school_code":"B120220500108","school_type_code":"B1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '小学校', '上久堅小学校', '長野県飯田市上久堅1995-4', '上久堅', null, 35.461486, 137.882879, 'iida_education', 'B120220500153', '{"school_code":"B120220500153","school_type_code":"B1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '小学校', '千代小学校', '長野県飯田市千代3166-2', '千代', null, 35.419093, 137.863783, 'iida_education', 'B120220500126', '{"school_code":"B120220500126","school_type_code":"B1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '小学校', '千栄小学校', '長野県飯田市千栄1530-1', '千栄', null, 35.42398, 137.83085, 'iida_education', 'B120220500135', '{"school_code":"B120220500135","school_type_code":"B1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '小学校', '龍江小学校', '長野県飯田市龍江3591-1', '龍江', null, 35.450161, 137.826833, 'iida_education', 'B120220500144', '{"school_code":"B120220500144","school_type_code":"B1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '小学校', '竜丘小学校', '長野県飯田市桐林336', '桐林', null, 35.469744, 137.826377, 'iida_education', 'B120220500064', '{"school_code":"B120220500064","school_type_code":"B1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '小学校', '川路小学校', '長野県飯田市川路3477-1', '川路', null, 35.448333, 137.808632, 'iida_education', 'B120220500117', '{"school_code":"B120220500117","school_type_code":"B1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '小学校', '三穂小学校', '長野県飯田市伊豆木3778', '伊豆木', null, 35.443025, 137.796153, 'iida_education', 'B120220500073', '{"school_code":"B120220500073","school_type_code":"B1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '小学校', '山本小学校', '長野県飯田市竹佐819-6', '竹佐', null, 35.471224, 137.767486, 'iida_education', 'B120220500091', '{"school_code":"B120220500091","school_type_code":"B1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '小学校', '伊賀良小学校', '長野県飯田市北方3872-1', '北方', 'igara', 35.500465, 137.792248, 'iida_education', 'B120220500082', '{"school_code":"B120220500082","school_type_code":"B1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '小学校', '鼎小学校', '長野県飯田市鼎中平2472', '鼎中平', 'kanae', 35.507837, 137.822144, 'iida_education', 'B120220500162', '{"school_code":"B120220500162","school_type_code":"B1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '小学校', '上郷小学校', '長野県飯田市上郷飯沼3118', '上郷飯沼', 'kamisato', 35.519056, 137.842472, 'iida_education', 'B120220500171', '{"school_code":"B120220500171","school_type_code":"B1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '小学校', '上村小学校', '長野県飯田市上村838', '上村', null, 35.383781, 137.969347, 'iida_education', 'B120220500180', '{"school_code":"B120220500180","school_type_code":"B1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '小学校', '和田小学校', '長野県飯田市南信濃和田1165', '南信濃和田', null, 35.323627, 137.936505, 'iida_education', 'B120220500199', '{"school_code":"B120220500199","school_type_code":"B1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '中学校', '飯田東中学校', '長野県飯田市高羽町三丁目16', '高羽町', 'chushin', 35.522194, 137.821443, 'iida_education', 'C120220500026', '{"school_code":"C120220500026","school_type_code":"C1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '中学校', '飯田西中学校', '長野県飯田市正永町一丁目1215', '正永町', 'chushin', 35.524304, 137.805862, 'iida_education', 'C120220500017', '{"school_code":"C120220500017","school_type_code":"C1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '中学校', '緑ヶ丘中学校', '長野県飯田市毛賀426', '毛賀', null, 35.487312, 137.840632, 'iida_education', 'C120220500035', '{"school_code":"C120220500035","school_type_code":"C1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '中学校', '竜東中学校', '長野県飯田市龍江9205', '龍江', null, 35.44009, 137.852258, 'iida_education', 'C120220500053', '{"school_code":"C120220500053","school_type_code":"C1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '中学校', '竜峡中学校', '長野県飯田市川路4370', '川路', null, 35.441631, 137.809779, 'iida_education', 'C120220500044', '{"school_code":"C120220500044","school_type_code":"C1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '中学校', '旭ヶ丘中学校', '長野県飯田市大瀬木3530', '大瀬木', 'igara', 35.490558, 137.779506, 'iida_education', 'C120220500062', '{"school_code":"C120220500062","school_type_code":"C1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '中学校', '鼎中学校', '長野県飯田市鼎上山2582', '鼎上山', 'kanae', 35.504437, 137.823425, 'iida_education', 'C120220500071', '{"school_code":"C120220500071","school_type_code":"C1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '中学校', '高陵中学校', '長野県飯田市上郷黒田5485', '上郷黒田', 'kamisato', 35.522613, 137.843911, 'iida_education', 'C120220500080', '{"school_code":"C120220500080","school_type_code":"C1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '中学校', '遠山中学校', '長野県飯田市南信濃和田950', '南信濃和田', null, 35.327193, 137.937993, 'iida_education', 'C120220500099', '{"school_code":"C120220500099","school_type_code":"C1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '高等学校', '飯田高等学校', '長野県飯田市上郷黒田450', '上郷黒田', 'kamisato', 35.516552, 137.84217, 'iida_education', 'D120220500042', '{"school_code":"D120220500042","school_type_code":"D1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '高等学校', '飯田風越高等学校', '長野県飯田市上郷黒田6462', '上郷黒田', 'kamisato', 35.528053, 137.821785, 'iida_education', 'D120220500015', '{"school_code":"D120220500015","school_type_code":"D1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '高等学校', '飯田ＯＩＤＥ長姫高等学校', '長野県飯田市鼎名古熊2535-2', '鼎名古熊', 'kanae', 35.502007, 137.832123, 'iida_education', 'D120220500024', '{"school_code":"D120220500024","school_type_code":"D1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '高等学校', '下伊那農業高等学校', '長野県飯田市鼎名古熊2366-4', '鼎名古熊', 'kanae', 35.500089, 137.825283, 'iida_education', 'D120220500033', '{"school_code":"D120220500033","school_type_code":"D1","establishment":"公立"}'::jsonb),
  ('school'::public.facility_kind, '高等学校', '飯田女子高等学校', '長野県飯田市上郷飯沼3135-3', '上郷飯沼', 'kamisato', 35.518364, 137.843903, 'iida_education', 'D120320500013', '{"school_code":"D120320500013","school_type_code":"D1","establishment":"私立"}'::jsonb),
  ('school'::public.facility_kind, '専修学校', '飯田コアカレッジ', '長野県飯田市松尾明7591', '松尾明', null, 35.493142, 137.8507, 'iida_education', 'H120320500014', '{"school_code":"H120320500014","school_type_code":"H1","establishment":"私立"}'::jsonb),
  ('school'::public.facility_kind, '短期大学', '飯田短期大学', '長野県飯田市松尾代田610', '松尾代田', null, 35.494136, 137.833671, 'iida_education', 'F220310105883', '{"school_code":"F220310105883","school_type_code":"F2","establishment":"私立"}'::jsonb),
  ('school'::public.facility_kind, '専修学校', '飯田ビジネス専門学校', '長野県飯田市高羽町五丁目6番地12', '高羽町', 'chushin', 35.523913, 137.820859, 'iida_education', 'H120320500023', '{"school_code":"H120320500023","school_type_code":"H1","establishment":"私立"}'::jsonb);

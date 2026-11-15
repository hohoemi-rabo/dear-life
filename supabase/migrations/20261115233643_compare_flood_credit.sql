-- 地区くらべ「いまの街と」（041）：水害被害額を1人あたり・1年あたりにした（2026-11-16）ので、出典の加工の説明と対象期間を直す
update public.data_sources
set credit_text = '出典：「水害統計調査」（国土交通省）（政府統計の総合窓口（e-Stat） https://www.e-stat.go.jp/）を加工して作成（市ごとの一般資産等被害額の直近10年の1年あたりの平均を、令和2年国勢調査の人口で割って1人あたりにした）',
    period_label = '2014〜2023年'
where id = 'mlit_flood_statistics';

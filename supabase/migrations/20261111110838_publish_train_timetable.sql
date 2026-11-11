-- 026 電車の時刻（飯田市の時刻表 PDF を書き写したもの）を、確認用に公開する（2026-11-11 まさゆきさん）。
-- サイトはまだ案内していない（025 の前）。市の許可は、実装を見せてから取る（まさゆきさん。許可が出たらライセンスとクレジットを直す）
update public.data_sources set is_published = true where id = 'iida_jr_timetable';

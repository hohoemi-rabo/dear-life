-- 036 わが家の下見プラン：バス停の名前を画面に出さず、「地区のバス停◯か所のうち◯か所から、乗りかえなしで行ける」と伝えるための列。
-- 値は npm run bus:sql が時刻表から数えて入れる（行き先へ乗りかえなしで行けて、乗りかえなしで帰ってこられるバス停の数）。
-- 当てた直後は空。次のバスのデータのマイグレーションで入り、そのあとのマイグレーションで not null にする
alter table public.bus_outings
  add column destination_place_name text check (destination_place_name <> ''),
  add column district_stop_count smallint check (district_stop_count > 0),
  add column reachable_stop_count smallint check (reachable_stop_count >= 0),
  add constraint bus_outings_reach_within_district check (reachable_stop_count <= district_stop_count);

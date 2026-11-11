-- 036：前のバスのデータのマイグレーションで値が入ったので、必須にする（npm run bus:sql はいつもこの3列を書く）
alter table public.bus_outings
  alter column destination_place_name set not null,
  alter column district_stop_count set not null,
  alter column reachable_stop_count set not null;

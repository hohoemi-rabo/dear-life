-- 004 対応表にない町名を記録する（要件 5章-2）。定期取得 Worker が service_role で1回の取得につき1回呼ぶ。
-- 同じ町名が何度出ても1行にまとめ、出た回数と最後に見た日時を足していく。
-- 反映済みの町名がまた出たら、反映できていなかったとみなして未反映に戻す

create function public.record_unmapped_towns(p_source_id text, p_town_names text[])
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.unmapped_towns (town_name, source_id, occurrences)
  select trim(name), p_source_id, count(*)
  from unnest(p_town_names) as name
  where trim(name) <> ''
  group by trim(name)
  on conflict (town_name, source_id) do update set
    last_seen_at = now(),
    occurrences = public.unmapped_towns.occurrences + excluded.occurrences,
    resolved_at = null;
$$;

comment on function public.record_unmapped_towns(text, text[]) is '対応表にない町名をまとめて記録する（004）。空の町名は無視する';

revoke execute on function public.record_unmapped_towns(text, text[]) from public, anon, authenticated;
grant execute on function public.record_unmapped_towns(text, text[]) to service_role;

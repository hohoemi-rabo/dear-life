-- 005 取得の記録の終了日時をデータベースの時計で付ける。
-- 開始日時（started_at の default now()）と同じ時計にそろえ、Worker の時計のずれで終了が開始より前にならないようにする

create function public.set_ingest_run_finished_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'running' and new.status <> 'running' then
    new.finished_at := now();
  end if;
  return new;
end;
$$;

revoke execute on function public.set_ingest_run_finished_at() from public, anon, authenticated;

create trigger ingest_runs_set_finished_at before update on public.ingest_runs
  for each row execute function public.set_ingest_run_finished_at();

comment on column public.ingest_runs.finished_at is '終わった日時。status を running から変えたときにトリガーで付ける';

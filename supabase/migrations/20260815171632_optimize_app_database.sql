create index if not exists idx_document_categories_category_id
  on public.document_categories (category_id);

create index if not exists idx_document_goals_goal_id
  on public.document_goals (goal_id);

alter table public.attachments enable row level security;
alter table public.cash_flows enable row level security;
alter table public.categories enable row level security;
alter table public.checkins enable row level security;
alter table public.document_categories enable row level security;
alter table public.document_goals enable row level security;
alter table public.goals enable row level security;
alter table public.notes_legacy enable row level security;
alter table public.settings enable row level security;
alter table public.task_categories enable row level security;
alter table public.tasks enable row level security;

revoke all on table public.attachments from anon;
revoke all on table public.cash_flows from anon;
revoke all on table public.categories from anon;
revoke all on table public.checkins from anon;
revoke all on table public.document_categories from anon;
revoke all on table public.document_goals from anon;
revoke all on table public.goals from anon;
revoke all on table public.notes_legacy from anon;
revoke all on table public.settings from anon;
revoke all on table public.task_categories from anon;
revoke all on table public.tasks from anon;

revoke truncate, references, trigger on all tables in schema public from authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

drop policy if exists authenticated_full_access on public.attachments;
create policy authenticated_full_access on public.attachments
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public.cash_flows;
create policy authenticated_full_access on public.cash_flows
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public.categories;
create policy authenticated_full_access on public.categories
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public.checkins;
create policy authenticated_full_access on public.checkins
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public.document_categories;
create policy authenticated_full_access on public.document_categories
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public.document_goals;
create policy authenticated_full_access on public.document_goals
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public.goals;
create policy authenticated_full_access on public.goals
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public.notes_legacy;
create policy authenticated_full_access on public.notes_legacy
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public.settings;
create policy authenticated_full_access on public.settings
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public.task_categories;
create policy authenticated_full_access on public.task_categories
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_full_access on public.tasks;
create policy authenticated_full_access on public.tasks
  for all to authenticated using (true) with check (true);

revoke all on function public.rls_auto_enable() from public;
revoke all on function public.rls_auto_enable() from anon;
revoke all on function public.rls_auto_enable() from authenticated;

create or replace function public.claim_automation_run(
  p_min_interval_seconds integer default 240
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  with claim as (
    insert into public.settings (key, value)
    values ('automation_last_run_at', now()::text)
    on conflict (key) do update
      set value = excluded.value
      where public.settings.value::timestamp with time zone
        <= now() - make_interval(secs => p_min_interval_seconds)
    returning 1
  )
  select exists(select 1 from claim);
$$;

revoke all on function public.claim_automation_run(integer) from public;
revoke all on function public.claim_automation_run(integer) from anon;
grant execute on function public.claim_automation_run(integer) to authenticated;
grant execute on function public.claim_automation_run(integer) to service_role;

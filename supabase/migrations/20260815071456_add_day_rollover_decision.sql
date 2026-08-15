alter table public.documents
  add column if not exists rollover_source_date date,
  add column if not exists rollover_status text,
  add column if not exists rollover_decided_at timestamp with time zone;

alter table public.documents
  drop constraint if exists documents_rollover_status_check;

alter table public.documents
  add constraint documents_rollover_status_check
  check (rollover_status is null or rollover_status in ('carried', 'dismissed'));

alter table public.documents enable row level security;

revoke all on table public.documents from anon;

drop policy if exists authenticated_full_access on public.documents;
create policy authenticated_full_access on public.documents
  for all
  to authenticated
  using (true)
  with check (true);

create or replace function public.handle_day_rollover(
  p_from_date date,
  p_to_date date,
  p_action text
)
returns setof public.documents
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_source_blocks jsonb;
  v_result public.documents%rowtype;
begin
  if p_action not in ('carried', 'dismissed') then
    raise exception 'Invalid rollover action' using errcode = '22023';
  end if;

  if p_to_date <> p_from_date + 1 then
    raise exception 'Rollover dates must be consecutive' using errcode = '22023';
  end if;

  select *
    into v_result
    from public.documents
    where date = p_to_date
      and rollover_status is not null;

  if found then
    return next v_result;
    return;
  end if;

  if p_action = 'carried' then
    select blocks
      into v_source_blocks
      from public.documents
      where date = p_from_date;

    if not found or v_source_blocks is null then
      raise exception 'Source day has no document' using errcode = 'P0002';
    end if;
  end if;

  insert into public.documents (
    date,
    title,
    sort_order,
    content,
    blocks,
    rollover_source_date,
    rollover_status,
    rollover_decided_at,
    updated_at
  )
  values (
    p_to_date,
    '',
    0,
    '',
    case when p_action = 'carried' then v_source_blocks else null end,
    p_from_date,
    p_action,
    now(),
    now()
  )
  on conflict (date) do update
  set
    blocks = case
      when p_action = 'carried'
        and not jsonb_path_exists(
          coalesce(public.documents.blocks, '{}'::jsonb),
          '$.** ? (@.type == "taskBlock" || (@.type == "text" && @.text like_regex "\\S"))'
        )
      then excluded.blocks
      else public.documents.blocks
    end,
    rollover_source_date = excluded.rollover_source_date,
    rollover_status = case
      when p_action = 'carried'
        and jsonb_path_exists(
          coalesce(public.documents.blocks, '{}'::jsonb),
          '$.** ? (@.type == "taskBlock" || (@.type == "text" && @.text like_regex "\\S"))'
        )
      then 'dismissed'
      else excluded.rollover_status
    end,
    rollover_decided_at = excluded.rollover_decided_at,
    updated_at = excluded.updated_at
  where public.documents.rollover_status is null
  returning * into v_result;

  if v_result.id is null then
    select *
      into v_result
      from public.documents
      where date = p_to_date;
  end if;

  return next v_result;
end;
$$;

revoke all on function public.handle_day_rollover(date, date, text) from public;
revoke all on function public.handle_day_rollover(date, date, text) from anon;
grant execute on function public.handle_day_rollover(date, date, text) to authenticated;
grant execute on function public.handle_day_rollover(date, date, text) to service_role;

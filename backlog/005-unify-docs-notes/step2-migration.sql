-- 005 Step 2: merge day-notes into documents (one "note" type).
-- ⚠️ REVIEW AGAINST THE LIVE SCHEMA BEFORE RUNNING (column names inferred from
-- app code). Run in the Supabase SQL editor inside a transaction. The old
-- notes table is RENAMED, not dropped — full rollback = rename it back.

begin;

-- 1) Documents gain the day-note fields: a unique date (null = subject doc)
--    and the optional blocks JSON notes carried.
alter table documents add column if not exists date date unique;
alter table documents add column if not exists blocks jsonb;

-- 2) Move every day-note into documents. Title left empty — day-notes derive
--    their display title from the date (shipped in 005 Step 1).
insert into documents (title, content, blocks, date, sort_order, created_at, updated_at)
select
  '',                              -- title derived from date at render
  n.content,
  case
    when n.blocks is null then null
    else n.blocks::jsonb
  end,
  n.date::date,
  0,
  coalesce(n.created_at, now()),
  coalesce(n.updated_at, now())
from notes n;

-- 3) Repoint polymorphic attachments from the old note ids to the new
--    document ids (matched via the unique date).
update attachments a
set entity_type = 'document',
    entity_id   = d.id
from notes n
join documents d on d.date = n.date::date
where a.entity_type = 'note'
  and a.entity_id   = n.id;

-- 4) Keep the old table as a safety net (drop manually weeks later).
alter table notes rename to notes_legacy;

commit;

-- Rollback (if anything looks wrong AFTER commit):
--   begin;
--   update attachments a set entity_type='note', entity_id=n.id
--     from notes_legacy n join documents d on d.date = n.date::date
--     where a.entity_type='document' and a.entity_id=d.id and d.date is not null;
--   delete from documents where date is not null;
--   alter table documents drop column date, drop column blocks;
--   alter table notes_legacy rename to notes;
--   commit;

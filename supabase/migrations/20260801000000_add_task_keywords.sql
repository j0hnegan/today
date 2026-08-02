-- Hidden search-enrichment terms on tasks. Not user-facing tags: an agent
-- (via MCP update_task) periodically fills these with related concepts so
-- search finds tasks by meaning, e.g. "get Tylenol" keyworded {migraine,health}.
alter table tasks add column if not exists keywords text[] not null default '{}';

-- Enable Row Level Security on all tables and grant authenticated users full access.
-- Run this once against the Supabase database.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'tasks', 'categories', 'task_categories', 'goals',
    'documents', 'document_categories', 'document_goals',
    'notes', 'attachments', 'checkins', 'settings'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY "authenticated_full_access" ON %I FOR ALL USING (auth.role() = ''authenticated'')',
      tbl
    );
  END LOOP;
END
$$;

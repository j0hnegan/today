-- Enable Supabase Realtime for the tasks table so changes from any source
-- (other tabs, MCP, Claude, cron triage) stream to connected clients.
--
-- postgres_changes is authorized by the table's existing RLS policy
-- (authenticated_full_access: auth.role() = 'authenticated'), which already
-- grants SELECT, so the logged-in user receives every event. No extra policy
-- is needed.

ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- DELETE payloads carry only the replica-identity columns. The default
-- (primary key) is enough here — the client only needs the id to drop the row
-- from cache — so we leave REPLICA IDENTITY at its default.

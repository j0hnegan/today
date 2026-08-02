-- Stream day-doc changes (documents table) to connected clients so the Day
-- view stays live across tabs/devices and picks up MCP writes instantly.
-- Same authorization story as tasks: postgres_changes is gated by the
-- existing RLS policy, which already grants SELECT to authenticated.

ALTER PUBLICATION supabase_realtime ADD TABLE documents;

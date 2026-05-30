CREATE TABLE IF NOT EXISTS cash_flows (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Cash Flow Forecast',
  starting_balance NUMERIC NOT NULL DEFAULT 0,
  starting_date TEXT,
  rows JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE cash_flows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_full_access" ON cash_flows;
CREATE POLICY "authenticated_full_access" ON cash_flows
  FOR ALL USING (auth.role() = 'authenticated');

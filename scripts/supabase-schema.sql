-- Hush: Postgres schema (Supabase-compatible)
-- Reflects the final state after all SQLite migrations have been applied.

-- =============================================================================
-- TASKS
-- =============================================================================
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  destination TEXT NOT NULL DEFAULT 'someday'
    CHECK (destination IN ('on_deck', 'someday', 'in_progress')),
  consequence TEXT NOT NULL DEFAULT 'none'
    CHECK (consequence IN ('none', 'soft', 'hard')),
  size TEXT NOT NULL DEFAULT 'small'
    CHECK (size IN ('xs', 'small', 'medium', 'large')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'done')),
  due_date TEXT,
  snoozed_until TEXT,
  snooze_reason TEXT,
  done_at TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_destination_status ON tasks (destination, status);
CREATE INDEX idx_tasks_due_date ON tasks (due_date);

-- =============================================================================
-- CATEGORIES (migrated from "tags")
-- =============================================================================
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6366f1'
);

-- =============================================================================
-- TASK_CATEGORIES (migrated from "task_tags")
-- =============================================================================
CREATE TABLE task_categories (
  task_id INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, category_id)
);

CREATE INDEX idx_task_categories_task_id ON task_categories (task_id);
CREATE INDEX idx_task_categories_category_id ON task_categories (category_id);

-- =============================================================================
-- GOALS
-- =============================================================================
CREATE TABLE goals (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category_id INTEGER REFERENCES categories (id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'done')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goals_category_id ON goals (category_id);
CREATE INDEX idx_goals_status ON goals (status);

-- =============================================================================
-- DOCUMENTS
-- =============================================================================
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_updated ON documents (updated_at DESC);

-- =============================================================================
-- DOCUMENT_CATEGORIES
-- =============================================================================
CREATE TABLE document_categories (
  document_id INTEGER NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, category_id)
);

-- =============================================================================
-- DOCUMENT_GOALS
-- =============================================================================
CREATE TABLE document_goals (
  document_id INTEGER NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  goal_id INTEGER NOT NULL REFERENCES goals (id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, goal_id)
);

-- =============================================================================
-- NOTES
-- =============================================================================
CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  content TEXT DEFAULT '',
  blocks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_date ON notes (date);

-- =============================================================================
-- ATTACHMENTS
-- =============================================================================
CREATE TABLE attachments (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('note', 'document', 'task')),
  entity_id INTEGER NOT NULL,
  thumbnail TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attachments_entity ON attachments (entity_type, entity_id);

-- =============================================================================
-- CHECKINS
-- =============================================================================
CREATE TABLE checkins (
  id SERIAL PRIMARY KEY,
  energy TEXT NOT NULL
    CHECK (energy IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checkins_created_at ON checkins (created_at DESC);

-- =============================================================================
-- SETTINGS
-- =============================================================================
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Seed default settings
INSERT INTO settings (key, value) VALUES ('user_name', 'John')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('checkin_interval_hours', '4')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('weekly_nudge_day', 'sunday')
  ON CONFLICT (key) DO NOTHING;

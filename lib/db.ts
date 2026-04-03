import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "focus.db");

const globalForDb = globalThis as unknown as {
  _db: Database.Database | undefined;
  _lastAccess: number | undefined;
};

// Max idle time before forcing a fresh connection (5 seconds).
// Normal SWR polling hits every 1-2s. Any gap > 5s means the process was
// suspended (laptop sleep). Proactively cycle the connection rather than
// risk a stale file descriptor hanging the health check query.
const MAX_IDLE_MS = 5 * 1000;

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      destination TEXT NOT NULL DEFAULT 'someday'
        CHECK(destination IN ('on_deck', 'someday', 'in_progress')),
      consequence TEXT NOT NULL DEFAULT 'none'
        CHECK(consequence IN ('none', 'soft', 'hard')),
      size TEXT NOT NULL DEFAULT 'small'
        CHECK(size IN ('xs', 'small', 'medium', 'large')),
      status TEXT NOT NULL DEFAULT 'active'
        CHECK(status IN ('active', 'done')),
      due_date TEXT,
      snoozed_until TEXT,
      snooze_reason TEXT,
      done_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#6366f1'
    );

    CREATE TABLE IF NOT EXISTS task_tags (
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      energy TEXT NOT NULL CHECK(energy IN ('low', 'medium', 'high')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES ('user_name', 'John');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('checkin_interval_hours', '4');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('weekly_nudge_day', 'sunday');

    CREATE INDEX IF NOT EXISTS idx_tasks_destination_status ON tasks(destination, status);
    CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON checkins(created_at DESC);
  `);

  // Migrate size values from old 3-tier (quick/medium/long) to new 4-tier (xs/small/medium/large)
  migrateSizes(database);

  // Fix task_tags FK if a previous migration left it pointing at _tasks_old
  fixTaskTagsFk(database);

  // Add sort_order column for manual task reordering within sections
  addSortOrder(database);

  // Migrate tags → categories and add goals + documents tables
  migrateToCategories(database);

  // Add notes + attachments tables and migrate settings-based notes
  addNotesAndAttachments(database);

  // Add thumbnail column to attachments
  addAttachmentThumbnail(database);

  // Add blocks column to notes
  addNotesBlocks(database);

  // Add in_progress destination
  addInProgressDestination(database);
}

function migrateSizes(database: Database.Database) {
  // Check if the table schema still has the old CHECK constraint
  const tableInfo = database
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'")
    .get() as { sql: string } | undefined;

  if (!tableInfo) return;

  // If schema already has 'xs', it's the new format — nothing to do
  if (tableInfo.sql.includes("'xs'")) return;

  // SQLite doesn't support ALTER CHECK, so we need rename-copy-drop.
  // We must also rebuild task_tags because ALTER TABLE RENAME updates
  // FK references in other tables, leaving them pointing at _tasks_old.
  database.exec(`
    PRAGMA foreign_keys = OFF;

    ALTER TABLE tasks RENAME TO _tasks_old;

    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      destination TEXT NOT NULL DEFAULT 'someday'
        CHECK(destination IN ('on_deck', 'someday', 'in_progress')),
      consequence TEXT NOT NULL DEFAULT 'none'
        CHECK(consequence IN ('none', 'soft', 'hard')),
      size TEXT NOT NULL DEFAULT 'small'
        CHECK(size IN ('xs', 'small', 'medium', 'large')),
      status TEXT NOT NULL DEFAULT 'active'
        CHECK(status IN ('active', 'done')),
      due_date TEXT,
      snoozed_until TEXT,
      snooze_reason TEXT,
      done_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO tasks (id, title, description, destination, consequence, size, status, due_date, snoozed_until, snooze_reason, done_at, created_at, updated_at)
    SELECT id, title, description, destination, consequence,
      CASE size
        WHEN 'quick' THEN 'xs'
        WHEN 'medium' THEN 'small'
        WHEN 'long' THEN 'large'
        ELSE size
      END,
      status, due_date, snoozed_until, snooze_reason, done_at, created_at, updated_at
    FROM _tasks_old;

    DROP TABLE _tasks_old;

    -- Rebuild task_tags so its FK points to tasks, not _tasks_old
    ALTER TABLE task_tags RENAME TO _task_tags_old;
    CREATE TABLE task_tags (
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, tag_id)
    );
    INSERT INTO task_tags SELECT * FROM _task_tags_old;
    DROP TABLE _task_tags_old;

    CREATE INDEX IF NOT EXISTS idx_tasks_destination_status ON tasks(destination, status);
    CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);

    PRAGMA foreign_keys = ON;
  `);
}

function fixTaskTagsFk(database: Database.Database) {
  const ttInfo = database
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='task_tags'")
    .get() as { sql: string } | undefined;

  if (!ttInfo || !ttInfo.sql.includes("_tasks_old")) return;

  database.exec(`
    PRAGMA foreign_keys = OFF;
    ALTER TABLE task_tags RENAME TO _task_tags_old;
    CREATE TABLE task_tags (
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, tag_id)
    );
    INSERT INTO task_tags SELECT * FROM _task_tags_old;
    DROP TABLE _task_tags_old;
    CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);
    PRAGMA foreign_keys = ON;
  `);
}

function addSortOrder(database: Database.Database) {
  const tableInfo = database
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'")
    .get() as { sql: string } | undefined;

  if (!tableInfo || tableInfo.sql.includes("sort_order")) return;

  database.exec(`ALTER TABLE tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`);
}

function migrateToCategories(database: Database.Database) {
  // Check if tags table still exists AND categories doesn't yet exist
  const tagsExists = database
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tags'")
    .get();
  const categoriesExists = database
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'")
    .get();

  if (tagsExists && !categoriesExists) {
    database.exec(`
      PRAGMA foreign_keys = OFF;

      -- Rename tags → categories
      ALTER TABLE tags RENAME TO categories;

      -- Rebuild task_tags as task_categories with proper column names
      CREATE TABLE task_categories (
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, category_id)
      );
      INSERT INTO task_categories (task_id, category_id) SELECT task_id, tag_id FROM task_tags;
      DROP TABLE task_tags;

      PRAGMA foreign_keys = ON;
    `);

    // Rebuild indexes for the new table
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_task_categories_task_id ON task_categories(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_categories_category_id ON task_categories(category_id);
    `);
  } else if (tagsExists && categoriesExists) {
    // Categories already migrated but initSchema re-created tags/task_tags — drop the leftovers
    database.exec(`
      DROP TABLE IF EXISTS task_tags;
      DROP TABLE IF EXISTS tags;
    `);
    database.exec(`
      CREATE TABLE IF NOT EXISTS task_categories (
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, category_id)
      );
      CREATE INDEX IF NOT EXISTS idx_task_categories_task_id ON task_categories(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_categories_category_id ON task_categories(category_id);
    `);
  }

  // Create goals table if it doesn't exist
  database.exec(`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'done')),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_goals_category_id ON goals(category_id);
    CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
  `);

  // Create documents table if it doesn't exist
  database.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT 'Untitled',
      content TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS document_categories (
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      PRIMARY KEY (document_id, category_id)
    );

    CREATE TABLE IF NOT EXISTS document_goals (
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      PRIMARY KEY (document_id, goal_id)
    );

    CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(updated_at DESC);
  `);
}

function addNotesAndAttachments(database: Database.Database) {
  // Create notes table (replaces settings-based today_page_content_* keys)
  database.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      content TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_notes_date ON notes(date);
  `);

  // Create attachments table for files on notes, documents, and tasks
  database.exec(`
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('note', 'document', 'task')),
      entity_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);
  `);

  // Migrate existing settings-based notes into the notes table
  const existingNotes = database
    .prepare("SELECT key, value FROM settings WHERE key LIKE 'today_page_content_%'")
    .all() as { key: string; value: string }[];

  if (existingNotes.length > 0) {
    const insert = database.prepare(
      "INSERT OR IGNORE INTO notes (date, content) VALUES (?, ?)"
    );
    const deleteKey = database.prepare("DELETE FROM settings WHERE key = ?");

    const migrate = database.transaction(() => {
      for (const row of existingNotes) {
        const date = row.key.replace("today_page_content_", "");
        if (date && row.value) {
          insert.run(date, row.value);
        }
        deleteKey.run(row.key);
      }
    });

    migrate();
  }
}

function addAttachmentThumbnail(database: Database.Database) {
  const tableInfo = database
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='attachments'")
    .get() as { sql: string } | undefined;

  if (!tableInfo || tableInfo.sql.includes("thumbnail")) return;

  database.exec(`ALTER TABLE attachments ADD COLUMN thumbnail TEXT`);
}

function addNotesBlocks(database: Database.Database) {
  const tableInfo = database
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='notes'")
    .get() as { sql: string } | undefined;

  if (!tableInfo || tableInfo.sql.includes("blocks")) return;

  database.exec(`ALTER TABLE notes ADD COLUMN blocks TEXT`);
}

function addInProgressDestination(database: Database.Database) {
  const tableInfo = database
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'")
    .get() as { sql: string } | undefined;

  if (!tableInfo || tableInfo.sql.includes("'in_progress'")) return;

  database.exec(`
    PRAGMA foreign_keys = OFF;

    ALTER TABLE tasks RENAME TO _tasks_old_ip;

    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      destination TEXT NOT NULL DEFAULT 'someday'
        CHECK(destination IN ('on_deck', 'someday', 'in_progress')),
      consequence TEXT NOT NULL DEFAULT 'none'
        CHECK(consequence IN ('none', 'soft', 'hard')),
      size TEXT NOT NULL DEFAULT 'small'
        CHECK(size IN ('xs', 'small', 'medium', 'large')),
      status TEXT NOT NULL DEFAULT 'active'
        CHECK(status IN ('active', 'done')),
      due_date TEXT,
      snoozed_until TEXT,
      snooze_reason TEXT,
      done_at TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO tasks SELECT * FROM _tasks_old_ip;
    DROP TABLE _tasks_old_ip;

    CREATE INDEX IF NOT EXISTS idx_tasks_destination_status ON tasks(destination, status);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

    PRAGMA foreign_keys = ON;
  `);
}

function getDb(): Database.Database {
  const now = Date.now();

  if (globalForDb._db) {
    // If the connection has been idle longer than MAX_IDLE_MS (e.g. laptop
    // slept and woke), proactively cycle it instead of risking a stale lock.
    const idleMs = now - (globalForDb._lastAccess ?? now);
    if (idleMs > MAX_IDLE_MS || !globalForDb._db.open) {
      try { globalForDb._db.close(); } catch { /* already closed */ }
      globalForDb._db = undefined;
    } else {
      try {
        // Verify the connection is still usable with an actual table read
        globalForDb._db.prepare("SELECT 1 FROM settings LIMIT 1").get();
        globalForDb._lastAccess = now;
        return globalForDb._db;
      } catch {
        // Connection is dead — close and recreate
        try { globalForDb._db.close(); } catch { /* already closed */ }
        globalForDb._db = undefined;
      }
    }
  }

  const database = new Database(DB_PATH);

  database.pragma("journal_mode = DELETE");
  database.pragma("busy_timeout = 1000");
  database.pragma("foreign_keys = ON");

  initSchema(database);

  globalForDb._db = database;
  globalForDb._lastAccess = Date.now();
  return database;
}

// Use a getter so the DB is only opened when actually accessed at runtime,
// not during the build process
export const db = new Proxy({} as Database.Database, {
  get(_target, prop) {
    const instance = getDb();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

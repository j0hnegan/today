import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "focus.db");

console.log(`Initializing database at ${DB_PATH}...`);

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    destination TEXT NOT NULL DEFAULT 'someday'
      CHECK(destination IN ('on_deck', 'someday', 'in_progress')),
    consequence TEXT NOT NULL DEFAULT 'none'
      CHECK(consequence IN ('none', 'soft', 'hard')),
    size TEXT NOT NULL DEFAULT 'medium'
      CHECK(size IN ('quick', 'medium', 'long')),
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
`);

console.log("Database initialized successfully.");
console.log("Tables created: tasks, tags, task_tags, checkins, settings");
console.log("Default settings seeded.");

db.close();

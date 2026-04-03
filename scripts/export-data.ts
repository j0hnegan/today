import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "focus.db");
const OUTPUT_PATH = path.join(process.cwd(), "backup-data.json");

const TABLES = [
  "tasks",
  "categories",
  "task_categories",
  "goals",
  "documents",
  "document_categories",
  "document_goals",
  "notes",
  "attachments",
  "checkins",
  "settings",
];

console.log(`Exporting data from ${DB_PATH}...`);

const db = new Database(DB_PATH, { readonly: true });
db.pragma("foreign_keys = ON");

const data: Record<string, unknown[]> = {};
const summary: { table: string; count: number }[] = [];

for (const table of TABLES) {
  // Check if the table exists before querying
  const exists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(table);

  if (!exists) {
    console.log(`  Skipping "${table}" (table does not exist)`);
    data[table] = [];
    summary.push({ table, count: 0 });
    continue;
  }

  const rows = db.prepare(`SELECT * FROM "${table}"`).all();
  data[table] = rows;
  summary.push({ table, count: rows.length });
}

db.close();

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), "utf-8");

console.log(`\nExport complete -> ${OUTPUT_PATH}\n`);
console.log("Records per table:");
for (const { table, count } of summary) {
  console.log(`  ${table}: ${count}`);
}
const total = summary.reduce((sum, s) => sum + s.count, 0);
console.log(`\n  Total: ${total} records`);

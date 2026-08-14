import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "secondbrain.sqlite3"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    handle TEXT,
    url TEXT,
    subscriber_count INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER REFERENCES channels(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    summary TEXT,
    stage TEXT NOT NULL DEFAULT 'idea',
    tags TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    hook TEXT DEFAULT '',
    body TEXT DEFAULT '',
    cta TEXT DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'link',
    title TEXT,
    url TEXT,
    content TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_projects_stage ON projects(stage);
  CREATE INDEX IF NOT EXISTS idx_sources_project ON sources(project_id);
`);

export default db;

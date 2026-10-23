import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type ChatRole = "user" | "assistant";
export type StoredMessage = {
  id: number;
  thread_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
};

let database: Database.Database | undefined;

export function getDb(): Database.Database {
  if (database) return database;

  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  database = new Database(path.join(dataDir, "chat-history.sqlite"));
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.exec(`
    CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'گفتگوی جدید',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_messages_thread_id_id
      ON messages(thread_id, id);
  `);
  return database;
}

// App state (accounts, saved locations, conversations) in a local SQLite file via Node's built-in node:sqlite.
// No live marine data is stored here: forecasts, PFZ and alerts always come from the upstream sources at request time.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

const file = process.env["ORCA_DB"] ?? path.resolve(process.cwd(), "data", "orca.db");
mkdirSync(path.dirname(file), { recursive: true });
export const db = new DatabaseSync(file);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, pw_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'fisher', language TEXT NOT NULL DEFAULT 'English', created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, lat REAL NOT NULL, lon REAL NOT NULL, kind TEXT NOT NULL DEFAULT 'harbour', created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL, state TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY, conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL, text TEXT NOT NULL, answer TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export type User = { id: number; email: string; name: string; role: string; language: string };
export type Location = { id: number; name: string; lat: number; lon: number; kind: string };

export const one = <T>(sql: string, ...args: Array<string | number | null>) => db.prepare(sql).get(...args) as T | undefined;
export const all = <T>(sql: string, ...args: Array<string | number | null>) => db.prepare(sql).all(...args) as T[];
export const run = (sql: string, ...args: Array<string | number | null>) => db.prepare(sql).run(...args);

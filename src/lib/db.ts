import * as schema from "./schema";
import path from "path";
import fs from "fs";

export const DDL = `
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, "order" INTEGER NOT NULL DEFAULT 0, parent_id TEXT
  );
  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
    duration_min INTEGER NOT NULL, price REAL NOT NULL, image TEXT,
    active INTEGER NOT NULL DEFAULT 1, "order" INTEGER NOT NULL DEFAULT 0, category_id TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'CLIENT', created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY, date TEXT NOT NULL, start_min INTEGER NOT NULL, end_min INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'POTRJENO', first_name TEXT NOT NULL, last_name TEXT NOT NULL,
    email TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '',
    cancel_token TEXT NOT NULL UNIQUE, gcal_event_id TEXT, service_id TEXT NOT NULL, user_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS working_hours (
    id TEXT PRIMARY KEY, weekday INTEGER NOT NULL, start_min INTEGER NOT NULL, end_min INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS day_overrides (
    id TEXT PRIMARY KEY, date TEXT NOT NULL, closed INTEGER NOT NULL DEFAULT 1,
    start_min INTEGER, end_min INTEGER, note TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
`;

/**
 * Stolpci, dodani po prvi objavi. CREATE TABLE IF NOT EXISTS jih na obstoječi
 * bazi ne doda, zato jih izvedemo posebej — napaka "duplicate column" se ignorira.
 */
export const ALTERS = [
  `ALTER TABLE bookings ADD COLUMN client_id TEXT`,
  `ALTER TABLE bookings ADD COLUMN paid INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE bookings ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'Gotovina'`,
  `ALTER TABLE bookings ADD COLUMN reminder_sent_at TEXT`,
  `ALTER TABLE bookings ADD COLUMN followup_sent_at TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings(client_id)`,
];

import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
type Db = BetterSQLite3Database<typeof schema>;

const globalForDb = globalThis as unknown as { __beluxDb?: Db; __beluxReady?: Promise<void> };

function createLocalDb() {
  
  const Database = require("better-sqlite3");
  
  const { drizzle } = require("drizzle-orm/better-sqlite3");
  let file = process.env.DATABASE_FILE || path.join(process.cwd(), "data", "belux.db");
  // Na Vercelu je datotečni sistem samo za branje — kopiramo bazo v /tmp (demo način)
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.accessSync(path.dirname(file), fs.constants.W_OK);
  } catch {
    const tmpFile = "/tmp/belux.db";
    if (!fs.existsSync(tmpFile) && fs.existsSync(file)) fs.copyFileSync(file, tmpFile);
    file = tmpFile;
  }
  const sqlite = new Database(file);
  try {
    sqlite.pragma("journal_mode = WAL");
  } catch { /* ignore */ }
  sqlite.exec(DDL);
  for (const stmt of ALTERS) {
    try { sqlite.exec(stmt); } catch { /* stolpec že obstaja */ }
  }
  return drizzle(sqlite, { schema });
}

function createTursoDb() {
  
  const { createClient } = require("@libsql/client");
  
  const { drizzle } = require("drizzle-orm/libsql");
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  globalForDb.__beluxReady = client
    .executeMultiple(DDL)
    .then(async () => {
      for (const stmt of ALTERS) {
        try { await client.execute(stmt); } catch { /* stolpec že obstaja */ }
      }
      const { seedIfEmpty } = await import("./seed");
      await seedIfEmpty(drizzle(client, { schema }));
    })
    .catch((e: unknown) => console.error("DB init error:", e));
  return drizzle(client, { schema });
}

function createDb(): Db {
  if (process.env.TURSO_DATABASE_URL) return createTursoDb();
  const db = createLocalDb();
  globalForDb.__beluxReady = import("./seed")
    .then(({ seedIfEmpty }) => seedIfEmpty(db))
    .catch((e) => console.error("Seed error:", e));
  return db;
}

export const db: Db = globalForDb.__beluxDb ?? createDb();
globalForDb.__beluxDb = db;

export function dbReady(): Promise<void> {
  return globalForDb.__beluxReady ?? Promise.resolve();
}

export * as tables from "./schema";

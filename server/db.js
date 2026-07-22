const path = require('path');
const fs = require('fs');
const { createClient } = require('@libsql/client');

let url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  // No Turso credentials configured: fall back to a local file so `npm run dev`
  // and `npm start` work out of the box with zero external accounts. libSQL
  // speaks plain SQLite for local files, so this is the same engine, just
  // not network-backed.
  const dataDir = path.join(__dirname, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  url = `file:${path.join(dataDir, 'dashboard.db')}`;
}

const db = createClient(authToken ? { url, authToken } : { url });

const ready = (async () => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'unsorted',
      priority TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      completed_at TEXT
    )
  `);

  // Session tokens live here instead of in-memory, since serverless function
  // instances don't share memory (and don't stay warm) the way a long-running
  // Express process on Railway would.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      expires_at TEXT NOT NULL
    )
  `);
})();

module.exports = { db, ready };

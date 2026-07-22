const path = require('path');
const fs = require('fs');
const { createClient } = require('@libsql/client');

let url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  // Vercel serverless functions have no persistent disk, so a local file here
  // would silently reset (wrong PIN prompts, vanished tasks) instead of loudly
  // failing. Fail fast instead of shipping a confusing bug.
  if (process.env.VERCEL) {
    throw new Error(
      'TURSO_DATABASE_URL is not set. On Vercel there is no persistent local disk, ' +
        'so a Turso database is required — set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN ' +
        'in the project\'s Environment Variables and redeploy.'
    );
  }
  // No Turso credentials configured and not running on Vercel: fall back to a
  // local file so `npm run dev` and `npm start` work out of the box with zero
  // external accounts. libSQL speaks plain SQLite for local files, so this is
  // the same engine, just not network-backed.
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

  // Tracks failed PIN attempts per client so /api/auth/verify can lock out
  // brute-force guessing of what's otherwise just a 4-digit code.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      client_key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT
    )
  `);
})();

module.exports = { db, ready };

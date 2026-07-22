const { db, ready } = require('./db');

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

async function checkLocked(clientKey) {
  await ready;
  const { rows } = await db.execute({
    sql: 'SELECT locked_until FROM login_attempts WHERE client_key = ?',
    args: [clientKey],
  });
  if (!rows.length || !rows[0].locked_until) return { locked: false };

  const lockedUntil = new Date(rows[0].locked_until).getTime();
  if (Date.now() < lockedUntil) {
    return { locked: true, retryAfterSeconds: Math.ceil((lockedUntil - Date.now()) / 1000) };
  }
  return { locked: false };
}

async function recordFailure(clientKey) {
  await ready;
  const { rows } = await db.execute({
    sql: 'SELECT count FROM login_attempts WHERE client_key = ?',
    args: [clientKey],
  });
  const nextCount = (rows[0]?.count || 0) + 1;

  if (nextCount >= MAX_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_MS).toISOString();
    await db.execute({
      sql: `INSERT INTO login_attempts (client_key, count, locked_until) VALUES (?, 0, ?)
            ON CONFLICT(client_key) DO UPDATE SET count = 0, locked_until = excluded.locked_until`,
      args: [clientKey, lockedUntil],
    });
    return { locked: true, retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000) };
  }

  await db.execute({
    sql: `INSERT INTO login_attempts (client_key, count, locked_until) VALUES (?, ?, NULL)
          ON CONFLICT(client_key) DO UPDATE SET count = excluded.count, locked_until = NULL`,
    args: [clientKey, nextCount],
  });
  return { locked: false };
}

async function recordSuccess(clientKey) {
  await ready;
  await db.execute({ sql: 'DELETE FROM login_attempts WHERE client_key = ?', args: [clientKey] });
}

module.exports = { checkLocked, recordFailure, recordSuccess };

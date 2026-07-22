const crypto = require('crypto');
const { db, ready } = require('../db');

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function issueToken() {
  await ready;
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await db.execute({
    sql: 'INSERT INTO sessions (token, expires_at) VALUES (?, ?)',
    args: [token, expiresAt],
  });
  return token;
}

async function isValidToken(token) {
  if (!token) return false;
  await ready;
  const { rows } = await db.execute({
    sql: 'SELECT expires_at FROM sessions WHERE token = ?',
    args: [token],
  });
  if (rows.length === 0) return false;
  if (Date.now() > new Date(rows[0].expires_at).getTime()) {
    await db.execute({ sql: 'DELETE FROM sessions WHERE token = ?', args: [token] });
    return false;
  }
  return true;
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!(await isValidToken(token))) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { issueToken, isValidToken, requireAuth };

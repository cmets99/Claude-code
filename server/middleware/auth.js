const crypto = require('crypto');

// In-memory session tokens. Restarting the server invalidates sessions,
// which is an acceptable tradeoff for a single-user personal app.
const sessions = new Map(); // token -> expiryTimestamp
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function issueToken() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

function isValidToken(token) {
  if (!token) return false;
  const expiry = sessions.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!isValidToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

module.exports = { issueToken, isValidToken, requireAuth };

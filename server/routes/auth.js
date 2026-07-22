const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { issueToken } = require('../middleware/auth');

const router = express.Router();

function getPinHash() {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('pin_hash');
  return row ? row.value : null;
}

router.get('/status', (req, res) => {
  res.json({ pinSet: !!getPinHash() });
});

router.post('/setup', (req, res) => {
  const { pin } = req.body;
  if (!pin || typeof pin !== 'string' || pin.length < 4) {
    return res.status(400).json({ error: 'PIN must be at least 4 characters' });
  }
  if (getPinHash()) {
    return res.status(409).json({ error: 'PIN already set' });
  }
  const hash = bcrypt.hashSync(pin, 10);
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('pin_hash', hash);
  const token = issueToken();
  res.json({ token });
});

router.post('/verify', (req, res) => {
  const { pin } = req.body;
  const hash = getPinHash();
  if (!hash) {
    return res.status(400).json({ error: 'No PIN set up yet' });
  }
  if (!pin || !bcrypt.compareSync(pin, hash)) {
    return res.status(401).json({ error: 'Incorrect PIN' });
  }
  const token = issueToken();
  res.json({ token });
});

module.exports = router;

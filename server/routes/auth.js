const express = require('express');
const bcrypt = require('bcryptjs');
const { db, ready } = require('../db');
const { issueToken } = require('../middleware/auth');
const { checkLocked, recordFailure, recordSuccess } = require('../loginAttempts');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

async function getPinHash() {
  await ready;
  const { rows } = await db.execute({
    sql: 'SELECT value FROM settings WHERE key = ?',
    args: ['pin_hash'],
  });
  return rows.length ? rows[0].value : null;
}

router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const hash = await getPinHash();
    res.json({ pinSet: !!hash });
  })
);

router.post(
  '/setup',
  asyncHandler(async (req, res) => {
    const { pin } = req.body;
    if (!pin || typeof pin !== 'string' || pin.length < 4) {
      return res.status(400).json({ error: 'PIN must be at least 4 characters' });
    }
    if (await getPinHash()) {
      return res.status(409).json({ error: 'PIN already set' });
    }
    const hash = bcrypt.hashSync(pin, 10);
    await ready;
    await db.execute({
      sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      args: ['pin_hash', hash],
    });
    const token = await issueToken();
    res.json({ token });
  })
);

router.post(
  '/verify',
  asyncHandler(async (req, res) => {
    const clientKey = req.ip;

    const lockStatus = await checkLocked(clientKey);
    if (lockStatus.locked) {
      return res.status(429).json({
        error: `Too many incorrect attempts. Try again in ${Math.ceil(lockStatus.retryAfterSeconds / 60)} minute(s).`,
      });
    }

    const { pin } = req.body;
    const hash = await getPinHash();
    if (!hash) {
      return res.status(400).json({ error: 'No PIN set up yet' });
    }
    if (!pin || !bcrypt.compareSync(pin, hash)) {
      const result = await recordFailure(clientKey);
      if (result.locked) {
        return res.status(429).json({
          error: `Too many incorrect attempts. Try again in ${Math.ceil(result.retryAfterSeconds / 60)} minute(s).`,
        });
      }
      return res.status(401).json({ error: 'Incorrect PIN' });
    }

    await recordSuccess(clientKey);
    const token = await issueToken();
    res.json({ token });
  })
);

module.exports = router;

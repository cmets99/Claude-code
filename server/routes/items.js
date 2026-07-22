const express = require('express');
const { db, ready } = require('../db');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

const VALID_PRIORITIES = new Set(['low', 'med', 'high']);
const VALID_TYPES = new Set(['unsorted', 'task']);

async function getItem(id) {
  const { rows } = await db.execute({ sql: 'SELECT * FROM items WHERE id = ?', args: [id] });
  return rows[0] || null;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    await ready;
    const { rows } = await db.execute('SELECT * FROM items ORDER BY created_at DESC');
    res.json(rows);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { content } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'content is required' });
    }
    await ready;
    const result = await db.execute({
      sql: 'INSERT INTO items (content, type) VALUES (?, ?)',
      args: [content.trim(), 'unsorted'],
    });
    const item = await getItem(Number(result.lastInsertRowid));
    res.status(201).json(item);
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await ready;
    const existing = await getItem(id);
    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const { content, type, priority, completed } = req.body;

    const next = {
      content: existing.content,
      type: existing.type,
      priority: existing.priority,
      completed: existing.completed,
      completed_at: existing.completed_at,
    };

    if (content !== undefined) {
      if (typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ error: 'content must be a non-empty string' });
      }
      next.content = content.trim();
    }

    if (type !== undefined) {
      if (!VALID_TYPES.has(type)) {
        return res.status(400).json({ error: 'type must be "unsorted" or "task"' });
      }
      next.type = type;
      if (type === 'unsorted') {
        next.priority = null;
      }
    }

    if (priority !== undefined) {
      if (priority !== null && !VALID_PRIORITIES.has(priority)) {
        return res.status(400).json({ error: 'priority must be low, med, high, or null' });
      }
      next.priority = priority;
    }

    if (completed !== undefined) {
      next.completed = completed ? 1 : 0;
      next.completed_at = completed ? new Date().toISOString() : null;
    }

    await db.execute({
      sql: 'UPDATE items SET content = ?, type = ?, priority = ?, completed = ?, completed_at = ? WHERE id = ?',
      args: [next.content, next.type, next.priority, next.completed, next.completed_at, id],
    });

    const updated = await getItem(id);
    res.json(updated);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await ready;
    const result = await db.execute({ sql: 'DELETE FROM items WHERE id = ?', args: [id] });
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.status(204).end();
  })
);

module.exports = router;

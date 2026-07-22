const express = require('express');
const db = require('../db');

const router = express.Router();

const VALID_PRIORITIES = new Set(['low', 'med', 'high']);
const VALID_TYPES = new Set(['unsorted', 'task']);

router.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM items ORDER BY created_at DESC').all();
  res.json(items);
});

router.post('/', (req, res) => {
  const { content } = req.body;
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'content is required' });
  }
  const info = db
    .prepare('INSERT INTO items (content, type) VALUES (?, ?)')
    .run(content.trim(), 'unsorted');
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(item);
});

router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
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

  db.prepare(
    `UPDATE items SET content = ?, type = ?, priority = ?, completed = ?, completed_at = ? WHERE id = ?`
  ).run(next.content, next.type, next.priority, next.completed, next.completed_at, id);

  const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const info = db.prepare('DELETE FROM items WHERE id = ?').run(id);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Item not found' });
  }
  res.status(204).end();
});

module.exports = router;

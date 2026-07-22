import { useState } from 'react';

const PRIORITY_ORDER = { high: 0, med: 1, low: 2 };
const PRIORITY_LABELS = { low: 'Low', med: 'Med', high: 'High' };

export default function TaskList({ items, onUpdate, onDelete }) {
  const [doneOpen, setDoneOpen] = useState(false);

  const unsorted = items.filter((it) => it.type === 'unsorted');
  const openTasks = items
    .filter((it) => it.type === 'task' && !it.completed)
    .sort((a, b) => PRIORITY_ORDER[a.priority ?? 'low'] - PRIORITY_ORDER[b.priority ?? 'low']);
  const doneTasks = items.filter((it) => it.type === 'task' && it.completed);

  return (
    <div className="task-list">
      {unsorted.length > 0 && (
        <section className="list-section">
          <h2 className="section-title">Inbox</h2>
          {unsorted.map((item) => (
            <div className="item-row" key={item.id}>
              <span className="item-content">{item.content}</span>
              <div className="item-actions">
                {['low', 'med', 'high'].map((p) => (
                  <button
                    key={p}
                    className={`priority-pill priority-${p}`}
                    onClick={() => onUpdate(item.id, { type: 'task', priority: p })}
                  >
                    {PRIORITY_LABELS[p]}
                  </button>
                ))}
                <button className="icon-button" onClick={() => onDelete(item.id)} aria-label="Delete">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="list-section">
        <h2 className="section-title">Tasks</h2>
        {openTasks.length === 0 && <p className="empty-hint">No open tasks. Nice.</p>}
        {openTasks.map((item) => (
          <div className="item-row" key={item.id}>
            <label className="task-checkbox">
              <input
                type="checkbox"
                checked={false}
                onChange={() => onUpdate(item.id, { completed: true })}
              />
            </label>
            <span className="item-content">{item.content}</span>
            <div className="item-actions">
              <select
                className={`priority-select priority-${item.priority ?? 'low'}`}
                value={item.priority ?? 'low'}
                onChange={(e) => onUpdate(item.id, { priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="med">Med</option>
                <option value="high">High</option>
              </select>
              <button className="icon-button" onClick={() => onDelete(item.id)} aria-label="Delete">
                ✕
              </button>
            </div>
          </div>
        ))}
      </section>

      {doneTasks.length > 0 && (
        <section className="list-section done-section">
          <button className="done-toggle" onClick={() => setDoneOpen((v) => !v)}>
            {doneOpen ? '▾' : '▸'} Done ({doneTasks.length})
          </button>
          {doneOpen &&
            doneTasks.map((item) => (
              <div className="item-row done-row" key={item.id}>
                <label className="task-checkbox">
                  <input
                    type="checkbox"
                    checked
                    onChange={() => onUpdate(item.id, { completed: false })}
                  />
                </label>
                <span className="item-content done-content">{item.content}</span>
                <div className="item-actions">
                  <button className="icon-button" onClick={() => onDelete(item.id)} aria-label="Delete">
                    ✕
                  </button>
                </div>
              </div>
            ))}
        </section>
      )}
    </div>
  );
}

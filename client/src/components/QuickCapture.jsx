import { useState } from 'react';

export default function QuickCapture({ onCapture }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onCapture(trimmed);
      setValue('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="quick-capture" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Capture a task, note, or thought…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="quick-capture-input"
      />
    </form>
  );
}

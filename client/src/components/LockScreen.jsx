import { useState } from 'react';
import { authApi, setToken } from '../api.js';

export default function LockScreen({ mode, onUnlock }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isSetup = mode === 'setup';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (isSetup) {
      if (pin.length < 4) {
        setError('PIN must be at least 4 digits');
        return;
      }
      if (pin !== confirmPin) {
        setError('PINs do not match');
        return;
      }
    }

    setBusy(true);
    try {
      const { token } = isSetup ? await authApi.setup(pin) : await authApi.verify(pin);
      setToken(token);
      onUnlock();
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setPin('');
      setConfirmPin('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lock-screen">
      <div className="lock-card">
        <h1>{isSetup ? 'Set up your PIN' : 'Enter your PIN'}</h1>
        <p className="lock-subtitle">
          {isSetup ? 'Choose a PIN to lock your dashboard.' : 'Unlock to view your dashboard.'}
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="lock-input"
          />
          {isSetup && (
            <input
              type="password"
              inputMode="numeric"
              placeholder="Confirm PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              className="lock-input"
            />
          )}
          {error && <p className="lock-error">{error}</p>}
          <button type="submit" className="lock-button" disabled={busy}>
            {busy ? 'Please wait…' : isSetup ? 'Create PIN' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import LockScreen from './components/LockScreen.jsx';
import QuickCapture from './components/QuickCapture.jsx';
import Dashboard from './components/Dashboard.jsx';
import TaskList from './components/TaskList.jsx';
import BottomNav from './components/BottomNav.jsx';
import { authApi, getToken, itemsApi } from './api.js';

export default function App() {
  const [authState, setAuthState] = useState('loading'); // loading | setup | locked | unlocked
  const [tab, setTab] = useState('home');
  const [items, setItems] = useState([]);

  useEffect(() => {
    authApi
      .status()
      .then(({ pinSet }) => {
        if (!pinSet) {
          setAuthState('setup');
        } else if (getToken()) {
          setAuthState('unlocked');
        } else {
          setAuthState('locked');
        }
      })
      .catch(() => setAuthState('locked'));
  }, []);

  useEffect(() => {
    if (authState === 'unlocked') {
      refreshItems();
    }
  }, [authState]);

  function refreshItems() {
    itemsApi
      .list()
      .then(setItems)
      .catch(() => {});
  }

  async function handleCapture(content) {
    const item = await itemsApi.create(content);
    setItems((prev) => [item, ...prev]);
  }

  async function handleUpdate(id, patch) {
    const updated = await itemsApi.update(id, patch);
    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
  }

  async function handleDelete(id) {
    await itemsApi.remove(id);
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  if (authState === 'loading') {
    return <div className="loading-screen">Loading…</div>;
  }

  if (authState === 'setup' || authState === 'locked') {
    return (
      <LockScreen
        mode={authState === 'setup' ? 'setup' : 'verify'}
        onUnlock={() => setAuthState('unlocked')}
      />
    );
  }

  const openTasks = items.filter((it) => it.type === 'task' && !it.completed);

  return (
    <div className="app">
      <QuickCapture onCapture={handleCapture} />
      <main className="app-main">
        {tab === 'home' ? (
          <Dashboard openTaskCount={openTasks.length} />
        ) : (
          <TaskList items={items} onUpdate={handleUpdate} onDelete={handleDelete} />
        )}
      </main>
      <BottomNav tab={tab} onChange={setTab} />
    </div>
  );
}

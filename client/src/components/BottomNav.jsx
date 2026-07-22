const TABS = [
  { key: 'home', label: 'Home', icon: '⌂' },
  { key: 'list', label: 'Tasks', icon: '☰' },
];

export default function BottomNav({ tab, onChange }) {
  return (
    <nav className="bottom-nav">
      {TABS.map((t) => (
        <button
          key={t.key}
          className={`bottom-nav-item ${tab === t.key ? 'active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          <span className="bottom-nav-icon">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

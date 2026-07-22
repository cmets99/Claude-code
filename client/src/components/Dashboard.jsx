const PLACEHOLDER_CARDS = ['Calendar', 'Finance', 'Email'];

function formatToday() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function Dashboard({ openTaskCount }) {
  return (
    <div className="dashboard">
      <p className="dashboard-date">{formatToday()}</p>
      <div className="dashboard-summary">
        <span className="dashboard-summary-count">{openTaskCount}</span>
        <span className="dashboard-summary-label">
          open task{openTaskCount === 1 ? '' : 's'}
        </span>
      </div>
      <div className="placeholder-grid">
        {PLACEHOLDER_CARDS.map((label) => (
          <div className="placeholder-card" key={label}>
            <span className="placeholder-card-label">{label}</span>
            <span className="placeholder-card-badge">Coming soon</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// List of saved reports - click one to open it
export default function PastReports({ reports, onOpen }) {
  return (
    <div className="past">
      <h2 className="title">🕘 Past Reports</h2>
      {reports.length === 0 && <p className="empty">No saved reports yet.</p>}
      {reports.map((r) => (
        <button key={r._id} onClick={() => onOpen(r)}>
          <strong>{r.companies.join(", ")}</strong>
          <small>{new Date(r.createdAt).toLocaleString()}</small>
        </button>
      ))}
    </div>
  );
}

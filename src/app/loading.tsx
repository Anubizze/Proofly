export default function Loading() {
  return (
    <div className="workspace" role="status" aria-label="Loading page">
      <div className="card skeleton" />
      <p className="page-description">Loading your workspace…</p>
    </div>
  );
}

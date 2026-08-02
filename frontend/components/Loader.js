'use client';

/**
 * What a screen shows while its first load is in flight. Every page fetches its
 * own data after it mounts, so without this the table area sits blank and the app
 * looks stuck on a slow connection.
 */
export default function Loader({ label = 'Loading…', pad = 48 }) {
  return (
    <div className="loading-block" style={{ padding: `${pad}px 16px` }} role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true"></span>
      <span>{label}</span>
    </div>
  );
}

/** The bar across the top of the shell while another screen is opening. */
export function RouteProgress({ active }) {
  if (!active) return null;
  return <div className="route-progress" role="status" aria-label="Loading page"><span></span></div>;
}

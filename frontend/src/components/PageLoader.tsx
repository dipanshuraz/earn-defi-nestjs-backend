import { Spinner } from './Spinner';

export function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="page-loader">
      <Spinner size="md" />
      <span className="muted">{label}…</span>
    </div>
  );
}

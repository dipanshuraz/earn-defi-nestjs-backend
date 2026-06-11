interface SpinnerProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function Spinner({ size = 'sm', className = '' }: SpinnerProps) {
  return (
    <span
      className={`spinner spinner-${size} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

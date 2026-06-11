interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className = '', width, height }: SkeletonProps) {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };
  return <div className={`skeleton ${className}`} style={style} aria-hidden />;
}

export function CardSkeleton() {
  return (
    <div className="card skeleton-card">
      <Skeleton height={14} width="40%" />
      <Skeleton height={12} width="60%" />
      <div className="skeleton-row">
        <Skeleton height={28} width={80} />
        <Skeleton height={28} width={80} />
      </div>
    </div>
  );
}

export function WalletSkeleton() {
  return (
    <div className="card skeleton-card">
      <Skeleton height={12} width="30%" />
      <Skeleton height={18} width="85%" />
      <div className="skeleton-row">
        <Skeleton height={36} width={100} />
        <Skeleton height={36} width={100} />
      </div>
      <Skeleton height={36} width={140} />
    </div>
  );
}

export function PageSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

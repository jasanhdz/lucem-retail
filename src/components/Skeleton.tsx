export function SkeletonStack({ count = 3, className = '' }: { count?: number; className?: string }) {
  return <div className={`skeleton-stack ${className}`} role="status" aria-label="Cargando información">
    {Array.from({ length: count }, (_, index) => <div className="skeleton-card" key={index} aria-hidden="true">
      <span className="skeleton-line skeleton-line-long" />
      <span className="skeleton-line skeleton-line-medium" />
      <span className="skeleton-line skeleton-line-short" />
    </div>)}
  </div>;
}

export function SkeletonGrid({ count = 6, className = '' }: { count?: number; className?: string }) {
  return <div className={`skeleton-grid ${className}`} role="status" aria-label="Cargando productos">
    {Array.from({ length: count }, (_, index) => <div className="skeleton-product-card" key={index} aria-hidden="true">
      <span className="skeleton-product-image" />
      <span className="skeleton-line skeleton-line-long" />
      <span className="skeleton-line skeleton-line-medium" />
      <span className="skeleton-line skeleton-line-short" />
    </div>)}
  </div>;
}

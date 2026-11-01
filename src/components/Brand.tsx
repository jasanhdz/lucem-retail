import { Store } from 'lucide-react';

export function Brand({ className = '' }: { className?: string }) {
  return <span className={`brand ${className}`}><span className="brand-mark"><Store aria-hidden="true" /></span><span>lucem<span style={{ fontWeight: 500 }}> retail</span></span></span>;
}

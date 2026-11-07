import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

export type BreadcrumbItem = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export function Breadcrumbs({ items, label = 'Ruta de navegación', badge, trailing, className = '' }: { items: BreadcrumbItem[]; label?: string; badge?: string; trailing?: ReactNode; className?: string }) {
  return (
    <nav className={`app-breadcrumbs ${className}`} aria-label={label}>
      {items.map((item, index) => <span className="app-breadcrumb-item" key={`${item.label}-${index}`}>
        {index > 0 && <ChevronRight className="app-breadcrumb-separator" size={13} aria-hidden="true" />}
        {item.href ? <Link href={item.href} onClick={item.onClick}>{item.label}</Link> : <span aria-current={index === items.length - 1 ? 'page' : undefined}>{item.label}</span>}
      </span>)}
      {badge && <span className="app-breadcrumb-badge"><i aria-hidden="true"/>{badge}</span>}
      {trailing && <span className="app-breadcrumb-trailing">{trailing}</span>}
    </nav>
  );
}

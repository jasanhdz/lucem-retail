import Link from 'next/link';

export type BreadcrumbItem = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export function Breadcrumbs({ items, label = 'Ruta de navegación' }: { items: BreadcrumbItem[]; label?: string }) {
  return (
    <nav className="page-breadcrumbs products-editor-breadcrumb" aria-label={label}>
      {items.map((item, index) => <span className="page-breadcrumb-item" key={`${item.label}-${index}`}>
        {index > 0 && <span className="page-breadcrumb-separator" aria-hidden="true">›</span>}
        {item.href ? <Link href={item.href} onClick={item.onClick}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
      </span>)}
    </nav>
  );
}

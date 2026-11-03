export function Brand({ className = '' }: { className?: string }) {
  return <span className={`brand ${className}`}><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 40 40"><path d="M7 17h26v16H7z"/><path d="M5 17 8 8h24l3 9M5 17c0 3 5 4 7 1 2 3 6 3 8 0 2 3 6 3 8 0 2 3 7 2 7-1M13 24h6v9"/><path d="M11 12h18"/></svg></span><span className="brand-name">Lucem<span> Retail</span></span></span>;
}

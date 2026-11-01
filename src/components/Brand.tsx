export function Brand({ className = '' }: { className?: string }) {
  return <span className={`brand ${className}`}><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 40 40"><path d="m7 13 13-7 13 7-13 7-13-7Z"/><path d="m7 20 13 7 13-7M7 27l13 7 13-7"/></svg></span><span className="brand-name">Lucem<span> Retail</span></span></span>;
}

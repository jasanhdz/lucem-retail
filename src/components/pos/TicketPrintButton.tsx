'use client';
import { Download, Printer } from 'lucide-react';
import { useEffect } from 'react';

export function TicketPrintButton({ label = 'Imprimir ticket', variant = 'print', className }: { label?: string; variant?: 'print' | 'pdf'; className?: string }) {
  function print() {
    window.print();
  }
  useEffect(() => {
    if (window.sessionStorage.getItem('pos-print-ticket') !== '1') return;
    window.sessionStorage.removeItem('pos-print-ticket');
    const timer = window.setTimeout(print, 400);
    return () => window.clearTimeout(timer);
  }, []);
  const Icon = variant === 'pdf' ? Download : Printer;
  return <button className={className ?? `button ${variant === 'pdf' ? 'ticket-download' : 'ticket-print'}`} type="button" onClick={print}><Icon size={16} aria-hidden="true" />{label}</button>;
}

'use client';
import { useEffect } from 'react';

export function TicketPrintButton() {
  useEffect(() => {
    if (window.sessionStorage.getItem('pos-print-ticket') !== '1') return;
    window.sessionStorage.removeItem('pos-print-ticket');
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, []);
  return <button className="button ticket-print" type="button" onClick={() => window.print()}>Imprimir ticket</button>;
}

'use client';
export function TicketPrintButton() { return <button className="button ticket-print" type="button" onClick={() => window.print()}>Imprimir ticket</button>; }

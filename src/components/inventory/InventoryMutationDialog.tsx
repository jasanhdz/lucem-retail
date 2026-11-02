"use client";

import { LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";

type Variant = { id: string; sku: string; available?: string; reserved?: string; physical?: string; product: { name: string } };
type Mutation = { variantId: string; type: "PURCHASE" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT"; quantity: string; reason: string };

export function InventoryMutationDialog({ variants, initialVariantId, onClose, onSaved, onConflict, returnFocusRef }: { variants: Variant[]; initialVariantId?: string; onClose: () => void; onSaved: () => void; onConflict?: () => void; returnFocusRef?: RefObject<HTMLButtonElement | null> }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState<Mutation>({ variantId: initialVariantId ?? variants[0]?.id ?? "", type: "PURCHASE", quantity: "", reason: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { closeRef.current?.focus(); const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; document.addEventListener("keydown", key); const old = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.removeEventListener("keydown", key); document.body.style.overflow = old; window.setTimeout(() => returnFocusRef?.current?.focus(), 0); }; }, [onClose, returnFocusRef]);
  function trap(event: React.KeyboardEvent) {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])")];
    if (!focusable.length) return;
    if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1)?.focus(); }
    if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (!draft.variantId || !Number.isFinite(Number(draft.quantity)) || Number(draft.quantity) <= 0 || !draft.reason.trim()) { setError("Selecciona una variante, indica una cantidad positiva y escribe el motivo."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/inventory/movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo registrar el movimiento.");
      onSaved();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo registrar el movimiento."); onConflict?.(); }
    finally { setSaving(false); }
  }
  const selected = variants.find((variant) => variant.id === draft.variantId);
  const amount = Number(draft.quantity) || 0;
  const direction = draft.type === "ADJUSTMENT_OUT" ? -1 : 1;
  const preview = selected?.available !== undefined ? { available: Number(selected.available) + direction * amount, reserved: Number(selected.reserved ?? 0), physical: Number(selected.physical ?? selected.available) + direction * amount } : null;
  return <div className="inventory-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="inventory-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-mutation-title" ref={dialogRef} onKeyDown={trap}>
      <header><div><span className="inventory-eyebrow">Movimiento de inventario</span><h2 id="inventory-mutation-title">Registrar entrada o ajuste</h2></div><button ref={closeRef} className="icon-button" type="button" aria-label="Cerrar diálogo" onClick={onClose}><X size={20} /></button></header>
      <form onSubmit={save}>
        <label>Variante<select value={draft.variantId} onChange={(event) => setDraft({ ...draft, variantId: event.target.value })}>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.product.name} · {variant.sku}</option>)}</select></label>
        <label>Tipo<select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as Mutation["type"] })}><option value="PURCHASE">Compra / entrada</option><option value="ADJUSTMENT_IN">Ajuste positivo</option><option value="ADJUSTMENT_OUT">Ajuste negativo</option></select></label>
        <label>Cantidad<input type="number" min="0.01" step="0.01" value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} /></label>
       <label>Motivo obligatorio<textarea rows={3} value={draft.reason} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} placeholder="Ej. Recepción de proveedor" /></label>
       {preview && <div className="inventory-preview" aria-live="polite"><strong>Después del movimiento</strong><span>Físico {preview.physical.toLocaleString("es-MX")} · Apartado {preview.reserved.toLocaleString("es-MX")} · Disponible {preview.available.toLocaleString("es-MX")}</span></div>}
        {error && <p className="inventory-error" role="alert">{error}</p>}
        <footer><button className="button button-quiet" type="button" onClick={onClose} disabled={saving}>Cancelar</button><button className="button inventory-primary" type="submit" disabled={saving}>{saving && <LoaderCircle className="spin" size={17} />} {saving ? "Guardando..." : "Confirmar movimiento"}</button></footer>
      </form>
    </section>
  </div>;
}

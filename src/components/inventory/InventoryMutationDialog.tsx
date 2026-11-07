"use client";

import { BadgeCheck, Check, CircleAlert, Cloud, Info, LoaderCircle, Minus, Plus, ShieldCheck, Shirt, SlidersHorizontal, Store, X } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";

type Variant = { id: string; sku: string; barcode?: string | null; size?: string | null; color?: string | null; available?: string; reserved?: string; physical?: string; product: { name: string; photoPath?: string | null; location?: string } };
type Mutation = { variantId: string; type: "PURCHASE" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT"; quantity: string; reason: string };
const adjustmentReasons = [
  ["damage", "Merma por daño o exhibición"], ["negative_count", "Conteo físico negativo"], ["theft_loss", "Robo / Pérdida en piso"], ["vendor_return", "Devolución a proveedor"], ["commercial_sample", "Muestra comercial"],
] as const;
const entryReasons = [
  ["recepcion_mercancia", "Recepción de mercancía"], ["devolucion_cliente", "Devolución de cliente"], ["ajuste_inventario", "Ajuste de inventario físico"], ["produccion_traslado", "Traslado entre sucursales"],
] as const;
const format = (value: number) => value.toLocaleString("es-MX", { maximumFractionDigits: 2 });

export function InventoryMutationDialog({ variants, initialVariantId, initialType = "PURCHASE", countMode = false, branchName = "", onClose, onSaved, onConflict, returnFocusRef }: { variants: Variant[]; initialVariantId?: string; initialType?: Mutation["type"]; countMode?: boolean; branchName?: string; onClose: () => void; onSaved: () => void; onConflict?: () => void; returnFocusRef?: RefObject<HTMLButtonElement | null> }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const initialMutationType = countMode ? "ADJUSTMENT_IN" : initialType === "PURCHASE" ? "PURCHASE" : "ADJUSTMENT_OUT";
  const [draft, setDraft] = useState<Mutation>({ variantId: initialVariantId ?? variants[0]?.id ?? "", type: initialMutationType, quantity: "", reason: "" });
  const [entryReason, setEntryReason] = useState("recepcion_mercancia");
  const [adjustmentReason, setAdjustmentReason] = useState("damage");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    closeRef.current?.focus();
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = old; window.setTimeout(() => returnFocusRef?.current?.focus(), 0); };
  }, [onClose, returnFocusRef]);

  function trap(event: React.KeyboardEvent) {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])")];
    if (!focusable.length) return;
    if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1)?.focus(); }
    if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setError("");
    const quantity = Number(draft.quantity);
    const selectedVariant = variants.find(variant => variant.id === draft.variantId);
    const reasonIsRequired = countMode || draft.type !== "PURCHASE";
    if (!selectedVariant || !Number.isFinite(quantity) || (countMode ? quantity < 0 : quantity <= 0) || (reasonIsRequired && !draft.reason.trim())) {
      setError(countMode ? "Selecciona una variante, captura un conteo físico válido y escribe el motivo." : "Selecciona una variante, indica una cantidad positiva y escribe el motivo.");
      return;
    }
    let movement: Mutation = { ...draft, quantity: String(quantity) };
    if (countMode) {
      const reserved = Number(selectedVariant.reserved ?? 0);
      const countedAvailable = quantity - reserved;
      if (countedAvailable < 0) { setError("El conteo físico no puede ser menor que las unidades apartadas."); return; }
      const difference = countedAvailable - Number(selectedVariant.available ?? 0);
      if (!difference) { setError("El conteo coincide con el sistema; no se requiere un ajuste."); return; }
      movement = { ...draft, type: difference < 0 ? "ADJUSTMENT_OUT" : "ADJUSTMENT_IN", quantity: String(Math.abs(difference)), reason: `Conteo físico: ${draft.reason.trim()}` };
    } else if (draft.type === "PURCHASE") {
      const selectedReason = entryReasons.find(([value]) => value === entryReason)?.[1] ?? entryReason;
      movement = { ...draft, quantity: String(quantity), reason: `${selectedReason}${reference.trim() ? ` — ${reference.trim()}` : ""}` };
    } else {
      const available = Number(selectedVariant.available ?? 0);
      if (draft.type === "ADJUSTMENT_OUT" && quantity > available) { setError(`No se pueden descontar más de ${format(available)} unidades disponibles; las apartadas están protegidas.`); return; }
      const selectedReason = adjustmentReasons.find(([value]) => value === adjustmentReason)?.[1] ?? adjustmentReason;
      movement = { ...draft, quantity: String(quantity), reason: `${selectedReason}${draft.reason.trim() ? ` — ${draft.reason.trim()}` : ""}` };
    }
    setSaving(true);
    try {
      const response = await fetch("/api/inventory/movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(movement) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo registrar el movimiento.");
      onSaved();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo registrar el movimiento."); onConflict?.(); }
    finally { setSaving(false); }
  }

  const selected = variants.find(variant => variant.id === draft.variantId);
  const amount = Number(draft.quantity) || 0;
  const direction = draft.type === "ADJUSTMENT_OUT" ? -1 : 1;
  const physical = Number(selected?.physical ?? selected?.available ?? 0);
  const available = Number(selected?.available ?? 0);
  const reserved = Number(selected?.reserved ?? 0);
  const preview = selected && (!countMode || draft.quantity !== "") ? countMode
    ? { physical: amount, reserved, available: amount - reserved, delta: amount - physical }
    : { physical: physical + direction * amount, reserved, available: available + direction * amount, delta: direction * amount }
    : null;
  const decreaseInvalid = !countMode && draft.type === "ADJUSTMENT_OUT" && amount > available;
  const productVariant = (variant: Variant) => [variant.color, variant.size].filter(Boolean).join(" / ") || "Presentación única";
  const productVisual = (variant: Variant) => variant.product.photoPath
    ? <img src={variant.product.photoPath} alt="" />
    : <span className="inventory-mutation-product-placeholder"><Shirt size={22}/></span>;

  if (countMode) {
    return <div className="inventory-modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="inventory-modal inventory-count-dialog" role="dialog" aria-modal="true" aria-labelledby="inventory-mutation-title" ref={dialogRef} onKeyDown={trap}><header><div><span className="inventory-eyebrow">Conteo de existencias</span><h2 id="inventory-mutation-title">Iniciar conteo físico</h2></div><button ref={closeRef} className="icon-button" type="button" aria-label="Cerrar diálogo" onClick={onClose}><X size={20}/></button></header><form onSubmit={save}><label>Variante<select value={draft.variantId} onChange={event => setDraft({ ...draft, variantId: event.target.value })}>{variants.map(variant => <option key={variant.id} value={variant.id}>{variant.product.name} · {variant.sku}</option>)}</select></label><label>Existencia física contada<input type="number" min="0" step="0.01" value={draft.quantity} onChange={event => setDraft({ ...draft, quantity: event.target.value })}/>{selected && <small>Sistema: {selected.physical} físico · {selected.reserved} apartado · {selected.available} disponible.</small>}</label><label>Motivo obligatorio<textarea rows={3} value={draft.reason} onChange={event => setDraft({ ...draft, reason: event.target.value })} placeholder="Ej. Conteo de cierre de pasillo"/></label>{preview && <div className="inventory-preview" aria-live="polite"><strong>Después del conteo</strong><span>Físico {format(preview.physical)} · Apartado {format(preview.reserved)} · Disponible {format(preview.available)}</span></div>}{error && <p className="inventory-error" role="alert">{error}</p>}<footer><button className="button button-quiet" type="button" onClick={onClose} disabled={saving}>Cancelar</button><button className="button inventory-primary" type="submit" disabled={saving}>{saving && <LoaderCircle className="spin" size={17}/>} {saving ? "Guardando…" : "Confirmar conteo"}</button></footer></form></section></div>;
  }

  const isEntry = draft.type === "PURCHASE";
  const dialogTitle = isEntry ? "Registrar entrada de stock" : "Ajuste de existencias";
  return <div className={`inventory-modal-backdrop ${isEntry ? "inventory-entry-backdrop" : "inventory-adjustment-backdrop"}`} role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className={`inventory-modal inventory-mutation-dialog ${isEntry ? "inventory-entry-dialog" : "inventory-adjustment-dialog"}`} role="dialog" aria-modal="true" aria-labelledby="inventory-mutation-title" ref={dialogRef} onKeyDown={trap}>
      <div className="inventory-mutation-accent"/>
      <header className="inventory-mutation-header">
        <div className="inventory-mutation-heading-icon">{isEntry ? <Plus size={25}/> : <SlidersHorizontal size={23}/>}</div>
        <div className="inventory-mutation-heading-copy">
          <div className="inventory-mutation-kicker"><span>{isEntry ? "Entrada de mercancía" : "Operación de regularización física"}</span><small>• {isEntry ? "Almacén tienda" : "Kárdex de auditoría"}</small></div>
          <h2 id="inventory-mutation-title">{dialogTitle}</h2>
          <p>{isEntry ? "Suma existencias físicas al catálogo activo de la sucursal actualizando el balance en tiempo real." : "Registra discrepancias por merma, conteo físico o daño. Este movimiento quedará registrado en el kárdex permanente de auditoría."}</p>
        </div>
        <button ref={closeRef} className="inventory-mutation-close" type="button" aria-label="Cerrar diálogo" onClick={onClose}><X size={21}/></button>
      </header>
      <form className="inventory-mutation-form" onSubmit={save}>
        <section className="inventory-mutation-product">
          <div className="inventory-mutation-product-info">
            {selected && productVisual(selected)}
            <div className="inventory-mutation-product-copy">
              <strong>{selected?.product.name ?? "Selecciona producto y variante"}</strong>
              <select aria-label="Producto y variante" value={draft.variantId} onChange={event => setDraft({ ...draft, variantId: event.target.value })}>{variants.map(variant => <option key={variant.id} value={variant.id}>{productVariant(variant)}</option>)}</select>
              <small>SKU: <b>{selected?.sku ?? "—"}</b>{selected?.barcode && <> · Cód. Barras: <b>{selected.barcode}</b></>} · Sucursal: <b>{branchName || "Sucursal activa"}</b></small>
            </div>
            <span className="inventory-product-active">Activo</span>
          </div>
          <div className="inventory-mutation-stock-strip"><span><i className="is-physical"/>Existencia física actual: <b>{format(physical)}</b> pzas</span><span className="inventory-stock-separator">•</span><span><i className="is-reserved"/>Apartadas: <b>{format(reserved)}</b> pzas</span><span className="inventory-stock-separator">•</span><span><i className="is-available"/>Disponibles: <b>{format(available)}</b> pzas</span></div>
        </section>

        {isEntry ? <>
          <section className="inventory-entry-quantity">
            <div className="inventory-mutation-label-row"><label htmlFor="inventory-mutation-quantity">Cantidad de unidades a ingresar <b>*</b></label><small>Enteros o decimales (máx. 2 dígitos)</small></div>
            <div className="inventory-entry-quantity-row"><div className="inventory-entry-number"><span>+</span><input id="inventory-mutation-quantity" aria-label="Cantidad" type="number" min="0.01" step="0.01" placeholder="0" value={draft.quantity} onChange={event => setDraft({ ...draft, quantity: event.target.value })}/><small>pzas</small></div><div className="inventory-quick-add">{[5, 10, 20].map(value => <button key={value} type="button" className={amount === value ? "is-selected" : ""} onClick={() => setDraft({ ...draft, quantity: String(amount + value) })}><strong>+{value}</strong><small>{value === 20 ? "lote" : "rápido"}</small></button>)}</div></div>
          </section>
          <section className="inventory-entry-reasons"><label>Motivo y observaciones</label><div><label htmlFor="inventory-entry-reason">Motivo de la entrada <b>*</b><select id="inventory-entry-reason" value={entryReason} onChange={event => setEntryReason(event.target.value)}>{entryReasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label htmlFor="inventory-entry-reference">Referencia u observación <small>(Opcional)</small><input id="inventory-entry-reference" value={reference} onChange={event => setReference(event.target.value)} placeholder="Ej. Factura F-993, conteo cíclico, etc."/></label></div></section>
          {preview && <BalanceProjection kind="entry" preview={preview} amount={amount}/>}
          <div className="inventory-mutation-trace"><Info size={18}/><span><b>Operador: Administrador</b> · La entrada se registrará en el kárdex y estará disponible para venta al instante.</span><BadgeCheck size={17}/></div>
          {error && <p className="inventory-error" role="alert">{error}</p>}
          <footer className="inventory-mutation-footer inventory-entry-footer"><span><Cloud size={15}/> Folio asignado al confirmar</span><div><button className="inventory-modal-cancel" type="button" onClick={onClose} disabled={saving}>Cancelar</button><button className="inventory-modal-submit" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17}/> : <Check size={18}/>} {saving ? "Guardando…" : `Confirmar entrada${amount > 0 ? ` (+${format(amount)} pzas)` : ""}`}</button></div></footer>
        </> : <>
          <div className="inventory-adjustment-direction"><div className="inventory-mutation-label-row"><label>Sentido de la regularización <b>*</b></label><small>Selecciona el tipo de impacto en inventario</small></div><div className="inventory-direction-options"><button type="button" aria-pressed={draft.type === "ADJUSTMENT_OUT"} className={draft.type === "ADJUSTMENT_OUT" ? "is-decrease" : ""} onClick={() => setDraft({ ...draft, type: "ADJUSTMENT_OUT" })}><span><Minus size={22}/></span><span><strong>[−] Disminuir stock</strong><small>Salida / Merma, daño o faltante físico</small></span><i/></button><button type="button" aria-pressed={draft.type === "ADJUSTMENT_IN"} className={draft.type === "ADJUSTMENT_IN" ? "is-increase" : ""} onClick={() => setDraft({ ...draft, type: "ADJUSTMENT_IN" })}><span><Plus size={22}/></span><span><strong>[+] Aumentar stock</strong><small>Sobrante de conteo físico o hallazgo</small></span><i/></button></div></div>
          <div className="inventory-adjustment-fields"><div className="inventory-adjust-quantity"><label htmlFor="inventory-mutation-quantity">Unidades a {draft.type === "ADJUSTMENT_OUT" ? "descontar" : "agregar"} <b>*</b></label><div><button type="button" aria-label="Disminuir cantidad" onClick={() => setDraft({ ...draft, quantity: String(Math.max(0, amount - 1)) })}><Minus size={18}/></button><input id="inventory-mutation-quantity" aria-label="Cantidad" type="number" min="1" max={draft.type === "ADJUSTMENT_OUT" ? available : undefined} step="1" value={draft.quantity} onChange={event => setDraft({ ...draft, quantity: event.target.value })} placeholder="0"/><button type="button" aria-label="Aumentar cantidad" onClick={() => setDraft({ ...draft, quantity: String(amount + 1) })}><Plus size={18}/></button></div>{decreaseInvalid && <p className="inventory-adjust-warning"><Info size={15}/>El ajuste no puede dejar la existencia disponible en negativo; hay {format(reserved)} pzas apartadas y {format(available)} disponibles.</p>}</div><div className="inventory-adjust-reason"><label htmlFor="inventory-adjustment-reason">Motivo obligatorio del ajuste <b>*</b></label><select id="inventory-adjustment-reason" value={adjustmentReason} onChange={event => setAdjustmentReason(event.target.value)}>{adjustmentReasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small><ShieldCheck size={13}/> Categoría autorizada para kárdex de auditoría fiscal</small></div></div>
          <div className="inventory-adjust-note"><label htmlFor="inventory-adjustment-note">Detalle o justificación obligatoria <b>*</b><small>{draft.reason.length} / 250 caracteres</small></label><textarea id="inventory-adjustment-note" rows={2} maxLength={250} value={draft.reason} onChange={event => setDraft({ ...draft, reason: event.target.value })} placeholder="Describe el motivo y el detalle del ajuste físico."/></div>
          {preview && <BalanceProjection kind="adjustment" preview={preview} amount={amount} invalid={decreaseInvalid}/>}
          {error && <p className="inventory-error" role="alert">{error}</p>}
          <footer className="inventory-mutation-footer inventory-adjustment-footer"><span><Store size={15}/> Operador: Administrador</span><div><button className="inventory-modal-cancel" type="button" onClick={onClose} disabled={saving}>Cancelar</button><button className="inventory-modal-submit" type="submit" disabled={saving || decreaseInvalid}>{saving ? <LoaderCircle className="spin" size={17}/> : <Check size={18}/>} {saving ? "Guardando…" : `Confirmar ajuste (${draft.type === "ADJUSTMENT_OUT" ? "−" : "+"}${format(amount)} pzas)`}</button></div></footer>
        </>}
      </form>
    </section>
  </div>;
}

function BalanceProjection({ kind, preview, amount, invalid = false }: { kind: "entry" | "adjustment"; preview: { physical: number; reserved: number; available: number; delta: number }; amount: number; invalid?: boolean }) {
  const adjustment = kind === "adjustment";
  return <section className={`inventory-balance-projection ${adjustment ? "is-adjustment" : "is-entry"}`} aria-live="polite"><header><strong><SlidersHorizontal size={16}/> {adjustment ? "Proyección de balance en Kárdex" : "Proyección de balance resultante"}</strong><small>{adjustment ? "Cálculo en tiempo real" : "Cálculo automático"}</small></header><div className="inventory-balance-cards"><div><small>Física actual</small><strong>{format(preview.physical - preview.delta)} pzas</strong></div><div className={preview.delta < 0 ? "is-negative" : "is-positive"}><small>{adjustment ? "Ajuste" : "Entrada"}</small><strong>{preview.delta > 0 ? "+" : ""}{format(preview.delta)} pzas</strong></div><div className="is-new-physical"><small>Nueva física</small><strong>{format(preview.physical)} pzas</strong></div><div><small>Apartadas</small><strong>{format(preview.reserved)} pzas</strong></div><div className="is-new-available"><small>Nueva disponible</small><strong>{format(preview.available)} pzas</strong></div></div><p className={invalid ? "is-invalid" : ""}>{invalid ? <CircleAlert size={16}/> : <Check size={16}/>} {invalid ? "El saldo disponible no puede quedar por debajo de las unidades reservadas." : `Balance válido. ${adjustment ? "Las unidades apartadas se mantienen protegidas." : `Se incorporarán ${format(amount)} unidades al inventario disponible.`}`}</p></section>;
}

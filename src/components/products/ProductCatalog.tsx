"use client";

import {
  ArrowLeft,
  Barcode,
  ChevronLeft,
  ChevronRight,
  Archive,
  ArrowDownWideNarrow,
  ChevronDown,
  CircleAlert,
  CheckCircle2,
  Download,
  Eye,
  FilterX,
  ImagePlus,
  Info,
  Layers,
  LoaderCircle,
  Mic,
  MapPin,
  MoreVertical,
  PackageOpen,
  Pencil,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  TriangleAlert,
  Trash2,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  Fragment,
} from "react";
import {
  amount,
  groupProductRows,
  type ProductGroup,
  type ProductRow,
  type ProductVariant,
  validateProductDraft,
} from "./product-utils";

type Role = "ADMIN" | "INVENTORY_MANAGER" | "SELLER";
type Category = { id: string; name: string };
type DraftVariant = ProductVariant & {
  id?: string;
  stock: string;
  cost: string;
  price: string;
  promoPrice: string;
  lowStockThreshold: string;
  sku: string;
  barcode: string;
  size: string;
  color: string;
};
type ProductDetail = {
  id: string;
  name: string;
  categoryId: string;
  location: string;
  photoPath?: string | null;
  variants: DraftVariant[];
};
type HistoryRow = {
  field: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  createdAt: string;
  user?: { name: string } | null;
};

const emptyVariant = (): DraftVariant => ({
  sku: "",
  barcode: "",
  size: "",
  color: "",
  cost: "",
  price: "",
  promoPrice: "",
  stock: "",
  lowStockThreshold: "1",
});
const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});
function variantColorSwatch(color: string) {
  const value = color.toLowerCase();
  if (value.includes("negro")) return "#001615";
  if (value.includes("blanco")) return "#fff";
  if (value.includes("rojo")) return "#ba1a1a";
  if (value.includes("azul")) return "#315d74";
  if (value.includes("verde")) return "#88a78e";
  if (value.includes("gris")) return "#c4ceca";
  return "#dcefe9";
}

async function readResponse(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : `La solicitud terminó con ${response.status}.`,
    );
  return body;
}

function normalizeDetail(detail: ProductDetail): ProductDetail {
  return {
    ...detail,
    variants: detail.variants.map((variant) => ({
      ...variant,
      sku: variant.sku ?? "",
      barcode: variant.barcode ?? "",
      size: variant.size ?? "",
      color: variant.color ?? "",
      cost: String(variant.cost),
      price: String(variant.price),
      promoPrice: variant.promoPrice == null ? "" : String(variant.promoPrice),
      stock: String(variant.stock),
      lowStockThreshold: String(variant.lowStockThreshold),
    })),
  };
}

export function ProductCatalog({ role, businessName = "", initialCreate = false }: { role: Role; businessName?: string; initialCreate?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const canMutate = role !== "SELLER";
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("all");
  const [available, setAvailable] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "single" | "multiple">("all");
  const [sortBy, setSortBy] = useState("recent");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverHasMore, setServerHasMore] = useState(false);
  const [serverSummary, setServerSummary] = useState({ skuCount: 0, available: 0, low: 0, out: 0, multiple: 0, single: 0 });
  const [advancedFilters, setAdvancedFilters] = useState(false);
  const [shownMobileProducts, setShownMobileProducts] = useState(6);
  const [loading, setLoading] = useState(true);
  const productLoadId = useRef(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<"form" | "detail" | null>(() => initialCreate ? "form" : null);
  const [selected, setSelected] = useState<ProductGroup | null>(null);
  const [editing, setEditing] = useState<ProductDetail | null>(() => initialCreate ? {
    id: "",
    name: "",
    categoryId: "",
    location: "",
    variants: [emptyVariant()],
  } : null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const catalogSearchRef = useRef<HTMLInputElement | null>(null);

  async function loadProducts() {
    const loadId = ++productLoadId.current;
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (categoryId) params.set("categoryId", categoryId);
    if (status !== "all") params.set("status", status);
    if (available) params.set("available", "true");
    if (typeFilter !== "all") params.set("type", typeFilter);
    params.set("sort", sortBy);
    params.set("page", String(page));
    params.set("limit", String(pageSize));
    try {
      const result = await readResponse(await fetch(`/api/products?${params}`));
      if (loadId === productLoadId.current) { setRows(result.items); setServerTotal(result.total); setServerHasMore(result.hasMore); setServerSummary(result.summary ?? { skuCount: 0, available: 0, low: 0, out: 0, multiple: 0, single: 0 }); }
    } catch (reason) {
      if (loadId === productLoadId.current) {
        setError(
          reason instanceof Error
            ? reason.message
            : "No se pudieron cargar los productos.",
        );
      }
    } finally {
      if (loadId === productLoadId.current) setLoading(false);
    }
  }

  useEffect(() => {
    fetch("/api/categories")
      .then(readResponse)
      .then(setCategories)
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "No se pudieron cargar las categorías.",
        ),
      );
  }, []);
  useEffect(() => {
    const focusKey = "products-return-focus-new";
    if (initialCreate || pathname !== "/productos" || window.sessionStorage.getItem(focusKey) !== "1") return;
    let attempts = 0;
    let frame = 0;
    const restoreFocus = () => {
      const target = document.querySelector<HTMLButtonElement>('.products-catalog-actions [aria-label="Nuevo producto"]');
      if (target?.isConnected && !target.disabled) {
        target.focus({ preventScroll: true });
        if (document.activeElement === target) {
          window.sessionStorage.removeItem(focusKey);
        }
      }
      if (++attempts < 4) frame = window.requestAnimationFrame(restoreFocus);
    };
    frame = window.requestAnimationFrame(restoreFocus);
    return () => window.cancelAnimationFrame(frame);
  }, [initialCreate, pathname]);
  useEffect(() => {
    if (!initialCreate) void loadProducts();
  }, [query, categoryId, status, available, typeFilter, sortBy, initialCreate, page, pageSize]);
  useEffect(() => {
    const syncSearch = (event: Event) => {
      const value = (event as CustomEvent<string>).detail;
      if (typeof value === "string") {
        setQuery(value);
        setShownMobileProducts(6);
      }
    };
    window.addEventListener("products:search", syncSearch);
    return () => window.removeEventListener("products:search", syncSearch);
  }, []);

  function closeDialog() {
    if (initialCreate) {
      window.sessionStorage.setItem("products-return-focus-new", "1");
      router.push("/productos");
      return;
    }
    setDialog(null);
    setEditing(null);
    window.setTimeout(() => {
      if (triggerRef.current?.isConnected) {
        triggerRef.current.focus();
        return;
      }
      document.querySelector<HTMLButtonElement>('.products-page .products-catalog-heading .products-primary')?.focus();
    }, 0);
  }
  function openForm(product?: ProductGroup) {
    const active = document.activeElement;
    triggerRef.current =
      active instanceof HTMLButtonElement && !active.closest('[role="dialog"]')
        ? active
        : product
          ? document.querySelector<HTMLButtonElement>(
              `[data-product-edit="${product.id}"]`,
            )
          : null;
    if (!product) {
      setEditing({
        id: "",
        name: "",
        categoryId: "",
        location: "",
        variants: [emptyVariant()],
      });
      setDialog("form");
      return;
    }
    setEditing(null);
    setDialog("form");
    void Promise.all([
      fetch(`/api/products/${product.id}`).then(readResponse),
      fetch(`/api/products/${product.id}/history`).then(readResponse),
    ])
      .then(([detail]) => setEditing(normalizeDetail(detail)))
      .catch((reason) => {
        setError(
          reason instanceof Error
            ? reason.message
            : "No se pudo cargar el producto.",
        );
        closeDialog();
      });
  }
  function openDetail(product: ProductGroup) {
    triggerRef.current =
      document.activeElement instanceof HTMLButtonElement
        ? document.activeElement
        : null;
    setSelected(product);
    setDialog("detail");
  }
  function clearFilters() {
    setQuery("");
    setCategoryId("");
    setStatus("all");
    setAvailable(false);
    setTypeFilter("all");
    setSortBy("recent");
    setShownMobileProducts(6);
    window.dispatchEvent(new CustomEvent("products:search-sync", { detail: "" }));
  }
  function applyQuickFilter(filter: "all" | "available" | "low" | "out" | "multiple" | "single") {
    setCategoryId("");
    setAvailable(filter === "available");
    setStatus(filter === "low" || filter === "out" ? filter : "all");
    setTypeFilter(filter === "multiple" || filter === "single" ? filter : "all");
    setShownMobileProducts(6);
  }
  function handleFilterChange(updateFilter: () => void) {
    updateFilter();
    setShownMobileProducts(6);
  }
  async function exportCatalog() {
    const fields = ["Producto", "Categoría", "SKU", "Código de barras", "Talla", "Color", "Costo", "Precio", "Precio promocional", "Stock", "Umbral", "Ubicación"];
    const escapeCsv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    try {
      const exported: ProductRow[] = [];
      let exportPage = 1;
      let hasMore = true;
      while (hasMore) {
        const params = new URLSearchParams({ page: String(exportPage), limit: "100", sort: sortBy });
        if (query.trim()) params.set("q", query.trim());
        if (categoryId) params.set("categoryId", categoryId);
        if (status !== "all") params.set("status", status);
        if (available) params.set("available", "true");
        if (typeFilter !== "all") params.set("type", typeFilter);
        const result = await readResponse(await fetch(`/api/products?${params}`));
        exported.push(...result.items);
        hasMore = result.hasMore;
        exportPage += 1;
      }
      const data = [fields, ...exported.map((row) => [row.product.name, row.product.category?.name, row.sku, row.barcode, row.size, row.color, row.cost, row.price, row.promoPrice, row.stock, row.lowStockThreshold, row.product.location])];
      const blob = new Blob([`\uFEFF${data.map((line) => line.map(escapeCsv).join(",")).join("\r\n")}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "catalogo-productos.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo exportar el catálogo.");
    }
  }

  useEffect(() => {
    const shortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        catalogSearchRef.current?.focus();
        catalogSearchRef.current?.select();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => setPage(1), [query, categoryId, status, available, typeFilter, sortBy, pageSize]);

  const products = groupProductRows(rows);
  const totalSkus = serverSummary.skuCount;
  const availableSkus = serverSummary.available;
  const lowStockSkus = serverSummary.low;
  const outOfStockSkus = serverSummary.out;
  const filteredProducts = products;
  const pageCount = Math.max(1, Math.ceil(serverTotal / pageSize));
  const pageProducts = filteredProducts;
  const pageStart = serverTotal ? (page - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(page * pageSize, serverTotal);
  const mobileShownTotal = (page - 1) * pageSize + Math.min(shownMobileProducts, pageProducts.length);
  return (
    <section
      className={`products-page ${dialog === "form" ? "products-editor-page" : ""}`}
      aria-labelledby={dialog === "form" ? "products-editor-title" : "products-title"}
    >
      {dialog !== "form" && (
        <>
      <div className="products-master-page">
      <header className="products-catalog-heading">
        <div className="products-catalog-title">
          <div className="products-catalog-title-line"><h1 id="products-title" aria-label="Catálogo de productos">Productos</h1><span>Catálogo Master</span></div>
          <p className="products-catalog-description">Organiza, consulta y administra los productos de tu negocio.</p>
          <p className="products-catalog-business"><i aria-hidden="true"/>{businessName}</p>
        </div>
        <div className="products-catalog-actions">
          <button className="products-export-button" type="button" onClick={exportCatalog}><Download size={18} aria-hidden="true"/><span>Exportar catálogo</span></button>
         {canMutate && <button className="button products-primary" type="button" aria-label="Nuevo producto" onClick={() => router.push("/productos/nuevo")}><Plus size={18} aria-hidden="true"/><span className="products-new-desktop">Nuevo producto</span><span className="products-new-mobile">Nuevo</span></button>}
        </div>
      </header>
      <section className="products-metrics" aria-label="Resumen del catálogo">
        <article className="products-metric"><div><span>Total de productos</span><strong>{totalSkus}<small>SKUs</small></strong><p><span className="products-metric-desktop-copy">En catálogo activo</span><span className="products-metric-mobile-copy">Total</span></p></div><span className="products-metric-icon"><Archive size={24}/></span></article>
        <article className="products-metric products-metric-available"><div><span>Disponibles</span><strong>{availableSkus}<small>{totalSkus ? `${((availableSkus / totalSkus) * 100).toFixed(1)}%` : "0%"}</small></strong><p><span className="products-metric-desktop-copy">Listos para venta</span><span className="products-metric-mobile-copy">Listos</span></p></div><span className="products-metric-icon"><CheckCircle2 size={24}/></span></article>
        <article className="products-metric products-metric-low"><div><span>Stock bajo</span><strong>{lowStockSkus}<small>Atención</small></strong><p><span className="products-metric-desktop-copy">Menos de su umbral mínimo</span><span className="products-metric-mobile-copy">Stock bajo</span></p></div><span className="products-metric-icon"><TriangleAlert size={24}/></span></article>
        <article className="products-metric products-metric-out"><div><span>Agotados</span><strong>{outOfStockSkus}<small>Crítico</small></strong><p><span className="products-metric-desktop-copy">Sin existencias en tienda</span><span className="products-metric-mobile-copy">Agotados</span></p></div><span className="products-metric-icon"><PackageOpen size={24}/></span></article>
      </section>
      <section className="products-master-filters" role="region" aria-label="Filtros de productos">
        <div className="products-master-filter-row">
          <label className="products-search">
            <Search size={20} aria-hidden="true"/><span className="sr-only">Buscar productos</span>
            <input ref={catalogSearchRef} aria-label="Buscar productos" value={query} onChange={(event) => { setQuery(event.target.value); setShownMobileProducts(6); window.dispatchEvent(new CustomEvent("products:search-sync", { detail: event.target.value })); }} placeholder="Buscar por producto, SKU o código de barras..." />
            <kbd>⌘K</kbd>
            <Mic className="products-voice-search" size={17} aria-hidden="true"/>
          </label>
          <button className="products-barcode-search" type="button" aria-label="Buscar código de barras" title="Escribe o escanea el código en el campo de búsqueda" onClick={() => catalogSearchRef.current?.focus()}><Barcode size={22} aria-hidden="true"/></button>
          <div className="products-master-filter-controls">
             <label className="products-select-filter"><span className="sr-only">Categoría</span><select aria-label="Filtrar por categoría" value={categoryId} onChange={(event) => handleFilterChange(() => setCategoryId(event.target.value))}><option value="">Todas las categorías</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><ChevronDown size={17} aria-hidden="true"/></label>
             <label className="products-select-filter"><span className="sr-only">Estado</span><select aria-label="Filtrar por estado" value={available ? "available" : status} onChange={(event) => handleFilterChange(() => { setAvailable(event.target.value === "available"); setStatus(event.target.value === "available" ? "all" : event.target.value); })}><option value="all">Estado: Todos</option><option value="available">Disponible</option><option value="low">Stock bajo</option><option value="out">Agotado</option></select><ChevronDown size={17} aria-hidden="true"/></label>
             <label className="products-select-filter"><span className="sr-only">Tipo</span><select aria-label="Filtrar por tipo" value={typeFilter} onChange={(event) => handleFilterChange(() => setTypeFilter(event.target.value as "all" | "single" | "multiple"))}><option value="all">Tipo: Todos</option><option value="single">Simple</option><option value="multiple">Con variantes</option></select><ChevronDown size={17} aria-hidden="true"/></label>
             <label className="products-select-filter products-sort-filter"><span className="sr-only">Ordenar por</span><select aria-label="Ordenar productos" value={sortBy} onChange={(event) => handleFilterChange(() => setSortBy(event.target.value))}><option value="recent">Ordenar por: Recientes</option><option value="name">Nombre (A-Z)</option><option value="price-high">Precio: Mayor a menor</option><option value="price-low">Precio: Menor a mayor</option><option value="stock-high">Mayor existencia</option><option value="stock-low">Menor existencia</option></select><ArrowDownWideNarrow size={17} aria-hidden="true"/></label>
             <button className="products-clear-filter-button" type="button" onClick={clearFilters}><FilterX size={17} aria-hidden="true"/><span>Limpiar filtros</span></button>
          </div>
          <button className="products-advanced-filter-toggle" type="button" aria-expanded={advancedFilters} onClick={() => setAdvancedFilters((open) => !open)}><SlidersHorizontal size={20} aria-hidden="true"/><span className="sr-only">Filtros avanzados</span><span className="products-filter-dot" aria-hidden="true"/></button>
        </div>
        <div className="products-quick-filters" role="group" aria-label="Filtros rápidos" tabIndex={0}>
          <button type="button" className={!available && status === "all" && typeFilter === "all" ? "filter-chip filter-chip-active" : "filter-chip"} onClick={() => applyQuickFilter("all")}>Todos <span>({totalSkus})</span></button>
          <button type="button" className={available ? "filter-chip filter-chip-active" : "filter-chip"} onClick={() => applyQuickFilter("available")}><i className="quick-dot quick-dot-available"/>Disponibles <span>({availableSkus})</span></button>
          <button type="button" className={status === "low" ? "filter-chip filter-chip-active" : "filter-chip"} onClick={() => applyQuickFilter("low")}><i className="quick-dot quick-dot-low"/>Stock bajo <span>({lowStockSkus})</span></button>
          <button type="button" className={status === "out" ? "filter-chip filter-chip-active" : "filter-chip"} onClick={() => applyQuickFilter("out")}><i className="quick-dot quick-dot-out"/>Agotados <span>({outOfStockSkus})</span></button>
          <button type="button" className={typeFilter === "multiple" ? "filter-chip filter-chip-active" : "filter-chip"} onClick={() => applyQuickFilter("multiple")}><Layers size={14} aria-hidden="true"/>Con variantes <span>({serverSummary.multiple})</span></button>
          <button type="button" className={typeFilter === "single" ? "filter-chip filter-chip-active" : "filter-chip"} onClick={() => applyQuickFilter("single")}><PackageOpen size={14} aria-hidden="true"/>Productos simples <span>({serverSummary.single})</span></button>
        </div>
      </section>
      <div className="products-feedback" aria-live="polite">{notice}</div>
      {error && (
        <div className="products-alert" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          <span>{error}</span>
          <button type="button" onClick={() => void loadProducts()}>
            Reintentar
          </button>
        </div>
      )}
      {loading ? (
        <div
          className="products-loading"
          role="status"
          aria-label="Cargando productos"
        >
          {[1, 2, 3].map((item) => (
            <div key={item} className="products-skeleton" />
          ))}
          <span>Cargando catálogo…</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="products-empty">
          <PackageOpen size={38} aria-hidden="true" />
          <h2>No encontramos productos</h2>
          <p>Prueba otra búsqueda o limpia los filtros.</p>
        </div>
      ) : (
        <div className={`products-grid products-master-grid ${shownMobileProducts > 6 ? "products-mobile-show-more" : ""}`}>
          {pageProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              canMutate={canMutate}
              onOpen={() => openDetail(product)}
              onEdit={() => openForm(product)}
              mobileHidden={index >= shownMobileProducts}
            />
          ))}
        </div>
      )}
      {!loading && serverTotal > 0 && (
        <>
          <footer className="products-catalog-pagination">
            <span>Mostrando <strong>{pageStart}–{pageEnd}</strong> de <strong>{serverTotal}</strong> productos</span>
            <label>Mostrar por página <select aria-label="Productos por página" value={pageSize} onChange={(event) => handleFilterChange(() => setPageSize(Number(event.target.value)))}><option value="6">6</option><option value="12">12</option><option value="24">24</option><option value="48">48</option></select></label>
            <nav aria-label="Paginación del catálogo"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={16}/>Anterior</button><span>Página {page} de {pageCount}</span><button type="button" disabled={!serverHasMore} onClick={() => setPage((current) => current + 1)}>Siguiente<ChevronRight size={16}/></button></nav>
          </footer>
          <footer className="products-mobile-load-more"><div><span style={{ width: `${serverTotal ? Math.min(100, (mobileShownTotal / serverTotal) * 100) : 0}%` }}/></div><span>Mostrando {Math.min(mobileShownTotal, serverTotal)} de {serverTotal} productos registrados</span>{(serverHasMore || shownMobileProducts < pageProducts.length) && <button type="button" onClick={() => { if (shownMobileProducts < pageProducts.length) setShownMobileProducts((count) => Math.min(count + 6, pageProducts.length)); else { setPage((current) => current + 1); setShownMobileProducts(6); } }}><ChevronDown size={18}/>Cargar más productos</button>}</footer>
        </>
      )}
      </div>
        </>
      )}
      {dialog === "form" && editing && (
        <ProductForm
          product={editing}
          categories={categories}
          onClose={() => {
            if (selected && editing.id === selected.id) {
              setEditing(null);
              setDialog("detail");
              window.setTimeout(() => triggerRef.current?.focus(), 0);
            } else {
              closeDialog();
            }
          }}
          onSaved={() => {
            closeDialog();
            if (!initialCreate) void loadProducts();
          }}
        />
      )}
      {dialog === "detail" && selected && (
        <ProductDetailDialog
          product={selected}
          canMutate={canMutate}
          onClose={closeDialog}
          onEdit={() => openForm(selected)}
          onArchived={() => {
            setNotice(
              "Producto archivado. Ya no aparece en el catálogo activo.",
            );
            closeDialog();
            void loadProducts();
          }}
        />
      )}
    </section>
  );
}

function ProductCard({
  product,
  canMutate,
  onOpen,
  onEdit,
  mobileHidden,
}: {
  product: ProductGroup;
  canMutate: boolean;
  onOpen: () => void;
  onEdit: () => void;
  mobileHidden: boolean;
}) {
  const first = product.variants[0];
  const productType = product.variants.length === 1 ? "Producto simple" : `${product.variants.length} variantes`;
  return (
    <article className={`product-card products-master-card ${mobileHidden ? "products-card-mobile-hidden" : ""}`}>
      <button
        className="product-card-main"
        type="button"
        onClick={onOpen}
      >
        <div className="products-card-image-frame">
          <ProductImage path={product.photoPath} name={product.name} />
          <div className="products-card-badges"><StockBadge state={product.state}/><span className="products-variant-count">{productType}</span></div>
          {first.barcode && <span className="products-barcode-badge"><QrCode size={14} aria-hidden="true"/>{first.barcode.slice(0, 12)}</span>}
        </div>
        <div className="product-card-body">
          <div className="products-card-name-row">
            <div className="products-card-name-group"><span className="product-category" title={product.category?.name ?? "Sin categoría"}>{product.category?.name ?? "Sin categoría"}</span><h2 title={product.name}>{product.name}</h2></div>
            <MoreVertical size={18} className="products-card-more" aria-hidden="true"/>
            <span className="products-mobile-stock-status"><StockBadge state={product.state}/></span>
          </div>
          <div className="products-card-identifiers"><span className="products-card-mobile-category">{product.category?.name ?? "Sin categoría"}</span><span className="product-sku" title={`SKU ${first.sku}`}><Tag size={14} aria-hidden="true"/>{first.sku}{product.variants.length > 1 ? ` · +${product.variants.length - 1}` : ""}</span><span className="products-identifier-divider">•</span><span className="products-card-location" title={product.location}><MapPin size={14} aria-hidden="true"/>{product.location}</span></div>
          <div className={`products-card-stock-panel products-card-stock-${product.state}`}>
            <div className="products-card-stock-primary"><div className="product-price"><strong>{currency.format(amount(first.promoPrice ?? first.price))}</strong>{first.promoPrice != null && <del>{currency.format(amount(first.price))}</del>}<small>MXN</small></div><span>{product.stock} pzas disponibles</span></div>
            <div className="products-card-stock-detail"><span>Física: <strong>{product.stock}</strong></span><span>Mínimo: <strong>{product.threshold}</strong></span></div>
          </div>
        </div>
      </button>
      <div className="product-card-actions">
        <button className="products-card-detail" type="button" onClick={onOpen}>
          <Eye size={16} aria-hidden="true"/><span className="products-detail-desktop">Ver detalle</span><span className="products-detail-mobile">Detalle</span>
        </button>
        {canMutate && (
          <button
            className="products-card-edit"
            type="button"
            data-product-edit={product.id}
            onClick={onEdit}
          >
            <Pencil size={16} aria-hidden="true" /> <span>Editar</span>
          </button>
        )}
      </div>
    </article>
  );
}

function ProductImage({
  path,
  name,
}: {
  path: string | null | undefined;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  if (path && !failed)
    return (
      <img
        className="product-image"
        src={path}
        alt={`Foto de ${name}`}
        onError={() => setFailed(true)}
      />
    );
  return (
    <div
      className="product-image product-placeholder"
      role="img"
      aria-label={`Sin fotografía de ${name}`}
    >
      <PackageOpen size={42} aria-hidden="true" />
      <span>Sin fotografía</span>
    </div>
  );
}
function StockBadge({ state }: { state: ProductGroup["state"] }) {
  return (
    <span className={`stock-badge stock-${state}`}>
      {state === "stock"
        ? "Disponible"
        : state === "low"
          ? "Stock bajo"
          : "Agotado"}
    </span>
  );
}

function Modal({
  title,
  children,
  className = "",
  onClose,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const key = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", key);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = previous;
    };
  }, [onClose]);
  function trap(event: KeyboardEvent) {
    if (event.key !== "Tab" || !modalRef.current) return;
    const focusable = [
      ...modalRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]",
      ),
    ];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  return (
    <div
      className="products-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={modalRef}
        className={`products-modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="products-modal-title"
        onKeyDown={trap}
      >
        <header className="products-modal-header">
          <h2 id="products-modal-title">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            aria-label={`Cerrar ${title.toLowerCase()}`}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function FieldError({ message, id }: { message?: string; id: string }) {
  return message ? (
    <span className="field-error" id={id} role="alert">
      {message}
    </span>
  ) : null;
}

function firstError(errors: string[], prefix: string) {
  return errors.find((error) => error.startsWith(prefix));
}

function ProductForm({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: ProductDetail;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(product);
  const [variantMode, setVariantMode] = useState(
    product.variants.length > 1 ? "multiple" : "single",
  );
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(product.photoPath ?? "");
  const [expandedVariantIndexes, setExpandedVariantIndexes] = useState<Set<number>>(() => new Set([0]));
  const isEdit = Boolean(product.id);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  const validationErrors = validateProductDraft(
    draft.name,
    draft.categoryId,
    draft.variants,
    isEdit,
  );
  const promoIsInvalid = (variant: DraftVariant) => Boolean(
    variant.promoPrice && variant.price && Number(variant.promoPrice) > Number(variant.price),
  );
  const configuredVariantCount = draft.variants.filter((variant, index) =>
    !validationErrors.some((error) => error.startsWith(`Variante ${index + 1}:`)),
  ).length;
  const correctionCount = showValidation
    ? Math.max(0, draft.variants.length - configuredVariantCount)
    : draft.variants.filter(promoIsInvalid).length;
  const changedPrice =
    isEdit &&
    draft.variants.some((variant, index) => {
      const old = product.variants[index];
      return (
        old &&
        (String(old.cost) !== variant.cost ||
          String(old.price) !== variant.price ||
          String(old.promoPrice ?? "") !== variant.promoPrice)
      );
    });
  const update = (field: keyof ProductDetail, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));
  const updateVariant = (
    index: number,
    field: keyof DraftVariant,
    value: string,
  ) =>
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant, item) =>
        item === index ? { ...variant, [field]: value } : variant,
      ),
    }));
  function removeVariant(index: number) {
    setDraft((current) => ({
      ...current,
      variants: current.variants.filter((_, item) => item !== index),
    }));
    setExpandedVariantIndexes((current) => new Set(
      [...current].filter((item) => item !== index).map((item) => item > index ? item - 1 : item),
    ));
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || saving) return;
    setPreview(URL.createObjectURL(file));
    const form = new FormData();
    form.set("file", file);
    try {
      const body = await readResponse(
        await fetch("/api/products/image", { method: "POST", body: form }),
      );
      setDraft((current) => ({ ...current, photoPath: body.photoPath }));
      setPreview(body.photoPath);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo subir la imagen.",
      );
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setShowValidation(true);
    setMessage("");
    const errors = validateProductDraft(
      draft.name,
      draft.categoryId,
      draft.variants,
      isEdit,
    );
    if (errors.length) {
      setMessage(errors.join(" "));
      return;
    }
    if (changedPrice && !reason.trim()) {
      setMessage("Indica el motivo del cambio de costo, precio o promoción.");
      return;
    }
    setSaving(true);
    try {
      const variants = draft.variants.map((variant) => ({
        ...(variant.id ? { id: variant.id } : {}),
        sku: variant.sku,
        barcode: variant.barcode,
        size: variant.size,
        color: variant.color,
        cost: variant.cost,
        price: variant.price,
        promoPrice: variant.promoPrice || undefined,
        lowStockThreshold: variant.lowStockThreshold,
        ...(!variant.id ? { stock: variant.stock } : {}),
      }));
      const body = {
        name: draft.name,
        categoryId: draft.categoryId,
        location: draft.location,
        photoPath: draft.photoPath || null,
        variants,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      };
      await readResponse(
        await fetch(isEdit ? `/api/products/${draft.id}` : "/api/products", {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEdit && variantMode === "single"
              ? { ...body, variants: [variants[0]] }
              : body,
          ),
        }),
      );
      onSaved();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el producto.",
      );
    } finally {
      setSaving(false);
    }
  }
  const variantFields = (
    variant: DraftVariant,
    index: number,
    mobile = false,
  ) => (
    <div className="variant-fields">
      <label>
        Talla
        <input
          aria-label={`Talla variante ${index + 1}`}
          value={variant.size}
          onChange={(event) => updateVariant(index, "size", event.target.value)}
        />
      </label>
      <label>
        Color
        <input
          aria-label={`Color variante ${index + 1}`}
          value={variant.color}
          onChange={(event) => updateVariant(index, "color", event.target.value)}
        />
      </label>
      <label>
        SKU *
        <input
          aria-label={`SKU variante ${index + 1}`}
          value={variant.sku}
          onChange={(event) => updateVariant(index, "sku", event.target.value)}
          aria-invalid={showValidation && Boolean(firstError(validationErrors, `Variante ${index + 1}: el SKU`))}
          aria-describedby={`variant-${index}-sku-${mobile ? "mobile" : "desktop"}`}
        />
        {showValidation && <FieldError message={firstError(validationErrors, `Variante ${index + 1}: el SKU`)} id={`variant-${index}-sku-${mobile ? "mobile" : "desktop"}`} />}
      </label>
      <label>
        Barcode
        <input
          aria-label={`Barcode variante ${index + 1}`}
          value={variant.barcode}
          onChange={(event) =>
            updateVariant(index, "barcode", event.target.value)
          }
          aria-invalid={showValidation && Boolean(firstError(validationErrors, `Variante ${index + 1}: el barcode`))}
          aria-describedby={`variant-${index}-barcode-${mobile ? "mobile" : "desktop"}`}
        />
        {showValidation && <FieldError message={firstError(validationErrors, `Variante ${index + 1}: el barcode`)} id={`variant-${index}-barcode-${mobile ? "mobile" : "desktop"}`} />}
      </label>
      <label>
        Costo *
        <input
          type="number"
          min="0"
          step="any"
          aria-label={`Costo variante ${index + 1}`}
          value={variant.cost}
          onChange={(event) => updateVariant(index, "cost", event.target.value)}
          aria-invalid={showValidation && Boolean(firstError(validationErrors, `Variante ${index + 1}: costo`))}
          aria-describedby={`variant-${index}-cost-${mobile ? "mobile" : "desktop"}`}
        />
        {showValidation && <FieldError message={firstError(validationErrors, `Variante ${index + 1}: costo`)} id={`variant-${index}-cost-${mobile ? "mobile" : "desktop"}`} />}
      </label>
      <label>
        Precio *
        <input
          type="number"
          min="0"
          step="any"
          aria-label={`Precio variante ${index + 1}`}
          value={variant.price}
          onChange={(event) =>
            updateVariant(index, "price", event.target.value)
          }
          aria-invalid={showValidation && Boolean(firstError(validationErrors, `Variante ${index + 1}: precio`))}
          aria-describedby={`variant-${index}-price-${mobile ? "mobile" : "desktop"}`}
        />
        {showValidation && <FieldError message={firstError(validationErrors, `Variante ${index + 1}: precio`)} id={`variant-${index}-price-${mobile ? "mobile" : "desktop"}`} />}
      </label>
      <label>
        Promo
        <input
          type="number"
          min="0"
          step="any"
          aria-label={`Promoción variante ${index + 1}`}
          value={variant.promoPrice}
          onChange={(event) =>
            updateVariant(index, "promoPrice", event.target.value)
          }
          aria-invalid={promoIsInvalid(variant) || showValidation && Boolean(firstError(validationErrors, `Variante ${index + 1}: promoción`))}
          aria-describedby={`variant-${index}-promo-${mobile ? "mobile" : "desktop"}`}
        />
        {(showValidation || promoIsInvalid(variant)) && !(mobile && promoIsInvalid(variant)) && <FieldError message={firstError(validationErrors, `Variante ${index + 1}: promoción`)} id={`variant-${index}-promo-${mobile ? "mobile" : "desktop"}`} />}
      </label>
      <label>
        {isEdit && variant.id ? "Stock físico (solo lectura)" : "Stock inicial"}
        <input
          type="number"
          min="0"
          step="any"
          aria-label={`Stock variante ${index + 1}`}
          value={variant.stock}
          readOnly={Boolean(isEdit && variant.id)}
          onChange={(event) =>
            updateVariant(index, "stock", event.target.value)
          }
          aria-invalid={showValidation && Boolean(firstError(validationErrors, `Variante ${index + 1}: stock`))}
          aria-describedby={`variant-${index}-stock-${mobile ? "mobile" : "desktop"}`}
        />
        {showValidation && <FieldError message={firstError(validationErrors, `Variante ${index + 1}: stock`)} id={`variant-${index}-stock-${mobile ? "mobile" : "desktop"}`} />}
      </label>
      <label>
        Umbral
        <input
          type="number"
          min="0"
          step="any"
          aria-label={`Umbral variante ${index + 1}`}
          value={variant.lowStockThreshold}
          onChange={(event) =>
            updateVariant(index, "lowStockThreshold", event.target.value)
          }
          aria-invalid={showValidation && Boolean(firstError(validationErrors, `Variante ${index + 1}: umbral`))}
          aria-describedby={`variant-${index}-threshold-${mobile ? "mobile" : "desktop"}`}
        />
        {showValidation && <FieldError message={firstError(validationErrors, `Variante ${index + 1}: umbral`)} id={`variant-${index}-threshold-${mobile ? "mobile" : "desktop"}`} />}
      </label>
      {mobile && (
        <button
          className="button button-quiet variant-delete"
          type="button"
          aria-label={`Eliminar variante ${index + 1}`}
          onClick={() => removeVariant(index)}
        >
          <Trash2 size={16} /> Eliminar variante
        </button>
      )}
    </div>
  );
  const variantTableRow = (variant: DraftVariant, index: number) => {
    const errorId = (key: string) => `variant-${index}-${key}-desktop`;
    const fieldError = (label: string) => firstError(validationErrors, `Variante ${index + 1}: ${label}`);
    const promoInvalid = promoIsInvalid(variant);
    const variantLabel = [variant.size, variant.color].filter(Boolean).join(" / ") || `Variante ${index + 1}`;
    const promoError = `Variante ${variantLabel} — Precio promocional (${currency.format(Number(variant.promoPrice))} MXN) no puede ser mayor al precio normal (${currency.format(Number(variant.price))} MXN).`;
    return (
      <Fragment key={variant.id ?? index}>
        <tr className={promoInvalid ? "variant-row-invalid" : "variant-row-valid"}>
          <td><input aria-label={`Talla variante ${index + 1}`} value={variant.size} onChange={(event) => updateVariant(index, "size", event.target.value)} /></td>
          <td><div className="variant-color-cell">{variant.color.trim() && <span aria-hidden="true" style={{ backgroundColor: variantColorSwatch(variant.color) }} />}<input aria-label={`Color variante ${index + 1}`} value={variant.color} onChange={(event) => updateVariant(index, "color", event.target.value)} /></div></td>
          <td>
            <div className="variant-sku-cell"><input aria-label={`SKU variante ${index + 1}`} value={variant.sku} onChange={(event) => updateVariant(index, "sku", event.target.value)} aria-invalid={showValidation && Boolean(fieldError("el SKU"))} aria-describedby={errorId("sku")} />{variant.sku.trim() && !fieldError("el SKU") && <CheckCircle2 size={15} aria-label="SKU válido" />}</div>
            {showValidation && <FieldError message={fieldError("el SKU")} id={errorId("sku")} />}
          </td>
          <td><input aria-label={`Barcode variante ${index + 1}`} value={variant.barcode} onChange={(event) => updateVariant(index, "barcode", event.target.value)} aria-invalid={showValidation && Boolean(fieldError("el barcode"))} aria-describedby={errorId("barcode")} />{showValidation && <FieldError message={fieldError("el barcode")} id={errorId("barcode")} />}</td>
          <td><div className="products-variant-money"><span>$</span><input type="number" min="0" step="any" aria-label={`Costo variante ${index + 1}`} value={variant.cost} onChange={(event) => updateVariant(index, "cost", event.target.value)} aria-invalid={showValidation && Boolean(fieldError("costo"))} aria-describedby={errorId("cost")} /></div>{showValidation && <FieldError message={fieldError("costo")} id={errorId("cost")} />}</td>
          <td><div className="products-variant-money"><span>$</span><input type="number" min="0" step="any" aria-label={`Precio variante ${index + 1}`} value={variant.price} onChange={(event) => updateVariant(index, "price", event.target.value)} aria-invalid={showValidation && Boolean(fieldError("precio"))} aria-describedby={errorId("price")} /></div>{showValidation && <FieldError message={fieldError("precio")} id={errorId("price")} />}</td>
          <td><div className={`products-variant-money ${promoInvalid ? "products-variant-money-invalid" : ""}`}><span>$</span><input type="number" min="0" step="any" placeholder="-" aria-label={`Promoción variante ${index + 1}`} value={variant.promoPrice} onChange={(event) => updateVariant(index, "promoPrice", event.target.value)} aria-invalid={promoInvalid || showValidation && Boolean(fieldError("promoción"))} aria-describedby={promoInvalid ? errorId("promo-row") : errorId("promo")} /></div>{showValidation && !promoInvalid && <FieldError message={fieldError("promoción")} id={errorId("promo")} />}</td>
          <td>
            <div className="variant-stock-cell"><input type="number" min="0" step="any" aria-label={`Stock variante ${index + 1}`} value={variant.stock} readOnly={Boolean(isEdit && variant.id)} onChange={(event) => updateVariant(index, "stock", event.target.value)} aria-invalid={showValidation && Boolean(fieldError("stock"))} aria-describedby={errorId("stock")} /><small>pzas</small>
              <details className="variant-threshold-control" open={showValidation && Boolean(fieldError("umbral")) || undefined}>
                <summary aria-label={`Editar umbral de stock bajo de variante ${index + 1}`} title="Umbral de stock bajo"><SlidersHorizontal size={13} aria-hidden="true"/><span className="sr-only">Umbral</span></summary>
                <input type="number" min="0" step="any" aria-label={`Umbral variante ${index + 1}`} value={variant.lowStockThreshold} onChange={(event) => updateVariant(index, "lowStockThreshold", event.target.value)} aria-invalid={showValidation && Boolean(fieldError("umbral"))} aria-describedby={errorId("threshold")} />
                {showValidation && <FieldError message={fieldError("umbral")} id={errorId("threshold")} />}
              </details>
            </div>
            {isEdit && variant.id && <small>Solo lectura</small>}
          </td>
          <td className="variant-delete-cell"><button type="button" aria-label={`Eliminar variante ${index + 1}`} onClick={() => removeVariant(index)} disabled={draft.variants.length === 1}><Trash2 size={16} /></button></td>
        </tr>
        {promoInvalid && <tr className="variant-inline-error"><td colSpan={9}><div className="variant-inline-error-content"><CircleAlert size={16} aria-hidden="true"/><span id={errorId("promo-row")} role="alert">{promoError}</span><small>(Ajusta a un monto inferior a {currency.format(Number(variant.price))} MXN o déjalo vacío)</small></div></td></tr>}
      </Fragment>
    );
  };
  return (
    <section
      className={`products-editor-surface ${variantMode === "multiple" ? "products-editor-multiple" : ""}`}
      role="dialog"
      aria-modal="false"
      aria-label={isEdit ? "Editar producto" : "Nuevo producto"}
    >
      <header className="products-editor-header">
        <button
          ref={closeRef}
          className="products-editor-back"
          type="button"
          aria-label={`Cerrar ${isEdit ? "edición de producto" : "nuevo producto"}`}
          onClick={onClose}
        >
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Productos</span>
        </button>
        <span className="products-editor-header-status">
          {isEdit ? "Edición" : "Nuevo registro"}
        </span>
      </header>
      <form className="products-form" onSubmit={save} noValidate>
        <div className="products-form-body">
          <div className="products-editor-hero">
            <div>
              <Breadcrumbs items={[{ label: "Productos", href: "/productos", onClick: () => window.sessionStorage.setItem("products-return-focus-new", "1") }, { label: isEdit ? "Editar producto" : "Nuevo producto" }]} />
              <div className="products-editor-title-line"><h1 id="products-editor-title">{isEdit ? "Editar producto" : variantMode === "multiple" ? <><span className="editor-title-desktop">Crear Producto con Variantes</span><span className="editor-title-mobile">Crear Producto</span></> : "Crear Producto"}</h1>{!isEdit && variantMode === "single" && <span className="products-title-context">Mostrador directo</span>}</div>
              <p>{variantMode === "multiple" ? <><span className="editor-copy-desktop">Control manual explícito de combinaciones, códigos SKU únicos y existencia inicial en tienda.</span><span className="editor-copy-mobile">Varias opciones: Artículos con tallas o colores (ej. Ropa, Calzado).</span></> : "Registra artículos con precio neto final y disponibilidad inmediata para venta física."}</p>
            </div>
            <span className="products-editor-status">{variantMode === "multiple" ? "Validación de códigos en tiempo real" : "Captura Rápida de Inventario"}</span>
          </div>
          <fieldset className="variant-mode">
            <legend className="sr-only">Tipo de producto</legend>
            <label className={variantMode !== "single" ? "products-mode-inactive" : ""}>
              <input
                type="radio"
                checked={variantMode === "single"}
                onChange={() => setVariantMode("single")}
              />{" "}
              <span className={`products-mode-icon ${variantMode !== "single" ? "products-mode-icon-muted" : ""}`} aria-hidden="true">{variantMode === "single" ? <CheckCircle2 size={18} /> : <Archive size={18} />}</span>
              <span className="products-mode-copy"><strong>Una sola presentación{variantMode === "single" ? <span className="products-recommended">Recomendado</span> : <span className="products-mode-state">Inactivo</span>}</strong><small>Artículos estándar sin tallas ni colores (ej. Cuaderno, Botella de agua).</small></span>
            </label>
            <label>
              <input
                type="radio"
                checked={variantMode === "multiple"}
                onChange={() => setVariantMode("multiple")}
              />{" "}
              <span className={`products-mode-icon ${variantMode === "multiple" ? "products-mode-icon-selected" : ""}`} aria-hidden="true"><Layers size={18} /></span>
              <span className="products-mode-copy"><strong>Varias opciones{variantMode === "multiple" && <span className="products-mode-state products-mode-state-selected">Seleccionado</span>}</strong><small>Para artículos con múltiples atributos como talla o color (ej. Playeras, Calzado).</small></span>
              {variantMode === "multiple" && <CheckCircle2 className="products-mode-selected-check" size={20} aria-hidden="true" />}
            </label>
          </fieldset>
          <section className={`products-data-section ${variantMode === "multiple" ? "products-data-multiple" : ""}`}>
          <div className="products-section-heading products-main-heading">
            <div>
              <div className={`products-main-heading-title ${variantMode === "multiple" ? "products-main-heading-multiple" : ""}`}><span className="products-section-icon">{variantMode === "multiple" ? <Info size={18} aria-hidden="true" /> : <Archive size={18} aria-hidden="true" />}</span><h2>{variantMode === "multiple" ? <><span className="data-heading-desktop">Datos generales del producto</span><span className="data-heading-mobile">Datos generales</span></> : "Datos principales"}</h2></div>
              <p>{variantMode === "multiple" ? "Información base compartida por todas las variantes en catálogo." : "Campos requeridos para habilitar el artículo en el punto de venta."}</p>
            </div>
            <span>{variantMode === "multiple" ? "Paso 1 de 2" : "Requerido"}</span>
          </div>
          <div className="products-form-grid">
            <label>
              <span className="products-field-label">Nombre del producto <em>*</em></span>
                <input
                  aria-label="Nombre del producto"
                  value={draft.name}
                  placeholder="ej: Cuaderno Profesional Raya 100 Hojas"
                  title={variantMode === "multiple" ? "El nombre visible en recibos, catálogo y búsqueda rápida de terminal." : undefined}
                onChange={(event) => update("name", event.target.value)}
                aria-invalid={showValidation && !draft.name.trim()}
                aria-describedby="product-name-error"
                required
              />
              {variantMode === "multiple" && <small>El nombre visible en recibos, catálogo y búsqueda rápida de terminal.</small>}
              {showValidation && <FieldError message={firstError(validationErrors, "El nombre")} id="product-name-error" />}
            </label>
            <label>
              <span className="products-field-label">Categoría <em>*</em></span>
              <select
                aria-label="Categoría"
                value={draft.categoryId}
                onChange={(event) => update("categoryId", event.target.value)}
                aria-invalid={showValidation && !draft.categoryId}
                aria-describedby="product-category-error"
                required
              >
                <option value="">Selecciona una categoría...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {variantMode === "multiple" && <small>Agrupación contable e inventario en punto de venta.</small>}
              {showValidation && <FieldError message={firstError(validationErrors, "Selecciona una categoría")} id="product-category-error" />}
            </label>
            {variantMode === "single" && draft.variants[0] && (
              <label className="products-sku-field">
                <span className="products-field-label">Código SKU <em>*</em></span>
                <input
                  aria-label="SKU"
                  value={draft.variants[0].sku}
                  placeholder="EJ: PAP-CUA-100R"
                  onChange={(event) => updateVariant(0, "sku", event.target.value)}
                  aria-invalid={showValidation && Boolean(firstError(validationErrors, "Variante 1: el SKU"))}
                  aria-describedby="variant-0-sku-desktop"
                />
                {showValidation && <FieldError message={firstError(validationErrors, "Variante 1: el SKU")} id="variant-0-sku-desktop" />}
                <small>Identificador único ingresado manualmente.</small>
              </label>
            )}
            {variantMode === "multiple" && (
              <>
                <label>
                  <span className="products-field-label">Ubicación en tienda <small className="products-optional-inline">(Opcional)</small></span>
                  <input value={draft.location} onChange={(event) => update("location", event.target.value)} placeholder="Ej. Pasillo 2, Anaquel C-01" />
                  <small>Referencia física para el personal de bodega y piso de venta.</small>
                </label>
                <label className="products-upload">
                  <span className="products-field-label">Fotografía referencial <small className="products-optional-inline">(Opcional)</small></span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={upload} />
                  <span><ImagePlus size={18} /> {preview ? "Cambiar imagen" : "Seleccionar imagen"}</span>
                  <small>Imagen genérica visible en la cuadrícula de cobro de terminales.</small>
                </label>
              </>
            )}
          </div>
          {variantMode === "single" && draft.variants[0] && (
            <div className="products-simple-values">
              <div className="products-value-grid">
                <label>
                  <span className="products-field-label">Costo <em>*</em></span>
                  <span className="products-money-input"><span aria-hidden="true">$</span><input aria-label="Costo" type="number" min="0" step="0.01" placeholder="28.50" value={draft.variants[0].cost} onChange={(event) => updateVariant(0, "cost", event.target.value)} /><small>MXN</small></span>
                  <small>Costo directo pagado.</small>
                </label>
                <label>
                  <span className="products-field-label">Precio de venta <em>*</em></span>
                  <span className="products-money-input products-money-sale"><span aria-hidden="true">$</span><input aria-label="Precio de venta" type="number" min="0" step="0.01" placeholder="45.00" value={draft.variants[0].price} onChange={(event) => updateVariant(0, "price", event.target.value)} /><small>MXN</small></span>
                  <small className="products-sale-price-helper"><Tag size={14} aria-hidden="true" /> Precio final al público</small>
                </label>
                <label>
                  <span className="products-field-label">Existencia inicial <em>*</em></span>
                  <span className="products-stock-input"><input aria-label="Existencia inicial" type="number" min="0" step="0.01" placeholder="50.00" value={draft.variants[0].stock} readOnly={Boolean(isEdit && draft.variants[0].id)} onChange={(event) => updateVariant(0, "stock", event.target.value)} /><small>pzas</small><span className="products-stock-stepper"><button type="button" aria-label="Disminuir existencia" disabled={Boolean(isEdit && draft.variants[0].id)} onClick={() => updateVariant(0, "stock", String(Math.max(0, (Number(draft.variants[0].stock) || 0) - 1)))}>−</button><button type="button" aria-label="Aumentar existencia" disabled={Boolean(isEdit && draft.variants[0].id)} onClick={() => updateVariant(0, "stock", String((Number(draft.variants[0].stock) || 0) + 1))}>+</button></span></span>
                  <small>{isEdit ? "Stock físico de sólo lectura" : "Hasta 2 decimales permitidos."}</small>
                </label>
              </div>
            </div>
          )}
          </section>
          {variantMode === "single" && (
            <details className="products-optional-section">
              <summary>
              <span>
                  <SlidersHorizontal className="products-optional-icon" size={20} aria-hidden="true" />
                  <span className="products-optional-title"><strong>Información opcional</strong><span className="products-optional-count">5 campos opcionales</span></span>
                  <small>Fotografía, código de barras, ubicación en anaquel y precio promocional.</small>
                </span>
                <ChevronDown size={18} aria-hidden="true" />
              </summary>
              <div className="products-extra-grid">
                <label>
                  Código de barras
                  <input aria-label="Código de barras" value={draft.variants[0]?.barcode ?? ""} onChange={(event) => updateVariant(0, "barcode", event.target.value)} />
                </label>
                <label>
                  Ubicación en tienda
                  <input value={draft.location} onChange={(event) => update("location", event.target.value)} placeholder="Ej. Pasillo 2, Anaquel C-01" />
                </label>
                <label>
                  Precio promocional
                  <input aria-label="Precio promocional" type="number" min="0" step="0.01" value={draft.variants[0]?.promoPrice ?? ""} onChange={(event) => updateVariant(0, "promoPrice", event.target.value)} />
                </label>
                <label>
                  Alerta de existencia baja
                  <input aria-label="Alerta de existencia baja" type="number" min="0" step="any" value={draft.variants[0]?.lowStockThreshold ?? "1"} onChange={(event) => updateVariant(0, "lowStockThreshold", event.target.value)} />
                </label>
                <label className="products-upload">
                  Fotografía del producto
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={upload} />
                  <span><ImagePlus size={18} /> {preview ? "Cambiar imagen" : "Seleccionar imagen"}</span>
                </label>
                {preview && <img className="products-preview" src={preview} alt="Vista previa de la foto del producto" />}
              </div>
            </details>
          )}
          {variantMode === "multiple" && (
            <>
              <div className="variants-heading">
                <div>
                  <h3><span className="variants-heading-icon"><Layers size={17} aria-hidden="true" /></span><span className="variant-heading-desktop">Variantes del producto</span><span className="variant-heading-mobile">Variantes</span></h3>
                  <p>Agrega cada combinación vendible con su SKU, precio y existencia inicial.</p>
                </div>
                <button
                  className="button products-variant-add"
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      variants: [...current.variants, emptyVariant()],
                    }))
                  }
                >
                  <Plus size={16} /> <span className="variant-add-desktop">Agregar variante</span><span className="variant-add-mobile">Agregar</span>
                </button>
              </div>
            </>
          )}
          {message && (
            <div className="products-form-alert" role="alert">
              <CircleAlert size={18} aria-hidden="true" />
              <span>{message}</span>
            </div>
          )}
          {variantMode === "multiple" && <div className="variants-table-wrap">
            <table className="variants-table" role="presentation">
              <thead>
                <tr>
                  <th>Talla</th>
                  <th>Color</th>
                  <th>SKU manual *</th>
                  <th>Cód. barras</th>
                  <th>Costo *</th>
                  <th>Precio *</th>
                  <th>Promo</th>
                  <th>Existencia *</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {draft.variants.map((variant, index) => variantTableRow(variant, index))}
              </tbody>
            </table>
          </div>}
          {variantMode === "multiple" && <div className="variant-cards">
            {draft.variants.map((variant, index) => (
              <details
                className="variant-card"
                key={variant.id ?? index}
                open={expandedVariantIndexes.has(index)}
                onToggle={(event) => {
                  const isOpen = event.currentTarget.open;
                  setExpandedVariantIndexes((current) => {
                    if (current.has(index) === isOpen) return current;
                    const next = new Set(current);
                    if (isOpen) next.add(index);
                    else next.delete(index);
                    return next;
                  });
                }}
              >
                <summary>
                  <span>Variante {index + 1}</span>
                  {promoIsInvalid(variant) && <span className="variant-validation-badge">Error en precio</span>}
                  <ChevronDown size={18} aria-hidden="true" />
                </summary>
                {variantFields(variant, index, true)}
                {promoIsInvalid(variant) && <p className="variant-mobile-error" role="alert">Variante {variant.color} / {variant.size}: Precio promocional no puede ser mayor al precio normal.</p>}
              </details>
            ))}
          </div>}
          {variantMode === "multiple" && (
            <div className="variants-summary" aria-live="polite">
              <span className="variants-summary-main"><strong>{configuredVariantCount} {configuredVariantCount === 1 ? "variante válida" : "variantes válidas"}</strong><span aria-hidden="true">•</span><span>{draft.variants.reduce((total, variant) => total + (Number(variant.stock) || 0), 0)} unidades de existencia</span>{correctionCount > 0 && <span className="variants-correction-count"><CircleAlert size={15} aria-hidden="true"/>{correctionCount} {correctionCount === 1 ? "variante requiere corrección" : "variantes requieren corrección"}</span>}</span>
              <span className="variants-currency-label">Moneda base: <strong>MXN</strong></span>
            </div>
          )}
          {isEdit && (
            <label className="reason-field">
              Motivo de cambios de costo, precio o promoción
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ej. Actualización de proveedor"
              />
            </label>
          )}
          {isEdit && (
            <p className="products-contract-note">
              Disponibles = stock en este contrato; no se reportan apartados ni
              movimientos independientes en este formulario.
            </p>
          )}
        </div>
        <footer className="products-modal-actions">
          {variantMode === "multiple" && (
            <p className="products-variant-footer-note"><ShieldCheck size={18} aria-hidden="true" /><span>Los cambios impactarán de inmediato en el catálogo de todas las terminales asociadas.</span></p>
          )}
          <button
            className="button button-quiet"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Cancelar
          </button>
          <button
            className={`button products-primary ${variantMode === "multiple" ? "products-variant-save" : ""}`}
            type="submit"
            disabled={saving || (variantMode === "multiple" && draft.variants.some(promoIsInvalid))}
          >
            {saving && (
              <LoaderCircle className="spin" size={17} aria-hidden="true" />
            )}
            {!saving && <CheckCircle2 size={18} aria-hidden="true" />}
            {saving ? "Guardando…" : variantMode === "multiple" ? "Guardar producto con variantes" : "Guardar producto"}
          </button>
        </footer>
      </form>
    </section>
  );
}

function ProductDetailDialog({
  product,
  canMutate,
  onClose,
  onEdit,
  onArchived,
}: {
  product: ProductGroup;
  canMutate: boolean;
  onClose: () => void;
  onEdit: () => void;
  onArchived: () => void;
}) {
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  useEffect(() => {
    void Promise.all([
      fetch(`/api/products/${product.id}`).then(readResponse),
      fetch(`/api/products/${product.id}/history`).then(readResponse),
    ])
      .then(([nextDetail, nextHistory]) => {
        setDetail(normalizeDetail(nextDetail));
        setHistory(nextHistory);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "No se pudo cargar el detalle.",
        ),
      )
      .finally(() => setLoading(false));
  }, [product.id]);
  async function archive() {
    if (
      archiving ||
      !window.confirm(
        `¿Archivar ${product.name}? El producto no se eliminará físicamente.`,
      )
    )
      return;
    setArchiving(true);
    try {
      await readResponse(
        await fetch(`/api/products/${product.id}`, { method: "DELETE" }),
      );
      onArchived();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo archivar el producto.",
      );
      setArchiving(false);
    }
  }
  return (
    <Modal
      title={`Detalle de ${product.name}`}
      className="product-detail-dialog"
      onClose={onClose}
    >
      <div className="product-detail-body">
        {loading ? (
          <p role="status">Cargando detalle…</p>
        ) : error ? (
          <div className="products-alert" role="alert">
            <CircleAlert size={18} />
            {error}
          </div>
        ) : (
          detail && (
            <>
              <div className="detail-intro">
                <ProductImage path={detail.photoPath} name={detail.name} />
                <div>
                  <p className="products-kicker">
                    {product.category?.name ?? "Producto"}
                  </p>
                  <h3 title={detail.name}>{detail.name}</h3>
                  <p>{detail.location || "Sin ubicación"}</p>
                </div>
              </div>
              <p className="detail-contract-note">
                Existencias físicas respaldadas por <strong>stock</strong>.
                Disponibles = stock; no se reportan apartados ni kardex
                independiente.
              </p>
              <h3>Variantes y existencias</h3>
              <div className="detail-variants">
                {detail.variants.map((variant) => (
                  <div
                    className="detail-variant"
                    key={variant.id ?? variant.sku}
                  >
                    <div>
                      <strong>{variant.sku}</strong>
                      <span>
                        {[variant.size, variant.color]
                          .filter(Boolean)
                          .join(" / ") || "Presentación única"}
                      </span>
                    </div>
                    <div>
                      <span>Stock físico</span>
                      <strong>{variant.stock}</strong>
                    </div>
                    <div>
                      <span>Disponibles</span>
                      <strong>{variant.stock}</strong>
                    </div>
                    <div>
                      <span>Precio aplicado</span>
                      <strong>
                        {currency.format(
                          amount(
                            variant.promoPrice !== ""
                              ? variant.promoPrice
                              : variant.price,
                          ),
                        )}
                      </strong>
                      {canMutate && (
                        <small>
                          Costo {currency.format(amount(variant.cost))}
                        </small>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <h3>Historial de costo y precio</h3>
              <div className="detail-history">
                {history.length ? (
                  history.map((item, index) => (
                    <div key={`${item.createdAt}-${index}`}>
                      <strong>{historyLabel(item.field)}</strong>
                      <span>
                        {item.oldValue ?? "—"} → {item.newValue ?? "—"}
                      </span>
                      <small>
                        {item.reason || "Sin motivo"} ·{" "}
                        {item.user?.name || "Usuario"} ·{" "}
                        {new Date(item.createdAt).toLocaleDateString("es-MX")}
                      </small>
                    </div>
                  ))
                ) : (
                  <p>
                    No hay cambios de costo, precio o promoción registrados.
                  </p>
                )}
              </div>
            </>
          )
        )}
      </div>
      <footer className="products-modal-actions">
        {canMutate && (
          <>
            <button
              className="button button-danger"
              type="button"
              onClick={() => void archive()}
              disabled={archiving}
            >
              <Archive size={16} />
              {archiving ? "Archivando…" : "Archivar"}
            </button>
            <button
              className="button products-primary"
              type="button"
              onClick={onEdit}
              disabled={archiving}
            >
              <Pencil size={16} /> Editar
            </button>
          </>
        )}
      </footer>
    </Modal>
  );
}

function historyLabel(field: string) {
  return (
    { COST: "Costo", PRICE: "Precio", PROMO_PRICE: "Promoción" }[field] ?? field
  );
}

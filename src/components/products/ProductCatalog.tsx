"use client";

import {
  ArrowLeft,
  Archive,
  ChevronDown,
  CircleAlert,
  CheckCircle2,
  ImagePlus,
  Info,
  Layers,
  LoaderCircle,
  PackageOpen,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
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

export function ProductCatalog({ role }: { role: Role }) {
  const canMutate = role !== "SELLER";
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("all");
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const productLoadId = useRef(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<"form" | "detail" | null>(null);
  const [selected, setSelected] = useState<ProductGroup | null>(null);
  const [editing, setEditing] = useState<ProductDetail | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  async function loadProducts() {
    const loadId = ++productLoadId.current;
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (categoryId) params.set("categoryId", categoryId);
    if (status !== "all") params.set("status", status);
    if (available) params.set("available", "true");
    try {
      const nextRows = await readResponse(await fetch(`/api/products?${params}`));
      if (loadId === productLoadId.current) setRows(nextRows);
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
    void loadProducts();
  }, [query, categoryId, status, available]);
  useEffect(() => {
    const syncSearch = (event: Event) => {
      const value = (event as CustomEvent<string>).detail;
      if (typeof value === "string") setQuery(value);
    };
    window.addEventListener("products:search", syncSearch);
    return () => window.removeEventListener("products:search", syncSearch);
  }, []);

  function closeDialog() {
    setDialog(null);
    setEditing(null);
    window.setTimeout(() => {
      if (triggerRef.current?.isConnected) {
        triggerRef.current.focus();
        return;
      }
      document.querySelector<HTMLButtonElement>('.products-page > .products-heading .products-primary')?.focus();
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
  }

  const products = groupProductRows(rows);
  return (
    <section
      className={`products-page ${dialog === "form" ? "products-editor-page" : ""}`}
      aria-labelledby={dialog === "form" ? "products-editor-title" : "products-title"}
    >
      {dialog !== "form" && (
        <>
      <header className="products-heading">
        <div>
          <p className="products-kicker">Inventario</p>
          <h1 id="products-title">Catálogo de productos</h1>
          <p>Consulta tus artículos, existencias y precios por negocio.</p>
        </div>
        {canMutate && (
          <button
            className="button products-primary"
            type="button"
            onClick={() => openForm()}
          >
            <Plus size={18} aria-hidden="true" /> Nuevo producto
          </button>
        )}
      </header>
      <div
        className="products-filters"
        role="region"
        aria-label="Filtros de productos"
      >
        <label className="products-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Buscar productos</span>
          <input
            aria-label="Buscar productos"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, SKU o ubicación"
          />
        </label>
        <label>
          <span>Categoría</span>
          <select
            aria-label="Filtrar por categoría"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Estado</span>
          <select
            aria-label="Filtrar por estado"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">Todos</option>
            <option value="low">Por agotarse</option>
            <option value="out">Agotado</option>
          </select>
        </label>
        <label className="products-check">
          <input
            type="checkbox"
            checked={available}
            onChange={(event) => setAvailable(event.target.checked)}
          />{" "}
          Sólo disponibles
        </label>
        <button
          className="button button-quiet"
          type="button"
          onClick={clearFilters}
        >
          Limpiar filtros
        </button>
      </div>
      <div className="products-feedback" aria-live="polite">
        {notice}
      </div>
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
      ) : products.length === 0 ? (
        <div className="products-empty">
          <PackageOpen size={38} aria-hidden="true" />
          <h2>No encontramos productos</h2>
          <p>Prueba otra búsqueda o limpia los filtros.</p>
        </div>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              canMutate={canMutate}
              onOpen={() => openDetail(product)}
              onEdit={() => openForm(product)}
            />
          ))}
        </div>
      )}
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
            void loadProducts();
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
}: {
  product: ProductGroup;
  canMutate: boolean;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const first = product.variants[0];
  return (
    <article className="product-card">
      <button
        className="product-card-main"
        type="button"
        onClick={onOpen}
        aria-label={`Ver detalle de ${product.name}`}
      >
        <ProductImage path={product.photoPath} name={product.name} />
        <div className="product-card-body">
          <div className="product-card-top">
            <StockBadge state={product.state} />
            <span>
              {product.variants.length}{" "}
              {product.variants.length === 1 ? "variante" : "variantes"}
            </span>
          </div>
          <h2 title={product.name}>{product.name}</h2>
          <p
            className="product-category"
            title={product.category?.name ?? "Sin categoría"}
          >
            {product.category?.name ?? "Sin categoría"}
          </p>
          <p className="product-sku" title={`SKU ${first.sku}`}>
            SKU {first.sku}
            {product.variants.length > 1
              ? ` · +${product.variants.length - 1}`
              : ""}
          </p>
          <div className="product-meta">
            <span title={product.location}>
              Ubicación <strong>{product.location}</strong>
            </span>
            <span>
              Existencias <strong>{product.stock}</strong>
            </span>
          </div>
          <div className="product-price">
            <strong>
              {currency.format(amount(first.promoPrice ?? first.price))}
            </strong>
            {first.promoPrice != null && (
              <del>{currency.format(amount(first.price))}</del>
            )}
            <small>Precio aplicado</small>
          </div>
        </div>
      </button>
      <div className="product-card-actions">
        {canMutate && (
          <button
            type="button"
            data-product-edit={product.id}
            onClick={onEdit}
          >
            <Pencil size={16} aria-hidden="true" /> Editar
          </button>
        )}
        <button type="button" onClick={onOpen}>
          Ver detalle
        </button>
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
        ? "En stock"
        : state === "low"
          ? "Por agotarse"
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
          aria-invalid={showValidation && Boolean(firstError(validationErrors, `Variante ${index + 1}: promoción`))}
          aria-describedby={`variant-${index}-promo-${mobile ? "mobile" : "desktop"}`}
        />
        {showValidation && <FieldError message={firstError(validationErrors, `Variante ${index + 1}: promoción`)} id={`variant-${index}-promo-${mobile ? "mobile" : "desktop"}`} />}
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
          onClick={() =>
            setDraft((current) => ({
              ...current,
              variants: current.variants.filter((_, item) => item !== index),
            }))
          }
        >
          <Trash2 size={16} /> Eliminar variante
        </button>
      )}
    </div>
  );
  const variantTableRow = (variant: DraftVariant, index: number) => {
    const errorId = (key: string) => `variant-${index}-${key}-desktop`;
    const fieldError = (label: string) => firstError(validationErrors, `Variante ${index + 1}: ${label}`);
    return (
      <tr key={variant.id ?? index}>
        <td><input aria-label={`Talla variante ${index + 1}`} value={variant.size} onChange={(event) => updateVariant(index, "size", event.target.value)} /></td>
        <td><input aria-label={`Color variante ${index + 1}`} value={variant.color} onChange={(event) => updateVariant(index, "color", event.target.value)} /></td>
        <td>
          <input aria-label={`SKU variante ${index + 1}`} value={variant.sku} onChange={(event) => updateVariant(index, "sku", event.target.value)} aria-invalid={showValidation && Boolean(fieldError("el SKU"))} aria-describedby={errorId("sku")} />
          {showValidation && <FieldError message={fieldError("el SKU")} id={errorId("sku")} />}
        </td>
        <td>
          <input aria-label={`Barcode variante ${index + 1}`} value={variant.barcode} onChange={(event) => updateVariant(index, "barcode", event.target.value)} aria-invalid={showValidation && Boolean(fieldError("el barcode"))} aria-describedby={errorId("barcode")} />
          {showValidation && <FieldError message={fieldError("el barcode")} id={errorId("barcode")} />}
        </td>
        <td>
          <div className="products-variant-money"><span>$</span><input type="number" min="0" step="any" aria-label={`Costo variante ${index + 1}`} value={variant.cost} onChange={(event) => updateVariant(index, "cost", event.target.value)} aria-invalid={showValidation && Boolean(fieldError("costo"))} aria-describedby={errorId("cost")} /></div>
          {showValidation && <FieldError message={fieldError("costo")} id={errorId("cost")} />}
        </td>
        <td>
          <div className="products-variant-money"><span>$</span><input type="number" min="0" step="any" aria-label={`Precio variante ${index + 1}`} value={variant.price} onChange={(event) => updateVariant(index, "price", event.target.value)} aria-invalid={showValidation && Boolean(fieldError("precio"))} aria-describedby={errorId("price")} /></div>
          {showValidation && <FieldError message={fieldError("precio")} id={errorId("price")} />}
        </td>
        <td>
          <div className="products-variant-money"><span>$</span><input type="number" min="0" step="any" aria-label={`Promoción variante ${index + 1}`} value={variant.promoPrice} onChange={(event) => updateVariant(index, "promoPrice", event.target.value)} aria-invalid={showValidation && Boolean(fieldError("promoción"))} aria-describedby={errorId("promo")} /></div>
          {showValidation && <FieldError message={fieldError("promoción")} id={errorId("promo")} />}
        </td>
        <td>
          <input type="number" min="0" step="any" aria-label={`Stock variante ${index + 1}`} value={variant.stock} readOnly={Boolean(isEdit && variant.id)} onChange={(event) => updateVariant(index, "stock", event.target.value)} aria-invalid={showValidation && Boolean(fieldError("stock"))} aria-describedby={errorId("stock")} />
          {isEdit && variant.id && <small>Solo lectura</small>}
        </td>
        <td><input type="number" min="0" step="any" aria-label={`Umbral variante ${index + 1}`} value={variant.lowStockThreshold} onChange={(event) => updateVariant(index, "lowStockThreshold", event.target.value)} aria-invalid={showValidation && Boolean(fieldError("umbral"))} aria-describedby={errorId("threshold")} />
          {showValidation && <FieldError message={fieldError("umbral")} id={errorId("threshold")} />}
        </td>
        <td className="variant-delete-cell"><button type="button" aria-label={`Eliminar variante ${index + 1}`} onClick={() => setDraft((current) => ({ ...current, variants: current.variants.filter((_, item) => item !== index) }))} disabled={draft.variants.length === 1}><Trash2 size={16} /></button></td>
      </tr>
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
              <p className="products-editor-breadcrumb">Productos <span aria-hidden="true">›</span> {isEdit ? "Editar producto" : "Nuevo producto"}</p>
              <div className="products-editor-title-line"><h1 id="products-editor-title">{isEdit ? "Editar producto" : variantMode === "multiple" ? <><span className="editor-title-desktop">Crear Producto con Variantes</span><span className="editor-title-mobile">Crear Producto</span></> : "Crear Producto"}</h1>{!isEdit && variantMode === "single" && <span className="products-title-context">Mostrador directo</span>}</div>
              <p>{variantMode === "multiple" ? <><span className="editor-copy-desktop">Control manual explícito de combinaciones, códigos SKU únicos y existencia inicial en tienda.</span><span className="editor-copy-mobile">Varias opciones: Artículos con tallas o colores (ej. Ropa, Calzado).</span></> : "Registra artículos con precio neto final y disponibilidad inmediata para venta física."}</p>
            </div>
            <span className="products-editor-status">{variantMode === "multiple" ? "Validación de códigos en tiempo real" : "Captura Rápida de Inventario"}</span>
          </div>
          <fieldset className="variant-mode">
            <legend>Presentación</legend>
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
                  <th>Stock</th>
                  <th>Umbral</th>
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
                open={index === 0}
              >
                <summary>
                  <span>Variante {index + 1}</span>
                  <ChevronDown size={18} aria-hidden="true" />
                </summary>
                {variantFields(variant, index, true)}
              </details>
            ))}
          </div>}
          {variantMode === "multiple" && (
            <div className="variants-summary" aria-live="polite">
              <strong>
                {draft.variants.filter((variant) =>
                  variant.sku.trim() && variant.cost !== "" && variant.price !== "",
                ).length} variantes configuradas
              </strong>
              <span aria-hidden="true">•</span>
              <span>{draft.variants.reduce((total, variant) => total + (Number(variant.stock) || 0), 0)} unidades de existencia inicial total</span>
              <small>Moneda base: MXN (Neto)</small>
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
            disabled={saving}
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

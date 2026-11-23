"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { formatPrice, type Product } from "@/data/products";
import { AdminPageHeader } from "./admin-page-header";

type SaleItem = {
  id: string;
  producto_id: string | null;
  nombre_producto: string;
  precio_unitario: number | string;
  cantidad: number;
  subtotal: number | string;
};

type Sale = {
  id: string;
  numero_venta: string;
  metodo_pago: "Efectivo" | "QR";
  total: number | string;
  fecha_venta: string;
  notas: string;
  creado_en: string;
  detalles_venta: SaleItem[];
};

type SelectedItem = { productoId: string; cantidad: number };

function localDateInput(value?: string) {
  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function saleSummary(sale: Sale) {
  if (!sale.detalles_venta.length) return "Sin productos registrados";
  return sale.detalles_venta.map((item) => `${item.cantidad} × ${item.nombre_producto}`).join(", ");
}

export function AdminSales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [salesResponse, productsResponse] = await Promise.all([
        fetch("/api/admin/sales", { cache: "no-store" }),
        fetch("/api/admin/products", { cache: "no-store" }),
      ]);
      const salesPayload = await salesResponse.json() as { sales?: Sale[]; error?: string };
      const productsPayload = await productsResponse.json() as { products?: Product[]; error?: string };
      if (!salesResponse.ok) throw new Error(salesPayload.error || "No se pudieron cargar las ventas.");
      if (!productsResponse.ok) throw new Error(productsPayload.error || "No se pudieron cargar los productos.");
      setSales(salesPayload.sales ?? []);
      setProducts(productsPayload.products ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar el módulo de ventas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const selectedIds = useMemo(() => new Set(selectedItems.map((item) => item.productoId)), [selectedItems]);
  const selectedItemByProduct = useMemo(() => new Map(selectedItems.map((item) => [item.productoId, item])), [selectedItems]);
  const calculatedTotal = useMemo(() => selectedItems.reduce((sum, item) => {
    const product = productById.get(item.productoId);
    return sum + (product?.price ?? 0) * item.cantidad;
  }, 0), [productById, selectedItems]);

  const visibleSales = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    if (!normalized) return sales;
    return sales.filter((sale) => `${sale.numero_venta} ${sale.metodo_pago} ${saleSummary(sale)}`.toLocaleLowerCase("es").includes(normalized));
  }, [query, sales]);

  const total = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const today = new Date().toDateString();
  const todaySales = sales.filter((sale) => new Date(sale.fecha_venta).toDateString() === today);

  function openCreate() {
    setEditing(null);
    setSelectedItems([]);
    setError("");
    setModalOpen(true);
  }

  function openEdit(sale: Sale) {
    if (sale.detalles_venta.some((item) => !item.producto_id)) {
      setError("Esta venta contiene un producto eliminado y se conserva solo como historial; no puede editarse.");
      return;
    }
    setEditing(sale);
    setSelectedItems(sale.detalles_venta.map((item) => ({ productoId: item.producto_id as string, cantidad: item.cantidad })));
    setError("");
    setModalOpen(true);
  }

  function toggleProduct(productId: string) {
    setSelectedItems((current) => current.some((item) => item.productoId === productId)
      ? current.filter((item) => item.productoId !== productId)
      : [...current, { productoId: productId, cantidad: 1 }]);
  }

  function updateQuantity(productId: string, cantidad: number) {
    setSelectedItems((current) => current.map((item) => item.productoId === productId
      ? { ...item, cantidad: Math.min(999, Math.max(1, cantidad || 1)) }
      : item));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedItems.length) {
      setError("Selecciona al menos un producto para registrar la venta.");
      return;
    }
    setSaving(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/admin/sales", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id,
          metodo_pago: values.metodo_pago,
          fecha_venta: values.fecha_venta,
          notas: values.notas,
          items: selectedItems.map((item) => ({ producto_id: item.productoId, cantidad: item.cantidad })),
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar la venta.");
      setModalOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar la venta.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(sale: Sale) {
    if (!window.confirm(`¿Eliminar la venta ${sale.numero_venta}? Esta acción no se puede deshacer.`)) return;
    setError("");
    const response = await fetch("/api/admin/sales", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sale.id }),
    });
    const payload = await response.json() as { error?: string };
    if (!response.ok) {
      setError(payload.error || "No se pudo eliminar la venta.");
      return;
    }
    await load();
  }

  return (
    <>
      <AdminPageHeader eyebrow="Registro comercial" title="Ventas" description="Selecciona los productos vendidos; sus precios y cantidades determinan el total automáticamente." action="Nueva venta" onAction={openCreate} />
      <section className="admin-stats admin-stats--three" aria-label="Resumen de ventas">
        <article className="admin-stat admin-stat--purple"><span>Ingresos registrados</span><strong>{formatPrice(total)}</strong><small>{sales.length} ventas</small><i>VE</i></article>
        <article><span>Ventas de hoy</span><strong>{todaySales.length}</strong><small>{formatPrice(todaySales.reduce((sum, sale) => sum + Number(sale.total), 0))}</small><i>HO</i></article>
        <article><span>Promedio</span><strong>{formatPrice(sales.length ? total / sales.length : 0)}</strong><small>Por venta</small><i>PR</i></article>
      </section>
      <section className="admin-card">
        <div className="admin-card__header admin-card__header--toolbar">
          <div><p>Registro manual</p><h2>Historial de ventas</h2></div>
          <div className="admin-table-tools"><input type="search" placeholder="Buscar venta o producto..." value={query} onChange={(event) => setQuery(event.target.value)} /><button type="button" onClick={() => void load()}>Actualizar</button></div>
        </div>
        {loading ? <div className="admin-empty"><span>VE</span><h3>Cargando ventas…</h3></div> : visibleSales.length === 0 ? <div className="admin-empty"><span>＋</span><h3>No hay ventas registradas</h3><p>Usa “Nueva venta” para anotar la primera.</p></div> : (
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Venta</th><th>Fecha</th><th>Productos</th><th>Unidades</th><th>Método</th><th>Total</th><th>Acciones</th></tr></thead><tbody>
            {visibleSales.map((sale) => <tr key={sale.id}><td><strong>{sale.numero_venta}</strong></td><td>{new Intl.DateTimeFormat("es-BO", { dateStyle: "short", timeStyle: "short" }).format(new Date(sale.fecha_venta))}</td><td className="admin-sale-summary">{saleSummary(sale)}</td><td>{sale.detalles_venta.reduce((sum, item) => sum + item.cantidad, 0)}</td><td>{sale.metodo_pago}</td><td><strong>{formatPrice(Number(sale.total))}</strong></td><td><div className="admin-row-actions"><button type="button" onClick={() => openEdit(sale)}>Editar</button><button className="is-danger" type="button" onClick={() => void remove(sale)}>Eliminar</button></div></td></tr>)}
          </tbody></table></div>
        )}
      </section>
      {error && !modalOpen && <p className="admin-inline-error" role="alert">{error}</p>}

      {modalOpen && <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="sale-form-title">
        <button className="admin-modal__backdrop" type="button" aria-label="Cerrar" onClick={() => setModalOpen(false)} />
        <div className="admin-modal__panel admin-modal__panel--sale"><button className="admin-modal__close" type="button" aria-label="Cerrar" onClick={() => setModalOpen(false)}>×</button><p className="eyebrow">Registro comercial</p><h2 id="sale-form-title">{editing ? "Editar venta" : "Nueva venta"}</h2>
          <form className="admin-form" onSubmit={save} key={editing?.id ?? "new-sale"}>
            <label>Método de pago<select name="metodo_pago" defaultValue={editing?.metodo_pago ?? "Efectivo"}><option>Efectivo</option><option>QR</option></select></label>
            <label>Fecha y hora<input name="fecha_venta" type="datetime-local" defaultValue={localDateInput(editing?.fecha_venta)} required /></label>

            <fieldset className="sale-product-selector admin-form__wide">
              <legend className="sr-only">Productos y cantidades</legend>
              <div className="sale-product-selector__header">
                <div><strong>Productos y cantidades</strong></div>
                <span className="sale-product-selector__count" aria-live="polite">{selectedItems.length} {selectedItems.length === 1 ? "seleccionado" : "seleccionados"}</span>
              </div>
              <div className="sale-product-grid">
                {products.map((product) => {
                  const selectedItem = selectedItemByProduct.get(product.id);
                  const selected = selectedIds.has(product.id);
                  const quantityId = `sale-quantity-${product.id}`;
                  return <div className={`sale-product-option${selected ? " is-selected" : ""}`} key={product.id}>
                    <label className="sale-product-option__main">
                      <input type="checkbox" checked={selected} onChange={() => toggleProduct(product.id)} />
                      <span><strong>{product.name}</strong><small>{formatPrice(product.price)} c/u</small></span>
                    </label>
                    <label className="sale-product-option__quantity" htmlFor={quantityId}>
                      <span>Cant.</span>
                      <input id={quantityId} type="number" min="1" max="999" step="1" inputMode="numeric" value={selectedItem?.cantidad ?? 1} disabled={!selected} onChange={(event) => updateQuantity(product.id, Number(event.target.value))} />
                    </label>
                    <strong className="sale-product-option__subtotal">{selectedItem ? formatPrice(product.price * selectedItem.cantidad) : "—"}</strong>
                  </div>;
                })}
              </div>
            </fieldset>

            <div className="sale-total admin-form__wide"><span>Total calculado</span><strong>{formatPrice(calculatedTotal)}</strong><small>Se verificará nuevamente con los precios guardados en la base de datos.</small></div>
            <label className="admin-form__wide">Notas<textarea name="notas" rows={3} maxLength={1000} defaultValue={editing?.notas ?? ""} /></label>
            {error && <p className="admin-inline-error admin-form__wide" role="alert">{error}</p>}
            <button className="button button--primary admin-form__wide" type="submit" disabled={saving || selectedItems.length === 0}>{saving ? "Guardando…" : "Guardar venta"}</button>
          </form>
        </div>
      </div>}
    </>
  );
}

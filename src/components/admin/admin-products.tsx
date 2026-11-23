"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { formatPrice, type Product } from "@/data/products";
import { productImage } from "@/data/product-images";
import { announceProductAvailability } from "@/lib/availability-store";
import { AdminPageHeader } from "./admin-page-header";

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [savingForm, setSavingForm] = useState(false);
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/products", { cache: "no-store" });
      const payload = await response.json() as { products?: Product[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo cargar el catálogo.");
      setProducts(payload.products ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar el catálogo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { queueMicrotask(() => void loadProducts()); }, [loadProducts]);

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    if (!normalized) return products;
    return products.filter((product) => `${product.name} ${product.id} ${product.category}`.toLocaleLowerCase("es").includes(normalized));
  }, [products, query]);

  async function updateBoolean(product: Product, field: "available" | "active", value: boolean) {
    setSavingId(`${product.id}-${field}`);
    setError("");
    const previous = product;
    const next = field === "available"
      ? { ...product, availability: value ? "available" as const : "unavailable" as const }
      : { ...product, active: value };
    setProducts((current) => current.map((item) => item.id === product.id ? next : item));
    try {
      const response = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo actualizar el producto.");
      if (field === "available") announceProductAvailability(product.id, next.availability);
    } catch (caught) {
      setProducts((current) => current.map((item) => item.id === product.id ? previous : item));
      setError(caught instanceof Error ? caught.message : "No se pudo actualizar el producto.");
    } finally {
      setSavingId("");
    }
  }

  function openCreate() { setEditing(null); setError(""); setModalOpen(true); }
  function openEdit(product: Product) { setEditing(product); setError(""); setModalOpen(true); }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingForm(true);
    setError("");
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch(editing ? `/api/admin/products/${encodeURIComponent(editing.id)}` : "/api/admin/products", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, price: Number(body.price), displayOrder: Number(body.displayOrder) }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar el producto.");
      setModalOpen(false);
      await loadProducts();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar el producto.");
    } finally { setSavingForm(false); }
  }

  async function remove(product: Product) {
    if (!window.confirm(`¿Eliminar “${product.name}”? Esta acción no se puede deshacer.`)) return;
    setError("");
    const response = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}`, { method: "DELETE" });
    const payload = await response.json() as { error?: string };
    if (!response.ok) { setError(payload.error || "No se pudo eliminar el producto."); return; }
    await loadProducts();
  }

  return (
    <>
      <AdminPageHeader eyebrow="Catálogo" title="Productos" description="Administra precios, contenido, visibilidad y disponibilidad del catálogo público." action="Nuevo producto" onAction={openCreate} />
      <section className="admin-stats admin-stats--three" aria-label="Resumen del catálogo">
        <article className="admin-stat admin-stat--purple"><span>Productos</span><strong>{products.length}</strong><small>Registrados</small><i>PR</i></article>
        <article><span>Disponibles</span><strong>{products.filter((product) => product.availability === "available").length}</strong><small>En el establecimiento</small><i>DI</i></article>
        <article><span>Visibles</span><strong>{products.filter((product) => product.active).length}</strong><small>En el catálogo</small><i>VI</i></article>
      </section>
      <section className="admin-card">
        <div className="admin-card__header admin-card__header--toolbar"><div><p>Catálogo sincronizado</p><h2>Productos registrados</h2></div><div className="admin-table-tools"><input type="search" placeholder="Buscar producto..." value={query} onChange={(event) => setQuery(event.target.value)} /><button type="button" onClick={() => void loadProducts()}>Actualizar</button></div></div>
        {loading ? <div className="admin-empty"><span>PR</span><h3>Cargando productos…</h3></div> : visibleProducts.length === 0 ? <div className="admin-empty"><span>＋</span><h3>No hay productos</h3></div> : (
          <div className="admin-table-wrap"><table className="admin-table admin-products-table"><thead><tr><th>Imagen</th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Visible</th><th>Disponible</th><th>Acciones</th></tr></thead><tbody>
            {visibleProducts.map((product) => {
              const available = product.availability === "available";
              return <tr key={product.id}><td><Image className="admin-product-thumb admin-product-thumb--image" src={productImage(product)} alt="" width={54} height={54} /></td><td><strong>{product.name}</strong><small>{product.id}</small></td><td>{product.category}</td><td><strong>{formatPrice(product.price)}</strong></td><td><button className={`admin-switch ${product.active ? "is-on" : ""}`} type="button" role="switch" aria-checked={Boolean(product.active)} disabled={savingId === `${product.id}-active`} onClick={() => void updateBoolean(product, "active", !product.active)}><i /><span>{product.active ? "Visible" : "Oculto"}</span></button></td><td><button className={`admin-switch ${available ? "is-on" : ""}`} type="button" role="switch" aria-checked={available} disabled={savingId === `${product.id}-available`} onClick={() => void updateBoolean(product, "available", !available)}><i /><span>{available ? "Disponible" : "Agotado"}</span></button></td><td><div className="admin-row-actions"><button type="button" onClick={() => openEdit(product)}>Editar</button><button className="is-danger" type="button" onClick={() => void remove(product)}>Eliminar</button></div></td></tr>;
            })}
          </tbody></table></div>
        )}
      </section>
      {error && <p className="admin-inline-error" role="alert">{error}</p>}

      {modalOpen && <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="product-form-title"><button className="admin-modal__backdrop" type="button" aria-label="Cerrar" onClick={() => setModalOpen(false)} /><div className="admin-modal__panel"><button className="admin-modal__close" type="button" aria-label="Cerrar" onClick={() => setModalOpen(false)}>×</button><p className="eyebrow">Catálogo</p><h2 id="product-form-title">{editing ? "Editar producto" : "Nuevo producto"}</h2>
        <form onSubmit={saveProduct} className="admin-form" key={editing?.id ?? "new-product"}>
          {!editing && <label>Identificador (slug)<input name="id" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="nombre-del-producto" required /></label>}
          <label>Nombre<input name="name" defaultValue={editing?.name ?? ""} minLength={2} maxLength={120} required /></label>
          <label>Categoría<select name="category" defaultValue={editing?.category ?? "Bebidas"}><option>Bebidas</option><option>Postres</option><option>Acompañamientos</option></select></label>
          <label>Precio (Bs)<input name="price" type="number" min="0" max="100000" step="0.01" defaultValue={editing?.price ?? ""} required /></label>
          <label className="admin-form__wide">Descripción<textarea name="description" rows={3} maxLength={1000} defaultValue={editing?.description ?? ""} /></label>
          <label className="admin-form__wide">Descripción corta<input name="shortDescription" maxLength={240} defaultValue={editing?.shortDescription ?? ""} /></label>
          <label>Imagen relacionada<select name="visual" defaultValue={editing?.visual ?? "api"}><option value="api">Api</option><option value="tojori">Tojorí</option><option value="chocolate">Chocolate</option><option value="arroz">Arroz con leche</option><option value="pastel">Pastel</option><option value="bunuelo">Buñuelo</option></select></label>
          <label>Tono<select name="tone" defaultValue={editing?.tone ?? "purple"}><option value="purple">Morado</option><option value="gold">Dorado</option><option value="cocoa">Café</option><option value="cream">Crema</option><option value="amber">Ámbar</option></select></label>
          <label>Orden<input name="displayOrder" type="number" min="0" max="9999" defaultValue={editing?.displayOrder ?? products.length + 1} required /></label>
          {error && <p className="admin-inline-error admin-form__wide" role="alert">{error}</p>}
          <button className="button button--primary admin-form__wide" type="submit" disabled={savingForm}>{savingForm ? "Guardando…" : "Guardar producto"}</button>
        </form>
      </div></div>}
    </>
  );
}

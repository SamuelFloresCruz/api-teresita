"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { products as seedProducts, type Product, type ProductCategory } from "@/data/products";

type Filter = "Todos" | ProductCategory;

const filters: Filter[] = ["Todos", "Bebidas", "Postres", "Acompañamientos"];

export function ProductCatalog() {
  const [activeFilter, setActiveFilter] = useState<Filter>("Todos");
  const [products, setProducts] = useState<Product[]>(seedProducts);

  useEffect(() => {
    let active = true;
    fetch("/api/products", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { products?: Product[] }) => {
        if (active && payload.products?.length) setProducts(payload.products);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const visibleProducts = useMemo(
    () =>
      activeFilter === "Todos"
        ? products
        : products.filter((product) => product.category === activeFilter),
    [activeFilter, products],
  );

  return (
    <section className="catalog-section" aria-labelledby="catalog-title">
      <div className="shell">
        <div className="catalog-toolbar">
          <div>
            <p className="eyebrow">Explora a tu gusto</p>
            <h2 id="catalog-title">Todos los productos</h2>
          </div>
          <p className="catalog-toolbar__count" aria-live="polite">
            <strong>{String(visibleProducts.length).padStart(2, "0")}</strong>
            <span>{visibleProducts.length === 1 ? "producto" : "productos"}</span>
          </p>
        </div>

        <div className="catalog-filters" role="group" aria-label="Filtrar productos por categoría">
          {filters.map((filter) => (
            <button
              type="button"
              key={filter}
              className={activeFilter === filter ? "is-active" : ""}
              aria-pressed={activeFilter === filter}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="catalog-grid">
          {visibleProducts.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

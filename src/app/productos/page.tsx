import type { Metadata } from "next";
import { ProductCatalog } from "./product-catalog";

export const metadata: Metadata = {
  title: "Productos",
  description: "Conoce las bebidas, postres y acompañamientos tradicionales de Api Teresita.",
};

export default function ProductsPage() {
  return (
    <main className="products-page">
      <section className="products-hero" aria-labelledby="products-title">
        <div className="products-hero__shape products-hero__shape--one" aria-hidden="true" />
        <div className="products-hero__shape products-hero__shape--two" aria-hidden="true" />
        <div className="shell products-hero__inner">
          <p className="eyebrow eyebrow--light">Nuestro menú</p>
          <h1 id="products-title">Sabores que se sienten como en casa.</h1>
          <p>
            Explora nuestra selección de bebidas calientes, postres y
            acompañamientos inspirados en la gastronomía tradicional.
          </p>
          <span className="products-hero__index" aria-hidden="true">AT</span>
        </div>
      </section>

      <ProductCatalog />

    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { ProductAvailabilityDetail } from "@/components/product-availability";
import { ProductPhoto } from "@/components/product-photo";
import { formatPrice, products } from "@/data/products";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export const instant = false;

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.id }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = products.find((item) => item.id === slug);

  if (!product) return { title: "Producto no encontrado" };

  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = products.find((item) => item.id === slug);

  if (!product) notFound();

  const relatedProducts = products.filter((item) => item.id !== product.id).slice(0, 3);

  return (
    <main className="interior-page product-detail-page">
      <section className={`product-detail-hero product-detail-hero--${product.tone}`}>
        <div className="shell product-breadcrumb">
          <Link href="/productos">Productos</Link>
          <span aria-hidden="true">/</span>
          <span>{product.name}</span>
        </div>
        <div className="shell product-detail-hero__grid">
          <div className="product-detail-hero__copy">
            <p className="eyebrow">{product.category}</p>
            <h1>{product.name}</h1>
            <p>{product.description}</p>
            <div className="product-detail-hero__actions">
              <Link className="text-link" href="/productos">
                Volver al catálogo <span aria-hidden="true">↙</span>
              </Link>
            </div>
          </div>
          <div className="product-detail-stage" aria-label={`Presentación visual de ${product.name}`}>
            <ProductPhoto product={product} variant="detail" />
          </div>
        </div>
      </section>

      <section className="product-facts" aria-label="Información del producto">
        <div className="shell product-facts__grid">
          <article>
            <span>01</span>
            <div><small>Categoría</small><strong>{product.category}</strong></div>
          </article>
          <article>
            <span>02</span>
            <div><small>Precio</small><strong>{formatPrice(product.price)}</strong></div>
          </article>
          <article>
            <span>03</span>
            <div>
              <small>Disponibilidad</small>
              <ProductAvailabilityDetail product={product} />
            </div>
          </article>
        </div>
      </section>

      <section className="product-description" aria-labelledby="product-description-title">
        <div className="shell product-description__grid reveal">
          <p className="section-index">SABOR · TRADICIÓN</p>
          <h2 id="product-description-title">Una parte de nuestra propuesta gastronómica.</h2>
          <div>
            <p>{product.shortDescription}</p>
            <p>
              Disfrútalo en nuestro establecimiento y combínalo con tus sabores
              favoritos del menú.
            </p>
          </div>
        </div>
      </section>

      <section className="related-products" aria-labelledby="related-title">
        <div className="shell">
          <div className="section-heading reveal">
            <div>
              <p className="eyebrow">También puedes explorar</p>
              <h2 id="related-title">Otros sabores.</h2>
            </div>
            <p>Continúa recorriendo las bebidas, postres y acompañamientos de Api Teresita.</p>
          </div>
          <div className="featured-grid">
            {relatedProducts.map((item, index) => (
              <ProductCard key={item.id} product={item} index={index} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

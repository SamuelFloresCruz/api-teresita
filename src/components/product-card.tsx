import type { CSSProperties } from "react";
import Link from "next/link";
import { formatPrice, type Product } from "@/data/products";
import { ProductAvailabilityBadge } from "./product-availability";
import { ProductPhoto } from "./product-photo";

type ProductCardProps = {
  product: Product;
  index?: number;
};

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  return (
    <article
      className={`product-card product-card--${product.tone} reveal`}
      style={{ "--card-delay": `${index * 90}ms` } as CSSProperties}
    >
      <div className="product-card__visual">
        <span className="product-card__category">{product.category}</span>
        <ProductPhoto product={product} />
      </div>
      <div className="product-card__body">
        <p className="product-card__number">0{index + 1}</p>
        <div>
          <h3>{product.name}</h3>
          <p>{product.shortDescription}</p>
          <p className="product-card__price">{formatPrice(product.price)}</p>
          <div className="product-card__actions">
            <ProductAvailabilityBadge product={product} />
            <Link className="product-card__link" href={`/productos/${product.id}`}>
              Ver producto <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

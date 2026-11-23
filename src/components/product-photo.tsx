import Image from "next/image";
import type { Product } from "@/data/products";
import { productImage } from "@/data/product-images";

export function ProductPhoto({ product, variant = "card" }: {
  product: Pick<Product, "id" | "visual" | "name">;
  variant?: "card" | "detail" | "story";
}) {
  return (
    <div className={`product-photo product-photo--${variant}`}>
      <Image
        src={productImage(product)}
        alt={product.name}
        fill
        sizes={variant === "card" ? "(max-width: 768px) 100vw, (max-width: 1100px) 50vw, 33vw" : "(max-width: 768px) 100vw, 50vw"}
        loading="lazy"
      />
    </div>
  );
}

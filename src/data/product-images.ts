import type { Product } from "./products";

const photoIds = new Set([
  "api-tradicional", "tojori", "tojori-con-leche", "arroz-con-leche",
  "chocolate-con-leche", "cafe", "cafe-con-leche", "te-y-mates",
  "jugos-del-valle", "refresco-de-mocochinchi", "pastel-de-queso",
  "pastel-de-queso-y-jamon", "bunuelos", "tawa-tawa", "gordita-de-queso",
  "gordita-de-jamon", "gordita-de-guayaba",
]);

const visualFallback: Record<Product["visual"], string> = {
  api: "api-tradicional", tojori: "tojori", chocolate: "chocolate-con-leche",
  arroz: "arroz-con-leche", pastel: "pastel-de-queso", bunuelo: "bunuelos",
};

export function productImage(product: Pick<Product, "id" | "visual">) {
  return `/products/${photoIds.has(product.id) ? product.id : visualFallback[product.visual]}.webp`;
}

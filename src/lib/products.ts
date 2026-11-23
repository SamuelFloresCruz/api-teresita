import type { Product, ProductAvailability, ProductCategory, ProductVisual } from "@/data/products";

export type ProductRow = {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  descripcion_corta: string;
  precio: number | string;
  disponible: boolean;
  activo: boolean;
  visual: string;
  tono: string;
  orden_visualizacion: number;
};

const categories: ProductCategory[] = ["Bebidas", "Postres", "Acompañamientos"];
const visuals: ProductVisual[] = ["api", "tojori", "chocolate", "arroz", "pastel", "bunuelo"];
const tones: Product["tone"][] = ["purple", "gold", "cocoa", "cream", "amber"];

export function mapProduct(row: ProductRow): Product {
  const availability: ProductAvailability = row.disponible ? "available" : "unavailable";
  return {
    id: row.id,
    name: row.nombre,
    category: categories.includes(row.categoria as ProductCategory)
      ? (row.categoria as ProductCategory)
      : "Bebidas",
    description: row.descripcion,
    shortDescription: row.descripcion_corta,
    price: Number(row.precio),
    availability,
    active: row.activo,
    visual: visuals.includes(row.visual as ProductVisual) ? (row.visual as ProductVisual) : "api",
    tone: tones.includes(row.tono as Product["tone"]) ? (row.tono as Product["tone"]) : "purple",
    displayOrder: row.orden_visualizacion,
  };
}

export function productToRow(product: Product): ProductRow {
  return {
    id: product.id,
    nombre: product.name,
    categoria: product.category,
    descripcion: product.description,
    descripcion_corta: product.shortDescription,
    precio: product.price,
    disponible: product.availability === "available",
    activo: product.active ?? true,
    visual: product.visual,
    tono: product.tone,
    orden_visualizacion: product.displayOrder ?? 0,
  };
}

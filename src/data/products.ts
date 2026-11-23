export type ProductCategory = "Bebidas" | "Postres" | "Acompañamientos";
export type ProductVisual = "api" | "tojori" | "chocolate" | "arroz" | "pastel" | "bunuelo";
export type ProductAvailability = "available" | "unavailable";

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  shortDescription: string;
  price: number;
  visual: ProductVisual;
  tone: "purple" | "gold" | "cocoa" | "cream" | "amber";
  availability: ProductAvailability;
  active?: boolean;
  displayOrder?: number;
};

export const availabilityLabels: Record<ProductAvailability, string> = {
  available: "Disponible",
  unavailable: "No disponible",
};

export function formatPrice(price: number) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
  })
    .format(price)
    .replace("BOB", "Bs");
}

export const products: Product[] = ([
  {
    id: "api-tradicional",
    name: "Api tradicional",
    category: "Bebidas",
    description: "Bebida caliente de maíz, disponible en mezcla morada o amarilla.",
    shortDescription: "Mezclado, morado o amarillo.",
    price: 7,
    visual: "api",
    tone: "purple",
    availability: "available",
  },
  {
    id: "tojori",
    name: "Tojorí",
    category: "Bebidas",
    description: "Bebida caliente tradicional preparada con maíz willkaparu sin leche.",
    shortDescription: "Maíz willkaparu sin leche.",
    price: 7,
    visual: "tojori",
    tone: "gold",
    availability: "available",
  },
  {
    id: "tojori-con-leche",
    name: "Tojorí con leche",
    category: "Bebidas",
    description: "Bebida caliente tradicional preparada con maíz willkaparu y leche.",
    shortDescription: "Maíz willkaparu con leche.",
    price: 9,
    visual: "tojori",
    tone: "cream",
    availability: "available",
  },
  {
    id: "arroz-con-leche",
    name: "Arroz con leche",
    category: "Postres",
    description: "Preparación dulce y cremosa elaborada con arroz, leche y especias.",
    shortDescription: "Un clásico dulce de textura cremosa.",
    price: 18,
    visual: "arroz",
    tone: "cream",
    availability: "available",
  },
  {
    id: "chocolate-con-leche",
    name: "Chocolate con leche",
    category: "Bebidas",
    description: "Barras de chocolate diluidas en leche caliente para una bebida suave y reconfortante.",
    shortDescription: "Chocolate tradicional diluido en leche.",
    price: 18,
    visual: "chocolate",
    tone: "cocoa",
    availability: "available",
  },
  {
    id: "cafe",
    name: "Café",
    category: "Bebidas",
    description: "Café caliente preparado al momento.",
    shortDescription: "Aromático y recién preparado.",
    price: 10,
    visual: "chocolate",
    tone: "cocoa",
    availability: "available",
  },
  {
    id: "cafe-con-leche",
    name: "Café con leche",
    category: "Bebidas",
    description: "Café caliente combinado con leche para una textura más suave.",
    shortDescription: "Café suave y cremoso.",
    price: 15,
    visual: "chocolate",
    tone: "cream",
    availability: "available",
  },
  {
    id: "te-y-mates",
    name: "Té y mates",
    category: "Bebidas",
    description: "Sobres de infusión a elección preparados en agua caliente.",
    shortDescription: "Una infusión a elección.",
    price: 9,
    visual: "api",
    tone: "amber",
    availability: "available",
  },
  {
    id: "jugos-del-valle",
    name: "Jugos del Valle",
    category: "Bebidas",
    description: "Jugo refrescante en sabores disponibles del día.",
    shortDescription: "Una opción fresca para acompañar.",
    price: 15,
    visual: "api",
    tone: "gold",
    availability: "available",
  },
  {
    id: "refresco-de-mocochinchi",
    name: "Refresco de mocochinchi",
    category: "Bebidas",
    description: "Refresco tradicional boliviano elaborado con durazno deshidratado y especias.",
    shortDescription: "Refrescante y lleno de tradición.",
    price: 8,
    visual: "api",
    tone: "amber",
    availability: "available",
  },
  {
    id: "pastel-de-queso",
    name: "Pastel de queso",
    category: "Acompañamientos",
    description: "Fina masa horneada con relleno de queso.",
    shortDescription: "Fina masa con queso.",
    price: 10,
    visual: "pastel",
    tone: "amber",
    availability: "available",
  },
  {
    id: "pastel-de-queso-y-jamon",
    name: "Pastel de queso y jamón",
    category: "Acompañamientos",
    description: "Fina masa horneada con jamón y queso.",
    shortDescription: "Fina masa con jamón y queso.",
    price: 12,
    visual: "pastel",
    tone: "cocoa",
    availability: "available",
  },
  {
    id: "bunuelos",
    name: "Buñuelos",
    category: "Acompañamientos",
    description: "Masa dulce con anís, frita hasta obtener una textura ligera y dorada.",
    shortDescription: "Masa dulce con anís.",
    price: 2,
    visual: "bunuelo",
    tone: "gold",
    availability: "available",
  },
  {
    id: "tawa-tawa",
    name: "Tawa Tawa",
    category: "Acompañamientos",
    description: "Masa tradicional frita, ideal para acompañar una bebida caliente.",
    shortDescription: "Una masa tradicional para compartir.",
    price: 2,
    visual: "bunuelo",
    tone: "amber",
    availability: "available",
  },
  {
    id: "gordita-de-queso",
    name: "Gordita de queso",
    category: "Acompañamientos",
    description: "Pastel pequeño con relleno extra de queso.",
    shortDescription: "Pequeña, suave y con extra queso.",
    price: 10,
    visual: "pastel",
    tone: "cream",
    availability: "available",
  },
  {
    id: "gordita-de-jamon",
    name: "Gordita de jamón",
    category: "Acompañamientos",
    description: "Pastel pequeño con relleno extra de jamón y queso.",
    shortDescription: "Rellena de jamón y queso.",
    price: 10,
    visual: "pastel",
    tone: "cocoa",
    availability: "available",
  },
  {
    id: "gordita-de-guayaba",
    name: "Gordita de guayaba",
    category: "Postres",
    description: "Pastel pequeño con relleno extra de guayaba.",
    shortDescription: "Dulce relleno de guayaba.",
    price: 12,
    visual: "pastel",
    tone: "purple",
    availability: "available",
  },
] satisfies Product[]).map((product, index) => ({ ...product, active: true, displayOrder: index + 1 }));

import { NextResponse } from "next/server";
import { products } from "@/data/products";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapProduct, type ProductRow } from "@/lib/products";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("productos")
    .select("id,nombre,categoria,descripcion,descripcion_corta,precio,disponible,activo,visual,tono,orden_visualizacion")
    .eq("id", id)
    .eq("activo", true)
    .maybeSingle();

  if (!error && data) {
    return NextResponse.json(
      { product: mapProduct(data as ProductRow), source: "supabase" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const fallback = products.find((product) => product.id === id);
  if (!fallback) return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });

  return NextResponse.json(
    { product: fallback, source: "seed" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

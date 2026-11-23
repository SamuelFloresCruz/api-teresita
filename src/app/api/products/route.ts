import { NextResponse } from "next/server";
import { products } from "@/data/products";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapProduct, type ProductRow } from "@/lib/products";

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("productos")
    .select("id,nombre,categoria,descripcion,descripcion_corta,precio,disponible,activo,visual,tono,orden_visualizacion")
    .eq("activo", true)
    .order("orden_visualizacion", { ascending: true });

  if (error) {
    console.error("[products] Supabase query failed:", error.code, error.message);
    return NextResponse.json(
      { products, source: "seed", databaseReady: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { products: (data as ProductRow[]).map(mapProduct), source: "supabase", databaseReady: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}

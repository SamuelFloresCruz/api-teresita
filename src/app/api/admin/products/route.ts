import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapProduct, type ProductRow } from "@/lib/products";

export async function GET() {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("productos")
    .select("id,nombre,categoria,descripcion,descripcion_corta,precio,disponible,activo,visual,tono,orden_visualizacion")
    .order("orden_visualizacion", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: (data as ProductRow[]).map(mapProduct) });
}

export async function POST(request: Request) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "La solicitud no es válida." }, { status: 400 });
  const id = String(body.id ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  const price = Number(body.price);
  const category = String(body.category ?? "");
  const visual = String(body.visual ?? "");
  const tone = String(body.tone ?? "");
  const displayOrder = Number(body.displayOrder);

  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || name.length < 2 || name.length > 120 ||
    !Number.isFinite(price) || price < 0 || price > 100_000 ||
    !["Bebidas", "Postres", "Acompañamientos"].includes(category) ||
    !["api", "tojori", "chocolate", "arroz", "pastel", "bunuelo"].includes(visual) ||
    !["purple", "gold", "cocoa", "cream", "amber"].includes(tone) ||
    !Number.isInteger(displayOrder) || displayOrder < 0
  ) {
    return NextResponse.json({ error: "Los datos del producto no son válidos." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("productos").insert({
    id,
    nombre: name,
    categoria: category,
    descripcion: String(body.description ?? ""),
    descripcion_corta: String(body.shortDescription ?? ""),
    precio: price,
    disponible: body.available !== false,
    activo: body.active !== false,
    visual,
    tono: tone,
    orden_visualizacion: displayOrder,
  });

  if (error) {
    const duplicate = error.code === "23505";
    return NextResponse.json({ error: duplicate ? "Ya existe un producto con ese identificador." : "No se pudo crear el producto." }, { status: 400 });
  }
  await supabase.from("registros_auditoria").insert({ usuario_id: session.id, accion: "crear", entidad: "productos", id_entidad: id });
  return NextResponse.json({ ok: true }, { status: 201 });
}

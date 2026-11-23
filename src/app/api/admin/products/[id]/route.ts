import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "La solicitud no es válida." }, { status: 400 });
  const updates: Record<string, unknown> = {};

  if (typeof body.available === "boolean") updates.disponible = body.available;
  if (typeof body.active === "boolean") updates.activo = body.active;
  if (typeof body.name === "string" && body.name.trim().length >= 2) updates.nombre = body.name.trim();
  if (typeof body.price === "number" && Number.isFinite(body.price) && body.price >= 0 && body.price <= 100_000) updates.precio = body.price;
  if (typeof body.category === "string" && ["Bebidas", "Postres", "Acompañamientos"].includes(body.category)) updates.categoria = body.category;
  if (typeof body.description === "string") updates.descripcion = body.description.trim();
  if (typeof body.shortDescription === "string") updates.descripcion_corta = body.shortDescription.trim();
  if (typeof body.visual === "string" && ["api", "tojori", "chocolate", "arroz", "pastel", "bunuelo"].includes(body.visual)) updates.visual = body.visual;
  if (typeof body.tone === "string" && ["purple", "gold", "cocoa", "cream", "amber"].includes(body.tone)) updates.tono = body.tone;
  if (typeof body.displayOrder === "number" && Number.isInteger(body.displayOrder) && body.displayOrder >= 0) updates.orden_visualizacion = body.displayOrder;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No hay cambios válidos." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("productos").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo actualizar el producto." }, { status: 400 });

  await supabase.from("registros_auditoria").insert({
    usuario_id: session.id,
    accion: "actualizar",
    entidad: "productos",
    id_entidad: id,
    detalles: { fields: Object.keys(updates) },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("productos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo eliminar el producto." }, { status: 400 });

  await supabase.from("registros_auditoria").insert({ usuario_id: session.id, accion: "eliminar", entidad: "productos", id_entidad: id });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const paymentMethods = ["Efectivo", "QR"] as const;

type SaleItemInput = { producto_id: string; cantidad: number };
type SaleInput = {
  metodo_pago: (typeof paymentMethods)[number];
  fecha_venta: string;
  notas: string;
  items: SaleItemInput[];
};

function parseSale(body: Record<string, unknown>): SaleInput | null {
  const metodoPago = String(body.metodo_pago ?? "");
  const notas = String(body.notas ?? "").trim();
  const requestedDate = String(body.fecha_venta ?? "").trim();
  const date = requestedDate ? new Date(requestedDate) : new Date();
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems.map((raw) => {
    const item = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    return { producto_id: String(item.producto_id ?? "").trim(), cantidad: Number(item.cantidad) };
  });
  const productIds = new Set(items.map((item) => item.producto_id));

  if (
    !paymentMethods.includes(metodoPago as SaleInput["metodo_pago"]) ||
    notas.length > 1_000 ||
    Number.isNaN(date.getTime()) ||
    items.length < 1 || items.length > 50 ||
    productIds.size !== items.length ||
    items.some((item) => !item.producto_id || !Number.isInteger(item.cantidad) || item.cantidad < 1 || item.cantidad > 999)
  ) return null;

  return {
    metodo_pago: metodoPago as SaleInput["metodo_pago"],
    fecha_venta: date.toISOString(),
    notas,
    items,
  };
}

async function audit(userId: string, action: string, entityId: string) {
  const supabase = createAdminClient();
  await supabase.from("registros_auditoria").insert({
    usuario_id: userId,
    accion: action,
    entidad: "ventas",
    id_entidad: entityId,
  });
}

export async function GET() {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ventas")
    .select("id,numero_venta,metodo_pago,total,fecha_venta,notas,creado_en,detalles_venta(id,producto_id,nombre_producto,precio_unitario,cantidad,subtotal)")
    .order("fecha_venta", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[ventas] No se pudieron cargar:", error.code, error.message);
    return NextResponse.json({ error: "No se pudieron cargar las ventas." }, { status: 500 });
  }
  return NextResponse.json({ sales: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

async function saveSale(request: Request, saleId: string | null) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const values = body ? parseSale(body) : null;
  if (!values) {
    return NextResponse.json({ error: "Selecciona al menos un producto, indica cantidades válidas y elige Efectivo o QR." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("guardar_venta", {
    p_venta_id: saleId,
    p_metodo_pago: values.metodo_pago,
    p_fecha_venta: values.fecha_venta,
    p_notas: values.notas,
    p_items: values.items,
  });

  if (error || typeof data !== "string") {
    console.error("[ventas] No se pudo guardar:", error?.code, error?.message);
    return NextResponse.json({ error: "No se pudo guardar la venta. Verifica los productos seleccionados." }, { status: 400 });
  }

  await audit(session.id, saleId ? "actualizar" : "crear", data);
  return NextResponse.json({ id: data }, { status: saleId ? 200 : 201 });
}

export async function POST(request: Request) {
  return saveSale(request, null);
}

export async function PATCH(request: Request) {
  const body = await request.clone().json().catch(() => null) as Record<string, unknown> | null;
  const id = String(body?.id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "El identificador de la venta no es válido." }, { status: 400 });
  }
  return saveSale(request, id);
}

export async function DELETE(request: Request) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  const id = String(body?.id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "El identificador de la venta no es válido." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("ventas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo eliminar la venta." }, { status: 400 });
  await audit(session.id, "eliminar", id);
  return NextResponse.json({ ok: true });
}

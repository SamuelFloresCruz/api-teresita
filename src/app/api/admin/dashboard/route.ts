import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const productIdPattern = /^[a-z0-9][a-z0-9-]{0,79}$/;
const pageSize = 1_000;
const maximumRows = 20_000;

type DashboardRow = {
  venta_id: string;
  producto_id: string | null;
  nombre_producto: string;
  cantidad: number;
  subtotal: number | string;
  ventas: { fecha_venta: string } | { fecha_venta: string }[] | null;
};

export async function GET(request: Request) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const search = new URL(request.url).searchParams;
  const desde = new Date(search.get("desde") ?? "");
  const hasta = new Date(search.get("hasta") ?? "");
  const productos = [...new Set((search.get("productos") ?? "").split(",").filter(Boolean))];
  const rangeMilliseconds = hasta.getTime() - desde.getTime();

  if (
    Number.isNaN(desde.getTime()) ||
    Number.isNaN(hasta.getTime()) ||
    rangeMilliseconds <= 0 ||
    rangeMilliseconds > 10 * 366 * 24 * 60 * 60 * 1_000 ||
    productos.length < 1 ||
    productos.length > 50 ||
    productos.some((id) => !productIdPattern.test(id))
  ) {
    return NextResponse.json({ error: "Los filtros del reporte no son válidos." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const rows: DashboardRow[] = [];

  for (let offset = 0; offset < maximumRows; offset += pageSize) {
    const { data, error } = await supabase
      .from("detalles_venta")
      .select("venta_id,producto_id,nombre_producto,cantidad,subtotal,ventas!inner(fecha_venta)")
      .in("producto_id", productos)
      .gte("ventas.fecha_venta", desde.toISOString())
      .lt("ventas.fecha_venta", hasta.toISOString())
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("[dashboard] No se pudieron cargar los datos:", error.code, error.message);
      return NextResponse.json({ error: "No se pudo generar el reporte de ventas." }, { status: 500 });
    }

    const page = (data ?? []) as unknown as DashboardRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  if (rows.length >= maximumRows) {
    return NextResponse.json({ error: "El periodo contiene demasiados registros. Selecciona un rango menor." }, { status: 413 });
  }

  return NextResponse.json({
    rows: rows.map((row) => ({
      venta_id: row.venta_id,
      producto_id: row.producto_id,
      nombre_producto: row.nombre_producto,
      cantidad: row.cantidad,
      subtotal: Number(row.subtotal),
      fecha_venta: Array.isArray(row.ventas) ? row.ventas[0]?.fecha_venta : row.ventas?.fecha_venta,
    })).filter((row) => row.producto_id && row.fecha_venta),
  }, { headers: { "Cache-Control": "no-store" } });
}

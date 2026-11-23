import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Faltan las credenciales de Supabase.");

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const expectedTables = ["configuracion_negocio", "detalles_venta", "productos", "registros_auditoria", "ventas"];

const schemaResponse = await fetch(`${url}/rest/v1/`, {
  headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/openapi+json" },
});
if (!schemaResponse.ok) throw new Error("No se pudo consultar el esquema de Supabase.");
const schema = await schemaResponse.json();
const actualTables = Object.keys(schema.definitions ?? {}).sort();
if (JSON.stringify(actualTables) !== JSON.stringify(expectedTables)) {
  throw new Error(`Esquema pendiente. Tablas encontradas: ${actualTables.join(", ")}`);
}

const { count: productCount, error: productError } = await supabase.from("productos").select("id", { head: true, count: "exact" });
if (productError || productCount !== 17) throw new Error(`Se esperaban 17 productos y se encontraron ${productCount ?? 0}.`);

let saleId;
try {
  const { data: productRows, error: pricesError } = await supabase
    .from("productos")
    .select("id,precio")
    .in("id", ["api-tradicional", "bunuelos"]);
  if (pricesError || productRows.length !== 2) throw pricesError ?? new Error("Faltan productos de prueba.");
  const expectedTotal = productRows.reduce((sum, product) => sum + Number(product.precio) * (product.id === "api-tradicional" ? 2 : 3), 0);

  const { data: createdId, error: saleError } = await supabase.rpc("guardar_venta", {
    p_venta_id: null,
    p_metodo_pago: "Efectivo",
    p_fecha_venta: new Date().toISOString(),
    p_notas: "Venta temporal de verificación",
    p_items: [
      { producto_id: "api-tradicional", cantidad: 2 },
      { producto_id: "bunuelos", cantidad: 3 },
    ],
  });
  if (saleError) throw saleError;
  saleId = createdId;

  const { data: sale, error: readError } = await supabase
    .from("ventas")
    .select("total,detalles_venta(cantidad,subtotal)")
    .eq("id", saleId)
    .single();
  if (readError || Number(sale.total) !== expectedTotal || sale.detalles_venta.length !== 2) {
    throw readError ?? new Error("El total o los detalles de la venta no coinciden.");
  }
} finally {
  if (saleId) await supabase.from("ventas").delete().eq("id", saleId);
}

console.log("Sistema verificado: 5 tablas en español, 17 productos y ventas multiproducto correctas.");

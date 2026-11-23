import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("configuracion_negocio")
    .select("nombre_negocio,direccion,telefono,whatsapp,email,horario_atencion,url_mapa")
    .eq("id", true)
    .maybeSingle();
  const settings = data
    ? {
        business_name: data.nombre_negocio,
        address: data.direccion,
        phone: data.telefono,
        whatsapp: data.whatsapp,
        email: data.email,
        opening_hours: data.horario_atencion,
        map_url: data.url_mapa,
      }
    : null;
  return NextResponse.json({ settings }, { headers: { "Cache-Control": "no-store" } });
}

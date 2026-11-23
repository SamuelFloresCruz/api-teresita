import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";
const fullName = process.env.ADMIN_FULL_NAME?.trim() || "Administrador";

if (!url || !key || !email || !password) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, la clave del servidor, ADMIN_EMAIL o ADMIN_PASSWORD en .env.local.");
  process.exit(1);
}

if (!/^\S+@\S+\.\S+$/.test(email)) {
  console.error("ADMIN_EMAIL no es un correo válido.");
  process.exit(1);
}

if (!(password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password))) {
  console.error("ADMIN_PASSWORD debe tener 12+ caracteres, mayúscula, minúscula, número y símbolo.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

const { error: schemaError } = await supabase.from("productos").select("id", { head: true, count: "exact" });
if (schemaError) {
  console.error("La migración en español todavía no está aplicada. Ejecuta las migraciones de supabase/migrations en orden.");
  process.exit(1);
}

const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) {
  console.error(`No se pudo consultar Auth: ${listError.message}`);
  process.exit(1);
}

const existing = usersData.users.find((user) => user.email?.toLowerCase() === email);
const result = existing
  ? await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      app_metadata: { role: "admin" },
      user_metadata: { full_name: fullName },
      ban_duration: "none",
    })
  : await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "admin" },
      user_metadata: { full_name: fullName },
    });

if (result.error || !result.data.user) {
  console.error(`No se pudo crear el administrador: ${result.error?.message ?? "error desconocido"}`);
  process.exit(1);
}

console.log("Administrador configurado correctamente. Ya puedes iniciar sesión desde el sitio público.");

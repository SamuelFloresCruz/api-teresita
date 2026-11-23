"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string } | null;

export async function loginAdmin(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    return { error: "Ingresa un correo válido y una contraseña de al menos 8 caracteres." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Credenciales incorrectas o cuenta inactiva." };
  }

  const { data: claimsData } = await supabase.auth.getClaims();
  const metadata = claimsData?.claims?.app_metadata as { role?: string } | undefined;

  if (metadata?.role !== "admin") {
    await supabase.auth.signOut();
    return { error: "Esta cuenta no tiene autorización administrativa." };
  }

  redirect("/admin");
}


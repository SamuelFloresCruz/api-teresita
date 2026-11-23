import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminSession = {
  id: string;
  email: string;
  fullName: string;
  role: "admin";
};

export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims;
  const metadata = claims?.app_metadata as { role?: string } | undefined;

  if (!claims?.sub || metadata?.role !== "admin") return null;

  const userMetadata = claims.user_metadata as { full_name?: string } | undefined;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    fullName: userMetadata?.full_name?.trim() || "Administrador",
    role: "admin",
  };
});

export async function requireAdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/?login=required");
  return session;
}

export async function requireAdminApi() {
  return getAdminSession();
}

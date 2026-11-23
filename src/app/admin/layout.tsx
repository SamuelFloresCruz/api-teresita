import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Administración",
  description: "Panel administrativo de Api Teresita.",
};

// El panel depende de la sesión y puede bloquear hasta verificarla en el servidor.
export const instant = false;

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const session = await requireAdminPage();
  return <AdminShell user={{ email: session.email, fullName: session.fullName }}>{children}</AdminShell>;
}

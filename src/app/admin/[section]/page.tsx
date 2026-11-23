import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminProducts } from "@/components/admin/admin-products";
import { AdminSales } from "@/components/admin/admin-sales";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

const sectionTitles = {
  dashboard: "Dashboard",
  productos: "Productos",
  ventas: "Ventas",
} as const;

type AdminSectionProps = { params: Promise<{ section: string }> };

export function generateStaticParams() {
  return Object.keys(sectionTitles).map((section) => ({ section }));
}

export async function generateMetadata({ params }: AdminSectionProps): Promise<Metadata> {
  const { section } = await params;
  const title = sectionTitles[section as keyof typeof sectionTitles];
  return { title: title ? `${title} | Administración` : "Administración" };
}

export default async function AdminSectionPage({ params }: AdminSectionProps) {
  const { section } = await params;

  if (section === "dashboard") return <AdminDashboard />;
  if (section === "productos") return <AdminProducts />;
  if (section === "ventas") return <AdminSales />;
  notFound();
}

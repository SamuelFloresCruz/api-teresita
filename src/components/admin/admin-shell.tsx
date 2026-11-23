"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const adminNavigation = [
  { label: "Dashboard", href: "/admin/dashboard", code: "DB" },
  { label: "Productos", href: "/admin/productos", code: "PR" },
  { label: "Ventas", href: "/admin/ventas", code: "VE" },
];

function pageTitle(pathname: string) {
  return adminNavigation.find((item) => item.href === pathname)?.label ?? "Administración";
}

export function AdminShell({ children, user }: { children: React.ReactNode; user: { email: string; fullName: string } }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-layout">
      <button
        className={`admin-sidebar-backdrop ${sidebarOpen ? "is-open" : ""}`}
        type="button"
        aria-label="Cerrar navegación administrativa"
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`admin-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="admin-sidebar__brand">
          <span>AT</span>
          <div><strong>Api Teresita</strong><small>Administración</small></div>
          <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú">×</button>
        </div>
        <nav aria-label="Navegación administrativa">
          {adminNavigation.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                href={item.href}
                key={item.href}
                className={active ? "is-active" : undefined}
                onClick={() => setSidebarOpen(false)}
              >
                <span>{item.code}</span>{item.label}<i aria-hidden="true">›</i>
              </Link>
            );
          })}
        </nav>
        <Link className="admin-sidebar__exit" href="/">← Ver sitio público</Link>
        <form action="/api/auth/logout" method="post" className="admin-sidebar__logout">
          <button type="submit">Cerrar sesión</button>
        </form>
      </aside>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <button className="admin-menu-button" type="button" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú">
            <span /><span /><span />
          </button>
          <div><small>Panel administrativo</small><strong>{pageTitle(pathname)}</strong></div>
          <div className="admin-topbar__actions">
            <div className="admin-profile"><span>AT</span><p><strong>{user.fullName}</strong><small>{user.email}</small></p></div>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}

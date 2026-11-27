"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { loginAdmin } from "@/app/actions/auth";

const navigation = [
  { label: "Inicio", href: "/" },
  { label: "Productos", href: "/productos" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Ubicación", href: "/ubicacion" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginNotice, setLoginNotice] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [emailEditable, setEmailEditable] = useState(false);
  const [passwordEditable, setPasswordEditable] = useState(false);
  const [loginState, loginAction, loginPending] = useActionState(loginAdmin, null);

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("login");
    if (reason === "required" || reason === "denied") {
      queueMicrotask(() => {
        setLoginNotice(
          reason === "denied"
            ? "Tu cuenta no tiene permisos de administración."
            : "Inicia sesión para acceder al panel administrativo.",
        );
        setLoginOpen(true);
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const isOverlayOpen = menuOpen || loginOpen;
    document.body.style.overflow = isOverlayOpen ? "hidden" : "";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setLoginOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen, loginOpen]);

  function openLogin() {
    setMenuOpen(false);
    setLoginNotice("");
    setPasswordVisible(false);
    setLoginEmail("");
    setLoginPassword("");
    setEmailEditable(false);
    setPasswordEditable(false);
    setLoginOpen(true);
  }

  return (
    <>
      <header className="site-header">
        <div className="shell site-header__inner">
          <Link className="brand brand--header" href="/" aria-label="Api Teresita, inicio">
            <Image
              className="brand__logo"
              src="/api-teresita-logo.png"
              width={1536}
              height={1024}
              alt=""
              preload
            />
          </Link>

          <nav className="desktop-nav" aria-label="Navegación principal">
            {navigation.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link
                  href={item.href}
                  key={item.label}
                  className={isActive ? "is-active" : undefined}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="site-header__actions">
            <button className="login-trigger" type="button" onClick={openLogin}>
              <span className="login-trigger__icon" aria-hidden="true">
                <i />
              </span>
              Iniciar sesión
            </button>
            <button
              className={`menu-trigger ${menuOpen ? "is-open" : ""}`}
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            >
              <span /><span />
            </button>
          </div>
        </div>
      </header>

      <div className={`mobile-menu ${menuOpen ? "is-open" : ""}`} id="mobile-navigation">
        <nav aria-label="Navegación móvil">
          {navigation.map((item, index) => (
            <Link
              href={item.href}
              key={item.label}
              onClick={() => setMenuOpen(false)}
              style={{ "--menu-index": index } as React.CSSProperties}
            >
              <small>0{index + 1}</small>
              <span>{item.label}</span>
              <i aria-hidden="true">↗</i>
            </Link>
          ))}
        </nav>
        <button type="button" className="button button--cream" onClick={openLogin}>
          Acceso administrativo <span aria-hidden="true">→</span>
        </button>
        <p>La navegación pública no requiere iniciar sesión.</p>
      </div>

      {loginOpen && (
        <div className="login-modal" role="dialog" aria-modal="true" aria-labelledby="admin-login-title">
          <button
            className="login-modal__backdrop"
            aria-label="Cerrar acceso administrativo"
            type="button"
            onClick={() => setLoginOpen(false)}
          />
          <div className="login-panel">
            <button
              className="login-panel__close"
              type="button"
              onClick={() => setLoginOpen(false)}
              aria-label="Cerrar"
            >
              ×
            </button>
            <p className="eyebrow">Área privada</p>
            <h2 id="admin-login-title">Acceso administrativo</h2>
            <p className="login-panel__intro">
              Este acceso es exclusivo para el personal autorizado de Api Teresita.
            </p>
            <form action={loginAction} autoComplete="off" data-form-type="other">
              <label>
                Correo electrónico
                <input
                  type="email"
                  name="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  onFocus={() => setEmailEditable(true)}
                  autoComplete="off"
                  readOnly={!emailEditable}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  spellCheck={false}
                  required
                />
              </label>
              <label>
                Contraseña
                <span className="login-panel__password">
                  <input
                    type={passwordVisible ? "text" : "password"}
                    name="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    onFocus={() => setPasswordEditable(true)}
                    autoComplete="new-password"
                    readOnly={!passwordEditable}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    required
                  />
                  <button
                    type="button"
                    className="login-panel__password-toggle"
                    onClick={() => setPasswordVisible((visible) => !visible)}
                    aria-label={passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                    aria-pressed={passwordVisible}
                    title={passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {passwordVisible ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.3A10.7 10.7 0 0112 4c5.5 0 9 5.8 9 8a10.6 10.6 0 01-2.1 3.6M6.5 6.5C4.3 8 3 10.5 3 12c0 2.2 3.5 8 9 8 1.3 0 2.5-.3 3.5-.8" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 12c0-2.2 3.5-8 9-8s9 5.8 9 8-3.5 8-9 8-9-5.8-9-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </span>
              </label>
              <button className="button button--primary" type="submit" disabled={loginPending}>
                {loginPending ? "Verificando…" : "Ingresar al panel"} <span aria-hidden="true">→</span>
              </button>
              {(loginState?.error || loginNotice) && (
                <p className="login-panel__message" role="alert">
                  {loginState?.error || loginNotice}
                </p>
              )}
            </form>
            <p className="login-panel__footnote">
              Los clientes pueden explorar todo el sitio sin iniciar sesión.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

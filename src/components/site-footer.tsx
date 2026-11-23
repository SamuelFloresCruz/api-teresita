import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__top">
        <Link className="brand brand--footer" href="/" aria-label="Api Teresita, inicio">
          <span className="brand__seal">AT</span>
          <span className="brand__text">
            <strong>Api Teresita</strong>
            <small>Sabor tradicional</small>
          </span>
        </Link>
        <p className="site-footer__phrase">Calidez, tradición y sabor en cada pausa.</p>
        <nav aria-label="Navegación del pie de página">
          <Link href="/">Inicio</Link>
          <Link href="/productos">Productos</Link>
          <Link href="/nosotros">Nosotros</Link>
          <Link href="/ubicacion">Ubicación</Link>
        </nav>
      </div>
      <div className="shell site-footer__bottom">
        <p>© 2026 Api Teresita. Todos los derechos reservados.</p>
        <p>Hecho con identidad boliviana <span aria-hidden="true">✦</span></p>
      </div>
    </footer>
  );
}

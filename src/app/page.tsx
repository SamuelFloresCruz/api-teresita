import Link from "next/link";
import { ApiGlass3D } from "@/components/api-glass-3d";
import { ProductCard } from "@/components/product-card";
import { ProductPhoto } from "@/components/product-photo";
import { products } from "@/data/products";

const featuredProducts = products.filter((product) =>
  ["api-tradicional", "tojori", "bunuelos"].includes(product.id),
);

export default function HomePage() {
  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__glow" aria-hidden="true" />
        <div className="shell hero__grid">
          <div className="hero__copy">
            <p className="eyebrow hero__eyebrow">
              <span /> Gastronomía tradicional
            </p>
            <h1 id="hero-title">
              Una tradición que se disfruta <em>caliente.</em>
            </h1>
            <p className="hero__lead">
              Bebidas y alimentos que convierten una pausa cotidiana en un
              momento lleno de sabor, calidez y tradición.
            </p>
            <div className="hero__actions">
              <Link className="button button--primary" href="/productos">
                Explorar el menú <span aria-hidden="true">↗</span>
              </Link>
              <Link className="text-link" href="/nosotros">
                Conoce nuestra esencia <span aria-hidden="true">↓</span>
              </Link>
            </div>
            <div className="hero__note" aria-label="Información destacada">
              <span className="hero__note-mark">AT</span>
              <p>
                <strong>Sabores para compartir</strong>
                <span>Desayunos y meriendas con identidad.</span>
              </p>
            </div>
          </div>

          <div className="hero-stage" aria-label="Presentación del api tradicional">
            <div className="hero-stage__orbit" aria-hidden="true" />
            <div className="hero-stage__label hero-stage__label--one">
              <small>Hecho con</small>
              <strong>tradición</strong>
            </div>
            <div className="hero-stage__label hero-stage__label--two">
              <span className="status-dot" /> Sabor de siempre
            </div>
            <ApiGlass3D />
            <p className="hero-stage__caption">API TERESITA · SABOR BOLIVIANO</p>
          </div>
        </div>
        <a className="hero__scroll" href="#sabores" aria-label="Ir a nuestros sabores">
          <span>Descubre</span>
          <i aria-hidden="true" />
        </a>
      </section>

      <div className="flavor-strip" aria-label="Productos de Api Teresita">
        <div className="flavor-strip__track">
          <span>API MORADO</span><i>✦</i><span>TOJORÍ</span><i>✦</i>
          <span>PASTELES</span><i>✦</i><span>BUÑUELOS</span><i>✦</i>
          <span>ARROZ CON LECHE</span><i>✦</i><span>CHOCOLATE</span><i>✦</i>
          <span aria-hidden="true">API MORADO</span><i aria-hidden="true">✦</i>
          <span aria-hidden="true">TOJORÍ</span><i aria-hidden="true">✦</i>
          <span aria-hidden="true">PASTELES</span><i aria-hidden="true">✦</i>
          <span aria-hidden="true">BUÑUELOS</span><i aria-hidden="true">✦</i>
        </div>
      </div>

      <section className="section section--products" id="sabores" aria-labelledby="sabores-title">
        <div className="shell">
          <div className="section-heading reveal">
            <div>
              <p className="eyebrow">Nuestros sabores</p>
              <h2 id="sabores-title">Elige tu próximo antojo.</h2>
            </div>
            <p>
              Una selección de bebidas y acompañamientos tradicionales para
              comenzar el día o disfrutar la tarde.
            </p>
          </div>

          <div className="featured-grid">
            {featuredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
              />
            ))}
          </div>

          <div className="section-action reveal">
            <Link className="button button--outline" href="/productos">
              Ver todos los productos <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="story" id="historia" aria-labelledby="story-title">
        <div className="shell story__grid">
          <div className="story-art reveal" aria-hidden="true">
            <span className="story-art__stamp">Sabor<br />tradicional</span>
            <ProductPhoto product={{ id: "pastel-de-queso", visual: "pastel", name: "Pastel de queso" }} variant="story" />
            <p>Una pausa con sabor a casa</p>
          </div>
          <div className="story__copy reveal">
            <p className="eyebrow eyebrow--light">Nuestra esencia</p>
            <h2 id="story-title">Recetas que cuentan una historia.</h2>
            <p className="story__lead">
              Api Teresita nace del gusto por preparar y compartir bebidas y
              alimentos que forman parte de nuestras costumbres.
            </p>
            <div className="story__points">
              <article>
                <span>01</span>
                <div>
                  <h3>Identidad</h3>
                  <p>Productos reconocidos dentro de la gastronomía tradicional.</p>
                </div>
              </article>
              <article>
                <span>02</span>
                <div>
                  <h3>Variedad</h3>
                  <p>Bebidas, postres y acompañamientos para distintos gustos.</p>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="visit" id="visitanos" aria-labelledby="visit-title">
        <div className="shell visit__inner reveal">
          <div>
            <p className="eyebrow">Ven a conocernos</p>
            <h2 id="visit-title">Tu próxima pausa puede saber mejor.</h2>
          </div>
          <div className="visit__details">
            <p>
              Consulta cómo llegar y nuestros horarios de atención para
              planificar tu visita.
            </p>
            <Link className="button button--primary" href="/ubicacion">
              Ver ubicación <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

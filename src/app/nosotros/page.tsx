import type { Metadata } from "next";
import Link from "next/link";
import { ProductPhoto } from "@/components/product-photo";

export const metadata: Metadata = {
  title: "Nosotros",
  description: "Conoce la esencia gastronómica y la propuesta de Api Teresita.",
};

export default function AboutPage() {
  return (
    <main className="interior-page">
      <section className="inner-hero inner-hero--about" aria-labelledby="about-title">
        <div className="inner-hero__line" aria-hidden="true" />
        <div className="shell inner-hero__grid">
          <div className="inner-hero__copy">
            <p className="eyebrow eyebrow--light">Nuestra historia</p>
            <h1 id="about-title">El sabor de nuestras costumbres, en un solo lugar.</h1>
            <p>
              Api Teresita es un establecimiento dedicado a preparar y compartir
              bebidas y alimentos tradicionales para desayunos y meriendas.
            </p>
          </div>
          <div className="about-hero-art" aria-hidden="true">
            <span className="about-hero-art__word">Tradición</span>
            <div className="about-hero-art__product about-hero-art__product--one">
              <ProductPhoto product={{ id: "api-tradicional", visual: "api", name: "Api tradicional" }} />
            </div>
            <div className="about-hero-art__product about-hero-art__product--two">
              <ProductPhoto product={{ id: "pastel-de-queso", visual: "pastel", name: "Pastel de queso" }} />
            </div>
            <span className="about-hero-art__seal">AT<br /><small>2026</small></span>
          </div>
        </div>
      </section>

      <section className="about-intro" aria-labelledby="about-intro-title">
        <div className="shell about-intro__grid">
          <p className="section-index reveal">01 · QUIÉNES SOMOS</p>
          <div className="about-intro__statement reveal">
            <h2 id="about-intro-title">
              Una propuesta que une <em>gastronomía</em>, identidad y cercanía.
            </h2>
          </div>
          <div className="about-intro__body reveal">
            <p>
              Nuestra actividad se centra en la elaboración y comercialización
              de productos reconocidos dentro de la gastronomía popular, como
              api, tojorí, chocolate, arroz con leche, pasteles y buñuelos.
            </p>
            <p>
              Cada bebida y acompañamiento es una invitación a compartir una
              pausa, descubrir nuestros sabores y disfrutar de la tradición.
            </p>
          </div>
        </div>
      </section>

      <section className="about-principles" aria-labelledby="principles-title">
        <div className="shell">
          <div className="section-heading reveal">
            <div>
              <p className="eyebrow">Lo que nos representa</p>
              <h2 id="principles-title">Nuestra esencia.</h2>
            </div>
            <p>
              Tres ideas que nos acompañan en cada preparación y en la atención
              a quienes nos visitan.
            </p>
          </div>
          <div className="principles-grid">
            <article className="principle-card reveal">
              <span>01</span>
              <i aria-hidden="true">✦</i>
              <h3>Tradición</h3>
              <p>Sabores que forman parte de las costumbres gastronómicas de la población.</p>
            </article>
            <article className="principle-card principle-card--accent reveal">
              <span>02</span>
              <i aria-hidden="true">◎</i>
              <h3>Variedad</h3>
              <p>Bebidas, alimentos y postres pensados para diferentes preferencias.</p>
            </article>
            <article className="principle-card reveal">
              <span>03</span>
              <i aria-hidden="true">↗</i>
              <h3>Cercanía</h3>
              <p>Información simple y disponible para que cada visitante conozca nuestra oferta.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="digital-story" aria-labelledby="digital-title">
        <div className="shell digital-story__grid">
          <div className="digital-story__visual reveal" aria-hidden="true">
            <span>Tradición</span>
            <i>+</i>
            <span>calidez</span>
            <b>AT</b>
          </div>
          <div className="digital-story__copy reveal">
            <p className="eyebrow eyebrow--light">Sabores para compartir</p>
            <h2 id="digital-title">Tu momento de disfrutar la tradición.</h2>
            <p>
              Explora nuestras bebidas y acompañamientos, elige tus favoritos
              y ven a disfrutar un desayuno o una merienda en Api Teresita.
            </p>
            <Link className="button button--cream" href="/productos">
              Conocer los productos <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

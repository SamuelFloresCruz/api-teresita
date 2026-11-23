import type { Metadata } from "next";
import { LocationDetails } from "@/components/business-info";
import { ProductPhoto } from "@/components/product-photo";

export const metadata: Metadata = {
  title: "Ubicación",
  description: "Consulta la información de ubicación y atención de Api Teresita.",
};

export default function LocationPage() {
  return (
    <main className="interior-page location-page">
      <section className="inner-hero inner-hero--location" aria-labelledby="location-title">
        <div className="shell location-heading">
          <p className="eyebrow">Visítanos</p>
          <h1 id="location-title">Encuentra tu próxima pausa con sabor tradicional.</h1>
          <p>
            Consulta la dirección, los horarios de atención y las indicaciones
            publicadas por Api Teresita.
          </p>
        </div>
      </section>

      <section className="location-content" aria-label="Información de ubicación">
        <div className="shell location-grid">
          <div className="map-card reveal" aria-label="Api tradicional para acompañar tu visita">
            <ProductPhoto product={{ id: "api-tradicional", visual: "api", name: "Api tradicional" }} variant="story" />
            <div className="map-card__label">
              <span className="status-dot" />
              <p><strong>Te esperamos en Api Teresita</strong><small>Una pausa con sabor a tradición.</small></p>
            </div>
          </div>

          <div className="location-info reveal">
            <p className="eyebrow">Datos del establecimiento</p>
            <h2>Todo listo para encontrarnos.</h2>
            <p className="location-info__lead">
              Consulta nuestros datos de atención para organizar tu visita.
            </p>
            <LocationDetails />
          </div>
        </div>
      </section>

      <section className="location-notice">
        <div className="shell location-notice__inner reveal">
          <span aria-hidden="true">i</span>
          <div>
            <h2>Planifica tu visita</h2>
            <p>
              Revisa la dirección, los horarios y el enlace al mapa publicados
              por el establecimiento antes de visitarnos.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

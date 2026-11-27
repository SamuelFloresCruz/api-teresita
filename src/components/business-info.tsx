"use client";

import { useEffect, useState } from "react";

export type BusinessSettings = { business_name: string; address: string; phone: string; whatsapp: string; email: string; opening_hours: string; map_url: string };

const officialMapUrl = "https://maps.app.goo.gl/T5Za3nCUzxVXhViv8";

export function useBusinessSettings() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" }).then((response) => response.json()).then((payload: { settings?: BusinessSettings }) => setSettings(payload.settings ?? null)).catch(() => undefined);
  }, []);
  return settings;
}

export function LocationDetails() {
  const settings = useBusinessSettings();
  const details = [
    { label: "Dirección", icon: "⌖", value: settings?.address },
    { label: "Horarios", icon: "◷", value: settings?.opening_hours },
    { label: "Contacto", icon: "◌", value: settings?.phone || settings?.whatsapp || settings?.email },
  ].filter((detail) => detail.value);
  return <>
    {details.length ? <dl className="location-list">{details.map((detail) => <div key={detail.label}><dt><span aria-hidden="true">{detail.icon}</span> {detail.label}</dt><dd>{detail.value}</dd></div>)}</dl> : null}
    <div className="location-guide" aria-label="Recomendaciones para la visita">
      <article>
        <span aria-hidden="true">01</span>
        <div><h3>Consulta tu ruta</h3><p>Abre Google Maps para conocer el recorrido desde tu ubicación.</p></div>
      </article>
      <article>
        <span aria-hidden="true">02</span>
        <div><h3>Visítanos</h3><p>Disfruta nuestras bebidas y alimentos tradicionales en el establecimiento.</p></div>
      </article>
      <article>
        <span aria-hidden="true">03</span>
        <div><h3>Antes de salir</h3><p>Comprueba el tiempo estimado y elige la ruta más conveniente.</p></div>
      </article>
    </div>
    <a className="button button--primary" href={officialMapUrl} target="_blank" rel="noopener noreferrer">La ubicación del lugar <span aria-hidden="true">↗</span></a>
  </>;
}

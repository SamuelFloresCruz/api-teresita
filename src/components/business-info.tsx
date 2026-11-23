"use client";

import { useEffect, useState } from "react";

export type BusinessSettings = { business_name: string; address: string; phone: string; whatsapp: string; email: string; opening_hours: string; map_url: string };

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
    {details.length ? <dl className="location-list">{details.map((detail) => <div key={detail.label}><dt><span aria-hidden="true">{detail.icon}</span> {detail.label}</dt><dd>{detail.value}</dd></div>)}</dl> : <p>Escríbenos para consultar cómo llegar y los horarios de atención.</p>}
    {settings?.map_url && <a className="button button--primary" href={settings.map_url} target="_blank" rel="noreferrer">Abrir mapa <span aria-hidden="true">↗</span></a>}
  </>;
}

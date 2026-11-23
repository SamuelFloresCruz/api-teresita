"use client";

import { useEffect, useState } from "react";
import type { ProductAvailability } from "@/data/products";

const CHANGE_EVENT = "api-teresita-availability-change";

export function useProductAvailability(
  productId: string,
  initialAvailability: ProductAvailability,
) {
  const [availability, setAvailability] = useState(initialAvailability);

  useEffect(() => {
    let active = true;

    async function loadAvailability() {
      try {
        const response = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          product?: { availability?: ProductAvailability };
        };
        if (active && payload.product?.availability) {
          setAvailability(payload.product.availability);
        }
      } catch {
        // El catálogo inicial permite seguir navegando si Supabase no responde.
      }
    }

    const handleChange = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; availability: ProductAvailability }>).detail;
      if (detail?.id === productId) setAvailability(detail.availability);
    };

    loadAvailability();
    window.addEventListener(CHANGE_EVENT, handleChange);
    return () => {
      active = false;
      window.removeEventListener(CHANGE_EVENT, handleChange);
    };
  }, [productId]);

  return availability;
}

export function announceProductAvailability(
  productId: string,
  availability: ProductAvailability,
) {
  window.dispatchEvent(
    new CustomEvent(CHANGE_EVENT, { detail: { id: productId, availability } }),
  );
}

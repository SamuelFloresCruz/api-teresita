"use client";

import { availabilityLabels, type Product } from "@/data/products";
import { useProductAvailability } from "@/lib/availability-store";

export function ProductAvailabilityBadge({ product }: { product: Product }) {
  const availability = useProductAvailability(product.id, product.availability);

  return (
    <span className={`availability-badge availability-badge--${availability}`}>
      <i aria-hidden="true" />
      {availabilityLabels[availability]}
    </span>
  );
}

export function ProductAvailabilityDetail({ product }: { product: Product }) {
  const availability = useProductAvailability(product.id, product.availability);

  return (
    <>
      <strong className={`availability-detail availability-detail--${availability}`}>
        <i aria-hidden="true" />
        {availabilityLabels[availability]}
      </strong>
    </>
  );
}
